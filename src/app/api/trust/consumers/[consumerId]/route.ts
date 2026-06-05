import { NextResponse } from "next/server";
import {
  resolvedTrustConsumers,
  type ResolvedTrustConsumerUse
} from "@/lib/trust-signals";

type TrustConsumerDetailRouteContext = {
  params: Promise<{
    consumerId: string;
  }>;
};

export async function GET(_request: Request, { params }: TrustConsumerDetailRouteContext) {
  const { consumerId } = await params;
  const consumer = resolvedTrustConsumers.find((candidate) => candidate.id === consumerId);

  if (!consumer) {
    return NextResponse.json(
      { error: "Trust consumer not found", consumerId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: "v0",
    consumer,
    evidenceLinks: consumer.resolvedUses.map((use) => ({
      kind: use.kind,
      purpose: use.purpose,
      evidenceLabel: use.evidenceLabel ?? null,
      href: evidenceHrefForUse(use),
      generatedReport: use.reportSlug ? `/reports/generated/${use.reportSlug}` : null
    })),
    links: {
      collection: "/api/trust",
      detail: `/trust/consumers/${consumer.id}`,
      trustOverview: "/trust"
    }
  });
}

function evidenceHrefForUse(use: ResolvedTrustConsumerUse) {
  if (use.kind === "badge" && use.badgeId) {
    return `/trust/badges/${use.badgeId}`;
  }

  if (use.kind === "solver-score" && use.scorecardId) {
    return `/trust/solver-scores/${use.scorecardId}`;
  }

  if (use.kind === "token-compatibility" && use.compatibilityReportId) {
    return `/trust/token-compatibility/${use.compatibilityReportId}`;
  }

  if (use.kind === "compute-benchmark" && use.benchmarkProfileId) {
    return `/trust/compute-benchmarks/${use.benchmarkProfileId}`;
  }

  return "/trust";
}
