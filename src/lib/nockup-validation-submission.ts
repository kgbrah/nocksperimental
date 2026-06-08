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
import { containsSecretLikeField } from "@/lib/secret-field-scrubber";
import { secureId, stableId } from "@/lib/stable-id";

type NockupValidationInput = {
  project?: {
    name?: string | null;
    repo?: string | null;
    template?: string | null;
    installPath?: string | null;
    nockupVersion?: string | null;
    commit?: string | null;
  } | null;
  commands?: unknown;
  artifacts?: unknown;
  fakenet?: {
    endpoint?: string | null;
    networkId?: string | null;
    walletAddress?: string | null;
    accepted?: boolean | null;
  } | null;
};

type NockupCommandSummary = {
  id: string;
  command: string;
  status: string;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string | null;
  outputHash: string | null;
};

type NockupArtifactSummary = {
  path: string;
  kind: string;
  hash: string | null;
  size: number | null;
  producedBy: string | null;
};

type NockupValidationChecks = {
  projectProvided: boolean;
  templateProvided: boolean;
  commandsProvided: boolean;
  scaffoldCommandPassed: boolean;
  buildCommandPassed: boolean;
  runCommandPassed: boolean;
  artifactHashesProvided: boolean;
  installPathRecorded: boolean;
  fakenetAccepted: boolean;
  noSecretFields: boolean;
};

export type NockupValidationReceipt = ReturnType<typeof verifyNockupValidationSubmission>;

const nockupWatchThemes = [
  "#125 fix(nockup): harden templates and run UX",
  "#122 feat(nockup): install_path support and nested symlink fixes",
  "#120 feat(nockup): extension hooks for downstream-owned templates and subcommands",
  "#117 feat(nockup): declarative post-install [[patches]]",
  "#114 fix(nockup): pin basic template dependencies to a real commit"
] as const;

export function verifyNockupValidationSubmission(input: NockupValidationInput) {
  const project = normalizeProject(input.project);
  const commands = normalizeCommands(input.commands);
  const artifacts = normalizeArtifacts(input.artifacts);
  const fakenet = normalizeFakenet(input.fakenet);
  const checks: NockupValidationChecks = {
    projectProvided: Boolean(project.name),
    templateProvided: Boolean(project.template),
    commandsProvided: commands.length > 0,
    scaffoldCommandPassed: commands.some((command) => commandPassed(command) && commandLooksLike(command, ["new", "init", "scaffold"])),
    buildCommandPassed: commands.some((command) => commandPassed(command) && commandLooksLike(command, ["build"])),
    runCommandPassed: commands.some((command) => commandPassed(command) && commandLooksLike(command, ["run"])),
    artifactHashesProvided: artifacts.length > 0 && artifacts.every((artifact) => Boolean(artifact.hash)),
    installPathRecorded: Boolean(project.installPath) || commands.some((command) => command.command.includes("--install-path")),
    fakenetAccepted: !fakenet || fakenet.accepted === true,
    noSecretFields: !containsSecretLikeField(input)
  };
  const accepted =
    checks.projectProvided &&
    checks.templateProvided &&
    checks.commandsProvided &&
    checks.noSecretFields;
  const verified =
    accepted &&
    checks.scaffoldCommandPassed &&
    checks.buildCommandPassed &&
    checks.runCommandPassed &&
    checks.artifactHashesProvided &&
    checks.installPathRecorded &&
    checks.fakenetAccepted;
  const errors = collectErrors(checks);
  const generatedAt = latestTimestamp(commands) ?? new Date(0).toISOString();
  // Collision-resistant (256-bit) so a content-addressed, create-only receipt key
  // cannot be targeted by a crafted second submission (see stable-id.ts).
  const evidenceHash = secureId(JSON.stringify({ project, commands, artifacts, fakenet }));
  const receiptId = accepted ? `nockup_validation_${secureId(JSON.stringify({ project, evidenceHash }))}` : null;
  const status = verified ? "verified" : accepted ? "attention" : "rejected";
  const signature = signNockupReceipt(
    accepted && receiptId
      ? buildNockupSignedPayload({ receiptId, generatedAt, evidenceHash, project: project.name, status })
      : null
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/nockup/submit`,
    accepted,
    verified,
    status,
    receiptId,
    generatedAt,
    signature,
    profile: {
      project: project.name,
      repo: project.repo,
      template: project.template,
      installPath: project.installPath,
      nockupVersion: project.nockupVersion,
      commit: project.commit
    },
    summary: {
      project: project.name,
      repo: project.repo,
      template: project.template,
      installPath: project.installPath,
      evidenceHash,
      commandCount: commands.length,
      passedCommands: commands.filter(commandPassed).length,
      artifactCount: artifacts.length,
      artifactsHashed: checks.artifactHashesProvided,
      fakenetAccepted: checks.fakenetAccepted
    },
    nockchain: createNockchainReceiptProvenance({
      network: fakenet?.networkId ?? "nockup-local",
      endpoint: fakenet?.endpoint,
      walletAddress: fakenet?.walletAddress,
      project: project.name,
      settlementMode: "nockup-scaffold"
    }),
    nockup: {
      crate: "nockup",
      group: "hoon-and-scaffolding",
      primaryCheck: "cargo check -p nockup",
      purpose: "Validate NockApp scaffold, build, run, and artifact provenance without storing raw PMA or secret material.",
      watchThemes: nockupWatchThemes,
      riskPosture:
        "Nockup templates and run UX are active upstream work; receipts should pin project template, install path, command transcript hashes, artifacts, Nockchain commit, and release context."
    },
    checks,
    errors,
    commands,
    artifacts,
    fakenet,
    links: {
      submit: `${registryCanonicalBaseUrl}/api/nockchain/nockup/submit`,
      receipts: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts`,
      receipt: receiptId
        ? `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts/${receiptId}`
        : null,
      upstream: `${registryCanonicalBaseUrl}/api/nockchain/upstream`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      registry: `${registryCanonicalBaseUrl}/api/registry`
    }
  };
}

