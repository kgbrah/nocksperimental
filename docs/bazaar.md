# Verified Bazaar

The Verified Bazaar is a trust-filtered directory of *payable* NockApp services
for agents. It answers what x402 discovery alone cannot: not just "what can I pay
for?" but "what can I pay for **and trust**?"

It fuses two things nocksperimental already has:

- **Payability** (x402): its own metered endpoints, plus a facilitator's
  `/discovery/resources` when one is configured and reachable.
- **Trust** (the registry): verified badges, solver scores, compute benchmarks,
  token-compatibility reports.

A listing is **verified** iff it is backed by a registry badge whose current
status is `verified` (revocations downgrade it).

## Listings

| Source | What | Payable | Trust |
|---|---|---|---|
| `nocksperimental` | the metered x402 verification endpoints | yes (price + payTo) | — |
| `registry` | solvers, compute providers, token issuers, app badges | trust-only | verified by badge |
| `facilitator` | services cataloged by a live x402 facilitator | yes when priced | best-effort |

## API

- `GET /api/bazaar` — the directory. Filters: `verifiedOnly`, `payableOnly`,
  `kind`, `network`, `minScore`.
- `GET /api/bazaar/{listingId}` — a single listing.
- Page: `/bazaar`.

```
GET /api/bazaar?verifiedOnly=true
GET /api/bazaar?kind=solver&minScore=80
GET /api/bazaar?payableOnly=true
```

## Facilitator merge

When `NOCKS_X402_FACILITATOR_URL` is set and the facilitator is reachable, its
`/discovery/resources` are merged in as `source: "facilitator"` listings. If no
facilitator is configured, or it is unreachable / returns a malformed body, the
merge is skipped silently — the directory still serves own + registry listings.

## Discovery

Advertised in `/.well-known/nocksperimental.json` (the `verified-bazaar`
capability + `links.bazaar`) and `/openapi.json`, so agents can discover the
directory itself.

## Revenue

Browsing is free (agent adoption). The paid action is *trust verification* of a
listing — the x402-metered verify endpoints (see [`docs/x402.md`](x402.md)).
Premium / sponsored listings are a natural follow-up.

## Tests

`npm run test:bazaar` — aggregate + trust-join, facilitator merge (mocked
`fetch`), API routes + filters, and discovery advertising.
