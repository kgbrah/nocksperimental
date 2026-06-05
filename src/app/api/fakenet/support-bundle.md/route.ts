import { createLocalFakenetSupportBundleMarkdown } from "@/lib/local-fakenet-support-bundle";

export function GET() {
  return new Response(createLocalFakenetSupportBundleMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8"
    }
  });
}
