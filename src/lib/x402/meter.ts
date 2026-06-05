// The metering wrapper a route calls before doing its work. It builds the 402
// `PaymentRequired` envelope (with a Bazaar advertise block), runs the selected
// verifier on any presented payment, applies the free daily allowance, and
// returns either a `blocked` response to send as-is or a `granted` grant whose
// headers the route attaches to its real response.

import { NextResponse } from "next/server";
import type { MeteredResource } from "@/lib/x402/pricing";
import { bazaarInputForResource, meteredResourceBySlug } from "@/lib/x402/pricing";
import type { PaymentRequired, PaymentRequirements } from "@/lib/x402/types";
import { resolveX402Config } from "@/lib/x402/config";
import type { X402Config } from "@/lib/x402/config";
import {
  readPaymentHeader,
  decodePaymentPayload,
  encodePaymentResponseHeader,
  PAYMENT_RESPONSE_HEADER
} from "@/lib/x402/header";
import { selectVerifier, FacilitatorUnreachableError } from "@/lib/x402/verifier";
import { consumeAllowance } from "@/lib/x402/allowance";

const DEFAULT_BASE_URL = "https://nocksperimental.com";

export type GrantMode = "stub" | "facilitator" | "free-allowance";

export interface PaymentGrant {
  mode: GrantMode;
  responseHeaders: Record<string, string>;
}

export type MeterResult =
  | { kind: "blocked"; response: Response }
  | { kind: "granted"; grant: PaymentGrant };

interface MeterError {
  code: string;
  message: string;
}

export async function meterRequest(
  request: Request,
  resource: MeteredResource,
  config: X402Config = resolveX402Config(),
  now: Date = new Date()
): Promise<MeterResult> {
  const requirements = buildPaymentRequirements(resource, config, resolveResourceUrl(request, resource));
  const headerValue = readPaymentHeader(request.headers);

  if (headerValue) {
    const payload = decodePaymentPayload(headerValue);
    if (!payload) {
      return pay402(resource, requirements, { code: "invalid_payload", message: "could not decode payment payload" });
    }

    const verifier = selectVerifier(config);
    let outcome;
    try {
      outcome = await verifier.verify(payload, requirements, now);
    } catch (error) {
      if (error instanceof FacilitatorUnreachableError) {
        return serverError(502, "facilitator_unreachable", error.message);
      }
      return serverError(503, "verifier_unavailable", String(error));
    }

    if (!outcome.valid) {
      return pay402(resource, requirements, {
        code: outcome.code ?? "payment_invalid",
        message: outcome.message ?? "payment rejected"
      });
    }

    const receipt = encodePaymentResponseHeader({
      success: true,
      mode: outcome.mode,
      network: config.network,
      payer: outcome.payer ?? null,
      amountNicks: outcome.amountNicks ?? requirements.maxAmountRequired,
      nonce: outcome.nonce ?? null,
      txId: outcome.txId ?? null
    });
    return granted(outcome.mode, { [PAYMENT_RESPONSE_HEADER]: receipt });
  }

  // No payment presented: consult the free daily allowance.
  const clientKey = request.headers.get("cf-connecting-ip")?.trim() || "anonymous";
  const allowance = await consumeAllowance(clientKey, config.freeAllowancePerDay, now);
  if (allowance.allowed) {
    const receipt = encodePaymentResponseHeader({
      success: true,
      mode: "free-allowance",
      remaining: allowance.remaining,
      limit: allowance.limit
    });
    return granted("free-allowance", { [PAYMENT_RESPONSE_HEADER]: receipt });
  }

  return pay402(resource, requirements);
}

export type GateResult =
  | { blocked: true; response: Response }
  | { blocked: false; headers: Record<string, string> };

/**
 * Route-level convenience used by metered routes. Respects the master `enabled`
 * switch (off -> never meters, so existing behavior is untouched), looks the
 * resource up by slug, and returns either a blocked response to send as-is or
 * the headers to attach to the route's real response.
 */
export async function guard(request: Request, slug: string, now: Date = new Date()): Promise<GateResult> {
  const config = resolveX402Config();
  if (!config.enabled) {
    return { blocked: false, headers: {} };
  }

  const resource = meteredResourceBySlug(slug);
  if (!resource) {
    return { blocked: false, headers: {} };
  }

  const result = await meterRequest(request, resource, config, now);
  if (result.kind === "blocked") {
    return { blocked: true, response: result.response };
  }
  return { blocked: false, headers: result.grant.responseHeaders };
}

export function buildPaymentRequirements(
  resource: MeteredResource,
  config: X402Config,
  resourceUrl: string
): PaymentRequirements {
  return {
    scheme: config.scheme,
    network: config.network,
    maxAmountRequired: resource.priceNicks,
    resource: resourceUrl,
    asset: config.asset,
    payTo: config.payTo,
    maxTimeoutSeconds: config.maxTimeoutSeconds,
    description: resource.description,
    mimeType: resource.mimeType
  };
}

export function buildPaymentRequired(
  resource: MeteredResource,
  requirements: PaymentRequirements,
  error?: MeterError
): PaymentRequired {
  return {
    x402Version: 2,
    error: error ? `Payment required: ${error.code}` : "Payment required",
    resource: {
      url: requirements.resource,
      description: resource.description,
      mimeType: resource.mimeType
    },
    accepts: [requirements],
    extensions: {
      bazaar: {
        info: { input: bazaarInputForResource(resource), output: { type: "json" } },
        schema: { type: "object" },
        accepts: [requirements]
      }
    }
  };
}

function pay402(resource: MeteredResource, requirements: PaymentRequirements, error?: MeterError): MeterResult {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (error) {
    headers["X-Payment-Error"] = error.code;
  }
  return {
    kind: "blocked",
    response: NextResponse.json(buildPaymentRequired(resource, requirements, error), { status: 402, headers })
  };
}

function serverError(status: number, code: string, message: string): MeterResult {
  return {
    kind: "blocked",
    response: NextResponse.json(
      { error: { code, message } },
      { status, headers: { "Cache-Control": "no-store", "X-Payment-Error": code } }
    )
  };
}

function granted(mode: GrantMode, responseHeaders: Record<string, string>): MeterResult {
  return { kind: "granted", grant: { mode, responseHeaders } };
}

function resolveResourceUrl(request: Request, resource: MeteredResource): string {
  try {
    const url = new URL(request.url);
    return `${url.origin}${url.pathname}`;
  } catch {
    return `${DEFAULT_BASE_URL}${resource.pathPattern}`;
  }
}
