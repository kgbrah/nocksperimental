# APP ROUTES KNOWLEDGE

## OVERVIEW

`src/app` contains all public pages and API route handlers for the App Router
surface. Keep routes thin; domain logic belongs in `src/lib`. This now also includes
the EVM wallet/DeFi GUI (`swap`/`pool`/`bridge`/`payouts`/`play`/`pocgames`/`miner-lab`,
`providers.tsx`) and the `api/{rpc/base,base,bridge,game}` EVM routes — same thin-route
rule, and every on-chain write is signed in the user's wallet, never server-side.

## STRUCTURE

```
src/app/
|-- api/           # JSON, verifier, registry, evidence, trust, x402-gated + EVM (rpc/base, base, bridge, game) APIs
|-- nockchain/     # atlas/watch/operator-facing pages
|-- reports/       # sample, history, generated report pages
|-- trust/         # badges, feed, score/history, reports, updates
|-- workspaces/    # private workspace listing/detail pages
|-- fakenet/       # local fakenet UX
|-- registry/      # discovery surface
|-- verify/        # verifier index
|-- swap/ pool/ bridge/ payouts/   # EVM wallet/DeFi GUI (client-signed writes)
|-- play/ pocgames/                # on-chain + browser-only games
|-- miner-lab/                     # client-side miner ROI estimator
`-- providers.tsx                  # Web3Providers: Reown AppKit + wagmi
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
| Browser → Base RPC proxy | `api/rpc/base/route.ts` | Same-origin JSON-RPC proxy, pinned to Base Sepolia. Method ALLOWLIST (reads + `eth_sendRawTransaction` only), 256KB cap, hides upstream URL, 502 on unreachable. Do not widen the allowlist or parameterize the chain. |
| Live bridge status / supply | `api/base/state/route.ts`, `api/bridge/supply/route.ts` | GET `readBridgeStatus` (clamped to `ENABLED_CHAIN_IDS`) / `getBridgeSupply`. `force-dynamic`, no-store. |
| Flip game commit-reveal API | `api/game/flip/{open,reveal,state}/route.ts` | Thin adapters over `flip-house.ts`. `open` commits a fresh seed (503 if house unconfigured); `reveal` is idempotent + callable by anyone; `state` is read-only. No signing/storage in the route. |
| Wallet/DeFi providers | `providers.tsx` | `Web3Providers`: `createAppKit`+`WagmiAdapter` (registers `[baseSepolia, base]`); Base Sepolia reads via `/api/rpc/base`. Do NOT add `cookieToInitialState` to the root layout — the cookie-reconnect-after-mount pattern is deliberate to preserve static generation. |
| Swap/pool/bridge/play pages | `swap/`, `pool/`, `bridge/`, `play/`, `pocgames/` | All `force-dynamic`. Wrap write flows in `WalletGate`; writes signed in the user's wallet only. `/pocgames` move no value. |
| Operator payouts (copy-only) | `payouts/page.tsx` | Builds a `nockchain-wallet create-tx` string the operator signs locally; never holds keys or broadcasts. |
| Miner ROI estimator | `miner-lab/page.tsx` | Client-only compute via `miner-performance-model.ts`. Estimates, not live mining. |

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
- Do not move EVM transaction signing into a route, the Worker, or the orchestrator —
  on-chain writes are signed in the user's browser wallet (wagmi). Routes only
  observe/verify and proxy already-signed bytes.
- Do not widen the `api/rpc/base` method allowlist beyond reads + `eth_sendRawTransaction`,
  parameterize its chain, or leak the upstream RPC URL to the client.
