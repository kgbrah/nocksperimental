import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const upstreamFileBaseUrl =
  "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18";

function sourceUrl(file: string, start: number, end: number) {
  return `${upstreamFileBaseUrl}/${file}#L${start}-L${end}`;
}

const sourceAnchors = [
  {
    id: "nockstack-frame-bounds",
    file: "crates/nockvm/rust/nockvm/src/mem.rs",
    lineRange: "1338-1377",
    symbols: ["NockStack::is_in_frame"],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/mem.rs", 1338, 1377)],
    role:
      "Classifies whether a pointer belongs to the current NockStack frame before preserving or copying runtime structures.",
    evidence:
      "The check rejects null pointers, debug-asserts arena bounds, derives the pointer word offset, and compares it with the current and previous frame offsets.",
    receiptFields: ["stackFrameCheck", "runtimeSafetyIssue", "nockvmCommit"]
  },
  {
    id: "nockstack-frame-lifecycle",
    file: "crates/nockvm/rust/nockvm/src/mem.rs",
    lineRange: "1952-2032",
    symbols: ["NockStack::frame_push", "NockStack::frame_pop", "NockStack::with_frame"],
    sourceUrls: [
      sourceUrl("crates/nockvm/rust/nockvm/src/mem.rs", 1952, 1973),
      sourceUrl("crates/nockvm/rust/nockvm/src/mem.rs", 1983, 2032)
    ],
    role:
      "Pushes and pops frame metadata while preserving returned nouns into the previous frame.",
    evidence:
      "Frame push bounds-checks the requested words, saves previous frame/stack/alloc pointers, and frame_pop refuses null saved pointers before restoring offsets.",
    receiptFields: ["stackFrameCheck", "stackFrameLifecycle", "nockvmCommit"]
  },
  {
    id: "interpreter-stack-frame-preserve",
    file: "crates/nockvm/rust/nockvm/src/interpreter.rs",
    lineRange: "506-524",
    symbols: ["Context::with_stack_frame", "NockStack::frame_push", "NockStack::frame_pop"],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/interpreter.rs", 506, 524)],
    role:
      "Wraps jet work in a stack frame and preserves return value plus cache/cold/warm nouns before popping.",
    evidence:
      "The interpreter pushes a frame, runs the closure, preserves runtime state into the stack, then pops the frame.",
    receiptFields: ["stackFrameCheck", "jetFramePreserved", "runtimeSafetyIssue"]
  },
  {
    id: "cue-stack-deserialization",
    file: "crates/nockvm/rust/nockvm/src/serialization.rs",
    lineRange: "125-205",
    symbols: ["cue_bitslice_with_mode", "cue_bitslice", "cue", "CueStackEntry"],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/serialization.rs", 125, 205)],
    role:
      "Deserializes jam/cue data through an explicit stack of destination pointers and backreference entries.",
    evidence:
      "Cue uses stack.with_frame, a HAMT backreference map, next-bit tag dispatch, and deterministic failure when a backreference cannot resolve.",
    receiptFields: ["cueInputLength", "cueValidationError", "runtimeSafetyIssue"]
  },
  {
    id: "rub-backref-bounds",
    file: "crates/nockvm/rust/nockvm/src/serialization.rs",
    lineRange: "371-420",
    symbols: ["rub_atom_internal", "rub_backref", "get_size", "next_up_to_n_bits"],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/serialization.rs", 371, 420)],
    role:
      "Bounds the atom and backreference decoding path that malformed jam/cue payloads exercise.",
    evidence:
      "Atom decode uses get_size and bounded bit slices; backrefs over 64 bits return a nondeterministic failure instead of producing an unchecked offset.",
    receiptFields: ["cueInputLength", "cueValidationError", "jamBackrefCheck"]
  },
  {
    id: "jam-traversal-bounds",
    file: "crates/nockvm/rust/nockvm/src/serialization.rs",
    lineRange: "431-610",
    symbols: ["jam", "jam_atom", "jam_cell", "jam_backref", "mat", "double_atom_size"],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/serialization.rs", 431, 610)],
    role:
      "Serializes nouns with an iterative traversal, backreference map, and retry-on-growth atom buffer.",
    evidence:
      "Jam pushes nouns onto the NockStack instead of recursing, doubles output atoms when needed, and preserves the normalized result before popping the frame.",
    receiptFields: ["jamTraversalMode", "runtimeSafetyIssue", "nockvmCommit"]
  },
  {
    id: "noun-space-provenance",
    file: "crates/nockvm/rust/nockvm/src/noun.rs",
    lineRange: "56-390, 630-650",
    symbols: ["AllocLocation", "NounSpace", "NounSpace::with_brand", "BrandedNounHandle"],
    sourceUrls: [
      sourceUrl("crates/nockvm/rust/nockvm/src/noun.rs", 56, 120),
      sourceUrl("crates/nockvm/rust/nockvm/src/noun.rs", 183, 390),
      sourceUrl("crates/nockvm/rust/nockvm/src/noun.rs", 630, 650)
    ],
    role:
      "Separates stack, PMA pointer, and PMA offset nouns while giving handles a scope tied to a specific NounSpace.",
    evidence:
      "NounSpace records stack/PMA arenas, stack epoch snapshots, PMA bounds, and a branded handle API that prevents handles from escaping the intended scope.",
    receiptFields: ["nounSpaceEpoch", "nounAllocLocation", "runtimeSafetyIssue"]
  },
  {
    id: "hamt-fixed-depth-preserve",
    file: "crates/nockvm/rust/nockvm/src/hamt.rs",
    lineRange: "488-620, 1018-1048",
    symbols: ["Preserve for Hamt<T>", "Hamt<T>::preserve", "Hamsterator"],
    sourceUrls: [
      sourceUrl("crates/nockvm/rust/nockvm/src/hamt.rs", 488, 620),
      sourceUrl("crates/nockvm/rust/nockvm/src/hamt.rs", 1018, 1048)
    ],
    role:
      "Preserves HAMT structures with a fixed-depth traversal stack matching the bounded key layout.",
    evidence:
      "HAMT preserve copies in-frame stems/leaves into the previous frame and uses fixed arrays sized for maximum depth rather than unbounded recursion.",
    receiptFields: ["hamtTraversalDepth", "runtimeSafetyIssue", "nockvmCommit"]
  },
  {
    id: "pma-direct-reader-bounds",
    file: "crates/nockvm/rust/nockvm/src/pma/stream.rs",
    lineRange: "98-284",
    symbols: [
      "PmaDirectReader",
      "PmaDirectReader::read_u64",
      "PmaDirectReader::read_cell",
      "PmaDirectReader::indirect_atom_words"
    ],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/pma/stream.rs", 98, 284)],
    role:
      "Reads PMA words and noun structures directly from disk while enforcing alloc-word and indirect-atom bounds.",
    evidence:
      "read_u64 rejects offsets past alloc_words, read_cell rejects cells that would cross the limit, and indirect_atom_words rejects forwarding pointers, zero-length atoms, overflow, and end offsets past alloc_words.",
    receiptFields: ["pmaOffsetBoundsCheck", "pmaAllocWords", "runtimeSafetyIssue"]
  }
] as const;

