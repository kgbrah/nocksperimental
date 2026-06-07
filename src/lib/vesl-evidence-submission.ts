import type { LabRunReport, LabStatus, LabStepReport } from "@/lib/lab-report";
import { createNockchainReceiptProvenance } from "@/lib/nockchain-upstream";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import {
  signEvidenceReceipt,
  verifyEvidenceReceiptSignature,
  type EvidenceReceiptSignature
} from "@/lib/evidence-receipt-signing";
import { containsSecretLikeField, redactSecretFields } from "@/lib/secret-field-scrubber";
import { stableId } from "@/lib/stable-id";

export type VeslEvidenceSubmissionInput = {
  connection?: {
    project?: string | null;
    repo?: string | null;
    template?: string | null;
    settlementMode?: string | null;
    chainEndpoint?: string | null;
  } | null;
  verifyJam?: {
    status?: string | null;
    projectPath?: string | null;
    outJam?: string | null;
    fingerprint?: string | null;
  } | null;
  effects?: unknown;
  peeks?: unknown;
  hull?: {
    health?: Record<string, unknown> | null;
    status?: Record<string, unknown> | null;
    verify?: Record<string, unknown> | null;
    tx?: Record<string, unknown> | null;
  } | null;
  fakenet?: {
    endpoint?: string | null;
    walletAddress?: string | null;
    txId?: string | null;
    accepted?: boolean | null;
  } | null;
};

type VeslEffectSummary = {
  id: string;
  tag: string;
  source: string;
  observedAt: string | null;
};

type VeslPeekSummary = {
  id: string;
  path: string;
  status: string;
  source: string;
};

type VeslReceiptChecks = {
  projectProvided: boolean;
  evidenceProvided: boolean;
  noSecretFields: boolean;
  verifyJamFresh: boolean;
  settleRegisteredEffectPresent: boolean;
  settleNotedEffectPresent: boolean;
  peeksPresent: boolean;
  hullHealthOk: boolean;
  fakenetAccepted: boolean;
};

export type VeslEvidenceReceipt = ReturnType<typeof verifyVeslEvidenceSubmission>;

const requiredEffects = ["%settle-registered", "%settle-noted"];

