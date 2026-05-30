export type LabStatus = "pass" | "warn" | "fail";
export type LabStepType = "fakenet" | "poke" | "peek" | "invariant" | "bridge";
export type InvariantSeverity = "critical" | "high" | "medium" | "low";

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

export type StateDiff = {
  path: string;
  before: string;
  after: string;
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
    durationMs: number;
  };
  steps: LabStepReport[];
  invariants: InvariantReport[];
  stateDiffs: StateDiff[];
  nextActions: string[];
};

export const invariantCatalog = [
  {
    id: "state.numeric-min",
    name: "Numeric floor",
    purpose: "Verify a state value never drops below a configured minimum."
  },
  {
    id: "state.equals",
    name: "Expected state value",
    purpose: "Verify a path has an exact expected value after scripted interactions."
  },
  {
    id: "actors.poke-authorized",
    name: "Poke actor declared",
    purpose: "Verify every poke in the fixture has a declared actor."
  },
  {
    id: "balances.supply-conserved",
    name: "Supply conservation",
    purpose: "Verify account balances sum to the declared supply after a run."
  }
];

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
    durationMs: 128
  },
  steps: [
    {
      id: "boot-fakenet",
      type: "fakenet",
      title: "Boot mock fakenet profile",
      status: "pass",
      expectation: "gRPC endpoint configured at 127.0.0.1:5555",
      observed: "Mock endpoint accepted for deterministic run",
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
