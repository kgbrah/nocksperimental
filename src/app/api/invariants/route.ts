import { NextResponse } from "next/server";
import { invariantCatalog } from "@/lib/lab-report";
import { invariantPacks } from "@/lib/invariant-packs";

export function GET() {
  return NextResponse.json({
    version: "v0",
    invariants: invariantCatalog,
    packs: invariantPacks
  });
}
