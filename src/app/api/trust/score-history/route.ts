import { NextResponse } from "next/server";
import {
  scoreHistories,
  scoreHistoryRegistry,
  scoreHistorySummaries
} from "@/lib/trust-score-history";

export function GET() {
  return NextResponse.json({
    version: scoreHistoryRegistry.version,
    storage: scoreHistoryRegistry.storage,
    total: scoreHistories.length,
    histories: scoreHistories,
    summaries: scoreHistorySummaries
  });
}
