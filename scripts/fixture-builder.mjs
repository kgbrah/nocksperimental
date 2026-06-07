#!/usr/bin/env node

// Typed builder + lightweight validator for NockApp lab fixtures.
//
// Hand-authoring fixtures against the strict (`additionalProperties:false`)
// schema is error-prone, so `createFixture` emits an object that matches
// schemas/nockapp-lab-fixture.schema.json by construction, and `validateFixture`
// does a manual required-key/enum check (no ajv — it is transitive-only and
// unimported in this repo; this mirrors test-invariant-packs.mjs's manual
// schema-read pattern). The `new-fixture` verb in run-lab.mjs builds on these.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(moduleDir, "..", "schemas", "nockapp-lab-fixture.schema.json");

const ENVIRONMENT_MODES = ["mock-fakenet", "local-fakenet", "docker-fakenet"];

// Step types and invariant kind/severity enums. Exported so run-lab.mjs can
// reuse a single source of truth (the runner's runStep / evaluateInvariant rely
// on these), avoiding the previous character-identical duplication. Kept in sync
// with the fixture/pack JSON schemas and src/lib/lab-report.ts.
export const STEP_TYPES = ["fakenet", "poke", "peek", "invariant", "bridge"];
export const INVARIANT_KINDS = [
  "numeric-min",
  "state-equals",
  "poke-actors-declared",
  "supply-conservation",
  "timeline-state",
  "authorized-actor",
  "numeric-range",
  "array-length-min",
  "array-length-max",
  "temporal-ordering",
  "custom-function"
];
export const INVARIANT_SEVERITIES = ["critical", "high", "medium", "low"];

const DEFAULT_GRPC_ENDPOINT = "127.0.0.1:5555";
const DEFAULT_FAKENET_COMMAND = "fakenock --start";

/**
 * Build a schema-shaped fixture object from a small set of inputs, applying
 * sensible defaults. Emits exactly the allowed keys (no extras) so the result
 * passes the strict schema by construction.
 */
export function createFixture({
  id,
  app = {},
  environment = {},
  actors,
  initialState = {},
  steps = [],
  invariants = []
} = {}) {
  const slug = app.slug ?? "example-nockapp";

  const fixture = {
    $schema: "../schemas/nockapp-lab-fixture.schema.json",
    id: id ?? `${slug}-v0`,
    app: {
      name: app.name ?? "Example NockApp",
      slug,
      version: app.version ?? "0.0.1",
      kernel: app.kernel ?? "example-kernel"
    },
    environment: {
      mode: environment.mode ?? "mock-fakenet",
      grpcEndpoint: environment.grpcEndpoint ?? DEFAULT_GRPC_ENDPOINT,
      fakenetCommand: environment.fakenetCommand ?? DEFAULT_FAKENET_COMMAND,
      notes: environment.notes ?? ["Scaffolded by nocklab new-fixture."]
    },
    initialState,
    steps: steps.length > 0 ? steps : [defaultStep()],
    invariants
  };

  // `actors` is an optional top-level schema property; only emit it when given.
  if (Array.isArray(actors) && actors.length > 0) {
    fixture.actors = actors;
  }

  return fixture;
}

function defaultStep() {
  return {
    id: "boot-fakenet",
    type: "fakenet",
    title: "Boot mock fakenet profile",
    expectation: `gRPC endpoint configured at ${DEFAULT_GRPC_ENDPOINT}`
  };
}

/**
 * Scaffold a peek- or poke-flavored fixture for a given app slug. Defaults to a
 * `mock-fakenet` environment so the generated fixture round-trips cleanly
 * (a `local-fakenet` scaffold would report status:"fail" offline with no live
 * gRPC / fakenock binary).
 */
export function scaffoldFixture({ slug, type = "peek", endpoint = DEFAULT_GRPC_ENDPOINT } = {}) {
  if (!slug || typeof slug !== "string") {
    throw new Error("new-fixture requires a non-empty --slug");
  }
  // The slug is both interpolated into ids (id/kernel/step/invariant ids) and
  // used to derive the default output path in run-lab.mjs. Restrict it to a safe
  // lowercase kebab token so it cannot escape `fixtures/` via path traversal or
  // inject unexpected characters into the generated ids.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(
      `new-fixture --slug must match ^[a-z0-9][a-z0-9-]*$ (lowercase letters, digits, dashes), got ${JSON.stringify(slug)}`
    );
  }
  if (type !== "peek" && type !== "poke") {
    throw new Error(`new-fixture --type must be peek or poke, got ${JSON.stringify(type)}`);
  }

  const name = slugToTitle(slug);
  const actorName = "scaffold-actor";

  // A poke step's actor must be declared in `actors`, or the runner fails the
  // step. Declare the scaffold actor only for the poke flavor.
  const actors =
    type === "poke" ? [{ name: actorName, pkh: "scaffold-pkh-0000000000000000" }] : undefined;

  const step =
    type === "poke"
      ? {
          id: `${slug}-poke-increment`,
          type: "poke",
          title: `${name} increments a counter`,
          actor: actorName,
          target: "/counter",
          input: { action: "increment", by: 1 },
          operation: { kind: "increment", path: "counter", by: 1 },
          expect: { path: "counter", equals: 1 }
        }
      : {
          id: `${slug}-peek-counter`,
          type: "peek",
          title: `${name} peeks the counter`,
          target: "/counter",
          expectation: "counter is readable through a mock peek",
          expect: { path: "counter", equals: 0 }
        };

  return createFixture({
    id: `${slug}-v0`,
    app: {
      name,
      slug,
      version: "0.0.1",
      kernel: `${slug}-kernel`
    },
    environment: {
      mode: "mock-fakenet",
      grpcEndpoint: endpoint,
      fakenetCommand: DEFAULT_FAKENET_COMMAND,
      notes: [
        `Scaffolded by nocklab new-fixture (${type}).`,
        "Mock-backed so it passes offline; point it at your NockApp once an adapter is wired."
      ]
    },
    actors,
    initialState: { counter: 0 },
    steps: [step],
    invariants: [
      {
        id: `${slug}-counter-non-negative`,
        title: "Counter stays non-negative",
        severity: "medium",
        kind: "numeric-min",
        path: "counter",
        min: 0
      }
    ]
  });
}

