// AI-PoW (matmul Proof-of-Useful-Work) intelligence surface.
//
// MONITORING, NOT PROTOCOL AUTHORITY (see AGENTS.md). This mirrors what we have
// verified from nockchain/nockchain PR #124 ("AI Proof of Useful Work for matrix
// multiplication," Logan Allen / tacryt-socryp). The PR is OPEN, CONFLICTING
// (needs rebase), REVIEW_REQUIRED — NOT merged. Everything here is "preview":
// nothing is presented as a live Nockchain runtime claim, and no AI-PoW
// certificate is an "app works on Nockchain" attestation. Flip `status` to
// "merged" and promote the evidence classes only when #124 lands on master and
// we re-pin docs/research/nockchain-roadmap-baseline.json.
//
// Companion docs: docs/research/ai-pow-readiness-2026.md, docs/nockchain-watch.md
// (Front #2), src/lib/nockchain-pr-radar.ts (PR #124 live entry).

export type AiPowStatus = "preview-open-pr" | "merged";

export type AiPowLayer = {
  layer: 0 | 1 | 2;
  name: string;
  hash: string;
  friShape: string;
  role: string;
};

export type AiPowMeasurement = {
  metric: string;
  value: string;
  note: string;
};

export type AiPowCrate = {
  crate: string;
  role: string;
  keyFiles: string[];
};

export type AiPowReadinessItem = {
  id: string;
  title: string;
  surface: string;
  previewOnly: boolean;
  detail: string;
  dependsOnMerge: boolean;
};

export type AiPowEvidenceField = {
  field: string;
  meaning: string;
  source: string;
};

// A locally-reproduced compute-cost benchmark of the compact-certificate prove
// path. PREVIEW: measured in an isolated worktree against the UNMERGED PR #124
// branch, so it is attested compute cost, NOT a live Nockchain runtime claim and
// NOT a trust cert. Promote into the compute-benchmark/trust system only on merge.
export type AiPowProvingBenchmark = {
  preview: true;
  measuredAt: string;
  host: string;
  profile: string;
  branchHead: string;
  command: string;
  compactCertificateBytes: number;
  proveWallMs: number;
  l1OuterMs: number;
  l2ProveMs: number;
  compactVerifyMs: number;
  tamperCasesRejected: string[];
  prReportedCertBytes: number;
  prReportedProveWallMs: number;
};

export type AiPowIntelligence = {
  status: AiPowStatus;
  capturedAt: string;
  prNumber: number;
  prUrl: string;
  prTitle: string;
  author: string;
  branch: string;
  loc: { additions: number; deletions: number };
  mergeState: string;
  reviewState: string;
  summary: string;
  watchFront: string;
  realWatchSignal: string;
  crates: AiPowCrate[];
  certificate: {
    artifact: string;
    layers: AiPowLayer[];
    productionApi: string[];
    authoritativeDoc: string;
  };
  measurements: AiPowMeasurement[];
  consensusTieIn: string[];
  evidenceFields: AiPowEvidenceField[];
  forbiddenFields: string[];
  readiness: AiPowReadinessItem[];
  provingBenchmark: AiPowProvingBenchmark;
};

const PR_URL = "https://github.com/nockchain/nockchain/pull/124";

