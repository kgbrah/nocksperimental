export type LabStatus = "pass" | "warn" | "fail";
export type LabStepType = "fakenet" | "poke" | "peek" | "invariant" | "bridge";
export type InvariantSeverity = "critical" | "high" | "medium" | "low";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertState = "clear" | "triggered";
export type InvariantKind =
  | "numeric-min"
  | "state-equals"
  | "poke-actors-declared"
  | "supply-conservation"
  | "timeline-state"
  | "authorized-actor";

export type AppProfile = {
  name: string;
  slug: string;
  version: string;
  kernel: string;
};

export type LabEnvironment = {
  mode: "mock-fakenet" | "local-fakenet" | "docker-fakenet";
  grpcEndpoint: string;
  fakenetCommand: string;
  notes: string[];
};

export type LabStepReport = {
  id: string;
  type: LabStepType;
  title: string;
  status: LabStatus;
  actor?: string;
  target?: string;
  expectation: string;
  observed: string;
  beforeHash: string;
  afterHash: string;
  stateDiffs: StateDiff[];
  durationMs: number;
};

export type InvariantReport = {
  id: string;
  title: string;
  severity: InvariantSeverity;
  status: LabStatus;
  observed: string;
  expected: string;
};

export type AlertReport = {
  id: string;
  title: string;
  severity: AlertSeverity;
  state: AlertState;
  observed: string;
  condition: string;
  message: string;
};

export type StateDiff = {
  path: string;
  before: string;
  after: string;
};

export type StateSnapshot = {
  label: string;
  stepId?: string;
  stateHash: string;
  state: Record<string, unknown>;
};

export type InvariantPackRef = {
  id: string;
  name: string;
  domain?: string;
  version?: string;
  path: string;
};

export type LabRunReport = {
  reportId: string;
  fixtureId: string;
  generatedAt: string;
  app: AppProfile;
  environment: LabEnvironment;
  summary: {
    status: LabStatus;
    stepsPassed: number;
    stepsFailed: number;
    invariantsPassed: number;
    invariantsFailed: number;
    alertsClear: number;
    alertsTriggered: number;
    snapshotsCaptured: number;
    durationMs: number;
  };
  invariantPacks: InvariantPackRef[];
  steps: LabStepReport[];
  invariants: InvariantReport[];
  alerts: AlertReport[];
  stateSnapshots: StateSnapshot[];
  stateDiffs: StateDiff[];
  nextActions: string[];
};

export type InvariantCatalogItem = {
  id: string;
  kind: InvariantKind;
  name: string;
  purpose: string;
  requiredFields: string[];
  example: string;
};

export const invariantCatalog = [
  {
    id: "state.numeric-min.v0",
    kind: "numeric-min",
    name: "Numeric floor",
    purpose: "Verify a state value never drops below a configured minimum.",
    requiredFields: ["path", "min"],
    example: "counter >= 0"
  },
  {
    id: "state.equals.v0",
    kind: "state-equals",
    name: "Expected state value",
    purpose: "Verify a path has an exact expected value after scripted interactions.",
    requiredFields: ["path", "equals"],
    example: "bridge.status == finalized"
  },
  {
    id: "actors.poke-declared.v0",
    kind: "poke-actors-declared",
    name: "Poke actor declared",
    purpose: "Verify every poke in the fixture has a declared actor.",
    requiredFields: [],
    example: "2/2 poke steps declare actors from fixture.actors"
  },
  {
    id: "balances.supply-conserved.v0",
    kind: "supply-conservation",
    name: "Supply conservation",
    purpose: "Verify account balances sum to the declared supply after a run.",
    requiredFields: ["balancesPath", "supplyPath"],
    example: "sum(balances) == totalSupply"
  },
  {
    id: "timeline.expected-state.v0",
    kind: "timeline-state",
    name: "Expected timeline state",
    purpose: "Verify an operational lifecycle reaches a required terminal state.",
    requiredFields: ["path", "equals"],
    example: "settlement.status == finalized"
  },
  {
    id: "actors.authorized.v0",
    kind: "authorized-actor",
    name: "Authorized actor",
    purpose: "Verify all steps of a type are performed by an allowed actor set.",
    requiredFields: ["actors", "stepType"],
    example: "all poke actors in [merchant, treasury]"
  }
] satisfies InvariantCatalogItem[];

