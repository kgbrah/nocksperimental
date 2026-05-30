#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "run" ? rawArgs.slice(1) : rawArgs;

if (args.length === 0 || args.includes("--help")) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

const strict = args.includes("--strict");
const ciMode = args.includes("--ci");
const configPath = readFlag("--config");

if (configPath) {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const results = await runConfig(config, configPath);
  const hasFailure = results.some((result) => result.report.summary.status === "fail");

  if (strict && hasFailure) {
    process.exit(1);
  }
} else {
  const fixturePath = args[0];
  const outPath = readFlag("--out");
  const markdownPath = readFlag("--markdown");
  const outDir = readFlag("--out-dir");
  const startedAt = Date.now();
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const report = buildReport(fixture, startedAt);

  if (outDir) {
    await writeReportBundle(report, outDir);
  } else {
    if (outPath) {
      await writeArtifact(outPath, `${JSON.stringify(report, null, 2)}\n`);
    }

    if (markdownPath) {
      await writeArtifact(markdownPath, toMarkdown(report));
    }

    if (!outPath && !markdownPath) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    }
  }

  if (strict && report.summary.status === "fail") {
    process.exit(1);
  }
}

async function runConfig(config, configPath) {
  const configDir = path.dirname(configPath);
  const reportDir = resolveFrom(configDir, config.reportDir ?? ".nocklab");
  const fixtures = config.fixtures ?? [];
  const results = [];

  if (fixtures.length === 0) {
    throw new Error(`No fixtures configured in ${configPath}`);
  }

  for (const fixtureConfig of fixtures) {
    const fixturePath = resolveFrom(configDir, fixtureConfig.path);
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    const report = buildReport(fixture, Date.now());
    const written = await writeReportBundle(report, reportDir, fixtureConfig.slug);
    results.push({ fixturePath, report, written });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    config: configPath,
    reportDir,
    status: summarizeStatuses(results.map((result) => result.report.summary.status)),
    reports: results.map((result) => ({
      fixture: result.report.fixtureId,
      app: result.report.app.slug,
      status: result.report.summary.status,
      json: result.written.json,
      markdown: result.written.markdown
    }))
  };

  const manifestPath = resolveFrom(configDir, config.manifest ?? path.join(reportDir, "manifest.json"));
  await writeArtifact(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (ciMode || config.ci?.summary) {
    const summaryPath = resolveFrom(configDir, config.ci?.summary ?? path.join(reportDir, "summary.md"));
    await writeArtifact(summaryPath, toCiSummary(manifest, results));
  }

  process.stdout.write(
    `NockApp Lab generated ${results.length} report(s): ${manifest.status}\nManifest: ${manifestPath}\n`
  );

  return results;
}

function readFlag(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function printHelp() {
  process.stdout.write(`Usage:
  nocklab <fixture.json> [--out report.json] [--markdown report.md] [--out-dir .nocklab] [--strict]
  nocklab run --config nocklab.config.json [--ci] [--strict]

Examples:
  npm run lab:sample
  npm run lab:bridge
  npm run lab:ci
  nocklab run --config nocklab.config.json --ci --strict
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
  const alertReports = (fixture.alertPolicies ?? []).map((policy) => evaluateAlert(policy, state));
  const failedSteps = stepReports.filter((step) => step.status === "fail").length;
  const failedInvariants = invariantReports.filter((invariant) => invariant.status === "fail").length;
  const criticalAlerts = alertReports.filter(
    (alert) => alert.state === "triggered" && alert.severity === "critical"
  ).length;
  const warningAlerts = alertReports.filter(
    (alert) => alert.state === "triggered" && alert.severity !== "critical"
  ).length;
  const status =
    failedSteps > 0 || failedInvariants > 0 || criticalAlerts > 0
      ? "fail"
      : warningAlerts > 0
        ? "warn"
        : "pass";

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
      alertsClear: alertReports.filter((alert) => alert.state === "clear").length,
      alertsTriggered: alertReports.filter((alert) => alert.state === "triggered").length,
      durationMs: Math.max(Date.now() - startedAt, stepReports.length * 17)
    },
    steps: stepReports,
    invariants: invariantReports,
    alerts: alertReports,
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
      applyStepMutation(step, state);
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
    applyStepMutation(step, state);
    const result = evaluateExpectation(step.expect, state);
    status = result.status;
    expectation = step.expect ? result.expectation : expectation;
    observed = step.expect ? result.observed : JSON.stringify(diffState(before, state));
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

function applyStepMutation(step, state) {
  for (const operation of normalizeOperations(step)) {
    applyOperation(operation, state);
  }
  mergeState(state, step.statePatch ?? {});
}

function normalizeOperations(step) {
  const operations = [];
  if (step.operation) {
    operations.push(step.operation);
  }
  if (Array.isArray(step.operations)) {
    operations.push(...step.operations);
  }
  return operations;
}

function applyOperation(operation, state) {
  if (operation.kind === "increment") {
    const current = Number(getPath(state, operation.path) ?? 0);
    setPath(state, operation.path, current + Number(operation.by));
    return;
  }

  if (operation.kind === "set") {
    setPath(state, operation.path, structuredClone(operation.value));
    return;
  }

  if (operation.kind === "transfer") {
    const from = Number(getPath(state, operation.fromPath) ?? 0);
    const to = Number(getPath(state, operation.toPath) ?? 0);
    const amount = Number(operation.amount);
    setPath(state, operation.fromPath, from - amount);
    setPath(state, operation.toPath, to + amount);
    return;
  }

  if (operation.kind === "append-event") {
    const current = getPath(state, operation.path);
    const next = Array.isArray(current) ? [...current, operation.value] : [operation.value];
    setPath(state, operation.path, next);
    return;
  }

  throw new Error(`Unsupported operation kind: ${operation.kind}`);
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

  if (invariant.kind === "state-equals" || invariant.kind === "timeline-state") {
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

function evaluateAlert(policy, state) {
  const actual = getPath(state, policy.condition.path);
  const triggered = deepEqual(actual, policy.condition.equals);

  return {
    id: policy.id,
    title: policy.title,
    severity: policy.severity,
    state: triggered ? "triggered" : "clear",
    observed: formatValue(actual),
    condition: `${policy.condition.path} == ${formatValue(policy.condition.equals)}`,
    message: triggered ? policy.message : policy.clearMessage
  };
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

function setPath(target, pathExpression, value) {
  const segments = String(pathExpression).split(".").filter(Boolean);
  let current = target;

  for (const segment of segments.slice(0, -1)) {
    if (!isPlainObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments.at(-1)] = value;
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

async function writeReportBundle(report, reportDir, overrideSlug) {
  const slug = overrideSlug ?? report.app.slug;
  const json = path.join(reportDir, `${slug}.report.json`);
  const markdown = path.join(reportDir, `${slug}.report.md`);

  await writeArtifact(json, `${JSON.stringify(report, null, 2)}\n`);
  await writeArtifact(markdown, toMarkdown(report));

  return { json, markdown };
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
    `- Alerts: ${report.summary.alertsClear} clear, ${report.summary.alertsTriggered} triggered`,
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
    "## Alerts",
    "",
    ...(report.alerts.length === 0
      ? ["- No alert policies configured."]
      : report.alerts.map(
          (alert) =>
            `- ${alert.state.toUpperCase()} ${alert.id}: ${alert.observed} (${alert.condition})`
        )),
    "",
    "## State Diffs",
    "",
    ...report.stateDiffs.map((diff) => `- ${diff.path}: ${diff.before} -> ${diff.after}`),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function toCiSummary(manifest, results) {
  const lines = [
    "# NockApp Lab CI Summary",
    "",
    `Status: ${manifest.status}`,
    "",
    "| Fixture | App | Status | Steps | Invariants | Alerts |",
    "| --- | --- | --- | --- | --- | --- |",
    ...results.map(({ report }) =>
      [
        report.fixtureId,
        report.app.slug,
        report.summary.status,
        `${report.summary.stepsPassed}/${report.steps.length}`,
        `${report.summary.invariantsPassed}/${report.invariants.length}`,
        `${report.summary.alertsTriggered} triggered`
      ].join(" | ")
    )
  ];

  return `${lines.join("\n")}\n`;
}

function summarizeStatuses(statuses) {
  if (statuses.includes("fail")) {
    return "fail";
  }
  if (statuses.includes("warn")) {
    return "warn";
  }
  return "pass";
}

function resolveFrom(basePath, targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(basePath, targetPath);
}
