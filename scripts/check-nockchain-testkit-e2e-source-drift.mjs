#!/usr/bin/env node

import { runSourceDriftCheck } from "./lib/source-drift-check.mjs";

runSourceDriftCheck({
  tracePath: "src/lib/nockchain-testkit-e2e-trace.ts",
  traceFactory: "createNockchainTestkitE2eTrace",
  userAgent: "nocksperimental-testkit-e2e-source-drift-check",
  interpretation:
    "Compares Nocksperimental's commit-pinned Nockchain testkit/E2E scenario source anchors against current upstream master, including source hashes, byte counts, and required symbols.",
  nextActions: [
    "Refresh src/lib/nockchain-testkit-e2e-trace.ts before using testkit/E2E scenario source anchors as current BYO-fakenet evidence.",
    "Review changed testkit/E2E files against the Rust source guide before updating scenario or generated-report receipts.",
    "Run the testkit/E2E source API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned testkit source metadata."
  ],
  impact: {
    defaultTargetSurfaces: ["nockchainTestkitE2eTrace"],
    sourceAuthorities: ["canonical-nockchain-testkit-rust"],
    reviewClassIds: ["rust-workspace", "testkit-e2e"],
    sourceRouteIds: [
      "nockchain-testkit-e2e-trace",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    verificationCommands: [
      "npm run test:nockchain-testkit-e2e-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  },
  textTitle: "Nockchain testkit/E2E source drift"
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
