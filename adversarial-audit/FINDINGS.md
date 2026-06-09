# Adversarial audit — can nocksperimental be tricked into issuing a trust cert to a malicious app?

**Date:** 2026-06-08
**Target:** `nocksperimental` trust-badge / trust-cert issuance + verification pipeline
**Method:** built a real casino game on Nockchain (honest + a malicious twin), exercised the
lab honestly, then ran concrete exploits against the issuance/verification path and
**adversarially verified** every result (negative controls prove the verifier is sound).

## TL;DR

**Yes — trivially, and from outside with zero access.** The trust cert's signing key is the
*public, committed* dev seed, and the dev issuer key is **never retired**, so anyone can mint a
cryptographically-`verified` cert for any app — including one with **empty evidence** — and the
project's own advertised offline verifier (`nocks-verify`) accepts it. Separately, the lab
**never executes the app's kernel**, so even the honest issuance path certifies a self-authored
*model*, not the deployed code: a rigged casino that leaks the server seed and skips the house
hashlock passes the *same* fairness invariants as the honest game.

The cryptography is implemented **correctly** (negative controls confirm it rejects tampered
certs). The break is that the signature attests *"someone with the public seed signed these
attacker-authored strings"* — which is everyone — and that nothing in the pipeline binds the cert
to a real lab run or to the compiled kernel.

---

## What was built (the casino app)

A genuine, provably-fair casino game was built to drive the test: **Forfeit Roulette** (Game 3 of
the Forfeit series), European red/black with a transparent, *provable* green-zero house edge.

| Artifact | Result |
|---|---|
| `forfeit-roulette/kernels/forfeit-roulette.hoon` | real NockApp kernel — **compiles clean** (`hoonc`, "no panic!") |
| `forfeit-roulette/verifier/forfeit-roulette-verifier.mjs` | forensic verifier — **all assertions pass** |
| `nocksperimental/fixtures/forfeit-roulette-fairness.lab.json` | honest lab fixture — **lab: pass, 3/3 invariants** |
| `forfeit-roulette/kernels/rigged-roulette.hoon` | the **malicious twin** (test artifact): skips the house hashlock, leaks the server seed |

Honest baseline (the legit path works): the honest fixture passes the lab (`status: pass`, 3/3
invariants) and the loader mints a `badgeCandidate.status: "ready"`. The forensic verifier shows
the honest commit-reveal wheel gives the player exactly the wheel's honest 18/37 ≈ 48.6% (the
house keeps only the green-zero edge), while a seed-leaking variant is 100 % exploitable.

---

## The pipeline and where trust is (not) established

```
fixture.lab.json ──run-lab──▶ report.json ──loader──▶ badgeCandidate ──issuance/sign──▶ VerifiedBadge + signed receipt ──verify──▶ verified:true
   (attacker         (NEVER runs        (trusts the          ("ready" if         (Ed25519 over signed         (signature + string
    authored)         app.kernel)        report's self-       status==pass)        payload, PUBLIC seed)        equality only)
                                         declared status)
```

**The whole "verified cert" reduces to one fact:** a badge is `verified` iff someone produced a
valid Ed25519 signature over an attacker-chosen `signedPayload` using the *active* issuer key —
and that key's signing seed is committed in plaintext and derives the committed *active* public
key. No step re-derives the report status, re-runs the kernel, or binds the cert to compiled code.
The `signedPayload` contains no execution witness, no `fixtureId`, and no kernel hash.

---

## Findings

Severity uses the impact of an attacker obtaining a `verified` cert for an app that did not earn it.

### F1 — CRITICAL — Active issuer signing seed is public & committed; anyone can forge a `verified` cert (outsider-exploitable via the offline verifier)

- **Where:** `src/lib/trust-badge-crypto.ts:12-19` (`DEV_ISSUER_SEEDS`, `ACTIVE_DEV_ISSUER_KEY_ID = …-dev-v1`); `src/data/trust-issuer-keys.json` (`…-dev-v1` is `status:"active"`, `validUntil:null`); `scripts/nocks-verify.mjs` `verifyEnvelope` (`verified = issuerKeyResolved && signatureCryptographicallyValid && payloadDigestMatched !== false`).
- **Precondition:** *none.* The seed (`2200…0002`) is in the repo; the verifier resolves it from the committed registry.
- **Mints a verified cert:** **YES.** Reproduced: forged a receipt for "Lucky Nock Casino (rigged-roulette)" with **empty** `reportHash`/`snapshotRoot`, signed with the public dev seed, and the **real published `nocks-verify verify-badge --file`** returned `verified: true`, `issuerKeyStatus: "active"`, exit 0. (`adversarial-audit/forged-casino-cert.json`.)
- **Why it's the headline:** `nocks-verify` is the project's *advertised* "no host trust, fully offline" consumer path (a published bin, `package.json` `bin.nocks-verify`). A relying party who runs it on an attacker-supplied cert is deceived with **zero** attacker privileges. The Ed25519 signature is genuine but proves nothing — the key is public.

