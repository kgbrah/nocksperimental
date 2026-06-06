import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const releaseTag = "build-33ba97b1e206dd89b15c61b72b7802caf2136c18";
const releaseBaseUrl = `https://github.com/nockchain/nockchain/releases/download/${releaseTag}`;

const releaseAssets = [
  ["hoon-aarch64-apple-darwin.tar.gz", "hoon", "aarch64-apple-darwin", 4467255, "2026-06-06T00:17:54Z"],
  ["hoon-aarch64-unknown-linux-gnu.tar.gz", "hoon", "aarch64-unknown-linux-gnu", 15341867, "2026-06-06T00:31:43Z"],
  ["hoon-x86_64-unknown-linux-gnu.tar.gz", "hoon", "x86_64-unknown-linux-gnu", 16720491, "2026-06-06T00:23:33Z"],
  ["hoonc-aarch64-apple-darwin.tar.gz", "hoonc", "aarch64-apple-darwin", 3995865, "2026-06-06T00:17:54Z"],
  ["hoonc-aarch64-unknown-linux-gnu.tar.gz", "hoonc", "aarch64-unknown-linux-gnu", 13565880, "2026-06-06T00:31:43Z"],
  ["hoonc-x86_64-unknown-linux-gnu.tar.gz", "hoonc", "x86_64-unknown-linux-gnu", 14890482, "2026-06-06T00:23:33Z"],
  ["nockchain-aarch64-apple-darwin.tar.gz", "nockchain", "aarch64-apple-darwin", 22652042, "2026-06-06T00:17:54Z"],
  ["nockchain-aarch64-unknown-linux-gnu.tar.gz", "nockchain", "aarch64-unknown-linux-gnu", 51191654, "2026-06-06T00:31:43Z"],
  ["nockchain-manifest.toml", "manifest", "all", 6686, "2026-06-06T00:32:48Z"],
  ["nockchain-wallet-aarch64-apple-darwin.tar.gz", "nockchain-wallet", "aarch64-apple-darwin", 14179867, "2026-06-06T00:17:54Z"],
  ["nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz", "nockchain-wallet", "aarch64-unknown-linux-gnu", 31816862, "2026-06-06T00:31:43Z"],
  ["nockchain-wallet-x86_64-unknown-linux-gnu.tar.gz", "nockchain-wallet", "x86_64-unknown-linux-gnu", 33675114, "2026-06-06T00:23:33Z"],
  ["nockchain-x86_64-unknown-linux-gnu.tar.gz", "nockchain", "x86_64-unknown-linux-gnu", 52807818, "2026-06-06T00:23:33Z"],
  ["nockup-aarch64-apple-darwin.tar.gz", "nockup", "aarch64-apple-darwin", 3086800, "2026-06-06T00:17:54Z"],
  ["nockup-aarch64-unknown-linux-gnu.tar.gz", "nockup", "aarch64-unknown-linux-gnu", 10936679, "2026-06-06T00:31:43Z"],
  ["nockup-x86_64-unknown-linux-gnu.tar.gz", "nockup", "x86_64-unknown-linux-gnu", 11382286, "2026-06-06T00:23:33Z"]
] as const;

function releaseCommitSha() {
  return releaseTag.replace(/^build-/, "");
}

function materializeAssets() {
  return releaseAssets.map(([name, tool, platform, size, createdAt]) => ({
    id: name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    tool,
    platform,
    size,
    kind: name === "nockchain-manifest.toml" ? "release-manifest" : "binary-tarball",
    contentType: name.endsWith(".toml") ? "application/toml" : "application/gzip",
    createdAt,
    updatedAt: createdAt,
    downloadUrl: `${releaseBaseUrl}/${name}`
  }));
}

function groupAssets(assets: ReturnType<typeof materializeAssets>) {
  const tools = [...new Set(assets.map((asset) => asset.tool))].sort();

  return tools.map((tool) => {
    const groupAssetsForTool = assets.filter((asset) => asset.tool === tool);

    return {
      tool,
      count: groupAssetsForTool.length,
      platforms: [...new Set(groupAssetsForTool.map((asset) => asset.platform))].sort(),
      assets: groupAssetsForTool.map((asset) => asset.name)
    };
  });
}

export function createNockchainReleaseAssets() {
  const upstream = nockchainUpstreamIntelligence;
  const assets = materializeAssets();
  const releaseSha = releaseCommitSha();
  const manifestAsset = assets.find((asset) => asset.kind === "release-manifest");

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/release-assets`,
    generatedAt: "2026-06-06T00:35:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease
    },
    release: {
      tag: releaseTag,
      name: "Build 33ba97b1e206dd89b15c61b72b7802caf2136c18",
      url: `https://github.com/nockchain/nockchain/releases/tag/${releaseTag}`,
      publishedAt: "2026-06-06T00:17:53Z",
      updatedAt: "2026-06-06T00:32:48Z",
      targetCommitish: "master",
      commitSha: releaseSha,
      commitMatchesTag: releaseSha === upstream.latestCommit.sha,
      assetCount: assets.length,
      totalSizeBytes: assets.reduce((sum, asset) => sum + asset.size, 0),
      manifestPresent: Boolean(manifestAsset),
      manifestAsset: manifestAsset
        ? {
            name: manifestAsset.name,
            size: manifestAsset.size,
            downloadUrl: manifestAsset.downloadUrl
          }
        : null,
      platformTriples: [
        ...new Set(
          assets
            .map((asset) => asset.platform)
            .filter((platform) => platform !== "all")
        )
      ].sort()
    },
    assets,
    assetGroups: groupAssets(assets),
    provenance: {
      source:
        "GitHub release asset metadata for nockchain/nockchain; Nocksperimental records metadata and URLs, not downloaded artifacts.",
      requiredReceiptFields: [
        "nockchainRelease",
        "nockchainReleaseAsset",
        "releaseAssetUrl",
        "releaseManifestUrl",
        "releaseAssetPlatform",
        "releaseAssetSize",
        "binaryTool",
        "verificationCommand"
      ],
      doNotStore: [
        "downloaded release tarballs",
        "unpacked Nockchain binaries",
        "wallet keys",
        "PMA slabs",
        "state jams"
      ],
      operatorChecklist: [
        "Record the exact release asset name and URL before using a downloaded binary for fakenet, wallet, or Nockup evidence.",
        "Prefer the release manifest asset as the build-level anchor when comparing local binaries with upstream metadata.",
        "Keep platform triples explicit so Linux, macOS, wallet, nockup, hoon, and hoonc evidence do not share ambiguous build provenance.",
        "Do not commit downloaded release artifacts; store only metadata, hashes, and operator observations in receipts."
      ]
    },
    links: {
      upstream: upstream.canonicalUrl,
      release: `https://github.com/nockchain/nockchain/releases/tag/${releaseTag}`,
      manifest: manifestAsset?.downloadUrl ?? `${releaseBaseUrl}/nockchain-manifest.toml`,
      nockchainPage: `${registryCanonicalBaseUrl}/nockchain`,
      releasePage: `${registryCanonicalBaseUrl}/nockchain/releases`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    }
  };
}
