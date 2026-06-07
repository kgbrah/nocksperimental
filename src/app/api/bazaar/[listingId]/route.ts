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

  // Listing ids legitimately contain ':' so callers URL-encode them; a stray/
  // malformed percent-escape makes decodeURIComponent throw. Treat an undecodable
  // id as not-found (404) rather than letting the URIError surface as a 500.
  let decodedListingId: string;
  try {
    decodedListingId = decodeURIComponent(listingId);
  } catch {
    return NextResponse.json({ error: "Bazaar listing not found", listingId }, { status: 404 });
  }

  const listing = await findBazaarListing(decodedListingId);

  if (!listing) {
    return NextResponse.json({ error: "Bazaar listing not found", listingId }, { status: 404 });
  }

  return NextResponse.json({ version: "v0", listing });
}
