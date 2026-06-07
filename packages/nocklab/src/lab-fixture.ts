// Fixture-authoring types for nocklab. This file is self-contained (no imports) so it
// can ship as the package's typed entry. It mirrors the runtime source of truth,
// schemas/nockapp-lab-fixture.schema.json; the schema (bundled at build time) remains
// authoritative for validation — these types are for editor autocomplete + checking.

export type LabMode = "mock-fakenet" | "local-fakenet" | "docker-fakenet" | "kernel";
export type LabStepType = "fakenet" | "poke" | "peek" | "invariant" | "bridge";
export type InvariantSeverity = "critical" | "high" | "medium" | "low";
export type AlertSeverity = "critical" | "warning" | "info";

export type InvariantKind =
  | "numeric-min"
  | "state-equals"
  | "poke-actors-declared"
  | "supply-conservation"
  | "timeline-state"
  | "authorized-actor"
  | "numeric-range"
  | "array-length-min"
  | "array-length-max"
  | "temporal-ordering"
  | "custom-function";

export interface AppProfile {
  name: string;
  slug: string;
  version: string;
  kernel: string;
}

export interface LabEnvironment {
  mode: LabMode;
  grpcEndpoint: string;
  fakenetCommand: string;
  notes: string[];
  /** local-fakenet only: a command whose stdout is parsed for a NOCK balance. */
  balanceCheck?: Record<string, unknown>;
  /** local-fakenet only: a command whose stdout is parsed for chain metadata. */
  chainCheck?: Record<string, unknown>;
}

export interface Actor {
  name: string;
  pkh: string;
}

/** A state mutation applied while running a step (set / increment / transfer / append-event). */
export interface Operation {
  kind: "set" | "increment" | "transfer" | "append-event" | (string & {});
  path?: string;
  value?: unknown;
  by?: number;
  fromPath?: string;
  toPath?: string;
  amount?: number;
}

export interface StepExpectation {
  path: string;
  equals: unknown;
}

/** A command-backed peek/poke adapter (local-fakenet mode): run a program against a
 * live node and assert on its output. The program is whatever is on PATH (e.g.
 * `nockchain-wallet`). */
export interface StepAdapter {
  command: { program: string; args?: string[] };
  /** Command timeout in milliseconds (default 15000). Raise for slow node-backed commands. */
  timeoutMs?: number;
  expect?: { stdoutIncludes?: string };
}

export interface LabStep {
  id: string;
  type: LabStepType;
  title: string;
  actor?: string;
  target?: string;
  expectation?: string;
  expect?: StepExpectation;
  operation?: Operation;
  operations?: Operation[];
  statePatch?: Record<string, unknown>;
  /** local-fakenet only: a command-backed poke/peek adapter. */
  adapter?: StepAdapter;
}

export interface InvariantSpec {
  id: string;
  title: string;
  severity: InvariantSeverity;
  kind: InvariantKind;
  path?: string;
  min?: number;
  max?: number;
  equals?: unknown;
  balancesPath?: string;
  supplyPath?: string;
  actors?: string[];
  stepType?: LabStepType;
  /** temporal-ordering: the element field compared within the ordered log array. */
  field?: string;
  /** temporal-ordering: the field value that must appear first. */
  before?: unknown;
  /** temporal-ordering: the field value that must appear later. */
  after?: unknown;
  /** custom-function: the name of a runner-registered allowlisted function. */
  fn?: string;
  packId?: string;
}

export interface AlertPolicy {
  id: string;
  title: string;
  severity: AlertSeverity;
  condition: { path: string; equals: unknown };
  message: string;
  clearMessage: string;
}

export interface LabFixture {
  $schema?: string;
  id: string;
  app: AppProfile;
  environment: LabEnvironment;
  actors?: Actor[];
  /** Relative paths to invariant packs, resolved relative to the fixture file. */
  invariantPacks?: string[];
  initialState: Record<string, unknown>;
  steps: LabStep[];
  invariants: InvariantSpec[];
  alertPolicies?: AlertPolicy[];
}

/**
 * Author a NockApp lab fixture in TypeScript with full type-checking and autocomplete.
 * A typed-identity helper: it returns the fixture unchanged so it can be exported and
 * fed to `nocklab` (e.g. write it to JSON, or import it in a fixture-generation script).
 *
 * @example
 * import { defineFixture } from "nocklab";
 * export default defineFixture({
 *   id: "my-app-v0",
 *   app: { name: "My App", slug: "my-app", version: "0.1.0", kernel: "my-kernel" },
 *   environment: { mode: "mock-fakenet", grpcEndpoint: "127.0.0.1:5555", fakenetCommand: "fakenock --start", notes: [] },
 *   initialState: { counter: 0 },
 *   steps: [{ id: "boot", type: "fakenet", title: "Boot" }],
 *   invariants: [{ id: "counter-floor", title: "counter >= 0", severity: "high", kind: "numeric-min", path: "counter", min: 0 }]
 * });
 */
export function defineFixture<T extends LabFixture>(fixture: T): T {
  return fixture;
}
