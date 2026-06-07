import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const upstreamFileBaseUrl =
  "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18";

function sourceUrl(file: string, start: number, end: number) {
  return `${upstreamFileBaseUrl}/${file}#L${start}-L${end}`;
}

const sourceAnchors = [
  {
    id: "nockup-readme-contract",
    file: "crates/nockup/README.md",
    lineRange: "1-132",
    symbols: ["nockup update", "nockup project init", "nockup package install"],
    sourceUrls: [sourceUrl("crates/nockup/README.md", 1, 132)],
    role:
      "Documents Nockup's experimental status, local cache/toolchain workflow, manifest fields, template names, dependency commands, and untrusted-code security posture.",
    evidence:
      "The README states Nockup is experimental, bootstraps ~/.nockup, scaffolds from nockapp.toml, installs Hoon dependencies, and treats template/dependency execution as untrusted code execution.",
    receiptFields: ["nockupCommit", "templateName", "cacheChannel", "validationStatus"]
  },
  {
    id: "nockup-manifest-schema",
    file: "crates/nockup/src/manifest.rs",
    lineRange: "1-154",
    symbols: ["HoonPackage", "NockAppManifest", "PackageMeta", "DependencySpec", "NockAppLock"],
    sourceUrls: [sourceUrl("crates/nockup/src/manifest.rs", 1, 154)],
    role:
      "Defines package metadata, template/template_commit fields, dependency specs, and lockfile records.",
    evidence:
      "The manifest schema supports simple, versioned, and full git dependency specs plus lock entries with exact commit hashes.",
    receiptFields: ["manifestHash", "templateName", "templateCommit", "dependencySpecs", "lockfileHash"]
  },
  {
    id: "nockup-template-init",
    file: "crates/nockup/src/commands/init.rs",
    lineRange: "1-179",
    symbols: ["run", "load_project_config", "create_template_context", "copy_template_directory"],
    sourceUrls: [sourceUrl("crates/nockup/src/commands/init.rs", 1, 179)],
    role:
      "Scaffolds a new project from a cached template and applies manifest values through Handlebars.",
    evidence:
      "The init command loads <project>.toml, resolves ~/.nockup/templates/<template>, rejects existing target directories, builds template context, copies template files, and processes libraries.",
    receiptFields: ["templateName", "projectName", "manifestHash", "scaffoldedFileCount"]
  },
  {
    id: "nockup-template-cache",
    file: "crates/nockup/src/commands/common.rs",
    lineRange: "69-240",
    symbols: ["download_templates", "clone_templates", "has_existing_templates", "copy_dir_recursive"],
    sourceUrls: [sourceUrl("crates/nockup/src/commands/common.rs", 69, 240)],
    role:
      "Downloads or refreshes bundled templates and manifests from the canonical Nockchain repository.",
    evidence:
      "Nockup clones nockchain/nockchain master, moves crates/nockup/templates and crates/nockup/manifests into ~/.nockup, and writes commit.toml with the fetched commit id.",
    receiptFields: ["templateCommit", "templateSourceRepo", "manifestHash", "cacheCommit"]
  },
  {
    id: "nockup-toolchain-channel",
    file: "crates/nockup/src/commands/common.rs",
    lineRange: "241-360",
    symbols: ["download_toolchain_files", "clone_toolchain_files", "get_target_identifier"],
    sourceUrls: [sourceUrl("crates/nockup/src/commands/common.rs", 241, 360)],
    role:
      "Fetches channel manifests for the local architecture and writes cache config for stable/nightly tooling.",
    evidence:
      "The common command code derives architecture identifiers, writes config.toml defaults, downloads release manifests for the active channel, and keeps channel binaries under ~/.nockup.",
    receiptFields: ["cacheChannel", "targetIdentifier", "nockchainBuild", "toolchainManifestHash"]
  },
  {
    id: "nockup-dependency-resolver",
    file: "crates/nockup/src/resolver/engine.rs",
    lineRange: "1-430",
    symbols: [
      "Resolver::resolve",
      "Resolver::resolve_dependency",
      "dep_spec_to_git_spec",
      "validate_source_files"
    ],
    sourceUrls: [
      sourceUrl("crates/nockup/src/resolver/engine.rs", 1, 260),
      sourceUrl("crates/nockup/src/resolver/engine.rs", 260, 430)
    ],
    role:
      "Resolves dependencies recursively, fetches sources, validates requested .hoon files, loads transitive hoon.toml dependencies, and caches packages by exact commit.",
    evidence:
      "The resolver records exact commits, converts specs into GitSpec values, checks cache, validates source files, loads transitive deps, and computes an install graph.",
    receiptFields: ["dependencySpecs", "resolvedPackageCommits", "sourceFileAllowlist", "validationStatus"]
  },
  {
    id: "nockup-registry-install-path",
    file: "crates/nockup/src/resolver/registry.rs",
    lineRange: "1-318",
    symbols: ["RegistryEntry", "lookup", "get_dependencies", "to_git_spec"],
    sourceUrls: [sourceUrl("crates/nockup/src/resolver/registry.rs", 1, 318)],
    role:
      "Maps registry packages and Typhoon registry entries into git source paths, install paths, file selections, and dependencies.",
    evidence:
      "Registry entries carry git_url, path, install_path, and file; online registry lookup falls back to hardcoded entries and to_git_spec preserves install_path for package install.",
    receiptFields: ["dependencySpecs", "installPathMap", "resolvedPackageCommits", "sourceFileAllowlist"]
  },
  {
    id: "nockup-resolved-graph-order",
    file: "crates/nockup/src/resolver/types.rs",
    lineRange: "1-83",
    symbols: ["ResolvedPackage", "ResolvedGraph", "ResolvedGraph::compute_install_order"],
    sourceUrls: [sourceUrl("crates/nockup/src/resolver/types.rs", 1, 83)],
    role:
      "Defines resolved package metadata and topological install order with cycle detection.",
    evidence:
      "ResolvedPackage stores exact commit, source_url, source_path, install_path, source_files, and dependencies; compute_install_order visits deps first and rejects cycles.",
    receiptFields: ["resolvedPackageCommits", "installOrder", "installPathMap", "validationStatus"]
  },
  {
    id: "nockup-package-install-links",
    file: "crates/nockup/src/commands/package/install.rs",
    lineRange: "1-360",
    symbols: ["run", "link_registry_package", "link_package_files", "NockAppLock::save"],
    sourceUrls: [sourceUrl("crates/nockup/src/commands/package/install.rs", 1, 360)],
    role:
      "Installs resolved packages into hoon/packages, creates symlinks into hoon/lib, hoon/sur, or registry install_path directories, and writes nockapp.lock.",
    evidence:
      "Package install creates hoon/packages/lib/sur directories, uses install_path plus source_files for registry packages, sanitizes names/versions, and records exact git source commits in the lockfile.",
    receiptFields: ["installOrder", "installPathMap", "lockfileHash", "resolvedPackageCommits"]
  },
  {
    id: "nockup-cache-index",
    file: "crates/nockup/src/cache.rs",
    lineRange: "1-300",
    symbols: ["PackageCache", "PackageCache::cache_package", "CacheIndex", "CachedPackage"],
    sourceUrls: [sourceUrl("crates/nockup/src/cache.rs", 1, 300)],
    role:
      "Tracks package cache identity under ~/.nockup/cache/packages with source URL, version spec, exact commit, timestamp, and cache index.",
    evidence:
      "cache_package copies source into the package cache, records cached_at, and writes cache-index.json; the cache can list, prune, and find packages by version spec.",
    receiptFields: ["cacheIndexHash", "resolvedPackageCommits", "dependencySpecs", "cacheChannel"]
  },
  {
    id: "nockup-git-fetcher",
    file: "crates/nockup/src/git_fetcher.rs",
    lineRange: "1-240",
    symbols: ["GitSpec", "GitFetcher::fetch", "resolve_branch", "resolve_tag", "checkout_commit"],
    sourceUrls: [sourceUrl("crates/nockup/src/git_fetcher.rs", 1, 240)],
    role:
      "Fetches git dependencies by commit, tag, branch, or default branch and caches them by URL hash plus short commit.",
    evidence:
      "GitFetcher resolves refs with git ls-remote, prefers commit > tag > branch > default, clones repos, checks out exact commits, and supports sparse checkout for subdirectories.",
    receiptFields: ["resolvedPackageCommits", "sourceRepoUrl", "sourceRef", "cacheIndexHash"]
  }
] as const;

