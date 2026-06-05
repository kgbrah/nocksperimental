import { createLocalFakenetRunbook } from "@/lib/local-fakenet-commands";

export function GET() {
  return new Response(createLocalFakenetRunbook(), {
    headers: {
      "Content-Disposition": 'attachment; filename="nocksperimental-fakenet-runbook.sh"',
      "Content-Type": "text/x-shellscript; charset=utf-8"
    }
  });
}
