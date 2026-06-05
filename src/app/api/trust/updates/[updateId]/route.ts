import { NextResponse } from "next/server";
import {
  trustUpdateEntries,
  type TrustUpdateEntry,
  validateTrustUpdateChain
} from "@/lib/trust-update-log";

type TrustUpdateDetailRouteContext = {
  params: Promise<{
    updateId: string;
  }>;
};

export async function GET(_request: Request, { params }: TrustUpdateDetailRouteContext) {
  const { updateId } = await params;
  const index = trustUpdateEntries.findIndex((candidate) => candidate.id === updateId);
  const entry = trustUpdateEntries[index];

  if (!entry) {
    return NextResponse.json(
      { error: "Trust update entry not found", updateId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: "v0",
    entry,
    validation: validateTrustUpdateChain(),
    position: {
      previousUpdateId: trustUpdateEntries[index - 1]?.id ?? null,
      nextUpdateId: trustUpdateEntries[index + 1]?.id ?? null
    },
    links: {
      collection: "/api/trust/updates",
      detail: `/trust/updates/${entry.id}`,
      targetApi: trustUpdateTargetApiPath(entry)
    }
  });
}

function trustUpdateTargetApiPath(entry: TrustUpdateEntry) {
  if (entry.target === "score-history") {
    return "/api/trust/score-history";
  }

  if (entry.target === "badge-issuance" || entry.target === "badge-revocation") {
    return "/api/trust/badges";
  }

  return "/api/trust";
}
