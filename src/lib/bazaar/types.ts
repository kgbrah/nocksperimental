// The Verified Bazaar: a trust-filtered directory of payable NockApp services
// for agents. It fuses x402 payability (own metered resources + facilitator
// discoveries) with nocksperimental's trust registry (verified badges, solver
// scores, benchmarks). A listing is "verified" iff it has a verified badge.

export type BazaarSource = "nocksperimental" | "registry" | "facilitator";

export type BazaarKind =
  | "verification-endpoint"
  | "solver"
  | "compute-provider"
  | "token-issuer"
  | "app"
  | "facilitator-resource";

export interface BazaarTrust {
  /** True iff backed by a registry badge whose current status is "verified". */
  verified: boolean;
  badgeId: string | null;
  badgeStatus: string | null;
  score: number | null;
  signals: string[];
}

export interface BazaarPayment {
  resource: string;
  network: string;
  scheme: string;
  asset: string;
  priceNicks: string;
  payTo: string;
  method: string;
}

export interface BazaarListing {
  id: string;
  kind: BazaarKind;
  service: string;
  description: string;
  source: BazaarSource;
  payable: boolean;
  payment: BazaarPayment | null;
  trust: BazaarTrust;
  links: Record<string, string>;
}

export interface BazaarFilters {
  network: string | null;
  verifiedOnly: boolean;
  payableOnly: boolean;
  minScore: number | null;
  kind: BazaarKind | null;
}

export interface BazaarDirectory {
  version: string;
  generatedAt: string;
  network: string;
  facilitator: { configured: boolean; reachable: boolean };
  filters: BazaarFilters;
  counts: {
    total: number;
    verified: number;
    payable: number;
    bySource: Record<BazaarSource, number>;
  };
  listings: BazaarListing[];
}

export const BAZAAR_KINDS: BazaarKind[] = [
  "verification-endpoint",
  "solver",
  "compute-provider",
  "token-issuer",
  "app",
  "facilitator-resource"
];

export const NO_TRUST: BazaarTrust = {
  verified: false,
  badgeId: null,
  badgeStatus: null,
  score: null,
  signals: []
};

export function defaultBazaarFilters(): BazaarFilters {
  return { network: null, verifiedOnly: false, payableOnly: false, minScore: null, kind: null };
}
