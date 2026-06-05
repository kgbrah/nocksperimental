#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import net from "node:net";
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
  const fixture = await loadFixture(fixturePath);
  const report = await buildReport(fixture, startedAt);

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
    const fixture = await loadFixture(fixturePath);
    const report = await buildReport(fixture, Date.now());
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

async function loadFixture(fixturePath) {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const fixtureDir = path.dirname(fixturePath);
  const packs = [];

  for (const packPath of fixture.invariantPacks ?? []) {
    const resolvedPackPath = resolveFrom(fixtureDir, packPath);
    const pack = JSON.parse(await readFile(resolvedPackPath, "utf8"));
    packs.push({
      id: pack.id,
      name: pack.name,
      domain: pack.domain,
      version: pack.version,
      path: packPath,
      invariants: pack.invariants ?? []
    });
  }

  return {
    ...fixture,
    invariantPackRefs: packs.map(({ id, name, domain, version, path }) => ({
      id,
      name,
      domain,
      version,
      path
    })),
    invariants: [
      ...packs.flatMap((pack) =>
        pack.invariants.map((invariant) => ({
          ...invariant,
          packId: pack.id
        }))
      ),
      ...(fixture.invariants ?? [])
    ]
  };
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

async function buildReport(fixture, startedAt) {
  assertFixture(fixture);

  const initialState = structuredClone(fixture.initialState);
  const state = structuredClone(initialState);
  const actors = new Set((fixture.actors ?? []).map((actor) => actor.name));
  const stateSnapshots = [
    snapshotState({ label: "Initial state", state })
  ];
  const stepReports = [];

  for (const [index, step] of fixture.steps.entries()) {
    const stepReport = await runStep({ step, index, state, actors, environment: fixture.environment });
    stepReports.push(stepReport);
    stateSnapshots.push(
      snapshotState({
        label: `After ${step.id}`,
        stepId: step.id,
        state
      })
    );
  }
  const invariantReports = fixture.invariants.map((invariant) =>
    evaluateInvariant({ invariant, state, steps: fixture.steps, actors })
  );
  const alertReports = (fixture.alertPolicies ?? []).map((policy) => evaluateAlert(policy, state));
  const adapterObservations = summarizeAdapterObservations(stepReports);
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
      snapshotsCaptured: stateSnapshots.length,
      durationMs: Math.max(Date.now() - startedAt, stepReports.length * 17)
    },
    invariantPacks: fixture.invariantPackRefs ?? [],
    steps: stepReports,
    invariants: invariantReports,
    alerts: alertReports,
    adapterObservations,
    stateSnapshots,
    stateDiffs: diffState(initialState, state),
    nextActions: [
      "Replace mock poke and peek execution with local fakenet adapter calls.",
      "Replace command-backed fakenet metadata probes with stable gRPC-native probes once node surfaces are available.",
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

async function runStep({ step, index, state, actors, environment }) {
  const before = structuredClone(state);
  const beforeHash = hashState(before);
  const durationMs = 19 + index * 7;
  let status = "pass";
  let observed = "";
  let expectation = step.expectation ?? "step completes";
  let adapter;

  if (step.type === "fakenet") {
    expectation = step.expectation ?? `gRPC endpoint configured at ${environment.grpcEndpoint}`;
    if (environment.mode === "local-fakenet") {
      expectation = step.expectation ?? `gRPC endpoint reachable at ${environment.grpcEndpoint}`;
      const probe = await probeGrpcEndpoint(environment.grpcEndpoint);
      const balance = probe.ok && environment.balanceCheck
        ? await probeNockBalance(environment.balanceCheck)
        : null;
      const chain = probe.ok && environment.chainCheck
        ? await probeChainMetadata(environment.chainCheck)
        : null;
      status = probe.ok ? "pass" : "fail";
      if (balance?.status === "fail") {
        status = "fail";
      }
      if (chain?.status === "fail") {
        status = "fail";
      }
      adapter = {
        kind: "local-fakenet",
        grpcEndpoint: environment.grpcEndpoint,
        reachable: probe.ok,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        ...(balance ? { balance } : {}),
        ...(chain ? { chain } : {}),
        ...(probe.error ? { error: probe.error } : {})
      };
      observed = describeLocalFakenetObservation({
        endpoint: environment.grpcEndpoint,
        probe,
        balance,
        chain
      });
    } else {
      observed = `${environment.mode} profile ready at ${environment.grpcEndpoint}`;
    }
  }

  if (step.type === "poke") {
    if (!step.actor || !actors.has(step.actor)) {
      status = "fail";
      observed = `actor '${step.actor ?? "missing"}' is not declared`;
    } else if (environment.mode === "local-fakenet" && step.adapter?.command) {
      const probe = await probeGrpcEndpoint(environment.grpcEndpoint);
      const poke = probe.ok ? await probeAdapterPoke(step.adapter) : null;
      status = probe.ok && poke?.status === "pass" ? "pass" : "fail";
      expectation = step.expectation ?? poke?.expectation ?? `adapter command exits 0 for ${step.target ?? step.id}`;
      adapter = {
        kind: "local-fakenet",
        grpcEndpoint: environment.grpcEndpoint,
        reachable: probe.ok,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        ...(poke ? { poke } : {}),
        ...(probe.error ? { error: probe.error } : {})
      };
      observed = describeLocalPokeObservation({
        endpoint: environment.grpcEndpoint,
        probe,
        poke
      });
    } else {
      applyStepMutation(step, state);
      const result = evaluateExpectation(step.expect, state);
      status = result.status;
      expectation = result.expectation;
      observed = result.observed;
    }
  }

  if (step.type === "peek") {
    if (environment.mode === "local-fakenet" && step.adapter?.command) {
      const probe = await probeGrpcEndpoint(environment.grpcEndpoint);
      const peek = probe.ok ? await probeAdapterPeek(step.adapter) : null;
      status = probe.ok && peek?.status === "pass" ? "pass" : "fail";
      expectation = step.expectation ?? peek?.expectation ?? `adapter command exits 0 for ${step.target ?? step.id}`;
      adapter = {
        kind: "local-fakenet",
        grpcEndpoint: environment.grpcEndpoint,
        reachable: probe.ok,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        ...(peek ? { peek } : {}),
        ...(probe.error ? { error: probe.error } : {})
      };
      observed = describeLocalPeekObservation({
        endpoint: environment.grpcEndpoint,
        probe,
        peek
      });
    } else {
      const result = evaluateExpectation(step.expect, state);
      status = result.status;
      expectation = result.expectation;
      observed = result.observed;
    }
  }

  if (step.type === "bridge" || step.type === "invariant") {
    applyStepMutation(step, state);
    const result = evaluateExpectation(step.expect, state);
    status = result.status;
    expectation = step.expect ? result.expectation : expectation;
    observed = step.expect ? result.observed : JSON.stringify(diffState(before, state));
  }

  const after = structuredClone(state);

  return {
    id: step.id,
    type: step.type,
    title: step.title,
    status,
    actor: step.actor,
    target: step.target,
    expectation,
    observed,
    adapter,
    beforeHash,
    afterHash: hashState(after),
    stateDiffs: diffState(before, after),
    durationMs
  };
}

function summarizeAdapterObservations(stepReports) {
  return stepReports.flatMap((step) => {
    const adapter = step.adapter;

    if (!adapter) {
      return [];
    }

    const base = {
      stepId: step.id,
      kind: adapter.kind
    };
    const observations = [];

    if (typeof adapter.reachable === "boolean") {
      observations.push({
        ...base,
        capability: "health",
        status: adapter.reachable ? "pass" : "fail",
        target: adapter.grpcEndpoint,
        summary: adapter.reachable
          ? `gRPC endpoint reachable at ${adapter.grpcEndpoint}`
          : `gRPC endpoint not reachable at ${adapter.grpcEndpoint}: ${adapter.error ?? "unknown error"}`,
        checkedAt: adapter.checkedAt
      });
    }

    if (adapter.balance) {
      observations.push({
        ...base,
        capability: "balance",
        status: adapter.balance.status,
        target: adapter.balance.address,
        summary:
          adapter.balance.status === "pass"
            ? `Balance ${adapter.balance.amount} ${adapter.balance.unit} for ${adapter.balance.address}`
            : `Balance check failed for ${adapter.balance.address}: ${adapter.balance.error ?? "unknown error"}`,
        checkedAt: adapter.balance.checkedAt
      });
    }

    if (adapter.chain) {
      observations.push({
        ...base,
        capability: "chain",
        status: adapter.chain.status,
        target: adapter.grpcEndpoint,
        summary:
          adapter.chain.status === "pass"
            ? `Chain ${formatChainMetadata(adapter.chain)}`
            : `Chain metadata check failed: ${adapter.chain.error ?? "unknown error"}`,
        checkedAt: adapter.chain.checkedAt
      });
    }

    if (adapter.poke) {
      observations.push({
        ...base,
        capability: "poke",
        status: adapter.poke.status,
        target: step.target,
        summary:
          adapter.poke.status === "pass"
            ? singleLine(adapter.poke.raw)
            : `Poke command failed: ${adapter.poke.error ?? "unknown error"}`,
        checkedAt: adapter.poke.checkedAt
      });
    }

    if (adapter.peek) {
      observations.push({
        ...base,
        capability: "peek",
        status: adapter.peek.status,
        target: step.target,
        summary:
          adapter.peek.status === "pass"
            ? singleLine(adapter.peek.raw)
            : `Peek command failed: ${adapter.peek.error ?? "unknown error"}`,
        checkedAt: adapter.peek.checkedAt
      });
    }

    return observations;
  });
}

async function probeAdapterPoke(adapterConfig) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(adapterConfig.command, "step.adapter.command");
  } catch (error) {
    return {
      status: "fail",
      raw: "",
      checkedAt,
      expectation: "adapter command is configured",
      error: error.message
    };
  }

  const result = await runCommand(command);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  const expectation = describeCommandExpectation(adapterConfig.expect);

  if (result.error) {
    return {
      status: "fail",
      raw,
      checkedAt,
      expectation,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      raw,
      checkedAt,
      exitCode: result.code,
      expectation,
      error: `Poke command exited ${result.code}`
    };
  }

  const expectationResult = evaluateCommandExpectation(adapterConfig.expect, raw);

  if (!expectationResult.ok) {
    return {
      status: "fail",
      raw,
      checkedAt,
      exitCode: result.code,
      expectation,
      error: expectationResult.error
    };
  }

  return {
    status: "pass",
    raw,
    checkedAt,
    exitCode: result.code,
    expectation
  };
}