const nockupCapabilities = [
  {
    id: "manifest-template-selection",
    label: "Manifest template selection",
    sourceAnchorIds: ["nockup-manifest-schema", "nockup-readme-contract"],
    receiptFields: ["templateName", "templateCommit", "manifestHash"],
    interpretation:
      "A Nockup receipt should identify the template and manifest hash before treating scaffold output as comparable."
  },
  {
    id: "template-cache-and-toolchain-channel",
    label: "Template cache and toolchain channel",
    sourceAnchorIds: ["nockup-template-cache", "nockup-toolchain-channel"],
    receiptFields: ["templateCommit", "cacheChannel", "targetIdentifier", "nockchainBuild"],
    interpretation:
      "Template and channel evidence must include the cache commit and target architecture so local scaffold results can be reproduced."
  },
  {
    id: "handlebars-project-scaffold",
    label: "Handlebars project scaffold",
    sourceAnchorIds: ["nockup-template-init"],
    receiptFields: ["projectName", "templateName", "scaffoldedFileCount", "manifestHash"],
    interpretation:
      "Scaffold receipts should summarize generated files and substitutions without publishing raw template archives or full source trees."
  },
  {
    id: "dependency-resolution-and-lockfile",
    label: "Dependency resolution and lockfile",
    sourceAnchorIds: ["nockup-dependency-resolver", "nockup-resolved-graph-order"],
    receiptFields: ["dependencySpecs", "resolvedPackageCommits", "installOrder", "lockfileHash"],
    interpretation:
      "Dependency receipts should preserve exact commits and install order while hashing lockfiles rather than storing full manifests."
  },
  {
    id: "registry-install-path-symlinks",
    label: "Registry install_path symlinks",
    sourceAnchorIds: ["nockup-registry-install-path", "nockup-package-install-links"],
    receiptFields: ["installPathMap", "sourceFileAllowlist", "lockfileHash"],
    interpretation:
      "install_path behavior should be checked before Nocksperimental assumes a generated Hoon dependency appears under hoon/lib, hoon/sur, hoon/sys, or another registry path."
  },
  {
    id: "git-cache-and-exact-commit",
    label: "Git cache and exact commit",
    sourceAnchorIds: ["nockup-git-fetcher", "nockup-cache-index"],
    receiptFields: ["sourceRepoUrl", "sourceRef", "resolvedPackageCommits", "cacheIndexHash"],
    interpretation:
      "Git dependency evidence should cite the resolved commit and cache index hash instead of raw git checkouts."
  },
  {
    id: "experimental-untrusted-code-warning",
    label: "Experimental untrusted code warning",
    sourceAnchorIds: ["nockup-readme-contract"],
    receiptFields: ["validationStatus", "nockupCommit", "templateCommit"],
    interpretation:
      "Nockup-generated code and dependency execution should remain clearly experimental until source, build, and safety checks are attached."
  }
] as const;

