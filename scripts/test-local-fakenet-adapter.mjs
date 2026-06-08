#!/usr/bin/env node

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const runnerPath = path.join(repoRoot, "scripts", "run-lab.mjs");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await testLocalFakenetPassesWhenEndpointIsReachable();
  await testLocalFakenetFailsWhenEndpointIsUnavailable();
  await testLocalFakenetCapturesConfiguredBalance();
  await testLocalFakenetFailsWhenConfiguredBalanceCannotBeParsed();
  await testLocalFakenetCapturesConfiguredChainMetadata();
  await testLocalFakenetFailsWhenConfiguredChainMetadataCannotBeParsed();
  await testLocalFakenetPeekUsesConfiguredCommand();
  await testLocalFakenetPeekFailsWhenConfiguredCommandOutputDoesNotMatch();
  await testLocalFakenetPokeUsesConfiguredCommand();
  await testLocalFakenetPokeFailsWhenConfiguredCommandOutputDoesNotMatch();
}

async function testLocalFakenetPassesWhenEndpointIsReachable() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const report = await runFixture({
      id: "local-fakenet-reachable",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server"
      }
    });

    assertEqual(report.summary.status, "pass", "reachable local fakenet report status");
    assertEqual(report.steps[0].status, "pass", "reachable local fakenet step status");
    assertIncludes(report.steps[0].observed, "reachable", "reachable observed message");
    assertEqual(report.steps[0].adapter.kind, "local-fakenet", "reachable adapter kind");
    assertEqual(report.steps[0].adapter.grpcEndpoint, `127.0.0.1:${port}`, "reachable adapter endpoint");
    assertEqual(report.steps[0].adapter.reachable, true, "reachable adapter result");
    assertNumber(report.steps[0].adapter.latencyMs, "reachable adapter latency");
    assertIsoDate(report.steps[0].adapter.checkedAt, "reachable adapter checkedAt");
    const observation = findAdapterObservation(report, "health");
    assertEqual(observation.stepId, "boot-local-fakenet", "reachable observation step");
    assertEqual(observation.kind, "local-fakenet", "reachable observation kind");
    assertEqual(observation.status, "pass", "reachable observation status");
    assertIncludes(observation.summary, `127.0.0.1:${port}`, "reachable observation summary");
    assertIsoDate(observation.checkedAt, "reachable observation checkedAt");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetFailsWhenEndpointIsUnavailable() {
  const port = await findUnusedPort();
  const report = await runFixture({
    id: "local-fakenet-unreachable",
    environment: {
      mode: "local-fakenet",
      grpcEndpoint: `127.0.0.1:${port}`,
      fakenetCommand: "missing server"
    }
  });

  assertEqual(report.summary.status, "fail", "unreachable local fakenet report status");
  assertEqual(report.steps[0].status, "fail", "unreachable local fakenet step status");
  assertIncludes(report.steps[0].observed, "not reachable", "unreachable observed message");
  assertEqual(report.steps[0].adapter.kind, "local-fakenet", "unreachable adapter kind");
  assertEqual(report.steps[0].adapter.grpcEndpoint, `127.0.0.1:${port}`, "unreachable adapter endpoint");
  assertEqual(report.steps[0].adapter.reachable, false, "unreachable adapter result");
  assertIncludes(report.steps[0].adapter.error, "ECONNREFUSED", "unreachable adapter error");
}