const runtimeSafetyClasses = [
  {
    id: "stack-frame-pointer-outside-arena",
    label: "Stack frame pointer outside arena",
    sourceAnchorIds: [
      "nockstack-frame-bounds",
      "nockstack-frame-lifecycle",
      "interpreter-stack-frame-preserve"
    ],
    symptom: "Debug panic or support-bundle frame check while preserving NockVM data.",
    receiptFields: ["stackFrameCheck", "runtimeSafetyIssue", "nockvmCommit"],
    triage:
      "Capture the Nockchain build, stack-frame check status, and source anchor id before changing runbook memory or stack-size advice."
  },
  {
    id: "jam-cue-malformed-input",
    label: "Malformed jam/cue input",
    sourceAnchorIds: ["cue-stack-deserialization", "rub-backref-bounds"],
    symptom: "Cue returns deterministic or nondeterministic failure on malformed serialized noun data.",
    receiptFields: ["cueInputLength", "cueValidationError", "jamBackrefCheck"],
    triage:
      "Record size, validation error, and source anchor ids, but never attach raw jam bytes to public evidence."
  },
  {
    id: "p2p-jam-empty-buffer",
    label: "P2P jam/cue empty buffer",
    sourceAnchorIds: ["rub-backref-bounds", "cue-stack-deserialization"],
    symptom: "Peer or gossip decode path sees an empty or truncated jam/cue payload.",
    receiptFields: ["cueInputLength", "cueValidationError", "peerEvidenceTraceId"],
    triage:
      "Join the decode failure with route-table and peer-count context from sync/gossip before calling it a network failure."
  },
  {
    id: "height-bound-worker-panic",
    label: "Height-bound worker panic",
    sourceAnchorIds: ["jam-traversal-bounds", "hamt-fixed-depth-preserve"],
    symptom: "Worker panic risk after malformed or out-of-range runtime input reaches traversal or height-sensitive code.",
    receiptFields: ["runtimeSafetyIssue", "supportBundleTraceId", "nockchainBuild"],
    triage:
      "Pin source commit, input class, and local cargo gate so a support bundle can map the failure to the right upstream fix."
  },
  {
    id: "noun-space-stale-epoch",
    label: "NounSpace stale epoch",
    sourceAnchorIds: ["noun-space-provenance", "pma-direct-reader-bounds"],
    symptom: "Noun handles or PMA offsets are interpreted after a stack reset, flip, or artifact mismatch.",
    receiptFields: ["nounSpaceEpoch", "pmaOffsetBoundsCheck", "runtimeSafetyIssue"],
    triage:
      "Record noun location and epoch metadata while keeping stack memory, PMA slabs, and state jams out of public receipts."
  }
] as const;

