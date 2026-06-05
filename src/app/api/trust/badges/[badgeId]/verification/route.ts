import { NextResponse } from "next/server";
import { createBadgeVerificationBundle } from "@/lib/trust-badge-verification";

type BadgeVerificationRouteContext = {
  params: Promise<{
    badgeId: string;
  }>;
};

export async function GET(_request: Request, { params }: BadgeVerificationRouteContext) {
  const { badgeId } = await params;
  const verification = createBadgeVerificationBundle(badgeId);

  if (!verification) {
    return NextResponse.json({ error: "Badge not found", badgeId }, { status: 404 });
  }

  return NextResponse.json(verification);
}
