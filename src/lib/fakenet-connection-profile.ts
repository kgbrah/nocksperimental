import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

type EndpointVisibility = "private" | "public";
type FakenetConnectionMode = "local-runbook" | "hosted-http-candidate" | "remote-runbook" | "invalid";
type FakenetApiEndpointMode =
  | "private-grpc"
  | "public-http-manifest"
  | "public-grpc-client-side"
  | "invalid";
type HostedProbePolicy =
  | "blocked-private-or-loopback"
  | "allowed-public-http-only"
  | "blocked-public-grpc-client-side"
  | "blocked-invalid-endpoint";

type FakenetConnectionInput = {
  endpoint?: string | null;
  walletAddress?: string | null;
  networkId?: string | null;
  label?: string | null;
};

type ParsedEndpoint = {
  input: string;
  normalized: string;
  host: string;
  port: string | null;
  scheme: string;
  visibility: EndpointVisibility;
  testEndpoint: string;
};

type FakenetTestFunction = {
  id: string;
  label: string;
  command: string;
  runCommand: string;
  reportOutput: string;
  purpose: string;
};

type DeclaredPeek = {
  id: string;
  label: string;
  purpose: string;
  runCommand: string;
};

type ObservedPeek = {
  id: string;
  target: string | null;
  status: "pass" | "fail";
  checkedAt: string | null;
  expectation: string | null;
};

type AvailablePeeksInventory = {
  declared: DeclaredPeek[];
  observed: ObservedPeek[];
  peeks: Array<DeclaredPeek & { observation: ObservedPeek | null }>;
};

type AvailablePeeksProfile = {
  testFunctions?: Array<{ id: string; label?: string; purpose?: string; runCommand?: string }>;
};

type AvailablePeeksReport = {
  steps?: Array<{
    id?: string;
    type?: string;
    target?: string | null;
    expectation?: string | null;
    adapter?: {
      peek?: {
        status?: "pass" | "fail";
        checkedAt?: string | null;
        expectation?: string | null;
      } | null;
    } | null;
  }>;
};

const defaultEndpoint = "127.0.0.1:5555";
const defaultWalletAddress =
  "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
const defaultNetworkId = "local-fakenet";

const testDefinitions = [
  {
    id: "health",
    label: "Health",
    command: "npm run lab:local",
    reportOutput: ".nocklab/local-fakenet-health.report.json",
    purpose: "Check fakenet gRPC reachability."
  },
  {
    id: "balance",
    label: "Balance",
    command: "npm run lab:local:balance",
    reportOutput: ".nocklab/local-fakenet-balance.report.json",
    purpose: "Read the configured wallet balance."
  },
  {
    id: "chain",
    label: "Chain",
    command: "npm run lab:local:chain",
    reportOutput: ".nocklab/local-fakenet-chain.report.json",
    purpose: "Capture chain height, peers, and block commitment."
  },
  {
    id: "peek",
    label: "Peek",
    command: "npm run lab:local:peek",
    reportOutput: ".nocklab/local-fakenet-peek.report.json",
    purpose: "Run a command-backed fakenet peek."
  },
  {
    id: "poke",
    label: "Poke",
    command: "npm run lab:local:poke",
    reportOutput: ".nocklab/local-fakenet-poke.report.json",
    purpose: "Run a command-backed fakenet poke."
  }
];

const apiSafetySourceDocs = [
  {
    path: "crates/nockchain-api/README.md",
    authority: "Tier 1 scoped authority for public API runtime and deployment risk",
    interpretation:
      "nockchain-api is the public-facing NockApp gRPC API binary and carries a different risk surface than private node gRPC."
  },
  {
    path: "crates/nockchain-wallet/README.md",
    authority: "Tier 1 scoped authority for wallet endpoint selection",
    interpretation:
      "Wallet commands can target either the default public API or a private local API selected with --client private."
  },
  {
    path: "PROTOCOL.md",
    authority: "Tier 0 protocol authority",
    interpretation:
      "Endpoint output is evidence context, not protocol authority; protocol claims still defer to Tier 0 docs."
  }
] as const;

