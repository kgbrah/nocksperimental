#!/usr/bin/env node

import { runSourceDriftCheck } from "./lib/source-drift-check.mjs";

runSourceDriftCheck({
  tracePath: "src/lib/nockchain-api-source-trace.ts",
  traceFactory: "createNockchainApiSourceTrace",
  userAgent: "nocksperimental-api-source-drift-check",
  interpretation:
    "Compares Nocksperimental's commit-pinned Nockchain Nockchain public API and gRPC source anchors against current upstream master, including source hashes, byte counts, and required durability symbols.",
  nextActions: [
    "Refresh src/lib/nockchain-api-source-trace.ts before using PMA, snapshot, or event-log source anchors as current state-jam or bootstrap evidence.",
    "Review changed Nockchain public API and gRPC files against the Rust source guide before updating state-jam, fakenet, or Launch Evidence receipts.",
    "Run the PMA source API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned PMA source metadata."
  ],
  impact: {
    defaultTargetSurfaces: ["nockchainApiSourceTrace"],
    sourceAuthorities: ["canonical-nockchain-api-rust", "canonical-nockchain-grpc-rust"],
    reviewClassIds: ["rust-workspace"],
    sourceRouteIds: [
      "nockchain-api-source-trace",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    verificationCommands: [
      "npm run test:nockchain-api-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  },
  textTitle: "Nockchain API source drift"
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
