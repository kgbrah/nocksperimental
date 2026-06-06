# X402 KNOWLEDGE

## OVERVIEW

`src/lib/x402` makes Nocksperimental an x402 resource server. It gates selected
premium read/verify endpoints while keeping submit, list, registry, feed,
well-known, and OpenAPI routes free.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Resource prices | `pricing.ts` | Single source for metered paths and discovery. |
| Runtime config | `config.ts` | Env controls payTo, network, facilitator, allowance. |
| Payment checks | `verifier.ts` | Stub vs facilitator seam. |
| 402 wrapper | `meter.ts` | Builds `PaymentRequired` and response headers. |
| Persistence | `receipt-store.ts`, `kv.ts`, `allowance.ts` | `NOCKS_X402_RECEIPTS` binding. |
| Wire types | `types.ts`, `header.ts` | Accept `PAYMENT-SIGNATURE` and `X-PAYMENT`. |

## CONVENTIONS

- `StubVerifier` is offline structural validation only: version, scheme,
  network, recipient, amount, time window, nonce replay.
- Stub mode must stay explicit in responses; it does not verify Schnorr
  signatures, note existence, fees, PKH binding, or settlement.
- `FacilitatorVerifier` calls `{NOCKS_X402_FACILITATOR_URL}/verify`; if the
  facilitator is unreachable, metering fails closed with `502`.
- A valid payment consumes payment and leaves free allowance untouched; missing
  or invalid payment checks allowance before returning `402`.
- Production replay/receipt safety depends on `NOCKS_X402_RECEIPTS`; call this
  out when changing deployment config.

## ANTI-PATTERNS

- Do not implement cryptography, settlement, facilitator behavior, wallet
  signing, or on-chain note checks in this repo.
- Do not store private keys, seed material, raw secrets, or full payment secrets.
- Do not silently fall back to stub when facilitator mode is configured.
- Do not meter evidence-producing or discovery/listing routes without updating
  `docs/superpowers/specs/2026-06-05-x402-metered-trust-api-design.md`.
