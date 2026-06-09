# Fixes applied — trust-cert issuance hardening

Implementation of `REMEDIATION.md`. Every forgery from `FINDINGS.md` is now rejected; the
regression gate `npm run test:trust-forgery` mints **0 certs**, and the full `npm test` suite is
green. The verifier remains **sound** (negative controls still reject tampered certs).

## What changed

### Phase 0 — kill the public-seed forgery (F1, F2, F5)
- **New production issuer key.** `src/data/trust-issuer-keys.json` now has
  `nocksperimental-registry-ed25519-prod-v1` as the **active** anchor; both dev keys are
  **retired**. The prod key's seed lives **only** at `~/.config/nocklab/prod-issuer-seed.txt`
  (mode 600, outside the repo) — the repo commits **only** the public key.
- **Dev keys can never be a live anchor.** `src/lib/trust-badge-crypto.ts` adds `isDevIssuerKey`;
  `src/lib/trust-badge-verifier.ts` and `scripts/nocks-verify.mjs` now require an **active,
  non-dev** key for `verified` (a dev-key signature is still cryptographically valid but verifies
  only as DEMO). Closes the offline-verifier forgery.
- **Fail-closed signing.** `badgeIssuerSigningSeed()` throws unless `NOCKS_BADGE_ISSUER_SIGNING_SEED`
  (production secret) is set, or `NOCKS_ALLOW_DEV_SIGNING=1` opts into a non-authoritative demo
  signature. `scripts/sign-trust-badges.mjs` requires the prod secret and re-signs the committed
  badges under `prod-v1`.
- **Empty-evidence rejected.** the verifier now requires non-empty `reportHash` + `snapshotRoot`
  (no more `"" === ""`).

### Phase 1 — env-overlay fail-closed (F6)
- `src/lib/trust-issuer-keys.ts` `overlaidIssuerKeys()` no longer publishes an **uncommitted**
  env keyId as `active` — it is surfaced as `retired` only. A new production key must be added
  to the committed registry via a reviewed commit before its env-held secret can sign live certs.
  (The badge verifier already rejects uncommitted env keys via the committed-only key lookup.)

### Phase 2 — make the cert mean something (F3, F4, F7, F8)
- **Status re-derived, never trusted.** `src/lib/generated-lab-reports.ts` recomputes pass/warn/fail
  from the recorded `steps`/`invariants`/`alerts` and flags `statusConsistent` when the report's
  self-declared `summary.status` disagrees (tamper signal). A tampered "pass" report → `watch`.
- **`expectRejected` separated.** A negative-control report is `evidenceKind: "exploit-prevention"`,
  never an "app works" cert.
- **Model-vs-kernel honesty.** A mock-fakenet run (kernel never executed) is `evidenceKind:
  "model-attested"`; only a real-VM run with a bound `kernelHash` is `"app-report"`. Added optional
  `app.kernelHash` to the fixture schemas + an optional kernel-hash binding in the verifier.
- **Sign tool no longer launders status** — it requires the prod secret and re-signs under the
  active anchor (the old "trust signedPayload.status verbatim with the public dev seed" path is gone).

### Phase 4 — institutionalize (regression + docs)
- **Regression gate:** `npm run test:trust-forgery` runs `adversarial-audit/atk-run.mjs`
  (must mint 0 certs) + `adversarial-audit/neg-control.mjs` (verifier soundness, incl. a dev-key
  rejection control). Wired into `npm test` and `verify:trust-badges`.
- `nocks-verify` warns when verifying against the committed registry without a pinned `--keys`.
- `AGENTS.md` gains a trust-cert anti-pattern.

## Verification

```
npm run test:trust-forgery   # A,B,C,G → cert=no (0 minted); NC1–NC5 reject, NC6 accept (with prod seed)
npm test                     # full suite green
node scripts/nocks-verify.mjs verify-badge --file adversarial-audit/forged-casino-cert.json
                             #   → verified: FAIL (issuer-key-not-a-trust-anchor)
```

Before → after for the headline forged cert (`forged-casino-cert.json`, dev-key signed):
`verified: PASS, issuerKeyStatus: active`  →  `verified: FAIL, reason: issuer-key-not-a-trust-anchor`.

