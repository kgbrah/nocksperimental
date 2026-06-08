import { createHash, timingSafeEqual } from "node:crypto";

export type RegistryUpdateAuth = {
  keyId: string;
};

/**
 * Authenticate a registry-update request against the configured key set.
 *
 * Returns the resolved `{ keyId }` on success (used by the writer route to stamp
 * audit events) or `null` on failure. The audit reader route only needs a
 * boolean, which it derives via `Boolean(authenticateRegistryUpdate(request))`.
 *
 * Honors:
 * - `NOCKS_REGISTRY_UPDATE_KEYS` (comma-separated `keyId:secret`, rotation-aware)
 *   matched by the `x-nocks-registry-key-id` header, then
 * - legacy `NOCKS_REGISTRY_UPDATE_KEY` single-secret fallback.
 *
 * Secret comparison is timing-safe via `safeCompareSecrets`.
 */
export function authenticateRegistryUpdate(request: Request): RegistryUpdateAuth | null {
  const requestKey = request.headers.get("x-nocks-registry-key") ?? "";
  const configuredKeys = parseRegistryUpdateKeys();

  if (configuredKeys.length > 0) {
    const requestKeyId = request.headers.get("x-nocks-registry-key-id") ?? "";
    const configuredKey = configuredKeys.find((key) => key.keyId === requestKeyId);

    if (configuredKey && safeCompareSecrets(configuredKey.secret, requestKey)) {
      return { keyId: configuredKey.keyId };
    }

    return null;
  }

  const legacyKey = process.env.NOCKS_REGISTRY_UPDATE_KEY;
  if (legacyKey && safeCompareSecrets(legacyKey, requestKey)) {
    // Do NOT echo the caller-supplied x-nocks-registry-key-id as the audited key id.
    // Legacy single-secret mode has no per-request key identity to verify, so record a
    // fixed sentinel rather than attacker-controlled attribution in the audit chain.
    return { keyId: "legacy" };
  }

  return null;
}

export function parseRegistryUpdateKeys() {
  return (process.env.NOCKS_REGISTRY_UPDATE_KEYS ?? "")
    .split(",")
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex === -1) {
        return null;
      }

      const keyId = entry.slice(0, separatorIndex).trim();
      const secret = entry.slice(separatorIndex + 1).trim();

      if (!keyId || !secret) {
        return null;
      }

      return { keyId, secret };
    })
    .filter((entry): entry is { keyId: string; secret: string } => Boolean(entry));
}

export function safeCompareSecrets(expected: string, actual: string) {
  const expectedHash = createHash("sha256").update(expected).digest();
  const actualHash = createHash("sha256").update(actual).digest();

  return timingSafeEqual(expectedHash, actualHash);
}
