// Resolved x402 configuration. Pure and env-injectable so it is trivially
// testable: pass an env record, get a config back. In the Cloudflare Worker
// runtime the caller passes `getCloudflareContext().env`; everywhere else it
// falls back to `process.env`.

/** Default revenue wallet (x402 `payTo`). Overridable via NOCKS_X402_PAY_TO. */
export const DEFAULT_PAY_TO = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
export const DEFAULT_NETWORK = "nockchain:fakenet";
export const ASSET = "NOCK";
export const SCHEME = "exact";
export const X402_VERSION = 2;

export type VerifierMode = "stub" | "facilitator";

export interface X402Config {
  network: string;
  asset: string;
  scheme: string;
  /** Master on-switch for the paywall. When false, routes skip metering. */
  enabled: boolean;
  payTo: string;
  facilitatorUrl: string | null;
  verifierMode: VerifierMode;
  maxTimeoutSeconds: number;
  clockSkewSeconds: number;
  freeAllowancePerDay: number;
}

type EnvRecord = Record<string, string | undefined>;

/**
 * Resolve x402 config from an env record. The verifier mode is derived: a
 * facilitator URL means real verification/settlement, otherwise the offline
 * stub. This is the single swap-to-real seam.
 */
export function resolveX402Config(env: EnvRecord = readDefaultEnv()): X402Config {
  const facilitatorUrl = trimToNull(env.NOCKS_X402_FACILITATOR_URL);

  return {
    network: nonEmpty(env.NOCKS_X402_NETWORK) ?? DEFAULT_NETWORK,
    asset: ASSET,
    scheme: SCHEME,
    enabled: toBool(env.NOCKS_X402_ENABLED),
    payTo: nonEmpty(env.NOCKS_X402_PAY_TO) ?? DEFAULT_PAY_TO,
    facilitatorUrl,
    verifierMode: facilitatorUrl ? "facilitator" : "stub",
    maxTimeoutSeconds: toPositiveInt(env.NOCKS_X402_MAX_TIMEOUT_SECONDS, 120),
    clockSkewSeconds: toPositiveInt(env.NOCKS_X402_CLOCK_SKEW_SECONDS, 30),
    freeAllowancePerDay: toNonNegativeInt(env.NOCKS_X402_FREE_ALLOWANCE_PER_DAY, 5),
  };
}

function readDefaultEnv(): EnvRecord {
  if (typeof process !== "undefined" && process.env) {
    return process.env as EnvRecord;
  }
  return {};
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function trimToNull(value: string | undefined): string | null {
  return nonEmpty(value);
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toBool(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