### F2 — CRITICAL — The cert binds only attacker-authored strings; no binding to a real report, run, or kernel

- **Where:** `src/lib/trust-badge-verifier.ts:62-81` — `verified`/`exactIssuanceMatch` requires `signatureCryptographicallyValid && payloadBoundToBadge && activeVerifiedStatus && !isRevoked`; `payloadBoundToBadge` only checks `signedPayload.reportHash === badge.evidence.reportHash` (and `snapshotRoot`, `sourceAnchor`), all in the same attacker-authored record; `activeVerifiedStatus` only checks two plaintext strings equal `"verified"`/`"valid"`.
- **Mints a verified cert:** **YES** (Attack B). `"" === ""` satisfies the binding — a cert with no evidence whatsoever verifies. Nothing fetches the report, re-runs invariants, or hashes a kernel. The cert attests *"these strings were signed"*, not *"this app passed"*.

### F3 — HIGH — No kernel binding: the lab never executes `app.kernel` (rigged code + honest fixture passes)

- **Where:** `scripts/run-lab.mjs` default `mock-fakenet` mode applies fixture-authored state mutations and evaluates invariants over fixture-authored state (`buildReport`/`applyStepMutation`); `app.kernel` is free text copied verbatim into the report (`run-lab.mjs:501`, `fixture-builder.mjs` default). The kernel is run only in `mode:"kernel"` with a fixture-supplied shell command, never `app.kernel`.
- **Mints a verified cert:** Not by itself — it produces a `status:"pass"` report and a `"ready"` candidate. **Reproduced:** the rigged casino (`app.kernel:"rigged-roulette"`, the backdoored kernel) passes the **same 3/3 fairness invariants** as the honest game and mints a `"ready"` candidate, because the lab cannot see the deployed code. This is the *evidence-fabrication* primitive that the honest issuance path launders into a real cert (→ F1/F4). It also means **even a fully-honest issuer cannot tell a fair casino from a rigged one** with this lab.

### F4 — HIGH — The maintainer sign tool launders an attacker's self-declared status

- **Where:** `scripts/sign-trust-badges.mjs:78-101` — it builds `signedPayload.status` from `issuance.signedPayload.status` verbatim (line 80) and hard-sets `verification.status:"valid"` (line 99). It never checks the status corresponds to a real passing run.
- **Mints a verified cert:** **YES** (Attack C). Reproduced: appended an attacker stub (`status:"verified"`, fabricated evidence, empty signature), ran the **real** `scripts/sign-trust-badges.mjs` with no env seed → it signed the stub with the public dev seed and stamped `valid`; the verifier then returned `verified:true`. A maintainer who runs the tool over a poisoned `trust-signals.json` (e.g. a merged PR) ships a real cert for a rigged app.

### F5 — HIGH — Dev issuer key is never retired → production is also vulnerable

- **Where:** `src/lib/trust-issuer-keys.ts:43-70` `overlaidIssuerKeys()` — when a production `NOCKS_BADGE_ISSUER_SIGNING_SEED`/`KEY_ID` is set for a *new* keyId, it **appends** the prod key but leaves the committed `…-dev-v1` entry untouched (`status:"active"`); `publicKeyForKeyId()` still resolves the dev key. No verifier rejects the dev keyId.
- **Impact:** A badge stamped `issuerKeyId=…-dev-v1` and signed with the public dev seed **still verifies in production**. The finding is *not* dev-only. (Confirmed by independent review of the overlay + committed registry statuses.)

### F6 — HIGH — Env-overlay injects a brand-new ACTIVE issuer key with no guard for new keyIds

- **Where:** `src/lib/trust-badge-crypto.ts:142-179` (`issuerEnvKeyOverlay`, `assertIssuerSeedMatchesPublishedKey` only fires when the keyId already exists in the committed registry); `src/lib/trust-issuer-keys.ts:58-69` appends an unknown keyId as `status:"active"`.
- **Mints a verified cert:** **YES** (Attack G). With `NOCKS_BADGE_ISSUER_SIGNING_SEED`=attacker seed + a *new* `NOCKS_BADGE_ISSUER_KEY_ID`, the overlay publishes the attacker key as active and a cert signed by it verifies. A compromised deploy env / CI secret store mints certs under a key the attacker controls.

### F7 — MEDIUM — Report loader trusts self-declared `summary.status`; `/verify` is hash-membership, not crypto

