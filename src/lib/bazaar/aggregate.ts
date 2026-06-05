// Build the Verified Bazaar directory: own metered x402 resources (payable) +
// registry-backed services (solvers, compute providers, token issuers, apps;
// trust from badges) + facilitator discoveries when reachable. Filtering and
// listing lookup live here so the routes stay thin.

import { METERED_RESOURCES } from "@/lib/x402/pricing";
import { resolveX402Config } from "@/lib/x402/config";
import type { X402Config } from "@/lib/x402/config";
import {
  solverScorecards,
  computeBenchmarkProfiles,
  tokenCompatibilityReports,
  resolvedBadges
} from "@/lib/trust-signals";
import { registryCanonicalBaseUrl } from "@/lib/registry-manifest";
import { trustFromBadgeId, trustFromReport } from "@/lib/bazaar/trust";
import { discoverFacilitatorResources } from "@/lib/bazaar/facilitator-discovery";
import type { FacilitatorResource } from "@/lib/bazaar/facilitator-discovery";
import { BAZAAR_KINDS, NO_TRUST, defaultBazaarFilters } from "@/lib/bazaar/types";
import type {
  BazaarDirectory,
  BazaarFilters,
  BazaarKind,
  BazaarListing,
  BazaarSource
} from "@/lib/bazaar/types";

export async function buildBazaarDirectory(
  filters: BazaarFilters = defaultBazaarFilters(),
  now: Date = new Date()
): Promise<BazaarDirectory> {
  const config = resolveX402Config();

  const listings: BazaarListing[] = [
    ...ownMeteredListings(config),
    ...solverListings(),
    ...computeProviderListings(),
    ...tokenIssuerListings(),
    ...appListings()
  ];

  const facilitator = await discoverFacilitatorResources();
  if (facilitator.reachable) {
    listings.push(...facilitatorListings(facilitator.resources, config));
  }

  const filtered = applyFilters(listings, filters);

  return {
    version: "v0",
    generatedAt: now.toISOString(),
    network: config.network,
    facilitator: { configured: facilitator.configured, reachable: facilitator.reachable },
    filters,
    counts: {
      total: filtered.length,
      verified: filtered.filter((listing) => listing.trust.verified).length,
      payable: filtered.filter((listing) => listing.payable).length,
      bySource: countBySource(filtered)
    },
    listings: filtered
  };
}

export async function findBazaarListing(id: string): Promise<BazaarListing | null> {
  const directory = await buildBazaarDirectory(defaultBazaarFilters());
  return directory.listings.find((listing) => listing.id === id) ?? null;
}

export function parseBazaarFilters(params: URLSearchParams): BazaarFilters {
  const minScoreRaw = params.get("minScore");
  const minScore =
    minScoreRaw != null && minScoreRaw.trim() !== "" && Number.isFinite(Number(minScoreRaw))
      ? Number(minScoreRaw)
      : null;
  const kind = params.get("kind");

  return {
    network: trimOrNull(params.get("network")),
    verifiedOnly: isTrue(params.get("verifiedOnly")),
    payableOnly: isTrue(params.get("payableOnly")),
    minScore,
    kind: isBazaarKind(kind) ? kind : null
  };
}

function ownMeteredListings(config: X402Config): BazaarListing[] {
  return METERED_RESOURCES.map((resource) => ({
    id: `nocks:${resource.slug}`,
    kind: "verification-endpoint" as const,
    service: `Nocksperimental — ${resource.description}`,
    description: resource.description,
    source: "nocksperimental" as const,
    payable: true,
    payment: {
      resource: `${registryCanonicalBaseUrl}${toApiPath(resource.pathPattern)}`,
      network: config.network,
      scheme: config.scheme,
      asset: config.asset,
      priceNicks: resource.priceNicks,
      payTo: config.payTo,
      method: resource.method
    },
    trust: NO_TRUST,
    links: { openApi: `${registryCanonicalBaseUrl}/openapi.json` }
  }));
}

