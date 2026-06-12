// Guard against the published fakenet key being passed off as livenet evidence.
//
// Nockchain's fakenet seedphrase and its mining PKH are PUBLISHED in the
// development docs (Makefile / .env_example / e2e scenarios) and — per the
// `development-and-testing.md` warning — the same key WORKS ON LIVENET. So a
// signature or note "owned by" this key proves nothing about livenet value:
// anyone holding the repo can produce it. A trust cert must therefore never
// accept evidence bound to a well-known fakenet key as LIVENET evidence
// (nockchain roadmap alignment 2026). This mirrors the dev-issuer-key rule:
// a publicly-known key can never be a live trust anchor.

/** Canonical public fakenet keys (Nockchain `MINING_PKH` default, et al.). */
export const WELL_KNOWN_FAKENET_PKHS: ReadonlySet<string> = new Set([
  // nockchain default fakenet mining PKH — Makefile:11, .env_example:3,
  // tests/e2e/scenarios/*.yaml. Public + livenet-valid ⇒ a trojan horse.
  "9yPePjfWAdUnzaQKyxcRXKRa5PpUzKKEwtpECBZsUYt9Jd7egSDEWoV",
]);

/** True if `value` is a known public fakenet key. */
export function isWellKnownFakenetKey(value: unknown): boolean {
  return typeof value === "string" && WELL_KNOWN_FAKENET_PKHS.has(value.trim());
}

// Networks that carry REAL value. Their `-fakenet`/`-sepolia` siblings are
// honest test infrastructure and may legitimately use the fakenet key.
const LIVENET_NETWORKS: ReadonlySet<string> = new Set(["nockchain", "base"]);

/** True for a livenet (real-value) network id; false for fakenet/testnet ids. */
export function isLivenetNetwork(network: unknown): boolean {
  return typeof network === "string" && LIVENET_NETWORKS.has(network.trim());
}

/**
 * Deep-scan an arbitrary evidence object for a well-known fakenet key, so the
 * guard catches the key wherever it appears (address, note owner, signer, …)
 * without coupling to a single schema field. Depth-bounded to stay cheap and
 * cycle-safe.
 */
export function containsWellKnownFakenetKey(value: unknown, depth = 0): boolean {
  if (value == null || depth > 8) return false;
  if (typeof value === "string") return isWellKnownFakenetKey(value);
  if (Array.isArray(value)) return value.some((v) => containsWellKnownFakenetKey(v, depth + 1));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) =>
      containsWellKnownFakenetKey(v, depth + 1)
    );
  }
  return false;
}

/**
 * The core guard: evidence that claims a LIVENET network while carrying a
 * well-known fakenet key is a trojan-horse forgery. Returns true when the
 * evidence MUST be rejected (it can never be a `verified` livenet cert).
 */
export function fakenetKeyOnLivenetViolation(args: { network: unknown; evidence: unknown }): boolean {
  return isLivenetNetwork(args.network) && containsWellKnownFakenetKey(args.evidence);
}
