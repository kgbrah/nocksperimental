import { NextResponse } from "next/server";
import { listFakenetEvidenceReceipts } from "@/lib/fakenet-receipt-store";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request(`${registryCanonicalBaseUrl}/api/fakenet/evidence/receipts`)) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const result = await listFakenetEvidenceReceipts(limit);

  return NextResponse.json({
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/evidence/receipts`,
    count: result.receipts.length,
    storage: {
      backend: result.backend,
      binding: result.binding
    },
    receipts: result.receipts,
    links: {
      self: `${registryCanonicalBaseUrl}/api/fakenet/evidence/receipts`,
      submit: `${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`
    }
  });
}