export function createNockchainAiPowIntelligence(): AiPowIntelligence {
  return {
    status: "preview-open-pr",
    capturedAt: "2026-06-10",
    prNumber: 124,
    prUrl: PR_URL,
    prTitle: "AI Proof of Useful Work for matrix multiplication",
    author: "tacryt-socryp",
    branch: "claude/ai-pow-integration-squash",
    loc: { additions: 135240, deletions: 2506 },
    mergeState: "CONFLICTING (needs rebase on master)",
    reviewState: "REVIEW_REQUIRED — not merged",
    summary:
      "Mining work becomes verifiable matrix multiplication that can subsidize AI inference/training, merge-mined alongside the existing zkPoW — an additional mineable track, not a replacement. The wire artifact is a compact recursive STARK certificate.",
    watchFront: "Front #2 — AI Compute Market (Fork A)",
    realWatchSignal:
      "PR #124 merging to master is the real flip. Until then this is preview-only; re-pin the roadmap baseline on merge.",
    crates: [
      {
        crate: "ai-pow-miner",
        role: "NockApp-compatible miner binary + 'pearl' ticket search; builds the recursive certificate after a target hit and submits the canonical %ai-pow command. The bare crate (no `node` feature) keeps the Pearl ticket loop buildable without the gRPC tree — for benchmarks and library use.",
        keyFiles: [
          "src/bin/ai_pow_mine.rs",
          "src/pearl_mining.rs",
          "src/pearl_plain_proof.rs",
          "src/certificate_noun.rs",
          "src/run.rs"
        ]
      },
      {
        crate: "ai-pow-zk",
        role: "Plonky3 proof stack for the compact final-layer batch-STARK certificate.",
        keyFiles: ["src/recursion.rs", "src/composite_proof.rs", "src/circuit.rs", "src/chips/matmul/", "src/chips/blake3/"]
      }
    ],
    certificate: {
      artifact: "jammed %ai-pow artifact carrying a compact recursive certificate + explicit verifier-key/setup digest",
      layers: [
        { layer: 0, name: "Useful-work AI-PoW batch STARK", hash: "Tip5 MMCS / transcript", friShape: "lb=4,nq=15,pow=0", role: "Proves the useful-work (matmul) statement." },
        { layer: 1, name: "Recursive verifier circuit", hash: "Tip5 MMCS / transcript", friShape: "lb=3,nq=20,cap=4,pow=0", role: "Recursively verifies Layer 0; exposes a statement digest as public values." },
        { layer: 2, name: "Final compact STARK", hash: "BLAKE3 MMCS / transcript", friShape: "lb=5,nq=12,lfp=2,mla=3,cap=4,pow=0", role: "Native BLAKE3 STARK over Layer 1; binds the L1 digest, then compacted to a verifier-key digest + compact proof body." }
      ],
      productionApi: [
        "ai-pow::zk_bridge::prove_pearl_merge_compact_recursive_certificate",
        "ai-pow::zk_bridge::prove_pearl_merge_compact_recursive_certificate_with_prover_cache",
        "ai-pow::zk_bridge::prove_ai_pow_compact_recursive_certificate",
        "ai-pow::zk_bridge::prove_ai_pow_compact_recursive_certificate_with_prover_cache"
      ],
      authoritativeDoc: "crates/ai-pow-zk/docs/2026-06-07_COMPACT_RECURSIVE_PRODUCTION_PIPELINE.md"
    },
    measurements: [
      { metric: "Full jammed %ai-pow artifact", value: "125,382 bytes", note: "PR-reported, release/native" },
      { metric: "Compact recursive certificate (inside artifact)", value: "124,570 bytes", note: "vs ~150 KB relaxed target" },
      { metric: "Crate-level compact certificate", value: "122,597 bytes", note: "crate-level measurement" },
      { metric: "Cold artifact build wall time", value: "31.837 s", note: "vs ~32 s target" },
      { metric: "Recursive proof wall (after chain-verified L0)", value: "22.006 s", note: "crate-level" },
      { metric: "Soundness", value: "60 FRI query bits", note: "no proof-system PoW grinding" }
    ],
    consensusTieIn: [
      "Completion of the next PoUW puzzle triggers the 80%/20% coinbase reversion to 100% miner (watch board consensus snapshot).",
      "Fork A is merge-mined matmul PoUW alongside zkPoW; difficulty check moves inside formula execution.",
      "Tip5 is the recursive/circuit-friendly hash; BLAKE3 is used only for the native final Layer-2 STARK."
    ],
    evidenceFields: [
      { field: "compactCertificateBytes", meaning: "Attested artifact size — a real, citable compute-cost signal.", source: "jammed %ai-pow artifact length" },
      { field: "certificateVerifierKeyDigest", meaning: "Binds the compact proof to its verifier-key/setup so a verifier can re-derive trust.", source: "compact recursive certificate header" },
      { field: "coldBuildSeconds", meaning: "Attested proof-build wall time — a proving-demand cost signal.", source: "miner timing of prove_*_compact_recursive_certificate" }
    ],
    forbiddenFields: ["privateSolverKey", "rawProverCache", "rawMatmulWitness"],
    readiness: [
      { id: "explainer", title: "AI-PoW explainer surface", surface: "/nockchain/ai-pow", previewOnly: true, detail: "This page. Monitoring framing of Fork A, the merge-mined model, the compact certificate, and the coinbase-reversion consequence.", dependsOnMerge: false },
      { id: "proving-demand-evidence", title: "Proving-demand evidence class", surface: "computeBenchmarkProfiles", previewOnly: true, detail: "A compute-benchmark profile citing certificate byte size + cold-build time + verifier-key digest as attested compute cost. Gated preview until merge; never ingests solver keys.", dependsOnMerge: true },
      { id: "x402-proof", title: "x402 pay-for-proof lane", surface: "x402MeteredTrustApi", previewOnly: true, detail: "A metered endpoint that sells verification of a submitted AI-PoW certificate — a concrete revenue lane. Design only until merge.", dependsOnMerge: true },
      { id: "perf-tests", title: "AI-PoW miner performance tests", surface: "nockchainRustAtlas / computeBenchmarkProfiles", previewOnly: true, detail: "Build ai-pow-miner (bare crate) and benchmark the compact-certificate prove path; capture artifacts as evidence. Bring-up runs against the unmerged branch in an isolated worktree.", dependsOnMerge: false }
    ],
    provingBenchmark: {
      preview: true,
      measuredAt: "2026-06-10",
      host: "16-core x86_64",
      profile: "TEST_PEARL (release)",
      branchHead: "d5fc82f4 (PR #124 head)",
      command:
        "cargo test -p ai-pow-zk --release --features recursion compact_batch_recursive_certificate_round_trip_for_test_pearl -- --ignored --nocapture",
      compactCertificateBytes: 122597,
      proveWallMs: 10465,
      l1OuterMs: 7167,
      l2ProveMs: 2572,
      compactVerifyMs: 18,
      tamperCasesRejected: ["wrong public inputs", "wrong verifier-key digest", "stale verifier context"],
      prReportedCertBytes: 122597,
      prReportedProveWallMs: 22006
    }
  };
}
