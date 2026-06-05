import { NextResponse } from "next/server";
import { readNockupValidationReceipt } from "@/lib/nockup-receipt-store";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export const dynamic = "force-dynamic";

type ReceiptRouteContext = {
  params: {
    receiptId?: string;
  } | Promise<{
    receiptId?: string;
  }>;
};

export async function GET(_request: Request, context: ReceiptRouteContext) {
  const { receiptId = "" } = await context.params;
  const result = await readNockupValidationReceipt(receiptId);

  if (!result.receipt) {
    return NextResponse.json(
      {
        version: "v0",
        service: registryServiceName,
        subject: registrySubject,
        canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts/${receiptId}`,
        receiptId,
        found: false,
        storage: {
          backend: result.backend,
          binding: result.binding
        },
        error: "Nockup validation receipt was not found.",
        links: {
          receipts: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts`,
          submit: `${registryCanonicalBaseUrl}/api/nockchain/nockup/submit`
        }
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json(result.receipt);
}
