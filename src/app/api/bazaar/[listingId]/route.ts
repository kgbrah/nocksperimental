import { NextResponse } from "next/server";
import { findBazaarListing } from "@/lib/bazaar/aggregate";

export const dynamic = "force-dynamic";

type BazaarListingRouteContext = {
  params: Promise<{
    listingId: string;
  }>;
};

export async function GET(_request: Request, { params }: BazaarListingRouteContext) {
  const { listingId } = await params;
  const listing = await findBazaarListing(decodeURIComponent(listingId));

  if (!listing) {
    return NextResponse.json({ error: "Bazaar listing not found", listingId }, { status: 404 });
  }

  return NextResponse.json({ version: "v0", listing });
}