function slugToTitle(slug) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Lightweight required-key / enum validation against the fixture schema.
 * Reads the JSON schema for its required-key lists and enums (no ajv).
 * Returns an array of error strings; empty means valid.
 */
export function validateFixture(fixture, { schema = loadSchema() } = {}) {
  const errors = [];

  if (fixture === null || typeof fixture !== "object" || Array.isArray(fixture)) {
    return ["fixture must be a JSON object"];
  }

  // Derive the allowed key sets straight from the schema's declared properties
  // (honoring its `additionalProperties:false` on `app`/`environment`) so the
  // allow-lists never drift from the schema.
  const allowedAppKeys = Object.keys(schema.properties.app.properties);
  const allowedEnvKeys = Object.keys(schema.properties.environment.properties);

  for (const key of schema.required) {
    if (!(key in fixture)) {
      errors.push(`missing required field: ${key}`);
    }
  }

  // app
  if (isObject(fixture.app)) {
    for (const key of schema.properties.app.required) {
      if (!(key in fixture.app)) errors.push(`app missing required field: ${key}`);
    }
    for (const key of Object.keys(fixture.app)) {
      if (!allowedAppKeys.includes(key)) errors.push(`app has unexpected field: ${key}`);
    }
  } else if ("app" in fixture) {
    errors.push("app must be an object");
  }

  // environment
  if (isObject(fixture.environment)) {
    for (const key of schema.properties.environment.required) {
      if (!(key in fixture.environment)) errors.push(`environment missing required field: ${key}`);
    }
    for (const key of Object.keys(fixture.environment)) {
      if (!allowedEnvKeys.includes(key)) {
        errors.push(`environment has unexpected field: ${key}`);
      }
    }
    if ("mode" in fixture.environment && !ENVIRONMENT_MODES.includes(fixture.environment.mode)) {
      errors.push(
        `environment.mode ${JSON.stringify(fixture.environment.mode)} is not one of ${ENVIRONMENT_MODES.join("|")}`
      );
    }
  } else if ("environment" in fixture) {
    errors.push("environment must be an object");
  }

  // steps
  if (Array.isArray(fixture.steps)) {
    if (fixture.steps.length === 0) errors.push("steps must contain at least one step");
    fixture.steps.forEach((step, index) => {
      if (!isObject(step)) {
        errors.push(`steps[${index}] must be an object`);
        return;
      }
      for (const key of ["id", "type", "title"]) {
        if (!(key in step)) errors.push(`steps[${index}] missing required field: ${key}`);
      }
      if ("type" in step && !STEP_TYPES.includes(step.type)) {
        errors.push(`steps[${index}].type ${JSON.stringify(step.type)} is not one of ${STEP_TYPES.join("|")}`);
      }
    });
  } else if ("steps" in fixture) {
    errors.push("steps must be an array");
  }

  // invariants
  if (Array.isArray(fixture.invariants)) {
    fixture.invariants.forEach((invariant, index) => {
      if (!isObject(invariant)) {
        errors.push(`invariants[${index}] must be an object`);
        return;
      }
      for (const key of ["id", "title", "severity", "kind"]) {
        if (!(key in invariant)) errors.push(`invariants[${index}] missing required field: ${key}`);
      }
      if ("severity" in invariant && !INVARIANT_SEVERITIES.includes(invariant.severity)) {
        errors.push(
          `invariants[${index}].severity ${JSON.stringify(invariant.severity)} is not one of ${INVARIANT_SEVERITIES.join("|")}`
        );
      }
      if ("kind" in invariant && !INVARIANT_KINDS.includes(invariant.kind)) {
        errors.push(
          `invariants[${index}].kind ${JSON.stringify(invariant.kind)} is not one of ${INVARIANT_KINDS.join("|")}`
        );
      }
    });
  } else if ("invariants" in fixture) {
    errors.push("invariants must be an array");
  }

  return errors;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function loadSchema() {
  return JSON.parse(readFileSync(schemaPath, "utf8"));
}
