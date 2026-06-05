# VESL Evidence Bridge Design

## Status

Approved direction: Option C.

Build the first working VESL evidence bridge inside Nocksperimental, then use the proven report shape to propose a small upstream VESL contribution.

## Context

Nocksperimental already has a fixture-driven lab runner, `LabRunReport` artifacts, local fakenet diagnostics, public verification surfaces, and persisted fakenet evidence receipts. VESL provides a NockApp scaffold/toolchain around grafted Hoon kernels, Rust hulls, `vesl-test`, `vesl-hull`, and fakenet settlement flows.

The projects meet at the evidence boundary:

- VESL produces verifiable NockApp lifecycle events.
- Nocksperimental can turn lifecycle events into durable reports and public receipts.

## Goals

- Add a VESL-specific evidence path to Nocksperimental without requiring upstream VESL changes first.
- Normalize VESL lifecycle evidence into the existing `LabRunReport` shape.
- Publish and persist VESL evidence receipts through a clean public API namespace.
- Create a concrete collaboration artifact for the VESL maintainer that explains the flywheel for both projects.
- Leave a clear path toward an upstream VESL PR once the report schema is proven locally.

## Non-Goals

- Do not hand-edit VESL synced paths such as `vesl-core`, `vesl-wallet`, or bundled Hoon graft libraries.
- Do not require Nocksperimental to compile VESL from scratch in the first slice.
- Do not store raw private keys, wallet seeds, API keys, or unredacted environment dumps.
- Do not make Nocksperimental a replacement for `vesl-test` or `vesl-hull`.

## Approach

Use a two-step bridge.

1. Nocksperimental-side adapter.
   Build VESL fixture support, report normalization, and public evidence APIs in this repo. The adapter accepts captured command output and optional HTTP snapshots from a VESL app.

2. Upstream-friendly export proposal.
   After the Nocksperimental adapter is proven, propose either a `vesl-test` JSON/report export mode or a `vesl-hull` evidence endpoint upstream so VESL users can emit the same payload natively.

## Architecture

### New VESL Report Module

Add a VESL adapter module that converts VESL observations into `LabRunReport`.

Inputs:

- `verifyJam`: result from `vesl-test verify-jam`.
- `peeks`: one or more `vesl-test inspect peek` observations.
- `effects`: lifecycle events from `vesl-test watch`, `cargo run`, or a captured JSON/line stream.
- `hull`: optional `vesl-hull` snapshots from `/health`, `/status`, `/verify`, and `/tx/:tx_id`.
- `fakenet`: optional endpoint, wallet, settlement mode, transaction id, and chain acceptance signal.

Output:

- `LabRunReport` with `app.slug = "vesl-evidence-bridge"`.
- Steps for `verify-jam`, `peek`, `effect-watch`, `hull-health`, `hull-status`, and optional `fakenet-settlement`.
- Adapter observations that preserve VESL-specific metadata without forcing it into generic fakenet fields.
- State snapshots that hash the normalized VESL evidence payload.

### Public API Namespace

Add a VESL namespace separate from `/api/fakenet`:

- `GET /api/vesl/evidence/submit`
  Returns help metadata and example payload.
- `POST /api/vesl/evidence/submit`
  Accepts normalized VESL evidence input, returns and persists a VESL receipt.
- `GET /api/vesl/evidence/receipts`
  Lists recent persisted VESL receipts.
- `GET /api/vesl/evidence/receipts/{receiptId}`
  Reads a persisted VESL receipt by id.

The receipt store should reuse the existing Cloudflare KV pattern with a dedicated `NOCKS_VESL_RECEIPTS` binding. Keeping VESL receipts out of the fakenet namespace lets the receipt schema evolve without mixing unrelated index entries.

### Local Fixture

Add a sample fixture and deterministic test payload that represent a minimal VESL lifecycle:

- `verify-jam`: fresh.
- `effects`: includes `%settle-registered` and `%settle-noted`.
- `peek`: confirms a known settle path is present.
- `hull.health`: ok.
- `hull.status`: includes settlement mode, active gate, and graft list.

The first fixture can be static. A later slice can add a command-backed runner that invokes a local VESL checkout.

### Documentation Surface

Update:

- README with the VESL evidence bridge quickstart.
- Registry manifest and `.well-known` capabilities.
- OpenAPI spec.
- Keep the first slice API-first. Add a future `/vesl` page only after a live VESL demo report exists.

## Data Model

Use a VESL submission input shaped around evidence sources:

```json
{
  "connection": {
    "project": "vesl-demo",
    "repo": "zkvesl/vesl-nockup",
    "template": "vesl",
    "settlementMode": "local",
    "chainEndpoint": "http://127.0.0.1:5555"
  },
  "verifyJam": {
    "status": "fresh",
    "projectPath": ".",
    "outJam": "out.jam",
    "fingerprint": "sha256:..."
  },
  "effects": [
    { "tag": "%settle-registered", "source": "vesl-test watch" },
    { "tag": "%settle-noted", "source": "vesl-test watch" }
  ],
  "peeks": [
    { "path": "[%settle-registered 1 ~]", "status": "present" }
  ],
  "hull": {
    "health": { "status": "ok" },
    "status": { "settlementMode": "local", "activeGate": "default-hash" }
  }
}
```

Receipt ids should be deterministic over the project identity, effect tags, peek paths, and generated evidence hash.

## Validation

Accepted VESL evidence must have:

- A project identity.
- At least one VESL evidence source.
- No failed required checks.
- Unique effect ids or deterministic generated ids.
- No disallowed secret-like fields in known sensitive locations.

Verified VESL evidence should additionally have:

- `verifyJam.status = "fresh"`.
- Required effects include `%settle-registered` and `%settle-noted`.
- Required peeks are present.
- Hull health is ok when a hull snapshot is provided.
- Fakenet settlement is accepted when `settlementMode = "fakenet"`.

Accepted but not verified submissions return `status: "attention"` so users can still persist and share a diagnostic receipt.

## Testing

Start with TDD around the public submission route:

- RED: VESL submit test expects a persisted receipt, receipt index entry, receipt detail, registry capability, OpenAPI path, and README docs.
- GREEN: Implement the smallest adapter/store/API surface to pass.
- Add malformed payload tests for missing evidence, failed `verify-jam`, missing effects, and secret redaction.
- Extend Cloudflare preview smoke to submit a minimal VESL receipt and read it back.

## Rollout

1. Implement static VESL evidence submission and receipt persistence in Nocksperimental.
2. Deploy and verify on `nocksperimental.com`.
3. Share `docs/collabs/vesl-evidence-bridge.md` with the VESL maintainer.
4. Create a follow-up issue/PR plan for upstream `vesl-test` export support.
5. Add command-backed local VESL fixture execution after the static bridge is stable.

## Decisions

- Use a dedicated `NOCKS_VESL_RECEIPTS` KV binding.
- Keep the first slice API-first; defer `/vesl` UI until there is a live demo report.
- Prefer `vesl-test report --format nocksperimental` as the first upstream proposal because it fits VESL's existing test/inspection workflow and does not require hull server changes.
