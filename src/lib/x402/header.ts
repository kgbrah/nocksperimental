// Payment header codec. Clients send the signed `PaymentPayload` in a request
// header; we accept VESL's `PAYMENT-SIGNATURE` and the Coinbase-canonical
// `X-PAYMENT` alias, base64-encoded JSON or raw JSON. The server replies with a
// base64-JSON `X-PAYMENT-RESPONSE` receipt.

import type { PaymentPayload } from "./types";

export const PAYMENT_REQUEST_HEADERS = ["payment-signature", "x-payment"] as const;
export const PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE";

/** Read the first present payment header value from a request's headers. */
export function readPaymentHeader(headers: Headers): string | null {
  for (const name of PAYMENT_REQUEST_HEADERS) {
    const value = headers.get(name);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Decode a payment header value (base64-JSON or raw JSON) into a payload. */
export function decodePaymentPayload(raw: string | null): PaymentPayload | null {
  if (!raw) {
    return null;
  }

  const candidates = [raw];
  const decoded = base64Decode(raw);
  if (decoded && decoded !== raw) {
    candidates.push(decoded);
  }

  for (const candidate of candidates) {
    const parsed = tryJson(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PaymentPayload;
    }
  }

  return null;
}

/** Encode a server-side payment receipt for the `X-PAYMENT-RESPONSE` header. */
export function encodePaymentResponseHeader(value: unknown): string {
  return base64Encode(JSON.stringify(value));
}

function tryJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function base64Decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function base64Encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}
