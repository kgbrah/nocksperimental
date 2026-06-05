import { NextResponse } from "next/server";
import { createWellKnownRegistryManifest } from "@/lib/registry-manifest";

export function GET() {
  return NextResponse.json(createWellKnownRegistryManifest(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
