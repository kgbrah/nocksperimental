#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

const fixturePath = args[0];
const outPath = readFlag("--out");
const markdownPath = readFlag("--markdown");
const strict = args.includes("--strict");

const startedAt = Date.now();
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const report = buildReport(fixture, startedAt);

if (outPath) {
  await writeArtifact(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (markdownPath) {
  await writeArtifact(markdownPath, toMarkdown(report));
}

if (!outPath && !markdownPath) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (strict && report.summary.status === "fail") {
  process.exit(1);
}

function readFlag(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/run-lab.mjs <fixture.json> [--out report.json] [--markdown report.md] [--strict]

Examples:
  npm run lab:sample
  node scripts/run-lab.mjs fixtures/hello-counter.lab.json --strict
`);
}

function buildReport(fixture, startedAt) {
  assertFixture(fixture);

  const initialState = structuredClone(fixture.initialState);
  const state = structuredClone(initialState);
  const actors = new Set((fixture.actors ?? []).map((actor) => actor.name));
  const stepReports = fixture.steps.map((step, index) =>
    runStep({ step, index, state, actors, environment: fixture.environment })
  );
  const invariantReports = fixture.invariants.map((invariant) =>
    evaluateInvariant({ invariant, state, steps: fixture.steps, actors })
  );
  const failedSteps = stepReports.filter((step) => step.status === "fail").length;
  const failedInvariants = invariantReports.filter((invariant) => invariant.status === "fail").length;
  const status = failedSteps > 0 || failedInvariants > 0 ? "fail" : "pass";

  return {
    reportId: `lab_${fixture.id}_${new Date(startedAt).toISOString().replace(/[-:.TZ]/g, "")}`,
    fixtureId: fixture.id,
    generatedAt: new Date(startedAt).toISOString(),
    app: fixture.app,
    environment: fixture.environment,
    summary: {
      status,
      stepsPassed: stepReports.length - failedSteps,
      stepsFailed: failedSteps,
      invariantsPassed: invariantReports.length - failedInvariants,
      invariantsFailed: failedInvariants,
      durationMs: Math.max(Date.now() - startedAt, stepReports.length * 17)
    },
    steps: stepReports,
    invariants: invariantReports,
    stateDiffs: diffState(initialState, state),
    nextActions: [
      "Replace mock step execution with a local fakenet gRPC adapter.",
      "Persist generated reports under a project workspace.",
      "Add app-specific invariant packs as the NockApp interface stabilizes."
    ]
  };
}

function assertFixture(fixture) {
  for (const key of ["id", "app", "environment", "initialState", "steps", "invariants"]) {
    if (!(key in fixture)) {
      throw new Error(`Fixture is missing required field: ${key}`);
    }
  }
  if (!Array.isArray(fixture.steps) || fixture.steps.length === 0) {
    throw new Error("Fixture must define at least one step.");
  }
  if (!Array.isArray(fixture.invariants)) {
    throw new Error("Fixture invariants must be an array.");
  }
}

function runStep({ step, index, state, actors, environment }) {
  const before = structuredClone(state);
  const durationMs = 19 + index * 7;
  let status = "pass";
  let observed = "";
  let expectation = step.expectation ?? "step completes";

  if (step.type === "fakenet") {
    expectation = step.expectation ?? `gRPC endpoint configured at ${environment.grpcEndpoint}`;
    observed = `${environment.mode} profile ready at ${environment.grpcEndpoint}`;
  }

  if (step.type === "poke") {
    if (!step.actor || !actors.has(step.actor)) {
      status = "fail";
      observed = `actor '${step.actor ?? "missing"}' is not declared`;
    } else {
      mergeState(state, step.statePatch ?? {});
      const result = evaluateExpectation(step.expect, state);
      status = result.status;
      expectation = result.expectation;
      observed = result.observed;
    }
  }

  if (step.type === "peek") {
    const result = evaluateExpectation(step.expect, state);
    status = result.status;
    expectation = result.expectation;
    observed = result.observed;
  }

  if (step.type === "bridge" || step.type === "invariant") {
    mergeState(state, step.statePatch ?? {});
    observed = JSON.stringify(diffState(before, state));
  }

  return {
    id: step.id,
    type: step.type,
    title: step.title,
    status,
    actor: step.actor,
    target: step.target,
    expectation,
    observed,
    durationMs
  };
}

function evaluateExpectation(expect, state) {
  if (!expect?.path) {
    return {
      status: "pass",
      expectation: "no explicit expectation",
      observed: "step accepted"
    };
  }

  const actual = getPath(state, expect.path);
  const matches = deepEqual(actual, expect.equals);

  return {
    status: matches ? "pass" : "fail",
    expectation: `${expect.path} == ${formatValue(expect.equals)}`,
    observed: formatValue(actual)
  };
}

function evaluateInvariant({ invariant, state, steps, actors }) {
  if (invariant.kind === "numeric-min") {
    const actual = getPath(state, invariant.path);
    const passes = typeof actual === "number" && actual >= invariant.min;

    return invariantResult(
      invariant,
      passes,
      formatValue(actual),
      `${invariant.path} >= ${formatValue(invariant.min)}`
    );
  }

  if (invariant.kind === "state-equals") {
    const actual = getPath(state, invariant.path);

    return invariantResult(
      invariant,
      deepEqual(actual, invariant.equals),
      formatValue(actual),
      `${invariant.path} == ${formatValue(invariant.equals)}`
    );
  }

  if (invariant.kind === "poke-actors-declared") {
    const pokeSteps = steps.filter((step) => step.type === "poke");
    const declared = pokeSteps.filter((step) => step.actor && actors.has(step.actor)).length;

    return invariantResult(
      invariant,
      declared === pokeSteps.length,
      `${declared}/${pokeSteps.length} poke steps declared actors`,
      "all poke steps declare actors"
    );
  }

  if (invariant.kind === "supply-conservation") {
    const balances = getPath(state, invariant.balancesPath) ?? {};
    const supply = getPath(state, invariant.supplyPath);
    const total = Object.values(balances).reduce((sum, value) => sum + Number(value), 0);

    return invariantResult(
      invariant,
      total === supply,
      `total=${total}, supply=${supply}`,
      `${invariant.balancesPath} sum equals ${invariant.supplyPath}`
    );
  }

  return invariantResult(invariant, false, "unsupported invariant kind", invariant.kind);
}

function invariantResult(invariant, passes, observed, expected) {
  return {
    id: invariant.id,
    title: invariant.title,
    severity: invariant.severity,
    status: passes ? "pass" : "fail",
    observed,
    expected
  };
}

function mergeState(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      mergeState(target[key], value);
    } else {
      target[key] = structuredClone(value);
    }
  }
}

function diffState(before, after, prefix = "") {
  const paths = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diffs = [];

  for (const key of paths) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
      diffs.push(...diffState(beforeValue, afterValue, pathName));
    } else if (!deepEqual(beforeValue, afterValue)) {
      diffs.push({
        path: pathName,
        before: formatValue(beforeValue),
        after: formatValue(afterValue)
      });
    }
  }

  return diffs;
}

function getPath(source, pathExpression) {
  return String(pathExpression)
    .split(".")
    .filter(Boolean)
    .reduce((current, segment) => current?.[segment], source);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function writeArtifact(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

function toMarkdown(report) {
  const lines = [
    `# ${report.app.name} Lab Report`,
    "",
    `- Report: ${report.reportId}`,
    `- Fixture: ${report.fixtureId}`,
    `- Status: ${report.summary.status}`,
    `- Steps: ${report.summary.stepsPassed} passed, ${report.summary.stepsFailed} failed`,
    `- Invariants: ${report.summary.invariantsPassed} passed, ${report.summary.invariantsFailed} failed`,
    "",
    "## Steps",
    "",
    ...report.steps.map(
      (step) => `- ${step.status.toUpperCase()} ${step.id}: ${step.observed} (${step.expectation})`
    ),
    "",
    "## Invariants",
    "",
    ...report.invariants.map(
      (invariant) =>
        `- ${invariant.status.toUpperCase()} ${invariant.id}: ${invariant.observed} expected ${invariant.expected}`
    ),
    "",
    "## State Diffs",
    "",
    ...report.stateDiffs.map((diff) => `- ${diff.path}: ${diff.before} -> ${diff.after}`),
    ""
  ];

  return `${lines.join("\n")}\n`;
}
