/**
 * Deterministic canonical stringify for hash-chain digests.
 *
 * Object keys are sorted by codepoint comparison (NOT `localeCompare`, which is
 * locale/ICU-dependent and can yield non-reproducible cross-runtime ordering for
 * digit/underscore/uppercase-leading keys). This matches the codepoint ordering
 * used by `canonicalizeBadgePayload` in `trust-badge-crypto.ts` and is the single
 * source of truth for the trust-update log, registry-update audit events, and the
 * registry checkpoint roots.
 */
export function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([keyA], [keyB]) =>
      keyA < keyB ? -1 : keyA > keyB ? 1 : 0
    );

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
