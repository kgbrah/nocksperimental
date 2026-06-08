// Best-effort discovery of payable services from a configured x402-nockchain
// facilitator's Bazaar endpoint. Always graceful: if no facilitator is
// configured, or it is unreachable / malformed, we return an empty set and the
// directory simply omits facilitator listings.

import { isSafeFacilitatorUrl, resolveX402Config } from "@/lib/x402/config";

export interface FacilitatorResource {
  resource: string;
  kind: string;
  network?: string;
  scheme?: string;
  priceNicks?: string;
  payTo?: string;
  description?: string;
}

export interface FacilitatorDiscovery {
  configured: boolean;
  reachable: boolean;
  resources: FacilitatorResource[];
}

export async function discoverFacilitatorResources(timeoutMs = 1500): Promise<FacilitatorDiscovery> {
  const config = resolveX402Config();
  if (!config.facilitatorUrl) {
    return { configured: false, reachable: false, resources: [] };
  }

  // SSRF guard, mirroring FacilitatorVerifier: this fetch is server-side to the
  // same operator-configured URL, so apply the identical safety gate. A
  // configured-but-unsafe URL (cloud-metadata / link-local / internal-only) is
  // treated as configured-but-unreachable rather than fetched.
  if (!isSafeFacilitatorUrl(config.facilitatorUrl)) {
    return { configured: true, reachable: false, resources: [] };
  }

  const base = config.facilitatorUrl.replace(/\/+$/, "");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // redirect:"manual" so a compromised facilitator cannot 3xx-pivot the
    // server-side fetch to an internal host; any 3xx surfaces as !response.ok.
    const response = await fetch(`${base}/discovery/resources`, {
      signal: controller.signal,
      redirect: "manual"
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { configured: true, reachable: false, resources: [] };
    }

    const body: unknown = await response.json();
    const items = extractItems(body);
    const resources = items
      .map(normalizeResource)
      .filter((resource): resource is FacilitatorResource => resource !== null);

    return { configured: true, reachable: true, resources };
  } catch {
    return { configured: true, reachable: false, resources: [] };
  }
}

function extractItems(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && typeof body === "object") {
    const resources = (body as Record<string, unknown>).resources;
    if (Array.isArray(resources)) {
      return resources;
    }
  }
  return [];
}

function normalizeResource(item: unknown): FacilitatorResource | null {
  if (!item || typeof item !== "object") {
    return null;
  }
  const record = item as Record<string, unknown>;
  const resource =
    typeof record.resource === "string"
      ? record.resource
      : typeof record.url === "string"
        ? record.url
        : null;
  if (!resource) {
    return null;
  }

  const accepts = Array.isArray(record.accepts) ? (record.accepts[0] as Record<string, unknown> | undefined) : undefined;
  const pick = (key: string): string | undefined => {
    const value = accepts?.[key] ?? record[key];
    return typeof value === "string" ? value : undefined;
  };

  return {
    resource,
    kind: typeof record.type === "string" ? record.type : "http",
    network: pick("network"),
    scheme: pick("scheme"),
    priceNicks: pick("maxAmountRequired") ?? pick("priceNicks"),
    payTo: pick("payTo"),
    description: typeof record.description === "string" ? record.description : undefined
  };
}
