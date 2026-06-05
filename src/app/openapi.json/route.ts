import { NextResponse } from "next/server";
import { createOpenApiSpec } from "@/lib/openapi-spec";

export function GET() {
  return NextResponse.json(createOpenApiSpec(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