const receiptContract = {
  requiredFields: [
    "nockupCommit",
    "nockchainBuild",
    "templateName",
    "templateCommit",
    "manifestHash",
    "dependencySpecs",
    "resolvedPackageCommits",
    "installOrder",
    "installPathMap",
    "lockfileHash",
    "cacheChannel",
    "targetIdentifier",
    "validationStatus"
  ],
  forbiddenFields: [
    "rawTemplateArchive",
    "rawGitCheckout",
    "rawNockappToml",
    "rawHoonSource",
    "rawCompiledJam",
    "gpgPrivateKey",
    "walletSeedPhrase",
    "privateSpendKey"
  ],
  reviewRules: [
    "Publish template names, commits, hashes, dependency specs, resolved commits, and install-path summaries rather than raw project sources.",
    "Treat Nockup templates and dependencies as untrusted code until the receipt links source commit, lockfile hash, and validation status.",
    "Keep landed source behavior separate from open PR behavior for template manifests, extension hooks, install_path fixes, and patches.",
    "Hash nockapp.toml, nockapp.lock, cache-index.json, generated source trees, and compiled jams instead of storing raw content in public receipts."
  ]
} as const;

const upstreamWatch = {
  openPullRequests: [125, 122, 120, 117, 114],
  watchItems: [
    {
      prNumber: 125,
      label: "Template manifests from hbs sources",
      expectedImpact:
        "May turn template manifests into generated artifacts that Nockup receipts should hash and verify separately."
    },
    {
      prNumber: 122,
      label: "install_path support and nested symlink fixes",
      expectedImpact:
        "May change install_path receipt fields and symlink evidence for registry-backed dependencies."
    },
    {
      prNumber: 120,
      label: "Extension hooks for downstream templates and subcommands",
      expectedImpact:
        "May add hook execution surfaces that need explicit untrusted-code and output-hash fields."
    },
    {
      prNumber: 117,
      label: "Declarative post-install patches",
      expectedImpact:
        "May require patch id, patch hash, target path, and applied/failed state in Nockup receipts."
    },
    {
      prNumber: 114,
      label: "Basic template dependency pinning",
      expectedImpact:
        "May change the baseline scaffold reproducibility contract for the basic template."
    }
  ],
  interpretation:
    "Current Nocksperimental receipts should model landed Nockup behavior and watch open PRs before claiming template manifests, hooks, patches, or symlink fixes are canonical."
} as const;