export const sampleLabReport: LabRunReport = {
  reportId: "lab_hello_counter_001",
  fixtureId: "hello-counter-v0",
  generatedAt: "2026-05-30T00:00:00.000Z",
  app: {
    name: "Hello Counter",
    slug: "hello-counter",
    version: "0.0.1",
    kernel: "hoon-counter-v0"
  },
  environment: {
    mode: "mock-fakenet",
    grpcEndpoint: "127.0.0.1:5555",
    fakenetCommand:
      "nockchain --fakenet --bind-public-grpc-addr 127.0.0.1:5555 --no-default-peers",
    notes: [
      "Modeled after the official local fakenet flow.",
      "This report is mock-backed until the adapter can call a live node."
    ]
  },
  summary: {
    status: "pass",
    stepsPassed: 4,
    stepsFailed: 0,
    invariantsPassed: 4,
    invariantsFailed: 0,
    alertsClear: 0,
    alertsTriggered: 0,
    snapshotsCaptured: 5,
    durationMs: 128
  },
  invariantPacks: [],
  steps: [
    {
      id: "boot-fakenet",
      type: "fakenet",
      title: "Boot mock fakenet profile",
      status: "pass",
      expectation: "gRPC endpoint configured at 127.0.0.1:5555",
      observed: "Mock endpoint accepted for deterministic run",
      beforeHash: "7f278f7d37bf2b99",
      afterHash: "7f278f7d37bf2b99",
      stateDiffs: [],
      durationMs: 24
    },
    {
      id: "poke-increment-alice",
      type: "poke",
      title: "Alice increments counter",
      status: "pass",
      actor: "alice",
      target: "/counter",
      expectation: "counter moves from 0 to 1",
      observed: "counter=1",
      beforeHash: "7f278f7d37bf2b99",
      afterHash: "3e0e6d4db4892e2d",
      stateDiffs: [{ path: "counter", before: "0", after: "1" }],
      durationMs: 31
    },
    {
      id: "poke-increment-bob",
      type: "poke",
      title: "Bob increments counter",
      status: "pass",
      actor: "bob",
      target: "/counter",
      expectation: "counter moves from 1 to 2",
      observed: "counter=2",
      beforeHash: "3e0e6d4db4892e2d",
      afterHash: "937aeb078db9aa10",
      stateDiffs: [
        { path: "counter", before: "1", after: "2" },
        { path: "balances.alice", before: "1000", after: "700" },
        { path: "balances.bob", before: "0", after: "300" }
      ],
      durationMs: 29
    },
    {
      id: "peek-counter",
      type: "peek",
      title: "Read counter value",
      status: "pass",
      target: "/counter",
      expectation: "peek returns 2",
      observed: "2",
      beforeHash: "937aeb078db9aa10",
      afterHash: "937aeb078db9aa10",
      stateDiffs: [],
      durationMs: 44
    }
  ],
  invariants: [
    {
      id: "counter-non-negative",
      title: "Counter is never negative",
      severity: "critical",
      status: "pass",
      observed: "2",
      expected: ">= 0"
    },
    {
      id: "counter-final-value",
      title: "Counter final value matches fixture",
      severity: "medium",
      status: "pass",
      observed: "2",
      expected: "2"
    },
    {
      id: "poke-actors-declared",
      title: "Every poke has a declared actor",
      severity: "high",
      status: "pass",
      observed: "2/2 poke steps declared actors",
      expected: "all poke steps declare actors"
    },
    {
      id: "supply-conserved",
      title: "NOCK-denominated balances conserve supply",
      severity: "critical",
      status: "pass",
      observed: "alice=700, bob=300, total=1000",
      expected: "totalSupply=1000"
    }
  ],
  alerts: [],
  stateSnapshots: [
    {
      label: "Initial state",
      stateHash: "7f278f7d37bf2b99",
      state: { counter: 0, totalSupply: 1000, balances: { alice: 1000, bob: 0 } }
    },
    {
      label: "After boot-fakenet",
      stepId: "boot-fakenet",
      stateHash: "7f278f7d37bf2b99",
      state: { counter: 0, totalSupply: 1000, balances: { alice: 1000, bob: 0 } }
    },
    {
      label: "After poke-increment-alice",
      stepId: "poke-increment-alice",
      stateHash: "3e0e6d4db4892e2d",
      state: { counter: 1, totalSupply: 1000, balances: { alice: 1000, bob: 0 } }
    },
    {
      label: "After poke-increment-bob",
      stepId: "poke-increment-bob",
      stateHash: "937aeb078db9aa10",
      state: { counter: 2, totalSupply: 1000, balances: { alice: 700, bob: 300 } }
    },
    {
      label: "After peek-counter",
      stepId: "peek-counter",
      stateHash: "937aeb078db9aa10",
      state: { counter: 2, totalSupply: 1000, balances: { alice: 700, bob: 300 } }
    }
  ],
  stateDiffs: [
    {
      path: "counter",
      before: "0",
      after: "2"
    },
    {
      path: "balances.bob",
      before: "0",
      after: "300"
    }
  ],
  nextActions: [
    "Replace mock step execution with a local fakenet gRPC adapter.",
    "Persist generated reports under a project workspace.",
    "Add per-app invariant packs for payment, intent, bridge, and token workflows."
  ]
};
