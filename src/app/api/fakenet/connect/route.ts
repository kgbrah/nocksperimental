import { NextResponse } from "next/server";
import {
  createFakenetConnectionProfile,
  parseFakenetConnectionSearchParams
} from "@/lib/fakenet-connection-profile";
import { parseJsonObjectBody } from "@/lib/parse-json-object-body";

export async function GET(request: Request = new Request("https://nocksperimental.com/api/fakenet/connect")) {
  const url = new URL(request.url);
  const profile = parseFakenetConnectionSearchParams(url.searchParams);

  return NextResponse.json(profile, {
    status: profile.accepted ? 200 : 400
  });
}

export async function POST(request: Request) {
  const parsed = await parseRequestBody(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const profile = createFakenetConnectionProfile(parsed.value);

  return NextResponse.json(profile, {
    status: profile.accepted ? 200 : 400
  });
}

type ParsedConnectionBody =
  | { ok: true; value: Record<string, string | null | undefined> }
  | { ok: false; response: NextResponse };

async function parseRequestBody(request: Request): Promise<ParsedConnectionBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = await parseJsonObjectBody(request);

    if (!parsed.ok) {
      return parsed;
    }

    return { ok: true, value: parsed.value as Record<string, string | null | undefined> };
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();

    return {
      ok: true,
      value: {
        endpoint: stringFormValue(formData.get("endpoint")),
        walletAddress: stringFormValue(formData.get("walletAddress")),
        networkId: stringFormValue(formData.get("networkId")),
        label: stringFormValue(formData.get("label"))
      }
    };
  }

  return { ok: true, value: {} };
}

function stringFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}
