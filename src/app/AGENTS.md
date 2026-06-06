# APP ROUTES KNOWLEDGE

## OVERVIEW

`src/app` contains all public pages and API route handlers for the App Router
surface. Keep routes thin; domain logic belongs in `src/lib`.

## STRUCTURE

```
src/app/
|-- api/           # JSON, verifier, registry, evidence, trust, x402-gated APIs
|-- nockchain/     # atlas/watch/operator-facing pages
|-- reports/       # sample, history, generated report pages
|-- trust/         # badges, feed, score/history, reports, updates
|-- workspaces/    # private workspace listing/detail pages
|-- fakenet/       # local fakenet UX
|-- registry/      # discovery surface
`-- verify/        # verifier index
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Manifests | `.well-known/nocksperimental.json`, `openapi.json` | Must track public API changes. |
| Fakenet APIs | `api/fakenet/**` | Preserve receipt/evidence safety rules. |
| Nockchain APIs | `api/nockchain/**` | Cite upstream context; watch is monitoring only. |
| Trust APIs/pages | `api/trust/**`, `trust/**` | Keep verifier and badge routes aligned. |
| Workspaces | `api/workspaces/**`, `workspaces/**` | Upload tokens and private evidence stay gated. |
| Generated reports | `api/reports/generated/**`, `reports/generated/**` | Hash/provenance routes must agree. |

## CONVENTIONS

- Route handlers return `NextResponse.json` and import typed helpers from
  `src/lib`.
- Pages should render existing static/data helpers instead of duplicating lists
  or verification rules.
- Public route additions normally require registry manifest, OpenAPI, README or
  docs, and a `scripts/test-*.mjs` coverage shard.
- Use `export const dynamic = "force-dynamic"` only when the surrounding route
  pattern already needs dynamic behavior.
- Client components are exceptions for interactivity; default to server pages.

## ANTI-PATTERNS

- Do not put receipt validation, trust scoring, x402 verification, or fakenet
  command generation directly in route files.
- Do not expose raw upload tokens, secrets, private workspace data, raw chain
  state, or unredacted support bundles.
- Do not meter submit/list/discovery routes unless the x402 spec changes.
