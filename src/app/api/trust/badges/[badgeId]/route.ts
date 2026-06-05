import { NextResponse } from "next/server";
import { badgeEmbedForId, resolvedBadgeForId } from "@/lib/trust-signals";

type BadgeRouteContext = {
  params: Promise<{
    badgeId: string;
  }>;
};

export async function GET(_request: Request, { params }: BadgeRouteContext) {
  const { badgeId } = await params;
  const badge = resolvedBadgeForId(badgeId);

  if (!badge) {
    return NextResponse.json({ error: "Badge not found", badgeId }, { status: 404 });
  }

  return NextResponse.json({
    badge,
    embed: badgeEmbedForId(badgeId)
  });
}
