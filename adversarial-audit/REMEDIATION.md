# Remediation plan — close the trust-cert issuance trust boundary

> **Status: Phases 0–2 + 4 applied and verified** (all CRITICAL/HIGH findings F1–F8 + F9 core).
> See `FIXES-APPLIED.md` for what shipped and what remains staged (real-VM kernel execution,
> re-run-at-issuance, F10 launch-evidence surface). The regression gate `npm run test:trust-forgery`
> mints 0 certs and the full `npm test` suite is green.


Ordered by leverage. Phases 0–1 stop the bleeding (a public key signs everything); Phase 2 makes
the cert *mean something* (bind it to a real run and the real kernel); Phase 3 hardens the
surfaces; Phase 4 institutionalizes it so the gap can't silently reopen.

The single sentence that drives the whole plan: **a `verified` cert must prove "the registry, using
a secret key, vouched that THIS compiled kernel passed THIS independently-re-derived lab run" —
today it proves only "someone with the public dev seed signed these attacker-authored strings."**

---

## Phase 0 — Stop the forgery (CRITICAL, do first; ~0.5 day)

Fixes F1, F5. Goal: a committed/public key can never be a *trust anchor*.

1. **Retire the dev keys as trust anchors.** In `src/data/trust-issuer-keys.json` set every
   `…-dev-*` key to `status:"retired"` with a real `validUntil`, and `supersededBy` the production
   key. Keep them in the registry **only** so historically dev-signed demo badges still resolve.
2. **Verifiers must reject retired/dev keys for fresh issuance.** In
   `src/lib/trust-badge-verifier.ts` (and the ported `scripts/nocks-verify.mjs verifyEnvelope`) add
   `issuerKeyActive` to the `verified` predicate (today it is computed but **not** required —
   `verifier.ts:41,71-81`), and additionally reject any keyId whose seed is in `DEV_ISSUER_SEEDS`.
   A retired key may verify a *revoked/historical* badge for display, but must never yield
   `verified:true` for a live cert.
3. **Require a real production seed at issuance.** `badgeIssuerSigningSeed()`
   (`trust-badge-crypto.ts:181-195`) must **throw** if `NOCKS_BADGE_ISSUER_SIGNING_SEED` is unset
   in any non-test path — never silently fall back to `DEV_ISSUER_SEEDS`. Gate the fallback behind
   an explicit `NOCKS_ALLOW_DEV_SIGNING=1` used only by unit tests.
4. **Rotate the active key id** (`ACTIVE_DEV_ISSUER_KEY_ID`) to a production keyId whose seed is
   **only** in the secret store, and re-sign the genuinely-earned committed badges with it.

*Acceptance:* `node adversarial-audit/atk-run.mjs` no longer mints (A, B, C, G all flip to
`verified:false`); `nocks-verify` rejects `forged-casino-cert.json`; `neg-control.mjs` still passes
(NC5's "valid forgery" now fails because the dev key is retired — update it to sign with a test prod
key behind the test flag).

## Phase 1 — Make the env-overlay safe (HIGH; ~0.5 day)

Fixes F6.

5. **Never auto-publish an unknown env keyId as `active`.** In `overlaidIssuerKeys()`
   (`trust-issuer-keys.ts:43-70`) require a new prod keyId to be present in the committed registry
   (added via a reviewed commit) before it can be served; the env seed may only *supply the secret*
   for an already-published keyId. Equivalently: `assertIssuerSeedMatchesPublishedKey`
   (`trust-badge-crypto.ts:164-179`) must fail-closed for keyIds **not** committed, not no-op.
6. **When a prod key is configured, retire the dev key in the served registry** so production never
   serves `dev-v1` as `active` (closes the F5 residue at the overlay layer).

## Phase 2 — Make the cert *mean* something (HIGH; the real fix; ~3–5 days)

Fixes F2, F3, F4, F7, F8. Goal: independent re-derivation + binding to the actual code.

7. **Re-derive status at issuance; never trust `report.summary.status`.** In
   `generated-lab-reports.ts` (`buildGeneratedBadgeCandidate`, ~`:254,293`) and in the sign tool
   (`sign-trust-badges.mjs:78-101`), recompute pass/fail from the recorded `steps[]`/`invariants[]`
   (and reject if the recomputation disagrees with the stored `summary`). The issuer must
   **re-run** `run-lab` against the submitted fixture in a clean sandbox and compare the resulting
   `reportHash` to the one being certified — signing a report it did not itself produce is the core
   defect behind F4.
