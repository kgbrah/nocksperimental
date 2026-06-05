export type CapitalIntensity = "Low" | "Low-medium" | "Medium-high";
export type Upside = "Medium-high" | "High" | "Very high";

export type LabModule = {
  rank: number;
  name: string;
  category: string;
  horizon: "Now" | "Next" | "Later";
  thesis: string;
  revenue: string[];
  capitalIntensity: CapitalIntensity;
  upside: Upside;
  firstMilestone: string;
  deliverables: string[];
};

export type StrategyPhase = {
  timeframe: string;
  objective: string;
  ship: string[];
  proofOfValue: string;
};

export type ParallelTrack = {
  name: string;
  whyItMatters: string;
  sharedCore: string;
  firstArtifact: string;
};

export const labModules: LabModule[] = [
  {
    rank: 1,
    name: "NockApp Test Runner",
    category: "Core testing",
    horizon: "Now",
    thesis:
      "NockApp SDK builders need deterministic local checks before wallets, explorers, and users rely on their apps.",
    revenue: ["CI subscriptions", "Team workspaces", "Paid audit-readiness reports"],
    capitalIntensity: "Low",
    upside: "High",
    firstMilestone: "Model an SDK-era test run with fakenet setup, scripted pokes, peeks, and pass/fail output.",
    deliverables: ["Fakenet profile schema", "Scripted interaction format", "Wallet-ready run report JSON"]
  },
  {
    rank: 2,
    name: "State Replay + Invariants",
    category: "Security analysis",
    horizon: "Now",
    thesis:
      "Explorers can show what happened; Nocksperimental should help prove app state transitions obey the invariants builders promised.",
    revenue: ["Verification badges", "Audit retainers", "Explorer-ready report exports"],
    capitalIntensity: "Low",
    upside: "Very high",
    firstMilestone:
      "Define invariant fixtures for conservation, authorization, upgrade migration, replay, and invalid input handling.",
    deliverables: ["Invariant catalog", "Snapshot diff format", "Shareable explorer/auditor report page"]
  },
  {
    rank: 3,
    name: "Intent Simulator",
    category: "Solver tooling",
    horizon: "Next",
    thesis:
      "As programmable NockApps and solver-style flows emerge, builders will need to simulate execution quality before exposing real settlement paths.",
    revenue: ["Solver QA plans", "Execution-quality reports", "Market-maker tooling"],
    capitalIntensity: "Low-medium",
    upside: "Very high",
    firstMilestone: "Create a mock intent lifecycle from declaration through solver response, proof status, and settlement result.",
    deliverables: ["Intent fixture schema", "Solver replay log", "Failure classification"]
  },
  {
    rank: 4,
    name: "Bridge + Settlement Monitor",
    category: "Operations",
    horizon: "Next",
    thesis:
      "Bridge users, wallets, funds, and explorers need reconciliation, stuck-withdrawal alerts, and proof/status timelines.",
    revenue: ["Ops subscriptions", "Alert seats", "Wallet and treasury monitoring"],
    capitalIntensity: "Low-medium",
    upside: "High",
    firstMilestone: "Ship a Base-bridge monitor model that tracks a transfer lifecycle and emits alert-ready states.",
    deliverables: ["Transfer timeline", "Alert policy schema", "Wallet/explorer reconciliation report"]
  },
  {
    rank: 5,
    name: "Native Token Test Harness",
    category: "Standards readiness",
    horizon: "Later",
    thesis:
      "Before native tokens get crowded, own the testing surface for issuers, wallets, explorers, and protocol integrators.",
    revenue: ["Issuer verification", "Wallet compatibility checks", "Explorer compatibility exports"],
    capitalIntensity: "Low",
    upside: "High",
    firstMilestone: "Draft token invariants for supply, mint/burn authority, metadata, wallet display, and transfer behavior.",
    deliverables: ["Token invariant pack", "Wallet/explorer compatibility checklist", "Issuer report"]
  },
  {
    rank: 6,
    name: "Compute Benchmark Reports",
    category: "Compute markets",
    horizon: "Later",
    thesis:
      "Mining pools and future compute markets need neutral provider reputation before compute supply becomes a tradable surface.",
    revenue: ["Provider reports", "Benchmark leaderboards", "Pool and job-quality attestations"],
    capitalIntensity: "Medium-high",
    upside: "Very high",
    firstMilestone: "Define benchmark report formats for miners, pools, and providers without routing live jobs.",
    deliverables: ["Benchmark spec", "Provider profile", "Pool/provider scoring model"]
  }
];