## Operator notes
- **The production signing seed is at `~/.config/nocklab/prod-issuer-seed.txt`.** Move it to your
  real secret store and set `NOCKS_BADGE_ISSUER_SIGNING_SEED` in the deploy environment. It is the
  ONLY way to mint a real `verified` cert; if lost, generate a new keypair, add the public key to
  `trust-issuer-keys.json` as the active key (retire the old), and re-run `sign-trust-badges`.
- The committed demo badges are now real prod-key signatures (not forgeable). To re-sign after
  editing them: `NOCKS_BADGE_ISSUER_SIGNING_SEED=$(cat ~/.config/nocklab/prod-issuer-seed.txt) node scripts/sign-trust-badges.mjs`.
- Test suites that exercise demo signing set `NOCKS_ALLOW_DEV_SIGNING=1` themselves; production never sets it.

## Follow-on (completed after the initial pass)
- **Production secret set in the deploy env.** `NOCKS_BADGE_ISSUER_SIGNING_SEED` is a Cloudflare
  Worker secret on `nocksperimental`, and `NOCKS_BADGE_ISSUER_KEY_ID=…prod-v1` is set alongside it
  (both live — `wrangler.jsonc` documents them). `adversarial-audit/verify-prod-config.mjs` proves
  both are required (seed-only stamps the wrong key) and that live signing verifies under the anchor.
- **Re-run-at-issuance gate** (`scripts/issue-badge.mjs`, Phase 2.7): the issuer RE-RUNS the lab
  itself, loads the report through the status-re-deriving loader, and signs ONLY a genuinely
  promotable candidate — refusing negative-control / failing / tampered runs, and never issuing a
  model-only run as an app-report cert. Locked by `scripts/test-issue-badge.mjs` (in the gate).
- **F9 trust-update**: default issuer key is now the active anchor (`resolveActiveIssuerKeyId`) — a
  trust-update is signed by the live prod key in production, never a retired dev key.
- **F10 launch-evidence badge.svg**: a case that CLAIMS a cert (links a trust badge) only renders
  the green "verified" when that badge's signature actually verifies; otherwise it downgrades.
- **kernelHash binding** (`scripts/kernel-attest.mjs`, Phase 2.8 partial): compile-gates a kernel
  (real `hoonc`, "no panic") and emits a deterministic `kernelHash` over the source — so a cert
  commits to the exact kernel that compiles (honest vs rigged hash differently). Labeling is honest:
  a run stays `model-attested` until an explicit real-VM `kernelExecuted` flag is set.

## Real-VM behavioral execution (Phase 2.8) — harness DELIVERED + PROVEN; jam blocked in this sandbox
- Built a complete real-VM verifier, `nockapp-roulette` (`nockchain/crates/hoonc/src/bin/`, copied to
  `forfeit-roulette/verifier/nockapp-roulette.rs`): it boots the compiled kernel on a real NockVM,
  drives the actual `%commit`/`%client-commit`/`%reveal` causes, and verifies — over real VM state —
  **hashlock enforcement** (a mismatched reveal is rejected; the round stays unresolved) and **no
  seed-leak peek surface**. `kernelHash = blake3(compiled jam)`.
- **Proven end-to-end** on a real committed kernel jam (the counter `test-ker.jam`): boot,
  `kernelHash`, real `poke_sync`/`peek_sync`, and effect-log reading all execute on the NockVM. The
  roulette-specific assertions run against the roulette jam via `--jam`.
- **Blocker (environment, precisely diagnosed):** `hoonc`'s jam-emission does not produce a kernel
  jam in this sandbox — both the binary and `hoonc::build_jam` depend on a file-write effect that
  never lands here (confirmed even for the trivial kernel; unaffected by `--new`/`--output`/
  `--disable-fsync`/`HOONC_DISABLE_PREWARM`). Not a flaw in the kernel or the harness. The lab
  integration is fully wired: a successful run sets `environment.kernelExecuted` → `kernelVerified`
  → the issuance gate promotes `model-attested` to `app-report` automatically, no code change needed.
  See `forfeit-roulette/docs/REAL-VM-EXECUTION.md`.

## Still staged
- **Trust-update rootHash recompute** (Phase 3.12 remainder): the entry is now Ed25519-signed
  fail-closed under the active anchor (the forgeability vector is closed); recomputing the chain
  rootHash digest from referenced evidence would additionally require re-deriving the committed
  symbolic chain and is deferred.
