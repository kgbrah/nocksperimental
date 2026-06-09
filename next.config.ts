import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/.well-known/nocksperimental.json": [".nocklab/**/*"],
    "/api/registry": [".nocklab/**/*"],
    "/api/reports/generated": [".nocklab/**/*"],
    "/api/reports/generated/**/*": [".nocklab/**/*"]
  },
  turbopack: {
    root: process.cwd(),
    // wagmi v3 / WalletConnect lazy-import a few optional deps that are not installed (the Tempo
    // connector's "accounts", pino's "pino-pretty", react-native's "encoding"). Those runtime imports
    // are .catch-guarded and never fire in our flows; alias them to an empty stub so the bundler's
    // build-time static resolution succeeds.
    resolveAlias: {
      accounts: "./stubs/empty.js",
      "pino-pretty": "./stubs/empty.js",
      encoding: "./stubs/empty.js"
    }
  }
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
