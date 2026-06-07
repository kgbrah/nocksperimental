#!/usr/bin/env node

import { runSourceDriftCheck } from "./lib/source-drift-check.mjs";

runSourceDriftCheck({
  tracePath: "src/lib/nockchain-runtime-safety.ts",
  traceFactory: "createNockchainRuntimeSafetyTrace",
  userAgent: "nocksperimental-runtime-safety-source-drift-check",
  interpretation:
    "Compares Nocksperimental's commit-pinned Nockchain NockVM runtime-safety source anchors against current upstream master, including source hashes, byte counts, and required durability symbols.",
  nextActions: [
    "Refresh src/lib/nockchain-runtime-safety.ts before using PMA, snapshot, or event-log source anchors as current state-jam or bootstrap evidence.",
    "Review changed NockVM runtime-safety files against the Rust source guide before updating state-jam, fakenet, or Launch Evidence receipts.",
    "Run the PMA source API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned PMA source metadata."
  ],
  impact: {
    defaultTargetSurfaces: ["nockchainRuntimeSafety"],
    sourceAuthorities: ["canonical-nockchain-runtime-rust", "canonical-nockchain-nockvm-rust"],
    reviewClassIds: ["rust-workspace"],
    sourceRouteIds: [
      "nockchain-runtime-safety",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    verificationCommands: [
      "npm run test:nockchain-runtime-safety-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  },
  textTitle: "Nockchain runtime-safety source drift"
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
