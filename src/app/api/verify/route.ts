import { NextResponse } from "next/server";
import { createVerificationIndex } from "@/lib/verification-index";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createVerificationIndex());
}