- **Where:** `src/lib/generated-lab-reports.ts:254,260-265,293-294` (`status` and counts read verbatim from `report.summary`; `badgeCandidate.status = summary.status==="pass" ? "ready":"watch"`); `src/lib/generated-report-verifier.ts` / `/api/reports/generated/verify` checks hash membership, not a signature.
- **Impact:** A hand-edited `report.json` whose recorded steps/invariants actually fail but whose `summary.status` says `"pass"` mints a `"ready"` candidate. A consumer who mistakes `/api/reports/generated/verify` (hash lookup, candidate is `signatureStatus:"unsigned"`) for `/api/trust/badges/verify` (crypto) is misled.

### F8 — MEDIUM — `expectRejected` status laundering (fail → pass), indistinguishable at the badge layer

- **Where:** `scripts/run-lab.mjs:495` — `status = expectRejected ? (rawStatus==="fail" ? "pass":"fail") : rawStatus`. The badge layer only checks `status==="pass"` and cannot distinguish a *negative-control* "pass" (an exploit was caught) from a *positive* "pass" (the app works).
- **Impact:** Reproduced: a fixture with `expectRejected:true` + an unsatisfiable invariant reports `rawStatus:"fail"` → `status:"pass"`. A rigged app can present a "proof-of-prevention" pass as if it were a verification pass.

### F9 — MEDIUM — Trust-update chain signs caller-supplied content with the public dev seed

- **Where:** `src/app/api/trust/updates/route.ts` (POST, `x-nocks-registry-key` auth) → `src/lib/trust-update-log.ts` signs the caller's `rootHash`/`summary`/`target` with `badgeIssuerSigningSeed()` (the public dev seed when no prod seed is set); `/api/trust/updates/verify` validates that signature.
- **Impact:** A caller with the registry-update credential (or anyone, offline, since the seed is public) produces a signature-valid `TrustUpdateEntry` attesting an arbitrary claim ("Rigged Casino passed fairness"). It is a *parallel* forgeable cert-like surface (not a `VerifiedBadge`), useful as laundering/credibility glue.

### F10 — LOW/MEDIUM — Public badge SVG / freshness / feed surfaces render "green" with no signature check

- **Where:** `src/app/api/launch-evidence/[caseId]/badge.svg/route.ts` + `src/lib/status-badge-svg.ts` render from `launch-evidence.json` `summaryStatus` with no crypto; `summaryStatus` is not covered by any signed payload.
- **Impact:** The embeddable badge a README would show is unsigned data; flipping `summaryStatus` to `"verified"` renders a green "verified" SVG. Social-engineering glue, not a cert itself.

---

## Severity summary & what each actually mints

| ID | Severity | Mints a signature-`verified` cert? | Outsider-exploitable (no access)? |
|----|----------|-----------------------------------|-----------------------------------|
| F1 | CRITICAL | **Yes** (offline verifier) | **Yes** |
| F2 | CRITICAL | **Yes** (empty evidence) | Yes (with F1) |
| F3 | HIGH | No (→ "ready" candidate; enables F1/F4) | n/a (any fixture author) |
| F4 | HIGH | **Yes** (via real sign tool) | Needs a maintainer to run the tool over poisoned data |
| F5 | HIGH | amplifies F1 to production | Yes |
| F6 | HIGH | **Yes** (attacker key) | Needs deploy-env control |
| F7 | MEDIUM | No (misleading surface + candidate) | filesystem/commit access |
| F8 | MEDIUM | No (laundered "pass") | any fixture author |
| F9 | MEDIUM | parallel signed surface | registry-update cred / public seed |
| F10 | LOW/MED | No (unsigned surface) | commit access |

## Attacker models

1. **Outsider, zero access (F1+F2):** forge a receipt offline with the public dev seed → victim's `nocks-verify` says PASS. *No repo, host, or secret needed.* This is the most damaging because it defeats the explicitly host-independent trust path.
2. **Supply-chain / poisoned data (F4, F7):** land a badge/issuance (or report) into committed/deployed data; the hosted `/api/trust/badges/verify` then also returns `verified:true` (it only ranges over committed records — confirmed — so this path *does* require write access).
3. **Deploy-env compromise (F6):** inject a new active issuer key via env vars.

## Adversarial verification (why these results are trustworthy)

The verifier is **sound**: negative controls (`adversarial-audit/neg-control.mjs`) show it returns
`verified:false` for a corrupted signature, a non-`verified` status, a missing issuance receipt,
and a revoked badge — and `verified:true` only for an untampered valid forgery. So the
`verified:true` results above are **real breaks of a correctly-implemented verifier**, caused by a
public key and missing bindings, not by a broken check.

## Reproduce

From the `nocksperimental` repo root:

```bash
node adversarial-audit/atk-run.mjs        # Attacks A,B,C,G — each prints cert=MINTED verified=true (auto-restores all data files)
node adversarial-audit/neg-control.mjs    # verifier soundness (NC1-4 reject, NC5 accept)
node scripts/nocks-verify.mjs verify-badge --file adversarial-audit/forged-casino-cert.json --json   # outsider forgery → verified:true
```

All scripts back up and restore every committed data file they touch; the repo is left clean.