const localVerification = {
  status: "source-inspected",
  inspectedSourceCommit: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
  recommendedCommands: [
    "cargo check -p nockup",
    "cargo test -p nockup",
    "cargo test -p nockup resolver::spec_parser::tests"
  ],
  notes: [
    "Nocksperimental currently records source-level Nockup evidence and does not claim these upstream cargo gates passed in production.",
    "Run Nockup commands in an isolated throwaway workspace before treating generated project output as launch evidence."
  ]
} as const;

const sourceDriftCheck = {
  command: "npm run check:nockchain-nockup-source-drift -- --json",
  script: "scripts/check-nockchain-nockup-source-drift.mjs",
  testCommand: "npm run test:nockchain-nockup-source-drift-check",
  sourceAnchorIds: sourceAnchors.map((anchor) => anchor.id),
  compareFields: [
    "upstreamCommit",
    "sourceAnchorId",
    "sourceSha256",
    "sourceBytes",
    "requiredSymbols"
  ],
  targetSurfaces: [
    "nockchainNockupSourceTrace",
    "nockupValidation",
    "generatedLabReports",
    "registryCheckpoint"
  ],
  interpretation:
    "Compares commit-pinned Nockup scaffold, manifest, and templating source anchors against current upstream master before Nockup validation receipts rely on them."
} as const;

export function createNockchainNockupSourceTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/nockup/source`,
    generatedAt: "2026-06-06T10:58:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceCommitUrl: upstream.latestCommit.url,
      crateSurfaces: ["nockup"]
    },
    sourceAnchors,
    nockupCapabilities,
    receiptContract,
    upstreamWatch,
    localVerification,
    sourceDriftCheck,
    nocksperimentalImplications: [
      "Nockup validation receipts can now cite the upstream scaffold, template-cache, dependency-resolver, and install-path source boundaries.",
      "BYO fakenet and Launch Evidence flows can preserve template and dependency provenance before accepting generated NockApp test output.",
      "Open Nockup PRs around template manifests, extension hooks, install_path, and post-install patches should update receipt fields before becoming product assumptions.",
      "Generated source, lockfiles, cache indexes, and compiled jams should be represented by hashes and summaries, not raw artifacts.",
      "VESL and Nockup collaboration tests can share source-aware scaffold receipts when generated applications become evidence subjects."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/nockup/source`,
      upstream: upstream.links.repository,
      repository: upstream.links.repository,
      nockupValidationSubmit: `${registryCanonicalBaseUrl}/api/nockchain/nockup/submit`,
      nockupValidationReceipts: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts`,
      testkitE2e: `${registryCanonicalBaseUrl}/api/nockchain/testkit-e2e`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