8. **Bind the cert to the compiled kernel.** Add a mandatory `kernelHash` (the `hoonc`/`jam` hash of
   the *actual deployed* kernel) to the fixture, the report, the `signedPayload`, and
   `payloadBoundToBadge` (`verifier.ts:62-69`). Issuance must (a) compile-gate the kernel, (b)
   verify the fixture's claimed behavior against the **real** kernel via `nockapp-run`
   (generic-cause real-VM poke/peek — already the documented Phase-2 roadmap in the Forfeit
   dossiers), and (c) refuse to certify if `app.kernel` is free text with no matching `kernelHash`.
   Until real-VM execution lands, the cert label must say **"model-attested, kernel-unverified"**
   and the badge `kind` must not be `app-report`.
9. **Reject empty/structural-nonsense evidence.** `payloadBoundToBadge` must reject empty
   `reportHash`/`snapshotRoot`, a `snapshotRoot` not equal to the report's last snapshot hash, and a
   `reportHash` that is not the sha256 of a report the issuer can reproduce (kills F2).
10. **Separate negative-control passes from positive passes.** Carry `expectRejected` into the badge
    candidate (`run-lab.mjs:495`, `generated-lab-reports.ts:293`): an `expectRejected` report is a
    *proof-of-prevention*, a distinct badge `kind`, never an `app-report` "this app works" cert
    (kills F8).
11. **Disambiguate the two verify endpoints.** Make `/api/reports/generated/verify` clearly return
    "hash-membership, unsigned candidate" and never the word "verified"; reserve "verified" for the
    signature path (`/api/trust/badges/verify`) (kills the F7 confusion).

## Phase 3 — Harden the surfaces (MEDIUM; ~1–2 days)

Fixes F9, F10.

12. **Trust-update chain:** sign with the same secret prod key (never the dev fallback) and have the
    issuer **recompute** `rootHash` from the referenced evidence rather than trusting the caller's
    (`trust-update-log.ts`); rate-limit + audit the registry-update credential (F9).
13. **Public badge SVG / embed / feed:** either render strictly from a signature-verified badge, or
    stamp the SVG as "unsigned status — verify at /api/trust/badges/verify". Cover `summaryStatus`
    under a signed payload so a flipped field can't fake green (F10).

## Phase 4 — Institutionalize (MEDIUM; ongoing)

14. **Land the adversarial suite as CI negative-controls.** Promote `adversarial-audit/atk-run.mjs`
    + `neg-control.mjs` into `npm run lab:ci` as **must-fail-to-mint** tests: CI fails if any forged
    cert ever verifies again, or if the verifier stops rejecting tamper. This is the regression net
    that keeps Phases 0–2 from silently reopening.
15. **Threat-model the trust boundary in `AGENTS.md`.** Add an explicit anti-pattern: "a cert must
    bind to a re-derived report and a compiled-kernel hash signed by a secret key; never sign
    caller-declared status; never treat a committed/public key as a trust anchor."
16. **Consumer guidance:** make `nocks-verify` **require** a pinned production registry (`--keys`)
    and warn loudly (non-zero) when falling back to the committed registry, so the advertised
    offline path can't be satisfied by the public dev key.

---

## Mapping: finding → fix

| Finding | Phase / item |
|---|---|
| F1 public seed anchor | 0.1–0.4, 16 |
| F2 empty-evidence binds | 2.9 |
| F3 no kernel execution / binding | 2.8 |
| F4 sign tool launders status | 2.7 |
| F5 dev key never retired | 0.1–0.2, 1.6 |
| F6 env-overlay new active key | 1.5–1.6 |
| F7 self-declared status / verify confusion | 2.7, 2.11 |
| F8 expectRejected laundering | 2.10 |
| F9 trust-update signs caller content | 3.12 |
| F10 unsigned green surfaces | 3.13 |
| (regression) | 4.14–4.16 |

## Definition of done

1. `node adversarial-audit/atk-run.mjs` → **0 certs minted** (A,B,C,G all `verified:false`).
2. `nocks-verify verify-badge --file adversarial-audit/forged-casino-cert.json` → **FAIL**, and
   fails-closed without a pinned prod registry.
3. A `verified` `app-report` cert exists **only** when the issuer re-ran the lab, the kernel
   compiled and was checked via `nockapp-run`, the `kernelHash` matches the deployed code, and the
   signature is from a secret prod key — verified end-to-end against the rigged casino (which must
   now be **rejected**).
4. The negative-control + forgery tests run in CI and fail the build if minting ever returns.
