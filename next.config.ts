import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/.well-known/nocksperimental.json": [".nocklab/**/*"],
    "/api/registry": [".nocklab/**/*"],
    "/api/reports/generated": [".nocklab/**/*"],
    "/api/reports/generated/**/*": [".nocklab/**/*"]
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
