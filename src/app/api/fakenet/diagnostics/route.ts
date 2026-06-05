import { NextResponse } from "next/server";
import { createLocalFakenetDiagnostics } from "@/lib/local-fakenet-diagnostics";

export function GET() {
  return NextResponse.json(createLocalFakenetDiagnostics());
}
