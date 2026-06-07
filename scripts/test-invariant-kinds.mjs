#!/usr/bin/env node

// Positive + negative evaluator coverage for the expressive invariant kinds
// (numeric-range, array-length-min/max, temporal-ordering, custom-function) and a
// regression for the setPath array-mutation fix. One fixture drives a non-strict
// run-lab pass; we read each invariant's status from the emitted report. Without
// --strict the report is written and the process exits 0 even when invariants fail,
// so both pass and fail cases are observable in a single run.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

main();

function main() {
  const fixture = {
    id: "invariant-kinds-test-v0",
    app: {
      name: "Invariant Kinds Test",
      slug: "invariant-kinds-test",
      version: "0.0.1",
      kernel: "test-kernel"
    },
    environment: {
      mode: "mock-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      fakenetCommand: "fakenock --start",
      notes: []
    },
    actors: [{ name: "op", pkh: "PKHOP" }],
    initialState: {
      rate: 3,
      trades: [{ type: "bid" }, { type: "ask" }],
      events: [{ type: "locked" }, { type: "settled" }],
      alerts: [],
      ledger: { balances: { a: 10, b: 0 } },
      negLedger: { balances: { a: -1 } },
      arr: [{ field: 0 }]
    },
    steps: [
      { id: "boot", type: "fakenet", title: "Boot" },
      {
        id: "mutate",
        type: "poke",
        title: "Set a nested element through an array index",
        actor: "op",
        // Exercises the setPath array-mutation fix: arr must stay an array.
        operation: { kind: "set", path: "arr.0.field", value: 42 }
      }
    ],
    invariants: [
      inv("range-pass", "numeric-range", { path: "rate", min: 0, max: 5 }),
      inv("range-fail", "numeric-range", { path: "rate", min: 0, max: 1 }),
      inv("lenmin-pass", "array-length-min", { path: "trades", min: 2 }),
      inv("lenmin-fail", "array-length-min", { path: "trades", min: 3 }),
      inv("lenmax-pass", "array-length-max", { path: "alerts", max: 0 }),
      inv("lenmax-fail", "array-length-max", { path: "trades", max: 1 }),
      inv("order-pass", "temporal-ordering", {
        path: "events",
        field: "type",
        before: "locked",
        after: "settled"
      }),
      inv("order-fail", "temporal-ordering", {
        path: "events",
        field: "type",
        before: "settled",
        after: "locked"
      }),
      inv("custom-pass", "custom-function", { fn: "balances-non-negative", path: "ledger.balances" }),
      inv("custom-fail", "custom-function", { fn: "balances-non-negative", path: "negLedger.balances" }),
      // setPath regression: arr survives as an array AND the indexed write landed.
      inv("setpath-arr-survives", "array-length-min", { path: "arr", min: 1 }),
      inv("setpath-value", "state-equals", { path: "arr.0.field", equals: 42 })
    ]
  };

  const report = runFixture(fixture);
  const status = Object.fromEntries(report.invariants.map((entry) => [entry.id, entry.status]));

  const expected = {
    "range-pass": "pass",
    "range-fail": "fail",
    "lenmin-pass": "pass",
    "lenmin-fail": "fail",
    "lenmax-pass": "pass",
    "lenmax-fail": "fail",
    "order-pass": "pass",
    "order-fail": "fail",
    "custom-pass": "pass",
    "custom-fail": "fail",
    "setpath-arr-survives": "pass",
    "setpath-value": "pass"
  };

  for (const [id, want] of Object.entries(expected)) {
    assertEqual(status[id], want, `invariant ${id} status`);
  }

  // Defense in depth: the final snapshot's arr must be a real array (not {"0":...}).
  const finalSnapshot = report.stateSnapshots?.at(-1);
  const finalArr = finalSnapshot?.state?.arr;
  assertEqual(Array.isArray(finalArr), true, "final state.arr is an array (setPath preserved it)");
  assertEqual(finalArr?.length, 1, "final state.arr has one element");
  assertEqual(finalArr?.[0]?.field, 42, "final state.arr[0].field was set through the index");

  console.log("test-invariant-kinds: OK");
}

function inv(id, kind, fields) {
  return { id, title: id, severity: "low", kind, ...fields };
}

function runFixture(fixture) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-invariant-kinds-"));
  try {
    const fixturePath = path.join(tempDir, "case.lab.json");
    const outPath = path.join(tempDir, "report.json");
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
    const result = spawnSync(
      process.execPath,
      ["scripts/run-lab.mjs", fixturePath, "--out", outPath],
      { encoding: "utf8", cwd: process.cwd() }
    );
    // Non-strict: the report is written even when invariants fail; a non-zero exit
    // here means a LOAD error (which should not happen for a valid fixture).
    if (result.status !== 0) {
      throw new Error(`run-lab exited ${result.status}: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(readFileSync(outPath, "utf8"));
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
