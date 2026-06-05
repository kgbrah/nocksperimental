import { NextResponse } from "next/server";
import { buildBazaarDirectory, parseBazaarFilters } from "@/lib/bazaar/aggregate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const directory = await buildBazaarDirectory(parseBazaarFilters(url.searchParams));

  return NextResponse.json(directory);
}