export function verifyVeslEvidenceSubmission(input: VeslEvidenceSubmissionInput) {
  const connection = normalizeConnection(input.connection);
  const effects = normalizeEffects(input.effects);
  const peeks = normalizePeeks(input.peeks);
  const evidenceProvided = Boolean(input.verifyJam) || effects.length > 0 || peeks.length > 0 || Boolean(input.hull);
  const verifyJamFresh = cleanInput(input.verifyJam?.status).toLowerCase() === "fresh";
  const settleRegisteredEffectPresent = effects.some((effect) => effect.tag === "%settle-registered");
  const settleNotedEffectPresent = effects.some((effect) => effect.tag === "%settle-noted");
  const peeksPresent = peeks.length > 0 && peeks.every((peek) => peek.status === "present");
  const hullHealthOk = !input.hull?.health || cleanInput(input.hull.health.status).toLowerCase() === "ok";
  const fakenetMode = connection.settlementMode === "fakenet";
  const fakenetAccepted = !fakenetMode || input.fakenet?.accepted === true || Boolean(input.fakenet?.txId);
  const noSecretFields = !containsSecretLikeField(input);
  const checks: VeslReceiptChecks = {
    projectProvided: Boolean(connection.project),
    evidenceProvided,
    noSecretFields,
    verifyJamFresh,
    settleRegisteredEffectPresent,
    settleNotedEffectPresent,
    peeksPresent,
    hullHealthOk,
    fakenetAccepted
  };
  const accepted = checks.projectProvided && checks.evidenceProvided && checks.noSecretFields;
  const verified =
    accepted &&
    checks.verifyJamFresh &&
    checks.settleRegisteredEffectPresent &&
    checks.settleNotedEffectPresent &&
    checks.peeksPresent &&
    checks.hullHealthOk &&
    checks.fakenetAccepted;
  const errors = collectErrors(checks);
  const generatedAt = latestTimestamp(effects) ?? new Date(0).toISOString();
  const evidenceHash = stableId(JSON.stringify({ connection, verifyJam: input.verifyJam ?? null, effects, peeks, hull: input.hull ?? null, fakenet: input.fakenet ?? null }));
  const receiptId = accepted ? `vesl_submission_${stableId(JSON.stringify({ connection, evidenceHash }))}` : null;
  const status = verified ? "verified" : accepted ? "attention" : "rejected";
  const signature = signVeslReceipt(
    accepted && receiptId
      ? buildVeslSignedPayload({ receiptId, generatedAt, evidenceHash, project: connection.project, status })
      : null
  );
  const report = createReport({
    connection,
    effects,
    peeks,
    input,
    checks,
    generatedAt,
    evidenceHash
  });

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/vesl/evidence/submit`,
    accepted,
    verified,
    status,
    receiptId,
    generatedAt,
    signature,
    profile: {
      project: connection.project,
      repo: connection.repo,
      template: connection.template,
      settlementMode: connection.settlementMode,
      chainEndpoint: connection.chainEndpoint
    },
    summary: {
      project: connection.project,
      repo: connection.repo,
      template: connection.template,
      settlementMode: connection.settlementMode,
      evidenceHash,
      evidenceSourceCount: countEvidenceSources(input, effects, peeks),
      effectCount: effects.length,
      peekCount: peeks.length,
      requiredEffectsPresent: settleRegisteredEffectPresent && settleNotedEffectPresent,
      hullHealth: input.hull?.health ? cleanInput(input.hull.health.status).toLowerCase() || "unknown" : "not-provided",
      fakenetAccepted
    },
    nockchain: createNockchainReceiptProvenance({
      network: connection.settlementMode === "fakenet" ? "vesl-fakenet" : "vesl-local",
      endpoint: input.fakenet?.endpoint ?? connection.chainEndpoint,
      walletAddress: input.fakenet?.walletAddress,
      project: connection.project,
      settlementMode: connection.settlementMode,
      stateJamFingerprint: input.verifyJam?.fingerprint
    }),
    checks,
    errors,
    effects,
    peeks,
    report,
    links: {
      submit: `${registryCanonicalBaseUrl}/api/vesl/evidence/submit`,
      receipts: `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts`,
      receipt: receiptId
        ? `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts/${receiptId}`
        : null,
      collab: `${registryCanonicalBaseUrl}/api/registry`
    }
  };
}

export function createVeslEvidenceSubmissionHelp() {
  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/vesl/evidence/submit`,
    method: "POST",
    description: "Submit VESL lifecycle evidence from vesl-test, vesl-hull, or fakenet settlement and receive a persisted verification receipt.",
    body: {
      connection: {
        project: "vesl-demo",
        repo: "zkvesl/vesl-nockup",
        template: "vesl",
        settlementMode: "local",
        chainEndpoint: "http://127.0.0.1:5555"
      },
      verifyJam: {
        status: "fresh",
        outJam: "out.jam",
        fingerprint: "sha256:..."
      },
      effects: requiredEffects.map((tag) => ({ tag, source: "vesl-test watch" })),
      peeks: [{ path: "[%settle-registered 1 ~]", status: "present" }],
      hull: {
        health: {
          status: "ok"
        }
      }
    },
    links: {
      receipts: `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts`,
      registry: `${registryCanonicalBaseUrl}/api/registry`
    }
  };
}

function normalizeConnection(connection: VeslEvidenceSubmissionInput["connection"]) {
  return {
    project: cleanInput(connection?.project),
    repo: cleanInput(connection?.repo) || "unknown",
    template: cleanInput(connection?.template) || "unknown",
    settlementMode: cleanInput(connection?.settlementMode) || "local",
    chainEndpoint: cleanInput(connection?.chainEndpoint) || null
  };
}

