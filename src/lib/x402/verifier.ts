// The pluggable verifier — the single swap-to-real seam. The stub verifies an
// x402 payment offline (structural + addressing + amount + time + replay) and
// is explicit about what it does NOT check (signature, on-chain notes, fee).
// The facilitator delegates to a real x402-nockchain-facilitator's /verify.

import type {
  PaymentPayload,
  PaymentRequirements,
  ExactNockchainPayload,
  VerifyResponse
} from "@/lib/x402/types";
import type { X402Config } from "@/lib/x402/config";
import { findReceiptByNonce, recordReceipt } from "@/lib/x402/receipt-store";
import type { X402Receipt } from "@/lib/x402/receipt-store";

export type VerifierMode = "stub" | "facilitator";

export interface VerifyOutcome {
  valid: boolean;
  mode: VerifierMode;
  code?: string;
  message?: string;
  payer?: string | null;
  amountNicks?: string;
  nonce?: string;
  txId?: string | null;
}

export interface Verifier {
  readonly mode: VerifierMode;
  verify(payload: PaymentPayload, requirements: PaymentRequirements, now?: Date): Promise<VerifyOutcome>;
}

/** Thrown when a configured facilitator cannot be reached; the meter maps this
 * to a 502 rather than silently falling back to the stub (no paywall bypass). */
export class FacilitatorUnreachableError extends Error {}

export function selectVerifier(config: X402Config): Verifier {
  if (config.verifierMode === "facilitator" && config.facilitatorUrl) {
    return new FacilitatorVerifier(config);
  }
  return new StubVerifier(config);
}

export class StubVerifier implements Verifier {
  readonly mode = "stub" as const;

  constructor(private readonly config: X402Config) {}

  async verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
    now: Date = new Date()
  ): Promise<VerifyOutcome> {
    if (payload?.x402Version !== 2) {
      return deny(this.mode, "invalid_version", "x402Version must be 2");
    }
    if (payload.scheme !== requirements.scheme) {
      return deny(this.mode, "scheme_mismatch", `scheme must be ${requirements.scheme}`);
    }
    if (payload.network !== requirements.network) {
      return deny(this.mode, "network_mismatch", `network must be ${requirements.network}`);
    }

    const inner = extractInner(payload);
    if (!inner) {
      return deny(this.mode, "invalid_payload", "missing authorization");
    }
    const auth = inner.authorization;

    if (auth.to !== this.config.payTo) {
      return deny(this.mode, "recipient_mismatch", "authorization.to must equal payTo");
    }

    let value: bigint;
    let required: bigint;
    try {
      value = BigInt(auth.value);
      required = BigInt(requirements.maxAmountRequired);
    } catch {
      return deny(this.mode, "invalid_amount", "value is not an integer");
    }
    if (value < required) {
      return deny(this.mode, "insufficient_amount", "value is below maxAmountRequired");
    }

    const nowSec = Math.floor(now.getTime() / 1000);
    const skew = this.config.clockSkewSeconds;
    // validAfter/validBefore arrive from untrusted JSON; the declared `number` type
    // is not enforced at runtime. Coerce numerically so a string timestamp (e.g.
    // "946684800") cannot slip past a `typeof === "number"` guard and skip the check,
    // and require a parseable validBefore (the expiry) so a missing/garbage expiry
    // fails CLOSED instead of being treated as "no expiry".
    const validAfter = toFiniteInt(auth.validAfter);
    const validBefore = toFiniteInt(auth.validBefore);
    if (validBefore === null) {
      return deny(this.mode, "invalid_time", "authorization.validBefore is missing or not an integer");
    }
    if (validAfter !== null && nowSec + skew < validAfter) {
      return deny(this.mode, "not_yet_valid", "payment is not yet valid");
    }
    if (nowSec - skew > validBefore) {
      return deny(this.mode, "expired", "payment has expired");
    }

    if (!auth.nonce) {
      return deny(this.mode, "invalid_nonce", "missing nonce");
    }
    const existing = await findReceiptByNonce(auth.nonce);
    if (existing) {
      return deny(this.mode, "replayed_nonce", "nonce has already been settled");
    }

    const payer = inner.signature?.pubkey ?? auth.from ?? null;
    const receipt: X402Receipt = {
      nonce: auth.nonce,
      payer,
      to: auth.to,
      amountNicks: auth.value,
      network: payload.network,
      resource: requirements.resource,
      mode: "stub",
      txId: null,
      generatedAt: now.toISOString()
    };
    await recordReceipt(receipt);

    return { valid: true, mode: this.mode, payer, amountNicks: auth.value, nonce: auth.nonce, txId: null };
  }
}

export class FacilitatorVerifier implements Verifier {
  readonly mode = "facilitator" as const;

  constructor(private readonly config: X402Config) {}

  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyOutcome> {
    const base = (this.config.facilitatorUrl ?? "").replace(/\/+$/, "");

    let response: Response;
    try {
      response = await fetch(`${base}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload, requirements })
      });
    } catch (error) {
      throw new FacilitatorUnreachableError(`facilitator request failed: ${String(error)}`);
    }

    if (!response.ok) {
      throw new FacilitatorUnreachableError(`facilitator returned status ${response.status}`);
    }

    const body = (await response.json()) as VerifyResponse;
    if (!body?.valid) {
      return deny(
        this.mode,
        body?.error?.code ?? "facilitator_rejected",
        body?.error?.message ?? "facilitator rejected the payment"
      );
    }

    const inner = extractInner(payload);
    const auth = inner?.authorization;
    return {
      valid: true,
      mode: this.mode,
      payer: inner?.signature?.pubkey ?? auth?.from ?? null,
      amountNicks: auth?.value,
      nonce: auth?.nonce,
      txId: null
    };
  }
}

function deny(mode: VerifierMode, code: string, message: string): VerifyOutcome {
  return { valid: false, mode, code, message };
}

// Coerce an untrusted JSON value to a finite integer (unix seconds), or null when
// it is missing/non-numeric. Accepts numeric strings so a string-encoded timestamp
// is still range-checked rather than silently skipped.
function toFiniteInt(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.floor(value) : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }
  return null;
}

function extractInner(payload: PaymentPayload): ExactNockchainPayload | null {
  const inner = payload?.payload as ExactNockchainPayload | undefined;
  if (!inner || typeof inner !== "object" || !inner.authorization) {
    return null;
  }
  return inner;
}
