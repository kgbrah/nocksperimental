import { NextResponse } from "next/server";
import { createRegistryCheckpoint } from "@/lib/registry-checkpoint";

export function GET() {
  return NextResponse.json(createRegistryCheckpoint());
}
