import { NextResponse } from "next/server";
import { createIssuerKeyDiscovery } from "@/lib/trust-issuer-keys";

export function GET() {
  return NextResponse.json(createIssuerKeyDiscovery(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