async function probeAdapterPeek(adapterConfig) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(adapterConfig.command, "step.adapter.command");
  } catch (error) {
    return {
      status: "fail",
      raw: "",
      checkedAt,
      expectation: "adapter command is configured",
      error: error.message
    };
  }

  const result = await runCommand(command);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  const expectation = describeCommandExpectation(adapterConfig.expect);

  if (result.error) {
    return {
      status: "fail",
      raw,
      checkedAt,
      expectation,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      raw,
      checkedAt,
      exitCode: result.code,
      expectation,
      error: `Peek command exited ${result.code}`
    };
  }

  const expectationResult = evaluateCommandExpectation(adapterConfig.expect, raw);

  if (!expectationResult.ok) {
    return {
      status: "fail",
      raw,
      checkedAt,
      exitCode: result.code,
      expectation,
      error: expectationResult.error
    };
  }

  return {
    status: "pass",
    raw,
    checkedAt,
    exitCode: result.code,
    expectation
  };
}

async function probeChainMetadata(chainCheck) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(chainCheck.command, "chainCheck.command");
  } catch (error) {
    return {
      status: "fail",
      raw: "",
      checkedAt,
      error: error.message
    };
  }

  const result = await runCommand(command);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.error) {
    return {
      status: "fail",
      raw,
      checkedAt,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      raw,
      checkedAt,
      error: `Chain metadata command exited ${result.code}`
    };
  }

  const metadata = parseChainMetadata(raw);

  if (!metadata) {
    return {
      status: "fail",
      raw,
      checkedAt,
      error: "Could not parse chain metadata from command output"
    };
  }

  return {
    status: "pass",
    ...metadata,
    raw,
    checkedAt
  };
}

