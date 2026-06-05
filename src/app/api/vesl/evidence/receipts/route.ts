import { NextResponse } from "next/server";
import { listVeslEvidenceReceipts } from "@/lib/vesl-receipt-store";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request(`${registryCanonicalBaseUrl}/api/vesl/evidence/receipts`)) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const result = await listVeslEvidenceReceipts(limit);

  return NextResponse.json({
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts`,
    count: result.receipts.length,
    storage: {
      backend: result.backend,
      binding: result.binding
    },
    receipts: result.receipts,
    links: {
      self: `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts`,
      submit: `${registryCanonicalBaseUrl}/api/vesl/evidence/submit`
    }
  });
}