function normalizeEffects(value: unknown): VeslEffectSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((effect): effect is Record<string, unknown> => Boolean(effect && typeof effect === "object"))
    .map((effect, index) => {
      const tag = cleanInput(effect.tag);

      return {
        id: cleanInput(effect.id) || `effect-${stableId(`${tag}|${index}`)}`,
        tag,
        source: cleanInput(effect.source) || "unknown",
        observedAt: cleanInput(effect.observedAt) || null
      };
    })
    .filter((effect) => Boolean(effect.tag));
}

function normalizePeeks(value: unknown): VeslPeekSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((peek): peek is Record<string, unknown> => Boolean(peek && typeof peek === "object"))
    .map((peek, index) => {
      const path = cleanInput(peek.path);

      return {
        id: cleanInput(peek.id) || `peek-${stableId(`${path}|${index}`)}`,
        path,
        status: cleanInput(peek.status).toLowerCase() || "unknown",
        source: cleanInput(peek.source) || "unknown"
      };
    })
    .filter((peek) => Boolean(peek.path));
}

function createReport({
  connection,
  effects,
  peeks,
  input,
  checks,
  generatedAt,
  evidenceHash
}: {
  connection: ReturnType<typeof normalizeConnection>;
  effects: VeslEffectSummary[];
  peeks: VeslPeekSummary[];
  input: VeslEvidenceSubmissionInput;
  checks: VeslReceiptChecks;
  generatedAt: string;
  evidenceHash: string;
}): LabRunReport {
  const reportId = `lab_vesl_${evidenceHash}`;
  const steps = createSteps({ effects, peeks, input, checks, evidenceHash });
  const stepsPassed = steps.filter((step) => step.status === "pass").length;
  const stepsFailed = steps.filter((step) => step.status === "fail").length;
  const status: LabStatus = stepsFailed > 0 ? "fail" : "pass";

  return {
    reportId,
    fixtureId: "vesl-evidence-bridge-v0",
    generatedAt,
    app: {
      name: "VESL Evidence Bridge",
      slug: "vesl-evidence-bridge",
      version: "0.0.1",
      kernel: `${connection.repo}:${connection.template}`
    },
    environment: {
      mode: connection.settlementMode === "fakenet" ? "vesl-fakenet" : "vesl-local",
      grpcEndpoint: input.fakenet?.endpoint ?? connection.chainEndpoint ?? "",
      fakenetCommand: "vesl-test",
      notes: [
        `project=${connection.project}`,
        `settlementMode=${connection.settlementMode}`,
        `repo=${connection.repo}`
      ]
    },
    summary: {
      status,
      stepsPassed,
      stepsFailed,
      invariantsPassed: stepsPassed,
      invariantsFailed: stepsFailed,
      alertsClear: checks.noSecretFields ? 1 : 0,
      alertsTriggered: checks.noSecretFields ? 0 : 1,
      snapshotsCaptured: 1,
      durationMs: 0
    },
    invariantPacks: [
      {
        id: "vesl.lifecycle.v0",
        name: "VESL lifecycle bridge checks",
        domain: "vesl",
        version: "v0",
        path: "docs/superpowers/specs/2026-06-05-vesl-evidence-bridge-design.md"
      }
    ],
    steps,
    invariants: [
      {
        id: "vesl-required-effects",
        title: "Required VESL lifecycle effects are present",
        severity: "high",
        status: checks.settleRegisteredEffectPresent && checks.settleNotedEffectPresent ? "pass" : "fail",
        observed: effects.map((effect) => effect.tag).join(", ") || "none",
        expected: requiredEffects.join(", ")
      },
      {
        id: "vesl-jam-fresh",
        title: "VESL out.jam fingerprint is fresh",
        severity: "high",
        status: checks.verifyJamFresh ? "pass" : "fail",
        observed: cleanInput(input.verifyJam?.status) || "missing",
        expected: "fresh"
      }
    ],
    alerts: checks.noSecretFields
      ? []
      : [
          {
            id: "vesl-secret-like-field",
            title: "Secret-like field detected",
            severity: "critical",
            state: "triggered",
            observed: "submission contains a sensitive-looking key",
            condition: "No secret-like fields should be submitted.",
            message: "Remove private keys, seed phrases, API keys, tokens, and passwords before submitting evidence."
          }
        ],
    adapterObservations: [],
    stateSnapshots: [
      {
        label: "VESL normalized evidence",
        stepId: "vesl-effects",
        stateHash: evidenceHash,
        // Deep-redact the snapshot so a rejected submission carrying a
        // secret-like key (the very thing the noSecretFields gate flags) is
        // never echoed verbatim into the receipt body. Redaction is
        // unconditional because secrets can nest under non-secret keys; the
        // receipt shape (keys, stateHash, snapshotsCaptured) is preserved.
        state: redactSecretFields({
          connection,
          verifyJam: input.verifyJam ?? null,
          effects,
          peeks,
          hull: input.hull ?? null,
          fakenet: input.fakenet ?? null
        })
      }
    ],
    stateDiffs: [],
    nextActions: status === "pass"
      ? ["Share the persisted VESL evidence receipt with collaborators."]
      : ["Resolve failed VESL lifecycle checks and submit a fresh receipt."]
  };
}