async function probeNockBalance(balanceCheck) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(balanceCheck.command, "balanceCheck.command");
  } catch (error) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw: "",
      checkedAt,
      error: error.message
    };
  }

  const result = await runCommand(command);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.error) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw,
      checkedAt,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw,
      checkedAt,
      error: `Balance command exited ${result.code}`
    };
  }

  const amount = parseNockBalance(raw);

  if (amount === null) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw,
      checkedAt,
      error: "Could not parse NOCK balance from command output"
    };
  }

  return {
    status: "pass",
    address: String(balanceCheck.address ?? ""),
    amount,
    unit: "NOCK",
    raw,
    checkedAt
  };
}

function describeLocalFakenetObservation({ endpoint, probe, balance, chain }) {
  if (!probe.ok) {
    return `local-fakenet gRPC endpoint not reachable at ${endpoint}: ${probe.error}`;
  }

  const parts = [`local-fakenet gRPC endpoint reachable at ${endpoint}`];

  if (balance?.status === "pass") {
    parts.push(`balance ${balance.amount} ${balance.unit} for ${balance.address}`);
  } else if (balance?.status === "fail") {
    parts.push(`balance peek failed for ${balance.address}: ${balance.error}`);
  }

  if (chain?.status === "pass") {
    parts.push(`chain ${formatChainMetadata(chain)}`);
  } else if (chain?.status === "fail") {
    parts.push(`chain metadata peek failed: ${chain.error}`);
  }

  return parts.join("; ");
}