function solverListings(): BazaarListing[] {
  return solverScorecards.map((solver) => ({
    id: `solver:${solver.solverSlug}`,
    kind: "solver" as const,
    service: solver.solverName,
    description: `Intent solver — grade ${solver.grade}, score ${solver.score}`,
    source: "registry" as const,
    payable: false,
    payment: null,
    trust: trustFromReport(solver.reportSlug, solver.fixtureId, solver.score, solver.signals ?? []),
    links: { scorecard: `${registryCanonicalBaseUrl}/api/trust/solver-scores/${solver.id}` }
  }));
}

function computeProviderListings(): BazaarListing[] {
  return computeBenchmarkProfiles.map((profile) => ({
    id: `compute:${profile.providerSlug}`,
    kind: "compute-provider" as const,
    service: profile.providerName,
    description: `Compute provider — score ${profile.score}`,
    source: "registry" as const,
    payable: false,
    payment: null,
    trust: trustFromBadgeId(profile.badgeId, profile.score),
    links: { profile: `${registryCanonicalBaseUrl}/api/trust/compute-benchmarks/${profile.id}` }
  }));
}

function tokenIssuerListings(): BazaarListing[] {
  return tokenCompatibilityReports.map((report) => ({
    id: `token:${report.id}`,
    kind: "token-issuer" as const,
    service: `${report.tokenSymbol} — ${report.issuerWorkspace}`,
    description: `Native token issuer — compatibility ${report.status}, score ${report.score}`,
    source: "registry" as const,
    payable: false,
    payment: null,
    trust: trustFromBadgeId(report.badgeId, report.score),
    links: { report: `${registryCanonicalBaseUrl}/api/trust/token-compatibility/${report.id}` }
  }));
}

function appListings(): BazaarListing[] {
  return resolvedBadges
    .filter((badge) => badge.kind === "app-report")
    .map((badge) => ({
      id: `app:${badge.reportSlug}`,
      kind: "app" as const,
      service: badge.label,
      description: `NockApp — ${badge.currentStatus}`,
      source: "registry" as const,
      payable: false,
      payment: null,
      trust: {
        verified: badge.currentStatus === "verified",
        badgeId: badge.id,
        badgeStatus: badge.currentStatus,
        score: null,
        signals: []
      },
      links: { badge: `${registryCanonicalBaseUrl}/api/trust/badges/${badge.id}` }
    }));
}

function facilitatorListings(resources: FacilitatorResource[], config: X402Config): BazaarListing[] {
  return resources.map((resource) => {
    const payable = Boolean(resource.priceNicks && resource.payTo);
    return {
      id: `facilitator:${slugify(resource.resource)}`,
      kind: "facilitator-resource" as const,
      service: resource.description ?? resource.resource,
      description: resource.description ?? "Facilitator-discovered payable service",
      source: "facilitator" as const,
      payable,
      payment: payable
        ? {
            resource: resource.resource,
            network: resource.network ?? config.network,
            scheme: resource.scheme ?? config.scheme,
            asset: "NOCK",
            priceNicks: resource.priceNicks as string,
            payTo: resource.payTo as string,
            method: "GET"
          }
        : null,
      trust: NO_TRUST,
      links: { resource: resource.resource }
    };
  });
}

function applyFilters(listings: BazaarListing[], filters: BazaarFilters): BazaarListing[] {
  return listings.filter((listing) => {
    if (filters.verifiedOnly && !listing.trust.verified) return false;
    if (filters.payableOnly && !listing.payable) return false;
    if (filters.kind && listing.kind !== filters.kind) return false;
    if (filters.network && listing.payment && listing.payment.network !== filters.network) return false;
    if (filters.minScore != null && (listing.trust.score == null || listing.trust.score < filters.minScore)) {
      return false;
    }
    return true;
  });
}

function countBySource(listings: BazaarListing[]): Record<BazaarSource, number> {
  const counts: Record<BazaarSource, number> = { nocksperimental: 0, registry: 0, facilitator: 0 };
  for (const listing of listings) {
    counts[listing.source] += 1;
  }
  return counts;
}

function toApiPath(pattern: string): string {
  return pattern.replace(/\[([^\]]+)\]/g, "{$1}");
}

function slugify(value: string): string {
  const slug = value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64);
  return slug || "resource";
}

function trimOrNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isTrue(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isBazaarKind(value: string | null): value is BazaarKind {
  return value != null && (BAZAAR_KINDS as string[]).includes(value);
}