function createSteps({
  effects,
  peeks,
  input,
  checks,
  evidenceHash
}: {
  effects: VeslEffectSummary[];
  peeks: VeslPeekSummary[];
  input: VeslEvidenceSubmissionInput;
  checks: VeslReceiptChecks;
  evidenceHash: string;
}): LabStepReport[] {
  const baseHash = `vesl:${evidenceHash}`;
  const steps: LabStepReport[] = [
    {
      id: "vesl-verify-jam",
      type: "invariant",
      title: "Verify out.jam freshness",
      status: checks.verifyJamFresh ? "pass" : "fail",
      expectation: "vesl-test verify-jam reports fresh.",
      observed: cleanInput(input.verifyJam?.status) || "missing",
      beforeHash: baseHash,
      afterHash: `${baseHash}:verify-jam`,
      stateDiffs: [],
      durationMs: 0
    },
    {
      id: "vesl-effects",
      type: "invariant",
      title: "Capture VESL lifecycle effects",
      status: checks.settleRegisteredEffectPresent && checks.settleNotedEffectPresent ? "pass" : "fail",
      expectation: `${requiredEffects.join(" and ")} are present.`,
      observed: effects.map((effect) => effect.tag).join(", ") || "none",
      beforeHash: `${baseHash}:verify-jam`,
      afterHash: `${baseHash}:effects`,
      stateDiffs: [],
      durationMs: 0
    },
    {
      id: "vesl-peeks",
      type: "peek",
      title: "Inspect VESL peek state",
      status: checks.peeksPresent ? "pass" : "fail",
      expectation: "At least one VESL peek is present.",
      observed: peeks.map((peek) => `${peek.path}:${peek.status}`).join(", ") || "none",
      beforeHash: `${baseHash}:effects`,
      afterHash: `${baseHash}:peeks`,
      stateDiffs: [],
      durationMs: 0
    }
  ];

  if (input.hull?.health) {
    steps.push({
      id: "vesl-hull-health",
      type: "invariant",
      title: "Check vesl-hull health",
      status: checks.hullHealthOk ? "pass" : "fail",
      expectation: "vesl-hull health status is ok.",
      // Redact before echoing: this attacker-supplied object is persisted in the
      // receipt and served from the unauthenticated receipt routes, so a nested
      // secret-like key must never appear verbatim (AGENTS.md no-echo).
      observed: JSON.stringify(redactSecretFields(input.hull.health)),
      beforeHash: `${baseHash}:peeks`,
      afterHash: `${baseHash}:hull-health`,
      stateDiffs: [],
      durationMs: 0
    });
  }

  if (input.fakenet) {
    steps.push({
      id: "vesl-fakenet-settlement",
      type: "fakenet",
      title: "Check VESL fakenet settlement",
      status: checks.fakenetAccepted ? "pass" : "fail",
      expectation: "Fakenet settlement is accepted or has a transaction id.",
      // Redact before echoing (see vesl-hull-health step above) — persisted and
      // served unauthenticated, so no nested secret-like key may leak verbatim.
      observed: JSON.stringify(redactSecretFields(input.fakenet)),
      beforeHash: `${baseHash}:hull-health`,
      afterHash: `${baseHash}:fakenet`,
      stateDiffs: [],
      durationMs: 0
    });
  }

  return steps;
}