function describeLocalPokeObservation({ endpoint, probe, poke }) {
  if (!probe.ok) {
    return `local-fakenet gRPC endpoint not reachable at ${endpoint}: ${probe.error}`;
  }

  if (poke?.status === "pass") {
    return `local-fakenet adapter poke succeeded at ${endpoint}: ${poke.raw}`;
  }

  return `local-fakenet adapter poke command failed at ${endpoint}: ${poke?.error ?? "unknown error"}`;
}

function describeLocalPeekObservation({ endpoint, probe, peek }) {
  if (!probe.ok) {
    return `local-fakenet gRPC endpoint not reachable at ${endpoint}: ${probe.error}`;
  }

  if (peek?.status === "pass") {
    return `local-fakenet adapter peek succeeded at ${endpoint}: ${peek.raw}`;
  }

  return `local-fakenet adapter peek command failed at ${endpoint}: ${peek?.error ?? "unknown error"}`;
}

async function probeGrpcEndpoint(endpoint) {
  let target;
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    target = parseGrpcEndpoint(endpoint);
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      latencyMs: Date.now() - startedAt,
      checkedAt
    };
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: target.host,
      port: target.port
    });
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve({
        ...result,
        latencyMs: Date.now() - startedAt,
        checkedAt
      });
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => finish({ ok: true }));
    socket.once("timeout", () => finish({ ok: false, error: "connection timed out" }));
    socket.once("error", (error) => finish({ ok: false, error: error.code ?? error.message }));
  });
}

function describeCommandExpectation(expect) {
  if (expect?.stdoutIncludes !== undefined) {
    return `stdout includes ${JSON.stringify(String(expect.stdoutIncludes))}`;
  }

  return "adapter command exits 0";
}

function evaluateCommandExpectation(expect, raw) {
  if (expect?.stdoutIncludes !== undefined) {
    const expected = String(expect.stdoutIncludes);
    return raw.includes(expected)
      ? { ok: true }
      : { ok: false, error: `Expected stdout to include ${JSON.stringify(expected)}` };
  }

  return { ok: true };
}

function normalizeCommand(command, label = "command") {
  if (!command?.program) {
    throw new Error(`${label}.program is required`);
  }

  return {
    program: String(command.program),
    args: Array.isArray(command.args) ? command.args.map(String) : []
  };
}

