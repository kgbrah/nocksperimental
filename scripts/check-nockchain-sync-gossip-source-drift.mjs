#!/usr/bin/env node

import { runSourceDriftCheck } from "./lib/source-drift-check.mjs";

runSourceDriftCheck({
  tracePath: "src/lib/nockchain-sync-gossip-trace.ts",
  traceFactory: "createNockchainSyncGossipTrace",
  userAgent: "nocksperimental-sync-gossip-source-drift-check",
  interpretation:
    "Compares Nocksperimental's commit-pinned libp2p sync/gossip source anchors (catch-up signal, gossip suppression gate, suppression metric) against current upstream master, including source hashes, byte counts, and required symbols.",
  nextActions: [
    "Refresh src/lib/nockchain-sync-gossip-trace.ts before using catch-up / gossip-suppression source anchors as current behind-tip or no-peers evidence.",
    "Review changed libp2p sync/gossip files against the Rust source guide before updating fakenet mining or sync diagnostics receipts.",
    "Run the sync/gossip API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned sync/gossip source metadata."
  ],
  impact: {
    defaultTargetSurfaces: ["nockchainSyncGossipTrace"],
    sourceAuthorities: ["canonical-nockchain-libp2p-rust"],
    reviewClassIds: ["rust-workspace", "libp2p-sync-mining"],
    sourceRouteIds: [
      "nockchain-sync-gossip-trace",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    verificationCommands: [
      "npm run test:nockchain-sync-gossip-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  },
  textTitle: "Nockchain sync/gossip source drift"
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
