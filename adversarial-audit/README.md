# adversarial-audit

Defensive security audit of nocksperimental's trust-cert (trust-badge) issuance + verification.
**Question:** can a malicious app obtain a `verified` trust cert it didn't earn? **Answer:** yes —
see `FINDINGS.md`. Fix plan in `REMEDIATION.md`.

These scripts are an **audit harness**, not part of `npm test`. Every script that touches committed
data (`src/data/trust-signals.json`, `trust-issuer-keys.json`, `launch-evidence.json`) **backs it up
and restores it** in a `finally` block, so the repo is left byte-for-byte unchanged.

## Run from the repo root

```bash
node adversarial-audit/atk-run.mjs       # Attacks A,B,C,G — forge/launder a verified cert (prints cert=MINTED verified=true)
node adversarial-audit/neg-control.mjs   # proves the verifier is SOUND (rejects tamper) → the mints are real breaks
node scripts/nocks-verify.mjs verify-badge --file adversarial-audit/forged-casino-cert.json --json   # outsider forgery, zero access → verified:true
```

## Files

| File | Purpose |
|---|---|
| `FINDINGS.md` | the report: F1–F10 with severity, repro, file:line evidence |
| `REMEDIATION.md` | phased fix plan, finding→fix mapping, definition of done |
| `atk-run.mjs` | runs the in-tree cert-minting attacks against the **real** verifier (backup/restore) |
| `verify-child.mjs` | loads the real `trust-badge-verifier.ts` in a fresh process and runs `verifyTrustBadgeIssuance` |
| `neg-control.mjs` | negative controls: corrupt-sig / watch-status / no-issuance / revoked all REJECT; valid forgery ACCEPTs |
| `load-report-harness.mjs` | loads `generated-lab-reports.ts` to show a report → `ready` badge candidate |
| `forged-casino-cert.json` | a forged "verified" cert for the rigged casino with **empty** evidence (F1+F2 artifact) |
| `results.json` | machine-readable results of `atk-run.mjs` |

## The one-line root cause

The active issuer **signing seed is committed in plaintext** (`src/lib/trust-badge-crypto.ts`) and
the dev key is **never retired**, so the Ed25519 signature on a "trust cert" proves only that
*someone with the public seed signed attacker-authored strings* — and nothing in the pipeline binds
the cert to a re-derived lab run or the compiled kernel.