function runCommand(command, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    const child = spawn(command.program, command.args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr,
        ...result
      });
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish({ code: null, error: `Command timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => finish({ code: null, error: error.message }));
    child.once("close", (code) => finish({ code }));
  });
}

function parseChainMetadata(output) {
  const raw = String(output);
  const height = parseFirstInteger(raw, /\b(?:block\s+height|tip\s+height|height)\s*[:=]\s*([0-9][0-9,]*)/i);
  const peerCount = parseFirstInteger(
    raw,
    /\b(?:connected\s+peers?|peer\s+count|peer_count|peers?)\s*[:=]\s*([0-9][0-9,]*)/i
  );
  const blockId = raw.match(/\b(?:block\s+id|block_id|tip\s+block)\s*[:=]\s*([^\s,;]+)/i);
  const commitment = raw.match(/\b(?:block\s+commitment|tip\s+commitment|commitment)\s*[:=]\s*([^\s,;]+)/i);
  const metadata = {};

  if (height !== null) {
    metadata.height = height;
  }
  if (peerCount !== null) {
    metadata.peerCount = peerCount;
  }
  if (blockId?.[1]) {
    metadata.blockId = blockId[1];
  }
  if (commitment?.[1]) {
    metadata.blockCommitment = commitment[1];
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function parseFirstInteger(raw, pattern) {
  const match = raw.match(pattern);
  return match?.[1] ? Number(match[1].replaceAll(",", "")) : null;
}

function formatChainMetadata(chain) {
  const parts = [];

  if (typeof chain.height === "number") {
    parts.push(`height ${chain.height}`);
  }
  if (typeof chain.peerCount === "number") {
    parts.push(`${chain.peerCount} peer${chain.peerCount === 1 ? "" : "s"}`);
  }
  if (chain.blockId) {
    parts.push(`block ${chain.blockId}`);
  }
  if (chain.blockCommitment) {
    parts.push(`commitment ${chain.blockCommitment}`);
  }

  return parts.join(", ");
}

function parseNockBalance(output) {
  const matches = [...String(output).matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s+NOCK\b/gi)];
  const amount = matches.at(-1)?.[1];

  if (!amount) {
    return null;
  }

  return Number(amount.replaceAll(",", ""));
}

function parseGrpcEndpoint(endpoint) {
  const rawEndpoint = String(endpoint ?? "").trim();

  if (!rawEndpoint) {
    throw new Error("missing grpcEndpoint");
  }

  const parsed = new URL(rawEndpoint.includes("://") ? rawEndpoint : `tcp://${rawEndpoint}`);
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));

  if (!parsed.hostname || !Number.isInteger(port) || port <= 0) {
    throw new Error(`invalid grpcEndpoint '${rawEndpoint}'`);
  }

  return {
    host: parsed.hostname,
    port
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

  if (invariant.kind === "authorized-actor") {
    const allowedActors = new Set(invariant.actors ?? []);
    const scopedSteps = steps.filter((step) => step.type === (invariant.stepType ?? "poke"));
    const unauthorized = scopedSteps.filter((step) => step.actor && !allowedActors.has(step.actor));

    return invariantResult(
      invariant,
      unauthorized.length === 0,
      unauthorized.length === 0
        ? `${scopedSteps.length}/${scopedSteps.length} ${invariant.stepType ?? "poke"} actors authorized`
        : unauthorized.map((step) => step.actor).join(", "),
      `actors in [${[...allowedActors].join(", ")}]`
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

function snapshotState({ label, stepId, state }) {
  const snapshot = {
    label,
    stateHash: hashState(state),
    state: structuredClone(state)
  };

  if (stepId) {
    snapshot.stepId = stepId;
  }

  return snapshot;
}

function hashState(state) {
  return createHash("sha256").update(stableStringify(state)).digest("hex").slice(0, 16);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
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
  if (value === undefined) {
    return "undefined";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function singleLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
    `- Snapshots: ${report.summary.snapshotsCaptured}`,
    "",
    "## Steps",
    "",
    ...report.steps.map(
      (step) =>
        `- ${step.status.toUpperCase()} ${step.id}: ${step.observed} (${step.expectation}); ${step.beforeHash} -> ${step.afterHash}`
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
    "## Adapter Observations",
    "",
    ...(report.adapterObservations.length === 0
      ? ["- No adapter observations captured."]
      : report.adapterObservations.map(
          (observation) =>
            `- ${observation.status.toUpperCase()} ${observation.stepId} ${observation.capability}: ${observation.summary}`
        )),
    "",
    "## State Diffs",
    "",
    ...report.stateDiffs.map((diff) => `- ${diff.path}: ${diff.before} -> ${diff.after}`),
    "",
    "## Snapshot Timeline",
    "",
    ...report.stateSnapshots.map((snapshot) => `- ${snapshot.label}: ${snapshot.stateHash}`),
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
    "| Fixture | App | Status | Steps | Invariants | Alerts | Snapshots |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...results.map(({ report }) =>
      `| ${[
        report.fixtureId,
        report.app.slug,
        report.summary.status,
        `${report.summary.stepsPassed}/${report.steps.length}`,
        `${report.summary.invariantsPassed}/${report.invariants.length}`,
        `${report.summary.alertsTriggered} triggered`,
        report.summary.snapshotsCaptured
      ].join(" | ")} |`
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
