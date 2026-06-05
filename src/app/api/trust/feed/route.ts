import { NextResponse } from "next/server";
import { createTrustEventFeed } from "@/lib/trust-event-feed";

export function GET() {
  return NextResponse.json(createTrustEventFeed());
}