export function createNockupValidationSubmissionHelp() {
  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/nockup/submit`,
    method: "POST",
    description: "Submit Nockup scaffold/build/run validation evidence and receive a persisted Nockchain-provenance receipt.",
    body: {
      project: {
        name: "counter-nockapp",
        repo: "owner/repo",
        template: "basic",
        installPath: "apps/counter",
        nockupVersion: "upstream-master",
        commit: "Nockchain commit used for the scaffold"
      },
      commands: [
        {
          id: "nockup-build",
          command: "nockup build counter-nockapp",
          status: "pass",
          exitCode: 0,
          outputHash: "sha256:..."
        }
      ],
      artifacts: [
        {
          path: "apps/counter/out.jam",
          kind: "jam",
          hash: "sha256:...",
          producedBy: "nockup-build"
        }
      ],
      fakenet: {
        endpoint: "http://127.0.0.1:5555",
        networkId: "local-fakenet",
        walletAddress: "optional wallet address",
        accepted: true
      }
    },
    links: {
      receipts: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`
    }
  };
}

function normalizeProject(project: NockupValidationInput["project"]) {
  return {
    name: cleanInput(project?.name),
    repo: cleanInput(project?.repo) || "unknown",
    template: cleanInput(project?.template),
    installPath: cleanInput(project?.installPath) || null,
    nockupVersion: cleanInput(project?.nockupVersion) || null,
    commit: cleanInput(project?.commit) || null
  };
}

function normalizeCommands(value: unknown): NockupCommandSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((command): command is Record<string, unknown> => Boolean(command && typeof command === "object"))
    .map((command, index) => {
      const commandText = cleanInput(command.command);

      return {
        id: cleanInput(command.id) || `nockup-command-${stableId(`${commandText}|${index}`)}`,
        command: commandText,
        status: cleanInput(command.status).toLowerCase() || "unknown",
        exitCode: cleanNumber(command.exitCode),
        startedAt: cleanTimestamp(command.startedAt),
        completedAt: cleanTimestamp(command.completedAt),
        outputHash: cleanInput(command.outputHash) || null
      };
    })
    .filter((command) => Boolean(command.command || command.id));
}

