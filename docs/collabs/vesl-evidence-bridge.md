# VESL x Nocksperimental Evidence Bridge

## Short Version

VESL makes it easier to build verifiable NockApps. Nocksperimental makes it easier to test, publish, and share evidence that a NockApp actually behaved correctly.

Those two loops fit together well:

1. Build a VESL app.
2. Run the VESL lifecycle locally or on fakenet.
3. Capture `vesl-test` / `vesl-hull` evidence.
4. Publish a Nocksperimental receipt that anyone can inspect.

That gives VESL builders public, durable proof of app behavior, and gives Nocksperimental a real NockApp toolchain to validate against.

## Why This Is Worth Doing

VESL is already focused on the hard kernel-facing layer: grafts, verification gates, Rust hulls, settlement, and test harnesses. Nocksperimental is focused on the surrounding trust layer: test reports, fakenet diagnostics, registry discovery, receipts, and external verification surfaces.

Together, we can create a useful flywheel for the Nockchain ecosystem:

- VESL apps produce structured execution evidence.
- Nocksperimental turns that evidence into public reports and receipts.
- Developers get faster feedback while building.
- Reviewers get a stable artifact to inspect.
- Future NockApps get a reusable path from local testing to public trust.

## First Integration Proposal

Start with a small evidence bridge in Nocksperimental.

The first bridge accepts a JSON payload containing:

- `vesl-test verify-jam` freshness result.
- `vesl-test inspect peek` observations.
- lifecycle effects such as `%settle-registered` and `%settle-noted`.
- optional `vesl-hull` `/health`, `/status`, `/verify`, and `/tx/:tx_id` snapshots.
- optional fakenet endpoint and settlement metadata.

Nocksperimental normalizes this into a lab report and persists a receipt.

Example public surfaces:

- `POST /api/vesl/evidence/submit`
- `GET /api/vesl/evidence/receipts`
- `GET /api/vesl/evidence/receipts/{receiptId}`

## Near-Term Upstream Possibility

Once the receipt shape is proven, the nicest VESL-side contribution might be one of:

- `vesl-test report --format nocksperimental`
- `vesl-test inspect ... --json` extensions that map directly to the bridge schema
- a `vesl-hull /evidence` endpoint that emits current health, status, active gate, graft manifest hashes, and recent settlement effects

The goal is not to push Nocksperimental into VESL internals. The goal is to make VESL's existing test and hull surfaces easier to share with outside reviewers.

## What Nocksperimental Can Contribute

- A public receipt endpoint and persisted evidence index.
- A lab-report schema for VESL app lifecycle checks.
- Cloudflare-hosted discovery surfaces: OpenAPI, `.well-known`, registry manifest.
- Fakenet diagnostics and BYO fakenet profile support.
- A first demo report for a VESL scaffolded app.

## What VESL Already Brings

- A real NockApp scaffold path through `nockup`.
- Hoon grafts and verification gates.
- Rust hull APIs.
- `vesl-test` for peeks, watch streams, and JAM freshness.
- Fakenet settlement walkthroughs.
- Agent-readable docs through `llms.txt` and per-page markdown.

## Suggested Collaboration Path

1. Nocksperimental ships a first static VESL evidence bridge and receipt demo.
2. We share the payload schema and a live receipt with VESL.
3. VESL reviews whether the schema matches their preferred surfaces.
4. We adapt the schema based on feedback.
5. We open a small upstream PR only after the bridge shape is boring and obvious.

## A Concrete Demo Target

A good first demo receipt would prove:

- `out.jam` is fresh.
- the app emitted `%settle-registered`.
- the app emitted `%settle-noted`.
- a settle-related peek returns present state.
- the hull `/health` endpoint returns ok.
- optional: a fakenet settlement produced a transaction id and reached acceptance.

That is enough for a builder, reviewer, or agent to see that a VESL app completed a meaningful lifecycle rather than only compiling.

## Draft Message

Hey, we took a closer look at VESL and think our paths line up pretty naturally.

VESL is doing the hard kernel/toolchain side: grafts, gates, Rust hulls, `vesl-test`, fakenet settlement. Nocksperimental is shaping up around the surrounding evidence layer: test reports, fakenet diagnostics, public receipts, OpenAPI/registry discovery, and shareable verification surfaces.

We would like to build a small VESL evidence bridge on the Nocksperimental side first. The idea is to accept structured output from `vesl-test` and/or `vesl-hull`, normalize it into a Nocksperimental lab report, and persist a public receipt. A minimal receipt would show things like fresh `out.jam`, `%settle-registered`, `%settle-noted`, relevant peek state, hull health/status, and optional fakenet tx acceptance.

If that shape feels useful, the next step could be a tiny upstream-friendly export path like `vesl-test report --format nocksperimental` or a `vesl-hull /evidence` endpoint. No need to entangle the projects deeply at first. We can prove the artifact shape, share a live receipt, and then adjust based on what you think VESL users would actually want.

Feels like this could become a good flywheel: VESL helps people build serious NockApps; Nocksperimental helps those apps produce durable, public evidence that they work.
