import { NextResponse } from "next/server";
import { resolvedBadgeForId } from "@/lib/trust-signals";
import { verifyTrustBadgeIssuance } from "@/lib/trust-badge-verifier";
import { verifyBaseAnchor } from "@/lib/chain-verify-base";
import { guard } from "@/lib/x402/meter";

// Independent CHAIN verification of a receipt's anchor. Resolves a chain-anchored
// badge, checks its Ed25519 issuance signature (issuer attests it) AND re-reads the
// chain to confirm the anchor is real (block/tx/log actually on-chain). A receipt is
// only "chain-verified" when BOTH hold — signature alone is just an attestation.
export async function GET(request: Request) {
  const gate = await guard(request, "receipts-verify-chain");
  if (gate.blocked) return gate.response;

  const url = new URL(request.url);
  const badgeId = url.searchParams.get("badgeId")?.trim() ?? "";
  if (!badgeId) {
    return NextResponse.json({ error: "Missing badgeId query parameter" }, { status: 400 });
  }

  const badge = resolvedBadgeForId(badgeId);
  if (!badge) {
    return NextResponse.json({ error: `badge ${badgeId} not found`, badgeId }, { status: 404 });
  }

  const signature = verifyTrustBadgeIssuance({ badgeId });
  const anchor = badge.evidence.chainAnchor;

  if (!anchor) {
    return NextResponse.json(
      {
        version: "v0",
        badgeId,
        kind: badge.kind,
        chainAnchored: false,
        note: "this badge carries no chain anchor; nothing to chain-verify",
        signature,
      },
      { headers: gate.headers }
    );
  }

  // EVM anchors are independently re-verifiable today. Nock anchors land in Phase 2/3.
  const chainVerify =
    anchor.verifiability === "evm-full"
      ? await verifyBaseAnchor(anchor)
      : { verifiability: anchor.verifiability, onChain: false, checks: {}, error: "nock chain-verify not yet wired (Phase 2/3)" };

  const overall = signature.verified === true && chainVerify.onChain === true;

  return NextResponse.json(
    {
      version: "v0",
      badgeId,
      kind: badge.kind,
      chainAnchored: true,
      anchor,
      signature,
      chainVerify,
      // The headline: a chain-anchored receipt is trustworthy only when its signature
      // is valid AND the chain independently confirms the anchor.
      chainVerified: overall,
    },
    { headers: gate.headers }
  );
}