function normalizeArtifacts(value: unknown): NockupArtifactSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((artifact): artifact is Record<string, unknown> => Boolean(artifact && typeof artifact === "object"))
    .map((artifact, index) => {
      const artifactPath = cleanInput(artifact.path);

      return {
        path: artifactPath,
        kind: cleanInput(artifact.kind) || "unknown",
        hash: cleanInput(artifact.hash) || null,
        size: cleanNumber(artifact.size),
        producedBy: cleanInput(artifact.producedBy) || null,
        id: `artifact-${stableId(`${artifactPath}|${index}`)}`
      };
    })
    .filter((artifact) => Boolean(artifact.path));
}

function normalizeFakenet(fakenet: NockupValidationInput["fakenet"]) {
  if (!fakenet) {
    return null;
  }

  return {
    endpoint: cleanInput(fakenet.endpoint) || null,
    networkId: cleanInput(fakenet.networkId) || "local-fakenet",
    walletAddress: cleanInput(fakenet.walletAddress) || null,
    accepted: fakenet.accepted === true
  };
}

function commandPassed(command: NockupCommandSummary) {
  return command.status === "pass" || command.status === "passed" || command.exitCode === 0;
}

function commandLooksLike(command: NockupCommandSummary, terms: string[]) {
  const haystack = `${command.id} ${command.command}`.toLowerCase();

  return terms.some((term) => haystack.includes(term));
}

function collectErrors(checks: NockupValidationChecks) {
  const errors = [];

  if (!checks.projectProvided) {
    errors.push("Nockup project identity is required.");
  }

  if (!checks.templateProvided) {
    errors.push("Nockup template identity is required.");
  }

  if (!checks.commandsProvided) {
    errors.push("At least one Nockup command transcript is required.");
  }

  if (!checks.noSecretFields) {
    errors.push("Nockup evidence contains secret-like fields.");
  }

  if (!checks.scaffoldCommandPassed) {
    errors.push("A passing Nockup scaffold command is required.");
  }

  if (!checks.buildCommandPassed) {
    errors.push("A passing Nockup build command is required.");
  }

  if (!checks.runCommandPassed) {
    errors.push("A passing Nockup run command is required.");
  }

  if (!checks.artifactHashesProvided) {
    errors.push("Nockup artifacts must include hashes.");
  }

  if (!checks.installPathRecorded) {
    errors.push("Nockup install path provenance is required.");
  }

  if (!checks.fakenetAccepted) {
    errors.push("Nockup fakenet context was not accepted.");
  }

  return errors;
}

function latestTimestamp(commands: NockupCommandSummary[]) {
  return latestByEpoch(commands.flatMap((command) => [command.completedAt, command.startedAt]));
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

function cleanNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanTimestamp(value: unknown) {
  const input = cleanInput(value);

  return input && !Number.isNaN(Date.parse(input)) ? input : null;
}

type NockupReceiptSignedPayload = {
  receiptId: string;
  generatedAt: string;
  evidenceHash: string;
  project: string;
  status: string;
};

function buildNockupSignedPayload(payload: NockupReceiptSignedPayload): NockupReceiptSignedPayload {
  return {
    receiptId: payload.receiptId,
    generatedAt: payload.generatedAt,
    evidenceHash: payload.evidenceHash,
    project: payload.project,
    status: payload.status
  };
}

function signNockupReceipt(
  signedPayload: NockupReceiptSignedPayload | null
): EvidenceReceiptSignature | null {
  return signEvidenceReceipt(signedPayload);
}

export function verifyNockupReceiptSignature(receipt: NockupValidationReceipt): boolean {
  const signedPayload = buildNockupSignedPayload({
    receiptId: receipt.receiptId ?? "",
    generatedAt: receipt.generatedAt,
    evidenceHash: receipt.summary.evidenceHash,
    project: receipt.summary.project,
    status: receipt.status
  });

  return verifyEvidenceReceiptSignature(receipt.signature, signedPayload);
}
