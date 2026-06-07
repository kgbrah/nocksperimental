// The metered-resource registry: the single source of truth for which
// endpoints are paid, their price, and how they are advertised for Bazaar
// discovery. Producing/browsing endpoints are intentionally absent.

import type { BazaarHttpQueryInput } from "./types";

export interface MeteredResource {
  /** Stable identifier for the resource. */
  slug: string;
  /** Route path (Next dynamic segments in `[bracket]` form). */
  pathPattern: string;
  /** Price in nicks, as a decimal string. */
  priceNicks: string;
  /** Human-readable description (used in 402 + discovery). */
  description: string;
  /** Response media type. */
  mimeType: string;
  /** HTTP method that pays (all current metered resources are GET). */
  method: "GET";
}

export const METERED_RESOURCES: MeteredResource[] = [
  {
    slug: "badge-verify",
    pathPattern: "/api/trust/badges/verify",
    priceNicks: "1000",
    description: "Verify badge issuance by badge id, payload digest, signature, or issuer key",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "generated-report-verify",
    pathPattern: "/api/reports/generated/verify",
    priceNicks: "1000",
    description: "Verify generated report hashes and snapshot roots",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "fakenet-evidence-verify",
    pathPattern: "/api/fakenet/evidence/verify",
    priceNicks: "1000",
    description: "Verify local fakenet evidence receipts",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "workspace-evidence-verify",
    pathPattern: "/api/workspaces/evidence/verify",
    priceNicks: "1000",
    description: "Verify private workspace evidence",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "compute-benchmark-detail",
    pathPattern: "/api/trust/compute-benchmarks/[profileId]",
    priceNicks: "10000",
    description: "Premium compute benchmark provider profile",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "token-compatibility-detail",
    pathPattern: "/api/trust/token-compatibility/[reportId]",
    priceNicks: "10000",
    description: "Premium native token compatibility report",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "invariant-pack-report-verify",
    pathPattern: "/api/invariants/packs/verify",
    priceNicks: "1000",
    description: "Verify an invariant pack's identity, upstream basis, and invariant set",
    mimeType: "application/json",
    method: "GET"
  },
  {
    slug: "drift-status-attestation",
    pathPattern: "/api/nockchain/drift-status/attestation",
    priceNicks: "10000",
    description: "Signed attestation of the current Nockchain upstream drift status",
    mimeType: "application/json",
    method: "GET"
  }
];

export function meteredResourceBySlug(slug: string): MeteredResource | undefined {
  return METERED_RESOURCES.find((resource) => resource.slug === slug);
}

/** Build the Bazaar `info.input` block advertising a metered GET resource. */
export function bazaarInputForResource(resource: MeteredResource): BazaarHttpQueryInput {
  return { type: "http", method: resource.method };
}
