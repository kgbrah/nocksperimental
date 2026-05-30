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
      "Every serious NockApp will need deterministic local tests before value can safely flow through it.",
    revenue: ["CI subscriptions", "Team workspaces", "Paid audit reports"],
    capitalIntensity: "Low",
    upside: "High",
    firstMilestone: "Model a test run with fakenet setup, scripted pokes, peeks, and pass/fail output.",
    deliverables: ["Fakenet profile schema", "Scripted interaction format", "Run report JSON"]
  },
  {
    rank: 2,
    name: "State Replay + Invariants",
    category: "Security analysis",
    horizon: "Now",
    thesis:
      "The long-term trust layer is not app discovery; it is proving state transitions obey economic invariants.",
    revenue: ["Verification badges", "Audit retainers", "Private report exports"],
    capitalIntensity: "Low",
    upside: "Very high",
    firstMilestone:
      "Define invariant fixtures for conservation, authorization, upgrade migration, and invalid input handling.",
    deliverables: ["Invariant catalog", "Snapshot diff format", "Shareable report page"]
  },
  {
    rank: 3,
    name: "Intent Simulator",
    category: "Solver tooling",
    horizon: "Next",
    thesis:
      "As intent-based apps emerge, builders will need to simulate solver behavior before exposing real settlement paths.",
    revenue: ["Solver QA plans", "Execution-quality reports", "Market-maker tooling"],
    capitalIntensity: "Low-medium",
    upside: "Very high",
    firstMilestone: "Create a mock intent lifecycle from declaration through solver response and settlement result.",
    deliverables: ["Intent fixture schema", "Solver replay log", "Failure classification"]
  },
  {
    rank: 4,
    name: "Bridge + Settlement Monitor",
    category: "Operations",
    horizon: "Next",
    thesis:
      "Bridge users, funds, and apps need reconciliation, stuck-withdrawal alerts, and proof/status timelines.",
    revenue: ["Ops subscriptions", "Alert seats", "Treasury monitoring"],
    capitalIntensity: "Low-medium",
    upside: "High",
    firstMilestone: "Ship a monitor model that tracks a transfer lifecycle and emits alert-ready states.",
    deliverables: ["Transfer timeline", "Alert policy schema", "Reconciliation report"]
  },
  {
    rank: 5,
    name: "Native Token Test Harness",
    category: "Standards readiness",
    horizon: "Later",
    thesis:
      "Before native tokens get crowded, own the testing surface for issuers, wallets, and protocol integrators.",
    revenue: ["Issuer verification", "Wallet compatibility checks", "Compliance exports"],
    capitalIntensity: "Low",
    upside: "High",
    firstMilestone: "Draft token invariants for supply, mint/burn authority, metadata, and transfer behavior.",
    deliverables: ["Token invariant pack", "Compatibility checklist", "Issuer report"]
  },
  {
    rank: 6,
    name: "Compute Benchmark Reports",
    category: "Compute markets",
    horizon: "Later",
    thesis:
      "Compute brokers will be contested; neutral benchmarking and provider reputation can be built before markets mature.",
    revenue: ["Provider reports", "Benchmark leaderboards", "Job-quality attestations"],
    capitalIntensity: "Medium-high",
    upside: "Very high",
    firstMilestone: "Define benchmark report formats without operating hardware or routing live jobs.",
    deliverables: ["Benchmark spec", "Provider profile", "SLA scoring model"]
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
      "Mock fakenet/test-run fixtures"
    ],
    proofOfValue: "A developer can understand what would be tested and what report they would get."
  },
  {
    timeframe: "30-90 days",
    objective: "Connect to real developer workflows.",
    ship: [
      "CLI command for local report generation",
      "Fixture-driven peek/poke simulation",
      "CI-friendly JSON and Markdown reports",
      "Bridge monitor model with alert states"
    ],
    proofOfValue: "A NockApp repo can run a repeatable check and publish a report artifact."
  },
  {
    timeframe: "3-6 months",
    objective: "Become the default pre-audit layer.",
    ship: [
      "State snapshot diffing",
      "Invariant packs for payments, intents, and token issuance",
      "Hosted report history",
      "Private team workspaces"
    ],
    proofOfValue: "Teams use the lab before launch, audits, upgrades, and integrations."
  },
  {
    timeframe: "6-18 months",
    objective: "Turn testing data into ecosystem trust infrastructure.",
    ship: [
      "Verified report badges",
      "Solver execution-quality scoring",
      "Native token compatibility reports",
      "Compute provider benchmark profiles"
    ],
    proofOfValue: "Apps, wallets, funds, and providers use Nocksperimental reports as trust signals."
  }
];

export const parallelTracks: ParallelTrack[] = [
  {
    name: "Bridge + Settlement Monitor",
    whyItMatters:
      "Bridge activity creates operational pain early: stuck transfers, reconciliation, proof status, and alerts.",
    sharedCore: "Reuses event ingestion, timelines, report exports, and alert policies.",
    firstArtifact: "A mock transfer timeline with states for initiated, observed, finalized, delayed, and failed."
  },
  {
    name: "Native Token Test Harness",
    whyItMatters:
      "The native token standard is later on the roadmap, but issuers will need safety checks as soon as it lands.",
    sharedCore: "Reuses invariant packs, snapshot diffs, and compatibility reports.",
    firstArtifact: "A supply-conservation and authority-check invariant pack."
  },
  {
    name: "Intent Simulator",
    whyItMatters:
      "Intent-based execution needs simulation before solver networks and private DeFi become production-grade.",
    sharedCore: "Reuses scripted runs, failure classification, and execution-quality scoring.",
    firstArtifact: "A fixture format for intent declaration, solver response, proof status, and settlement result."
  },
  {
    name: "Compute Benchmark Reports",
    whyItMatters:
      "Compute markets will be capital intensive; neutral benchmarking lets us enter without owning hardware.",
    sharedCore: "Reuses report identity, scoring, provider profiles, and verification badges.",
    firstArtifact: "A benchmark report schema for providers and job classes."
  }
];