const receiptContract = {
  requiredFields: [
    "nockvmCommit",
    "nockchainBuild",
    "runtimeSafetyIssue",
    "stackFrameCheck",
    "cueInputLength",
    "cueValidationError",
    "pmaOffsetBoundsCheck",
    "nounSpaceEpoch",
    "supportBundleTraceId"
  ],
  forbiddenFields: [
    "rawJamPayload",
    "rawPmaSlab",
    "rawCoreDump",
    "rawStackMemory",
    "rawEventLog",
    "walletSeedPhrase"
  ],
  reviewRules: [
    "Runtime safety receipts cite source anchors, issue class, build, and summarized validation results.",
    "Support bundles may include lengths, hashes, status labels, and trace ids, but not raw jam payloads, stack memory, PMA slabs, or event logs.",
    "Use Nockchain PR radar and upstream commit provenance before interpreting a panic as fixed or still actionable.",
    "Tie PMA offset checks to alloc_words and noun-space epoch context before trusting a state-jam or snapshot-derived receipt."
  ]
} as const;

const operatorTriage = [
  {
    id: "frame-check-panic",
    label: "Frame check panic",
    sourceAnchorIds: ["nockstack-frame-bounds", "nockstack-frame-lifecycle"],
    classIds: ["stack-frame-pointer-outside-arena"],
    checks: ["nockvmCommit", "stackFrameCheck", "runtimeSafetyIssue"],
    action: "Capture the build, source anchor id, and frame check result before changing stack-size or memory runbooks."
  },
  {
    id: "malformed-cue-payload",
    label: "Malformed cue payload",
    sourceAnchorIds: ["cue-stack-deserialization", "rub-backref-bounds"],
    classIds: ["jam-cue-malformed-input", "p2p-jam-empty-buffer"],
    checks: ["cueInputLength", "cueValidationError", "peerEvidenceTraceId"],
    action: "Record payload length and validation class; store only a hash or trace id for any operator-local raw input."
  },
  {
    id: "state-jam-pma-offset",
    label: "State-jam PMA offset",
    sourceAnchorIds: ["pma-direct-reader-bounds", "noun-space-provenance"],
    classIds: ["noun-space-stale-epoch"],
    checks: ["pmaOffsetBoundsCheck", "nounSpaceEpoch", "supportBundleTraceId"],
    action: "Treat PMA/state-jam evidence as metadata-only until offset bounds and producing build match."
  },
  {
    id: "traversal-worker-panic",
    label: "Traversal worker panic",
    sourceAnchorIds: ["jam-traversal-bounds", "hamt-fixed-depth-preserve"],
    classIds: ["height-bound-worker-panic"],
    checks: ["hamtTraversalDepth", "runtimeSafetyIssue", "nockchainBuild"],
    action: "Attach traversal class, source commit, and recommended cargo gate to the support bundle."
  }
] as const;

const localVerification = {
  status: "source-inspected",
  inspectedSourceCommit: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
  recommendedCommands: [
    "cargo check -p nockvm",
    "cargo test -p nockvm serialization::tests::test_cue_invalid_input",
    "cargo test -p nockvm serialization::tests::test_cue_invalid_backreference"
  ],
  notes: [
    "Nocksperimental currently records source-level evidence and does not claim these upstream cargo gates passed in production.",
    "Run the commands in a fresh upstream checkout before turning this trace into a release-blocking validation gate."
  ]
} as const;

const sourceDriftCheck = {
  command: "npm run check:nockchain-runtime-safety-source-drift -- --json",
  script: "scripts/check-nockchain-runtime-safety-source-drift.mjs",
  testCommand: "npm run test:nockchain-runtime-safety-source-drift-check",
  sourceAnchorIds: sourceAnchors.map((anchor) => anchor.id),
  compareFields: [
    "upstreamCommit",
    "sourceAnchorId",
    "sourceSha256",
    "sourceBytes",
    "requiredSymbols"
  ],
  targetSurfaces: [
    "nockchainRuntimeSafety",
    "nockchainPmaSourceTrace",
    "localFakenetEvidence",
    "registryCheckpoint"
  ],
  interpretation:
    "Compares commit-pinned NockVM runtime-safety source anchors (stack frames, cue/jam bounds, noun space, HAMT) against current upstream master before runtime-failure receipts rely on them."
} as const;

export function createNockchainRuntimeSafetyTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/runtime-safety`,
    generatedAt: "2026-06-06T08:52:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceCommitUrl: upstream.latestCommit.url,
      crateSurfaces: ["nockvm"]
    },
    sourceAnchors,
    runtimeSafetyClasses,
    receiptContract,
    operatorTriage,
    localVerification,
    sourceDriftCheck,
    nocksperimentalImplications: [
      "Fakenet support bundles can classify NockVM runtime failures without uploading raw jam payloads, stack memory, PMA slabs, or core dumps.",
      "Bring-your-own fakenet tests should join cue/jam failures with sync/gossip peer context before interpreting no peers or wrong commitments.",
      "State-jam receipts should include PMA offset-bounds and noun-space epoch context before trusting restored runtime state.",
      "PR radar items for jam/cue hardening and stack-frame safety should promote into this trace before operator runbooks claim the risk changed."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/runtime-safety`,
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      rustSource: `${registryCanonicalBaseUrl}/api/nockchain/rust-source`,
      pmaSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/pma`,
      prRadar: `${registryCanonicalBaseUrl}/api/nockchain/pr-radar`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
