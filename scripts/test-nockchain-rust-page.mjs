#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const pagePath = "src/app/nockchain/rust/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainRustAtlas", "Rust page uses Rust atlas");
  assertIncludes(page, "Nockchain Rust Atlas", "Rust page title");
  assertIncludes(page, "Rust workspace", "Rust page explains workspace");
  assertIncludes(page, "Workspace Coverage", "Rust page renders workspace coverage");
  assertIncludes(page, "Workspace Drift Check", "Rust page renders workspace drift check");
  assertIncludes(page, "npm run check:nockchain-cargo-workspace-drift -- --json", "Rust page renders workspace drift command");
  assertIncludes(
    page,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml",
    "Rust page renders raw Cargo source"
  );
  assertIncludes(page, "trackedWorkspaceMemberCount", "Rust page renders tracked workspace count");
  assertIncludes(page, "missingWorkspaceMembers", "Rust page renders missing workspace members");
  assertIncludes(page, "cargo check -p nockchain", "Rust page renders nockchain check");
  assertIncludes(page, "cargo check -p nockapp", "Rust page renders nockapp check");
  assertIncludes(page, "cargo check -p nockchain-wallet", "Rust page renders wallet check");
  assertIncludes(page, "nockchain-libp2p-io", "Rust page renders libp2p crate");
  assertIncludes(page, "nockchain-wallet", "Rust page renders wallet crate");
  assertIncludes(page, "wallet-tx-builder", "Rust page renders wallet tx builder crate");
  assertIncludes(page, "nockchain-bridge-sequencer", "Rust page renders bridge sequencer crate");
  assertIncludes(page, "bridge-dev", "Rust page renders bridge-dev crate");
  assertIncludes(page, "nockup", "Rust page renders nockup crate");
  assertIncludes(page, "#127 bridge: add end-to-end withdrawal execution", "Rust page renders merged bridge watch theme");
  assertIncludes(page, "PMA dynamic growth", "Rust page renders PMA watch theme");
  assertIncludes(page, "Use bridge-dev scenarios", "Rust page renders bridge-dev next use");
  assertIncludes(page, "Attach crate-level provenance", "Rust page renders next use");
  assertIncludes(page, 'href="/api/nockchain/rust-atlas"', "Rust page links Rust atlas API");
  assertIncludes(page, 'href="/nockchain"', "Rust page links parent Nockchain page");
  assertIncludes(nockchainPage, 'href="/nockchain/rust"', "Nockchain page links Rust page");
  assertIncludes(readme, "/nockchain/rust", "README documents Rust page");
  assertIncludes(readme, "bridge-dev", "README documents bridge-dev in Rust atlas");
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-rust-page",
    "full test suite includes Rust page test"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-rust-page"],
    "node scripts/test-nockchain-rust-page.mjs",
    "package Rust page test script"
  );
  assertIncludes(smokeScript, "/nockchain/rust", "Cloudflare smoke checks Rust page");
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)}, received ${JSON.stringify(expected)}`);
  }
}
