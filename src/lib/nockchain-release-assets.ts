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

const manifestHashes: Record<string, { hashBlake3: string; hashSha1: string }> = {
  "hoon-aarch64-apple-darwin.tar.gz": {
    hashBlake3: "b779726d162239c4a6a66a8f79009636b1ac04d5cef811dd932f75c93ce68cfc",
    hashSha1: "0f93ca5dabb73636b35cccda4298a59e30cde9f3"
  },
  "hoon-aarch64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "f10425be744c4f5091b40e875a53cef80d2bf4a79ddce40946a005b2e76a342b",
    hashSha1: "3a36be0841bbdf73a98cf313dee43066747f7e90"
  },
  "hoon-x86_64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "d9b0a8e3f1542166de5fb5f8de70383a588e1f273a2fd41329d7a8c546c061b9",
    hashSha1: "c1cea5a0b572b4a407a9db86cd68f47a0df39e4c"
  },
  "hoonc-aarch64-apple-darwin.tar.gz": {
    hashBlake3: "fe1907b9a893701661fda31e20f4f12cdb1b38473117e4d4d6fd18ee3869cbdf",
    hashSha1: "97c0f650d6650d1b5c8aa30cff8fd4b3b70e7bd6"
  },
  "hoonc-aarch64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "e0f9e4ee22a23338a63ab3c440b2d6cc258c28a351d75905c66d109e8929db60",
    hashSha1: "8c67144f1e057857b12ddb5e075ffe642f40c286"
  },
  "hoonc-x86_64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "e624ee063c3fc49c740ff26f2be88e7c3b8217b223ac45891ca9d6aa6aa69507",
    hashSha1: "b5bf038fb0755a4ea5be4122ce5447a677d9430f"
  },
  "nockchain-aarch64-apple-darwin.tar.gz": {
    hashBlake3: "7eb5c88ef55fe9e8453aeb20d3d9ebc7476a4a28cb20db868fef2da95229eb31",
    hashSha1: "a10689fd38774ec96778db748f079104cb6ba62f"
  },
  "nockchain-aarch64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "e21fad5360af1f08c0b120a2a90cf4cf2b8a5842bcb6b819462623b899ee10bc",
    hashSha1: "d2ee6a84500b0ff4b2416ae8a65eb4e8b49ae98c"
  },
  "nockchain-x86_64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "46ef027463b3bccfa1d3ddc7de4a80d5884a6452e3a2119aac264353b20ff5cb",
    hashSha1: "5e5126ec561c1bfd0677ce8eff79d93bdceb3ee9"
  },
  "nockchain-wallet-aarch64-apple-darwin.tar.gz": {
    hashBlake3: "5283e08441db5f1664f1561001156783bd44a21f3c2489bfe9b155b9f7138390",
    hashSha1: "e024df7a60e87be871dac904484b7cd373053914"
  },
  "nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "e57a287abc5adf1a227e3737134c6e87398d1163d567d5a7d61529241142bedc",
    hashSha1: "059b7a54d64d161930c5803a1e046c28245ccda4"
  },
  "nockchain-wallet-x86_64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "42dfa9d2b0c15d5798d52a6113d570e599971c24014b8742c97de41e7f3c00cd",
    hashSha1: "b3f6b1ae23d85f5d9dac47f8fce6432d34483913"
  },
  "nockup-aarch64-apple-darwin.tar.gz": {
    hashBlake3: "9368e12763f068d16f1e1c4ab2b9f4399e0c42d1f3828b7c0cd5c890ba7e2fec",
    hashSha1: "40a771b6d6a93dad59578fe348ef3506992f9578"
  },
  "nockup-aarch64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "0f78c68c5c2fcaf9ab0f67448e257f3b217aa2e8f80e5b971064017c01c8c8b0",
    hashSha1: "7c454496cd2112f2a1fd0db97775f913597b3baa"
  },
  "nockup-x86_64-unknown-linux-gnu.tar.gz": {
    hashBlake3: "7ff15ecdf36ac4d06818a4a73d0b59afda4c1b56f10a71155f5d0399cea45940",
    hashSha1: "d7e2fcf6199f2948f62c3d6ba87a854afa843091"
  }
};

function releaseCommitSha() {
  return releaseTag.replace(/^build-/, "");
}

function materializeAssets() {
  return releaseAssets.map(([name, tool, platform, size, createdAt]) => {
    const hashes = manifestHashes[name];

    return {
      id: name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      tool,
      platform,
      size,
      kind: name === "nockchain-manifest.toml" ? "release-manifest" : "binary-tarball",
      contentType: name.endsWith(".toml") ? "application/toml" : "application/gzip",
      createdAt,
      updatedAt: createdAt,
      downloadUrl: `${releaseBaseUrl}/${name}`,
      hashBlake3: hashes?.hashBlake3 ?? null,
      hashSha1: hashes?.hashSha1 ?? null,
      manifestVerified: Boolean(hashes)
    };
  });
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

function manifestTargets(assets: ReturnType<typeof materializeAssets>) {
  return assets
    .filter((asset) => asset.hashBlake3 && asset.hashSha1)
    .map((asset) => ({
      tool: asset.tool,
      platform: asset.platform,
      available: true,
      assetName: asset.name,
      url: asset.downloadUrl,
      hashBlake3: asset.hashBlake3,
      hashSha1: asset.hashSha1
    }));
}

export function createNockchainReleaseAssets() {
  const upstream = nockchainUpstreamIntelligence;
  const assets = materializeAssets();
  const releaseSha = releaseCommitSha();
  const manifestAsset = assets.find((asset) => asset.kind === "release-manifest");
  const targets = manifestTargets(assets);
  const assetsWithoutManifestHashes = assets
    .filter((asset) => !asset.hashBlake3 || !asset.hashSha1)
    .map((asset) => asset.name);

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
    manifest: {
      version: "1",
      date: "2026-06-06",
      commit: releaseSha,
      commitShort: "33ba97b",
      packageVersion: "1.0.0",
      profiles: ["default", "minimal"],
      targetCount: targets.length,
      targets,
      hashes: {
        algorithms: ["blake3", "sha1"],
        hashBlake3Count: targets.filter((target) => target.hashBlake3).length,
        hashSha1Count: targets.filter((target) => target.hashSha1).length
      },
      coverage: {
        hashedAssetCount: targets.length,
        unhashedAssetCount: assetsWithoutManifestHashes.length,
        assetsWithoutManifestHashes
      }
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
        "releaseAssetHashBlake3",
        "releaseAssetHashSha1",
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
