import driftStatusData from "@/data/nockchain-drift-status.json";
import {
  PINNED_UPSTREAM_BUILD,
  PINNED_UPSTREAM_COMMIT
} from "@/lib/nockchain-upstream-anchor";

// NOTE: This module reads the dependency-free upstream anchor constants and the
// committed drift-status JSON directly (not the drift-status or upstream libs).
// That keeps it free of the trust-signals import cycle while still reporting the
// pinned commit and the current aggregate drift status.

export type BadgeFreshness = "fresh" | "stale" | "unknown";

export type BadgeSourceAnchor = {
  commit: string;
  build: string;
  workspaceMemberHash?: string;
  sourceRefs?: string[];
};

export function currentUpstreamAnchor() {
  const driftStatus = (driftStatusData as { status?: string }).status ?? "unknown";

  return {
    commit: PINNED_UPSTREAM_COMMIT,
    build: PINNED_UPSTREAM_BUILD,
    driftStatus
  };
}

export function computeBadgeFreshness(sourceAnchor?: BadgeSourceAnchor | null): BadgeFreshness {
  if (!sourceAnchor?.commit) {
    return "unknown";
  }

  return sourceAnchor.commit === currentUpstreamAnchor().commit ? "fresh" : "stale";
}
