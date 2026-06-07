#!/usr/bin/env node

import { runSourceDriftCheck } from "./lib/source-drift-check.mjs";

runSourceDriftCheck({
  tracePath: "src/lib/nockchain-mining-source-trace.ts",
  traceFactory: "createNockchainMiningSourceTrace",
  userAgent: "nocksperimental-mining-source-drift-check",
  interpretation:
    "Compares Nocksperimental's commit-pinned Nockchain mining and PoW source anchors against current upstream master, including source hashes, byte counts, and required mining symbols.",
  nextActions: [
    "Refresh src/lib/nockchain-mining-source-trace.ts before using mining or PoW source anchors as current fakenet or block-commitment evidence.",
    "Review changed mining, config, and PoW files against the Rust source guide before updating fakenet mining or diagnostics receipts.",
    "Run the mining source API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned mining source metadata."
  ],
  impact: {
    defaultTargetSurfaces: ["nockchainMiningSourceTrace"],
    sourceAuthorities: ["canonical-nockchain-mining-rust", "canonical-nockchain-miner-hoon"],
    reviewClassIds: ["rust-workspace", "libp2p-sync-mining"],
    sourceRouteIds: [
      "nockchain-mining-source-trace",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    verificationCommands: [
      "npm run test:nockchain-mining-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  },
  textTitle: "Nockchain mining source drift"
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
