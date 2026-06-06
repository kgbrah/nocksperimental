// Standalone pinned upstream constants with NO imports. Kept dependency-free on
// purpose so freshness/anchor consumers can read the current pinned Nockchain
// commit without importing the heavy registry/upstream modules (which would form
// an import cycle through trust-signals).

export const PINNED_UPSTREAM_COMMIT = "33ba97b1e206dd89b15c61b72b7802caf2136c18";
export const PINNED_UPSTREAM_BUILD = "build-33ba97b1e206dd89b15c61b72b7802caf2136c18";