export const strategyPhases: StrategyPhase[] = [
  {
    timeframe: "0-30 days",
    objective: "Make the wedge concrete.",
    ship: [
      "Static NockApp Lab dashboard",
      "Run report schema",
      "Invariant catalog v0",
      "Mock fakenet/test-run fixtures",
      "Ecosystem alignment notes for wallets, explorers, pools, and SDK builders"
    ],
    proofOfValue: "A developer or ecosystem partner can understand what would be tested and what report they would get."
  },
  {
    timeframe: "30-90 days",
    objective: "Connect to real developer workflows.",
    ship: [
      "CLI command for local report generation",
      "Fixture-driven peek/poke simulation",
      "CI-friendly JSON and Markdown reports",
      "Bridge monitor model with alert states",
      "Explorer and wallet report handoff formats"
    ],
    proofOfValue: "A NockApp repo can run a repeatable check and publish a report artifact wallets or explorers can consume."
  },
  {
    timeframe: "3-6 months",
    objective: "Become the default pre-audit layer.",
    ship: [
      "State snapshot diffing",
      "Invariant packs for payments, intents, and token issuance",
      "Hosted report history",
      "Private team workspaces",
      "Partner-specific report views for wallets, explorers, and infrastructure teams"
    ],
    proofOfValue: "Teams use the lab before launch, audits, upgrades, and partner integrations."
  },
  {
    timeframe: "6-18 months",
    objective: "Turn testing data into ecosystem trust infrastructure.",
    ship: [
      "Verified report badges",
      "Solver execution-quality scoring",
      "Native token compatibility reports",
      "Compute provider benchmark profiles",
      "Pool and bridge reliability signals"
    ],
    proofOfValue: "Apps, wallets, explorers, funds, pools, and providers use Nocksperimental reports as trust signals."
  }
];

export const parallelTracks: ParallelTrack[] = [
  {
    name: "Bridge + Settlement Monitor",
    whyItMatters:
      "Bridge activity creates operational pain for wallets, explorers, funds, and app teams: stuck transfers, reconciliation, proof status, and alerts.",
    sharedCore: "Reuses event ingestion, timelines, report exports, and alert policies.",
    firstArtifact: "A mock Base transfer timeline with states for initiated, observed, finalized, delayed, and failed."
  },
  {
    name: "Native Token Test Harness",
    whyItMatters:
      "The native token standard is later on the roadmap, but issuers, wallets, and explorers will need safety checks as soon as it lands.",
    sharedCore: "Reuses invariant packs, snapshot diffs, and compatibility reports.",
    firstArtifact: "A supply-conservation and authority-check invariant pack."
  },
  {
    name: "Intent Simulator",
    whyItMatters:
      "Intent-based execution needs simulation before solver networks, private DeFi, and wallet-routed actions become production-grade.",
    sharedCore: "Reuses scripted runs, failure classification, and execution-quality scoring.",
    firstArtifact: "A fixture format for intent declaration, solver response, proof status, and settlement result."
  },
  {
    name: "Compute Benchmark Reports",
    whyItMatters:
      "Compute markets and mining pools will be capital intensive; neutral benchmarking lets Nocksperimental help without owning hardware.",
    sharedCore: "Reuses report identity, scoring, provider profiles, and verification badges.",
    firstArtifact: "A benchmark report schema for miners, pools, providers, and job classes."
  }
];