const apiSafetyRequiredReceiptFields = [
  "endpoint",
  "endpointMode",
  "walletAddress",
  "networkId",
  "nockchainCommit",
  "nockchainBuild",
  "accessControl",
  "probeLocation",
  "syncContext",
  "outputHash"
] as const;

export function createFakenetConnectionProfile(input: FakenetConnectionInput = {}) {
  const endpointInput = cleanInput(input.endpoint) || defaultEndpoint;
  const walletAddress = cleanInput(input.walletAddress) || defaultWalletAddress;
  const networkId = cleanInput(input.networkId) || defaultNetworkId;
  const label = cleanInput(input.label) || "Bring your own fakenet";
  const endpoint = parseEndpoint(endpointInput);
  const accepted = endpoint.errors.length === 0;
  const parsedEndpoint = endpoint.value;
  const mode = accepted && parsedEndpoint ? connectionMode(parsedEndpoint) : "invalid";
  const env = {
    NOCKS_FAKENET_ENDPOINT: parsedEndpoint?.testEndpoint ?? endpointInput,
    NOCKS_FAKENET_WALLET: walletAddress,
    NOCKS_FAKENET_NETWORK: networkId
  };
  const testFunctions = testDefinitions.map((definition) => ({
    ...definition,
    runCommand: `${envAssignments(env)} ${definition.command}`
  })) satisfies FakenetTestFunction[];
  const profileUrl = createProfileUrl({
    endpoint: endpointInput,
    walletAddress,
    networkId,
    label
  });
  const evidenceUrl = createEvidenceUrl(parsedEndpoint?.testEndpoint ?? endpointInput, walletAddress);

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/connect`,
    accepted,
    mode,
    connectionId: accepted
      ? `byo_fakenet_${stableId([parsedEndpoint?.normalized, walletAddress, networkId].join("|"))}`
      : null,
    connection: {
      label,
      endpoint: parsedEndpoint ?? {
        input: endpointInput,
        normalized: null,
        host: null,
        port: null,
        scheme: null,
        visibility: null,
        testEndpoint: endpointInput
      },
      walletAddress,
      networkId
    },
    apiSafety: createApiSafety(mode, parsedEndpoint),
    safety: createSafety(mode, parsedEndpoint),
    testFunctions,
    commands: {
      shell: "bash",
      env,
      setup: "npm install",
      runAll: testFunctions.map((testFunction) => testFunction.runCommand).join(" && "),
      inspect: "curl http://127.0.0.1:3000/api/fakenet",
      submitEvidence: `curl ${JSON.stringify(`${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`)} -H "content-type: application/json" --data @fakenet-evidence-submission.json`,
      submitProfile: `curl -G ${JSON.stringify(`${registryCanonicalBaseUrl}/api/fakenet/connect`)} --data-urlencode ${JSON.stringify(`endpoint=${endpointInput}`)} --data-urlencode ${JSON.stringify(`walletAddress=${walletAddress}`)} --data-urlencode ${JSON.stringify(`networkId=${networkId}`)}`
    },
    availablePeeks: createAvailablePeeksInventory({ testFunctions }, []),
    links: {
      profile: profileUrl,
      evidence: evidenceUrl,
      submit: `${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`,
      readiness: `${registryCanonicalBaseUrl}/api/fakenet`,
      commands: `${registryCanonicalBaseUrl}/api/fakenet/commands`,
      runbook: `${registryCanonicalBaseUrl}/api/fakenet/runbook.sh`
    },
    errors: endpoint.errors
  };
}

export function createAvailablePeeksInventory(
  profile: AvailablePeeksProfile,
  reports: AvailablePeeksReport[] = []
): AvailablePeeksInventory {
  const declared: DeclaredPeek[] = (profile.testFunctions ?? [])
    .filter((testFunction) => testFunction.id === "peek")
    .map((testFunction) => ({
      id: testFunction.id,
      label: testFunction.label ?? testFunction.id,
      purpose: testFunction.purpose ?? "",
      runCommand: testFunction.runCommand ?? ""
    }));

  const observed: ObservedPeek[] = [];

  for (const report of reports) {
    for (const step of report.steps ?? []) {
      if (step.type !== "peek" || !step.adapter?.peek) {
        continue;
      }

      const peek = step.adapter.peek;
      const id = step.id ?? step.target ?? "peek";

      if (observed.some((entry) => entry.id === id && entry.target === (step.target ?? null))) {
        continue;
      }

      observed.push({
        id,
        target: step.target ?? null,
        status: peek.status === "fail" ? "fail" : "pass",
        checkedAt: peek.checkedAt ?? null,
        expectation: peek.expectation ?? step.expectation ?? null
      });
    }
  }

  const peeks = declared.map((peek) => ({
    ...peek,
    observation: observed.find((entry) => entry.id === peek.id) ?? null
  }));

  return { declared, observed, peeks };
}

function createApiSafety(mode: FakenetConnectionMode, endpoint: ParsedEndpoint | null) {
  const endpointMode = apiEndpointMode(mode, endpoint);
  const hostedProbePolicy = apiHostedProbePolicy(endpointMode);
  const upstream = nockchainUpstreamIntelligence;

  return {
    source: "nockchain-api-safety-contract",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease
    },
    sourceDocs: apiSafetySourceDocs,
    endpointMode,
    hostedProbePolicy,
    requiredReceiptFields: apiSafetyRequiredReceiptFields,
    publicExposure: {
      riskFlags: [
        "alpha-testing-grade-api",
        "no-auth-no-rate-limit-public-grpc",
        "public-bind-is-operator-risk",
        "explorer-cache-warmup-and-reorg-staleness"
      ],
      trustedControls: ["VPN", "SSH tunnel", "mTLS proxy", "private network"],
      interpretation:
        "Public nockchain-api exposure is an expert-operated testbed surface, not a hardened public service."
    },
    privateApi: {
      walletClientFlag: "--client private",
      defaultEndpoint: defaultEndpoint,
      operationalRequirements: [
        "nockchain instance running locally",
        "private gRPC listener reachable from the command runner",
        "same fakenet network and state source used by the evidence run"
      ]
    },
    observabilitySignals: [
      "nockchain_public_grpc.* gnort metrics",
      "heaviest-chain freshness",
      "RPC success/error counts",
      "cache warm-up and reorg windows"
    ],
    interpretation:
      "Hosted nocksperimental checks only probe public HTTP(S) manifests. Private, loopback, Tailscale, and raw public gRPC endpoints require a client-side runbook."
  };
}

function apiEndpointMode(
  mode: FakenetConnectionMode,
  endpoint: ParsedEndpoint | null
): FakenetApiEndpointMode {
  if (!endpoint || mode === "invalid") {
    return "invalid";
  }

  if (endpoint.visibility === "private") {
    return "private-grpc";
  }

  if (mode === "hosted-http-candidate") {
    return "public-http-manifest";
  }

  return "public-grpc-client-side";
}

function apiHostedProbePolicy(endpointMode: FakenetApiEndpointMode): HostedProbePolicy {
  if (endpointMode === "private-grpc") {
    return "blocked-private-or-loopback";
  }

  if (endpointMode === "public-http-manifest") {
    return "allowed-public-http-only";
  }

  if (endpointMode === "public-grpc-client-side") {
    return "blocked-public-grpc-client-side";
  }

  return "blocked-invalid-endpoint";
}

export function parseFakenetConnectionSearchParams(searchParams: URLSearchParams) {
  return createFakenetConnectionProfile({
    endpoint: searchParams.get("endpoint"),
    walletAddress: searchParams.get("walletAddress"),
    networkId: searchParams.get("networkId"),
    label: searchParams.get("label")
  });
}

function cleanInput(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function parseEndpoint(input: string): { value: ParsedEndpoint | null; errors: string[] } {
  const errors: string[] = [];
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `grpc://${input}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return {
      value: null,
      errors: ["Fakenet endpoint must be a host:port or http(s)/grpc(s) URL."]
    };
  }

  const scheme = url.protocol.replace(":", "").toLowerCase();

  if (!["http", "https", "grpc", "grpcs"].includes(scheme)) {
    errors.push(`Unsupported fakenet endpoint scheme: ${scheme || "missing"}.`);
  }

  if (!url.hostname) {
    errors.push("Fakenet endpoint must include a host.");
  }

  const normalized = ["http", "https"].includes(scheme)
    ? url.toString()
    : `${scheme}://${url.hostname}${url.port ? `:${url.port}` : ""}`;
  const testEndpoint = ["grpc", "grpcs"].includes(scheme)
    ? `${url.hostname}${url.port ? `:${url.port}` : ""}`
    : url.toString();

  return {
    value: {
      input,
      normalized,
      host: url.hostname,
      port: url.port || null,
      scheme,
      visibility: isPrivateHost(url.hostname) ? "private" : "public",
      testEndpoint
    },
    errors
  };
}

