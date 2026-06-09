import { launchEvidenceCaseForId } from "@/lib/launch-evidence";
import { colorForStatus, renderStatusBadgeSvg } from "@/lib/status-badge-svg";
import { verifyTrustBadgeIssuance } from "@/lib/trust-badge-verifier";

type BadgeSvgRouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

// Embeddable shields-style status badge for a Launch Evidence case. Always returns a
// valid 200 SVG (even for unknown/private cases, where it shows "not found") so an
// <img> embed in a NockApp README never renders broken. Private cases are deliberately
// indistinguishable from missing ones — the badge must not leak their existence.
export async function GET(_request: Request, { params }: BadgeSvgRouteContext) {
  const { caseId } = await params;
  const launchCase = launchEvidenceCaseForId(caseId);
  const visible = launchCase && launchCase.visibility !== "private";

  let status: string = visible ? launchCase.report.summaryStatus : "unknown";
  // F10: a launch-evidence "verified" is a launch-READINESS status, NOT a cryptographic trust
  // cert. If a case CLAIMS a cert (links a trust badge), that badge's signature must actually
  // verify before we render the authoritative green "verified" — a linked-but-unverifiable badge
  // is downgraded to "unverified" so a tampered/forged link can't borrow the green. A case with
  // no linked badge keeps its (non-cryptographic) readiness status as-is.
  if (visible && status === "verified" && launchCase.badgeId) {
    const badgeOk = verifyTrustBadgeIssuance({ badgeId: launchCase.badgeId }).verified;
    if (!badgeOk) {
      status = "unverified";
    }
  }
  const message = visible ? status : "not found";
  const svg = renderStatusBadgeSvg("launch evidence", message, colorForStatus(status));

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // Short cache so a status flip propagates to embeds within minutes.
      "cache-control": "public, max-age=300, must-revalidate"
    }
  });
}
