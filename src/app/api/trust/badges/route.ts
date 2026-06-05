import { NextResponse } from "next/server";
import {
  badgeEmbedForId,
  badgeEmbeds,
  badgeIssuanceReceipts,
  badgeRevocations,
  resolvedBadges
} from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: resolvedBadges.length,
    activeEmbeds: badgeEmbeds.length,
    issuanceReceipts: badgeIssuanceReceipts,
    badges: resolvedBadges.map((badge) => ({
      ...badge,
      embed: badgeEmbedForId(badge.id)
    })),
    revocations: badgeRevocations,
    embeds: badgeEmbeds
  });
}