function connectionMode(endpoint: ParsedEndpoint): FakenetConnectionMode {
  if (endpoint.visibility === "private") {
    return "local-runbook";
  }

  if (endpoint.scheme === "http" || endpoint.scheme === "https") {
    return "hosted-http-candidate";
  }

  return "remote-runbook";
}

function createSafety(mode: FakenetConnectionMode, endpoint: ParsedEndpoint | null) {
  const canProbeFromHosted = mode === "hosted-http-candidate";
  const notes = [];

  if (!endpoint) {
    notes.push("No hosted probe will run until the endpoint is valid.");
  } else if (endpoint.visibility === "private") {
    notes.push("Endpoint is private or loopback, so tests must run beside the fakenet node.");
    notes.push("The hosted Worker will not attempt to probe private, local, or Tailscale-style addresses.");
  } else if (canProbeFromHosted) {
    notes.push("Public HTTP(S) endpoints can be profiled by hosted checks once a fakenet status manifest is exposed.");
  } else {
    notes.push("Public gRPC endpoints still require a client-side runbook until a hosted gRPC probe is available.");
  }

  return {
    canProbeFromHosted,
    requiresClientSideRun: !canProbeFromHosted,
    networkAccess: canProbeFromHosted ? "public-http-only" : "client-side",
    notes
  };
}

