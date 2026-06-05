import { NextResponse } from "next/server";
import { privateWorkspaces, reportHistory } from "@/lib/report-history";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import { resolvedBadges, trustSignals } from "@/lib/trust-signals";

const SERVICE_NAME = "nocksperimental";
const PRODUCTION_DOMAIN = "nocksperimental.com";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: SERVICE_NAME,
    checkedAt: new Date().toISOString(),
    deployment: {
      target: "cloudflare-workers",
      domain: PRODUCTION_DOMAIN
    },
    checks: {
      reportHistory: {
        status: reportHistory.length > 0 ? "ok" : "empty",
        count: reportHistory.length
      },
      trustRegistry: {
        status: trustSignals.verifiedBadges.length > 0 && trustUpdateChainSummary.entryCount > 0 ? "ok" : "empty",
        badges: trustSignals.verifiedBadges.length,
        resolvedBadges: resolvedBadges.length,
        trustUpdates: trustUpdateChainSummary.entryCount
      },
      workspaces: {
        status: privateWorkspaces.length > 0 ? "ok" : "empty",
        count: privateWorkspaces.length
      }
    }
  });
}