async function testLocalFakenetCapturesConfiguredBalance() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const balanceCommand = await createBalanceCommand("Balance: 7,012,352 NOCK\n");
    const address = "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx";
    const report = await runFixture({
      id: "local-fakenet-balance",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server",
        balanceCheck: {
          address,
          command: balanceCommand
        }
      }
    });

    assertEqual(report.summary.status, "pass", "balance local fakenet report status");
    assertEqual(report.steps[0].status, "pass", "balance local fakenet step status");
    assertIncludes(report.steps[0].observed, "balance 7012352 NOCK", "balance observed message");
    assertEqual(report.steps[0].adapter.balance.status, "pass", "balance adapter status");
    assertEqual(report.steps[0].adapter.balance.address, address, "balance adapter address");
    assertEqual(report.steps[0].adapter.balance.amount, 7012352, "balance adapter amount");
    assertEqual(report.steps[0].adapter.balance.unit, "NOCK", "balance adapter unit");
    assertIncludes(report.steps[0].adapter.balance.raw, "7,012,352 NOCK", "balance raw output");
    assertIsoDate(report.steps[0].adapter.balance.checkedAt, "balance adapter checkedAt");
    const observation = findAdapterObservation(report, "balance");
    assertEqual(observation.status, "pass", "balance observation status");
    assertIncludes(observation.summary, "7012352 NOCK", "balance observation summary");
    assertEqual(observation.target, address, "balance observation target");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetFailsWhenConfiguredBalanceCannotBeParsed() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const balanceCommand = await createBalanceCommand("wallet is reachable but no balance line yet\n");
    const report = await runFixture({
      id: "local-fakenet-balance-unparseable",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server",
        balanceCheck: {
          address: "test-address",
          command: balanceCommand
        }
      }
    });

    assertEqual(report.summary.status, "fail", "unparseable balance report status");
    assertEqual(report.steps[0].status, "fail", "unparseable balance step status");
    assertIncludes(report.steps[0].observed, "balance peek failed", "unparseable balance observed message");
    assertEqual(report.steps[0].adapter.balance.status, "fail", "unparseable balance adapter status");
    assertIncludes(report.steps[0].adapter.balance.error, "Could not parse NOCK balance", "unparseable balance error");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetCapturesConfiguredChainMetadata() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const chainCommand = await createCommand(
      [
        "height: 128",
        "connected peers: 3",
        "block id: block-001",
        "block commitment: 0xabc123def456"
      ].join("\n")
    );
    const report = await runFixture({
      id: "local-fakenet-chain",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server",
        chainCheck: {
          command: chainCommand
        }
      }
    });

    assertEqual(report.summary.status, "pass", "chain metadata report status");
    assertEqual(report.steps[0].status, "pass", "chain metadata step status");
    assertIncludes(report.steps[0].observed, "height 128", "chain metadata observed height");
    assertIncludes(report.steps[0].observed, "3 peer", "chain metadata observed peers");
    assertEqual(report.steps[0].adapter.chain.status, "pass", "chain adapter status");
    assertEqual(report.steps[0].adapter.chain.height, 128, "chain adapter height");
    assertEqual(report.steps[0].adapter.chain.peerCount, 3, "chain adapter peer count");
    assertEqual(report.steps[0].adapter.chain.blockId, "block-001", "chain adapter block id");
    assertEqual(
      report.steps[0].adapter.chain.blockCommitment,
      "0xabc123def456",
      "chain adapter block commitment"
    );
    assertIncludes(report.steps[0].adapter.chain.raw, "height: 128", "chain raw output");
    assertIsoDate(report.steps[0].adapter.chain.checkedAt, "chain adapter checkedAt");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetFailsWhenConfiguredChainMetadataCannotBeParsed() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const chainCommand = await createCommand("node responded, but no height, peers, or commitment yet\n");
    const report = await runFixture({
      id: "local-fakenet-chain-unparseable",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server",
        chainCheck: {
          command: chainCommand
        }
      }
    });

    assertEqual(report.summary.status, "fail", "unparseable chain report status");
    assertEqual(report.steps[0].status, "fail", "unparseable chain step status");
    assertIncludes(report.steps[0].observed, "chain metadata peek failed", "unparseable chain observed message");
    assertEqual(report.steps[0].adapter.chain.status, "fail", "unparseable chain adapter status");
    assertIncludes(
      report.steps[0].adapter.chain.error,
      "Could not parse chain metadata",
      "unparseable chain adapter error"
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetPeekUsesConfiguredCommand() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const peekCommand = await createCommand("counter: 42\n");
    const report = await runFixture({
      id: "local-fakenet-peek-command",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server"
      },
      steps: [
        {
          id: "peek-counter-live",
          type: "peek",
          title: "Peek counter through local adapter",
          target: "/counter",
          adapter: {
            command: peekCommand,
            expect: {
              stdoutIncludes: "counter: 42"
            }
          }
        }
      ]
    });

    assertEqual(report.summary.status, "pass", "local adapter peek report status");
    assertEqual(report.steps[0].status, "pass", "local adapter peek step status");
    assertIncludes(report.steps[0].observed, "counter: 42", "local adapter peek observed output");
    assertEqual(report.steps[0].adapter.kind, "local-fakenet", "local adapter peek kind");
    assertEqual(report.steps[0].adapter.peek.status, "pass", "local adapter peek status");
    assertIncludes(report.steps[0].adapter.peek.raw, "counter: 42", "local adapter peek raw output");
    assertIncludes(
      report.steps[0].adapter.peek.expectation,
      "stdout includes",
      "local adapter peek expectation"
    );
    assertIsoDate(report.steps[0].adapter.peek.checkedAt, "local adapter peek checkedAt");
    const observation = findAdapterObservation(report, "peek");
    assertEqual(observation.status, "pass", "local adapter peek observation status");
    assertIncludes(observation.summary, "counter: 42", "local adapter peek observation summary");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetPeekFailsWhenConfiguredCommandOutputDoesNotMatch() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const peekCommand = await createCommand("counter: 17\n");
    const report = await runFixture({
      id: "local-fakenet-peek-command-mismatch",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server"
      },
      steps: [
        {
          id: "peek-counter-live-mismatch",
          type: "peek",
          title: "Peek counter through local adapter",
          target: "/counter",
          adapter: {
            command: peekCommand,
            expect: {
              stdoutIncludes: "counter: 42"
            }
          }
        }
      ]
    });

    assertEqual(report.summary.status, "fail", "local adapter peek mismatch report status");
    assertEqual(report.steps[0].status, "fail", "local adapter peek mismatch step status");
    assertIncludes(report.steps[0].observed, "peek command failed", "local adapter peek mismatch observed");
    assertEqual(report.steps[0].adapter.peek.status, "fail", "local adapter peek mismatch status");
    assertIncludes(
      report.steps[0].adapter.peek.error,
      "stdout to include",
      "local adapter peek mismatch error"
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetPokeUsesConfiguredCommand() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const pokeCommand = await createCommand("poke accepted: counter incremented\n");
    const report = await runFixture({
      id: "local-fakenet-poke-command",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server"
      },
      actors: [
        {
          name: "alice",
          pkh: "test-pkh-alice"
        }
      ],
      steps: [
        {
          id: "poke-counter-live",
          type: "poke",
          title: "Poke counter through local adapter",
          actor: "alice",
          target: "/counter",
          adapter: {
            command: pokeCommand,
            expect: {
              stdoutIncludes: "poke accepted"
            }
          }
        }
      ]
    });

    assertEqual(report.summary.status, "pass", "local adapter poke report status");
    assertEqual(report.steps[0].status, "pass", "local adapter poke step status");
    assertIncludes(report.steps[0].observed, "poke accepted", "local adapter poke observed output");
    assertEqual(report.steps[0].adapter.kind, "local-fakenet", "local adapter poke kind");
    assertEqual(report.steps[0].adapter.poke.status, "pass", "local adapter poke status");
    assertIncludes(report.steps[0].adapter.poke.raw, "counter incremented", "local adapter poke raw output");
    assertIncludes(
      report.steps[0].adapter.poke.expectation,
      "stdout includes",
      "local adapter poke expectation"
    );
    assertIsoDate(report.steps[0].adapter.poke.checkedAt, "local adapter poke checkedAt");
    const observation = findAdapterObservation(report, "poke");
    assertEqual(observation.status, "pass", "local adapter poke observation status");
    assertIncludes(observation.summary, "poke accepted", "local adapter poke observation summary");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testLocalFakenetPokeFailsWhenConfiguredCommandOutputDoesNotMatch() {
  const server = net.createServer((socket) => socket.end());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    const pokeCommand = await createCommand("poke rejected: gate closed\n");
    const report = await runFixture({
      id: "local-fakenet-poke-command-mismatch",
      environment: {
        mode: "local-fakenet",
        grpcEndpoint: `127.0.0.1:${port}`,
        fakenetCommand: "test server"
      },
      actors: [
        {
          name: "alice",
          pkh: "test-pkh-alice"
        }
      ],
      steps: [
        {
          id: "poke-counter-live-mismatch",
          type: "poke",
          title: "Poke counter through local adapter",
          actor: "alice",
          target: "/counter",
          adapter: {
            command: pokeCommand,
            expect: {
              stdoutIncludes: "poke accepted"
            }
          }
        }
      ]
    });

    assertEqual(report.summary.status, "fail", "local adapter poke mismatch report status");
    assertEqual(report.steps[0].status, "fail", "local adapter poke mismatch step status");
    assertIncludes(report.steps[0].observed, "poke command failed", "local adapter poke mismatch observed");
    assertEqual(report.steps[0].adapter.poke.status, "fail", "local adapter poke mismatch status");
    assertIncludes(
      report.steps[0].adapter.poke.error,
      "stdout to include",
      "local adapter poke mismatch error"
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runFixture({ id, environment, actors, steps }) {
  const dir = await mkdtemp(path.join(tmpdir(), "nocklab-local-fakenet-"));
  const fixturePath = path.join(dir, `${id}.json`);
  const reportPath = path.join(dir, `${id}.report.json`);
  const fixtureSteps = steps ?? [
    {
      id: "boot-local-fakenet",
      type: "fakenet",
      title: "Probe local fakenet"
    }
  ];

  await writeFile(
    fixturePath,
    `${JSON.stringify(
      {
        id,
        app: {
          name: "Local Fakenet Probe",
          slug: id,
          version: "0.0.0",
          kernel: "probe"
        },
        environment,
        initialState: {
          probes: 0
        },
        ...(actors ? { actors } : {}),
        steps: fixtureSteps,
        invariants: []
      },
      null,
      2
    )}\n`
  );

  const result = await spawnNode([runnerPath, fixturePath, "--out", reportPath]);

  if (result.code !== 0) {
    throw new Error(`runner exited ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }

  return JSON.parse(await readFile(reportPath, "utf8"));
}

async function createBalanceCommand(stdout) {
  return createCommand(stdout);
}

async function createCommand(stdout) {
  const dir = await mkdtemp(path.join(tmpdir(), "nocklab-balance-command-"));
  const commandPath = path.join(dir, "command.mjs");
  await writeFile(commandPath, `process.stdout.write(${JSON.stringify(stdout)});\n`);

  return {
    program: process.execPath,
    args: [commandPath]
  };
}

async function findUnusedPort() {
  const server = net.createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function spawnNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertNumber(actual, label) {
  if (typeof actual !== "number" || Number.isNaN(actual)) {
    throw new Error(`${label}: expected a number, got ${JSON.stringify(actual)}`);
  }
}

function assertIsoDate(actual, label) {
  if (typeof actual !== "string" || Number.isNaN(Date.parse(actual))) {
    throw new Error(`${label}: expected an ISO date string, got ${JSON.stringify(actual)}`);
  }
}

function findAdapterObservation(report, capability) {
  const observation = report.adapterObservations?.find((entry) => entry.capability === capability);

  if (!observation) {
    throw new Error(`adapter observation: expected capability ${capability}`);
  }

  return observation;
}
