import { NextResponse } from "next/server";
import { createBadgeEmbedBundle } from "@/lib/trust-badge-embed";

type BadgeEmbedRouteContext = {
  params: Promise<{
    badgeId: string;
  }>;
};

export async function GET(_request: Request, { params }: BadgeEmbedRouteContext) {
  const { badgeId } = await params;
  const result = createBadgeEmbedBundle(badgeId);

  if (result.status === "missing") {
    return NextResponse.json({ error: "Badge not found", badgeId }, { status: 404 });
  }

  if (result.status === "not_embeddable") {
    return NextResponse.json(
      {
        error: "Badge is not publicly embeddable",
        badgeId,
        currentStatus: result.badge.currentStatus
      },
      { status: 410 }
    );
  }

  return NextResponse.json(result.bundle, {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