function countEvidenceSources(
  input: VeslEvidenceSubmissionInput,
  effects: VeslEffectSummary[],
  peeks: VeslPeekSummary[]
) {
  return [
    input.verifyJam,
    effects.length > 0,
    peeks.length > 0,
    input.hull,
    input.fakenet
  ].filter(Boolean).length;
}

function collectErrors(checks: VeslReceiptChecks) {
  const errors = [];

  if (!checks.projectProvided) {
    errors.push("VESL project identity is required.");
  }

  if (!checks.evidenceProvided) {
    errors.push("At least one VESL evidence source is required.");
  }

  if (!checks.noSecretFields) {
    errors.push("VESL evidence contains secret-like fields.");
  }

  if (!checks.verifyJamFresh) {
    errors.push("vesl-test verify-jam did not report a fresh out.jam.");
  }

  if (!checks.settleRegisteredEffectPresent) {
    errors.push("Missing %settle-registered lifecycle effect.");
  }

  if (!checks.settleNotedEffectPresent) {
    errors.push("Missing %settle-noted lifecycle effect.");
  }

  if (!checks.peeksPresent) {
    errors.push("At least one VESL peek must be present.");
  }

  if (!checks.hullHealthOk) {
    errors.push("vesl-hull health was not ok.");
  }

  if (!checks.fakenetAccepted) {
    errors.push("VESL fakenet settlement was not accepted.");
  }

  return errors;
}

function latestTimestamp(effects: VeslEffectSummary[]) {
  return latestByEpoch(effects.map((effect) => effect.observedAt));
}

// Returns the chronologically latest timestamp by parsed epoch (not lexicographic
// string order, which only matches chronological order for uniform UTC "...Z"
// strings — a tz offset or differing fractional precision could otherwise stamp a
// non-latest timestamp into the signed generatedAt). Invalid timestamps are
// dropped; ties keep the first occurrence; the original client string is returned
// unchanged (no toISOString() rewrite). Empty/all-invalid input -> undefined.
function latestByEpoch(values: Array<string | null | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value && !Number.isNaN(Date.parse(value))))
    .reduce<string | undefined>((latest, value) => {
      if (latest === undefined || Date.parse(value) > Date.parse(latest)) {
        return value;
      }

      return latest;
    }, undefined);
}

function cleanInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type VeslReceiptSignedPayload = {
  receiptId: string;
  generatedAt: string;
  evidenceHash: string;
  project: string;
  status: string;
};

function buildVeslSignedPayload(payload: VeslReceiptSignedPayload): VeslReceiptSignedPayload {
  return {
    receiptId: payload.receiptId,
    generatedAt: payload.generatedAt,
    evidenceHash: payload.evidenceHash,
    project: payload.project,
    status: payload.status
  };
}

function signVeslReceipt(
  signedPayload: VeslReceiptSignedPayload | null
): EvidenceReceiptSignature | null {
  return signEvidenceReceipt(signedPayload);
}

export function verifyVeslReceiptSignature(receipt: VeslEvidenceReceipt): boolean {
  const signedPayload = buildVeslSignedPayload({
    receiptId: receipt.receiptId ?? "",
    generatedAt: receipt.generatedAt,
    evidenceHash: receipt.summary.evidenceHash,
    project: receipt.summary.project,
    status: receipt.status
  });

  return verifyEvidenceReceiptSignature(receipt.signature, signedPayload);
}
