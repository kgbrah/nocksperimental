# Deployment

Nocksperimental deploys to Cloudflare Workers with the OpenNext Cloudflare adapter. The production Worker is named `nocksperimental` and is bound to the custom domain `nocksperimental.com` in `wrangler.jsonc`.

## Local Verification

Run the normal source gate first:

```bash
npm test
npm run verify:6-18
npm run lab:ci
npm run lint
```

Then run the Worker-runtime smoke check:

```bash
npm run smoke:cloudflare
```

The smoke command builds the OpenNext bundle, starts a local Wrangler preview on an available port, checks the home page, checks `/.well-known/nocksperimental.json`, checks `/openapi.json`, checks `/api/health`, checks `/fakenet`, checks `/api/fakenet`, checks `/api/fakenet/connect`, checks `/api/fakenet/commands`, checks `/api/fakenet/diagnostics`, checks `/api/fakenet/support-bundle`, checks `/api/fakenet/support-bundle.md`, checks `/api/fakenet/evidence`, verifies `/api/fakenet/evidence/verify` with the current fakenet evidence inputs, checks `/api/fakenet/runbook.sh`, checks `/registry`, checks `/api/registry`, checks `/api/registry/checkpoint`, checks `/workspaces`, checks `/api/workspaces`, checks `/workspaces/launch-lab-private`, checks `/api/workspaces/launch-lab-private`, checks `/api/workspaces/launch-lab-private/evidence`, verifies `/api/workspaces/evidence/verify` with the current workspace evidence inputs, checks `/api/workspaces/launch-lab-private/upload-policy`, validates the upload policy stays auth-gated without issuing a public token, checks `/api/workspaces/launch-lab-private/upload-token`, validates the upload token gate returns an auth-required `401` without issuing a public token, checks `/api/workspaces/upload-token/verify`, validates the signed upload token verifier handles missing input without echoing token material, checks `/verify`, checks `/api/verify`, checks `/api/trust`, checks `/trust/feed`, checks `/api/trust/feed`, checks `/api/trust/badges/badge-payment-flow-verified/verification`, checks `/api/trust/badges/badge-payment-flow-verified/embed`, checks `/trust/badges/badge-payment-flow-verified`, checks `/trust/solver-scores/solver-score-solver-a-v0`, checks `/api/trust/solver-scores/solver-score-solver-a-v0`, checks `/trust/token-compatibility/token-compat-mock-v0`, checks `/api/trust/token-compatibility/token-compat-mock-v0`, checks `/trust/compute-benchmarks/compute-profile-alpha-v0`, checks `/api/trust/compute-benchmarks/compute-profile-alpha-v0`, checks `/trust/updates/update-score-history-v0`, checks `/api/trust/updates/update-score-history-v0`, checks `/trust/consumers/consumer-audit-fund`, checks `/api/trust/consumers/consumer-audit-fund`, verifies `/api/trust/updates/verify` with the score-history update hash and signature, verifies `/api/trust/badges/verify` with the payment-flow badge digest and signature, checks `/api/reports/generated/payment-flow/provenance`, checks `/api/reports/generated/payment-flow/evidence`, verifies `/api/reports/generated/verify` with the payment-flow report hash and snapshot root, verifies `/api/trust/updates/audit` stays protected with HTTP `401`, and shuts the preview down.

## Cloudflare Auth

Wrangler must be authenticated before a live deploy:

```bash
npx wrangler login
npx wrangler whoami
```

`wrangler whoami` should print the authenticated Cloudflare user. If it says not authenticated, the deploy command will not be able to publish the Worker or attach `nocksperimental.com`.

## Deploy

After auth and local verification pass:

```bash
npm run deploy
```

For a non-publishing validation of the generated Worker bundle:

```bash
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
```
