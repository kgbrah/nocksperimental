import { NextResponse } from "next/server";
import { createNockchainHoonKernelAtlas } from "@/lib/nockchain-hoon-kernels";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(createNockchainHoonKernelAtlas());
}