function createProfileUrl(input: {
  endpoint: string;
  walletAddress: string;
  networkId: string;
  label: string;
}) {
  const url = new URL(`${registryCanonicalBaseUrl}/api/fakenet/connect`);
  url.searchParams.set("endpoint", input.endpoint);
  url.searchParams.set("walletAddress", input.walletAddress);
  url.searchParams.set("networkId", input.networkId);
  url.searchParams.set("label", input.label);
  return url.toString();
}

function createEvidenceUrl(endpoint: string, walletAddress: string) {
  const url = new URL(`${registryCanonicalBaseUrl}/api/fakenet/evidence/verify`);
  url.searchParams.set("grpcEndpoint", endpoint);
  url.searchParams.set("walletAddress", walletAddress);
  return url.toString();
}

function envAssignments(env: Record<string, string>) {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${shellQuote(value)}`)
    .join(" ");
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function stableId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isPrivateHost(host: string) {
  const normalizedHost = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".local") ||
    normalizedHost.endsWith(".lan") ||
    normalizedHost.endsWith(".internal") ||
    normalizedHost.endsWith(".home.arpa")
  ) {
    return true;
  }

  if (normalizedHost === "::1" || normalizedHost.startsWith("fc") || normalizedHost.startsWith("fd")) {
    return true;
  }

  const parts = normalizedHost.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}
