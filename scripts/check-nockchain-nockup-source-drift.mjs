#!/usr/bin/env node

import { runSourceDriftCheck } from "./lib/source-drift-check.mjs";

runSourceDriftCheck({
  tracePath: "src/lib/nockchain-nockup-source-trace.ts",
  traceFactory: "createNockchainNockupSourceTrace",
  userAgent: "nocksperimental-nockup-source-drift-check",
  interpretation:
    "Compares Nocksperimental's commit-pinned Nockup scaffold, manifest, and templating source anchors against current upstream master, including source hashes, byte counts, and required symbols.",
  nextActions: [
    "Refresh src/lib/nockchain-nockup-source-trace.ts before using Nockup scaffold, template, or dependency source anchors as current validation evidence.",
    "Review changed Nockup files against the Rust source guide before updating Nockup validation or generated-report receipts.",
    "Run the Nockup source API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned Nockup source metadata."
  ],
  impact: {
    defaultTargetSurfaces: ["nockchainNockupSourceTrace"],
    sourceAuthorities: ["canonical-nockchain-nockup-rust"],
    reviewClassIds: ["rust-workspace", "nockup-scaffold"],
    sourceRouteIds: [
      "nockchain-nockup-source-trace",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    verificationCommands: [
      "npm run test:nockchain-nockup-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  },
  textTitle: "Nockchain Nockup source drift"
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
