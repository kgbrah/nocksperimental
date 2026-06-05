import { NextResponse } from "next/server";
import {
  createFakenetConnectionProfile,
  parseFakenetConnectionSearchParams
} from "@/lib/fakenet-connection-profile";

export async function GET(request: Request = new Request("https://nocksperimental.com/api/fakenet/connect")) {
  const url = new URL(request.url);
  const profile = parseFakenetConnectionSearchParams(url.searchParams);

  return NextResponse.json(profile, {
    status: profile.accepted ? 200 : 400
  });
}

export async function POST(request: Request) {
  const input = await parseRequestBody(request);
  const profile = createFakenetConnectionProfile(input);

  return NextResponse.json(profile, {
    status: profile.accepted ? 200 : 400
  });
}

async function parseRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, string | null | undefined>;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();

    return {
      endpoint: stringFormValue(formData.get("endpoint")),
      walletAddress: stringFormValue(formData.get("walletAddress")),
      networkId: stringFormValue(formData.get("networkId")),
      label: stringFormValue(formData.get("label"))
    };
  }

  return {};
}

function stringFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}
