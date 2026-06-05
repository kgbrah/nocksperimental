#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const commands = [
  ["npm", ["run", "test:launch-evidence-api"]],
  ["npm", ["run", "test:launch-evidence-pages"]],
  ["npm", ["run", "test:registry-manifest"]],
  ["npm", ["run", "test:well-known-manifest"]],
  ["npm", ["run", "test:openapi-spec"]],
  ["npm", ["run", "test:verification-index-api"]]
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
