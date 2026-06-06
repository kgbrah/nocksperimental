# DOCS KNOWLEDGE

## OVERVIEW

`docs` is the product and architecture authority for Launch Evidence, VESL,
x402, Nockchain research, deployment, trust, CI, and work plans.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Product strategy | `strategy.md` | Launch Evidence first. |
| Launch Evidence spec | `superpowers/specs/2026-06-05-launch-evidence-design.md` | Paid review/report lane. |
| VESL bridge spec | `superpowers/specs/2026-06-05-vesl-evidence-bridge-design.md` | Evidence receipt collaboration. |
| x402 spec | `superpowers/specs/2026-06-05-x402-metered-trust-api-design.md`, `x402.md` | Stub-first metering, fail-closed facilitator. |
| Deployment | `deployment.md`, `ci.md` | Local gates, Cloudflare smoke/deploy. |
| Nockchain context | `research/*`, `nockchain-watch.md` | Carry ambiguity; watch board is not authority. |
| Active work plans | `superpowers/plans/*` | Plans can be stale; verify against code before applying. |

## CONVENTIONS

- Keep docs synchronized with API paths, OpenAPI, registry manifest, package
  scripts, and Cloudflare bindings.
- Specs describe product contracts; implementation plans are instructions only
  after confirming current code and branches.
- Nockchain claims should identify source tier, commit/release/protocol context,
  and known ambiguity.
- Deployment docs should distinguish local memory fallback from production KV
  persistence.

## ANTI-PATTERNS

- Do not document a route, verifier, KV binding, or command that is not present
  in code.
- Do not promote `docs/nockchain-watch.md` to protocol source of truth.
- Do not remove Launch Evidence framing when adding operator, Bazaar, or x402
  docs; those lanes reuse the same evidence primitives.
