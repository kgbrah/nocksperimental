import {
  ArrowLeft,
  Code2,
  FileCode2,
  GitPullRequest,
  ListChecks,
  PackageCheck,
  ShieldAlert,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainNockupSourceTrace } from "@/lib/nockchain-nockup-source-trace";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "nockup-readme-contract",
  "nockup-manifest-schema",
  "nockup-template-init",
  "nockup-template-cache",
  "nockup-toolchain-channel",
  "nockup-dependency-resolver",
  "nockup-registry-install-path",
  "nockup-resolved-graph-order",
  "nockup-package-install-links",
  "nockup-cache-index",
  "nockup-git-fetcher"
] as const;
const highlightedCapabilityIds = [
  "manifest-template-selection",
  "template-cache-and-toolchain-channel",
  "registry-install-path-symlinks",
  "experimental-untrusted-code-warning"
] as const;
const highlightedSymbols = [
  "NockAppManifest",
  "download_templates",
  "Resolver::resolve",
  "link_registry_package",
  "PackageCache::cache_package"
] as const;
const highlightedReceiptFields = [
  "templateCommit",
  "manifestHash",
  "resolvedPackageCommits",
  "lockfileHash"
] as const;
const highlightedForbiddenFields = ["rawTemplateArchive", "rawCompiledJam", "gpgPrivateKey"] as const;
const highlightedVerificationCommands = ["cargo check -p nockup"] as const;
const highlightedWatchLabels = ["PR #125", "PR #120"] as const;

export default function NockchainNockupSourcePage() {
  const trace = createNockchainNockupSourceTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor));
  const orderedCapabilities = highlightedCapabilityIds
    .map((id) => trace.nockupCapabilities.find((capability) => capability.id === id))
    .filter((capability): capability is NonNullable<typeof capability> => Boolean(capability));

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain">
            <ArrowLeft size={16} aria-hidden="true" />
            Nockchain evidence
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Scaffold provenance
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Nockup Source Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Source anchors for Nockup manifests, cached templates, toolchain channels,
                dependency resolution, registry install paths, package symlinks, git cache, and
                experimental untrusted-code boundaries.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/nockup/source"
              >
                <Code2 size={16} aria-hidden="true" />
                Source API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/nockup/submit"
              >
                <PackageCheck size={16} aria-hidden="true" />
                Submit
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/testkit-e2e"
              >
                <ListChecks size={16} aria-hidden="true" />
                Testkit/E2E
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Capabilities" value={trace.nockupCapabilities.length.toString()} />
        <Metric label="Crate" value={trace.upstream.crateSurfaces.join(", ")} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Anchors</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedAnchors.map((anchor) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={anchor.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {anchor.id}
                </p>
                <Callout label="file" value={anchor.file} />
                <Callout label="symbols" value={anchor.symbols.join(", ")} />
                <Callout label="lineRange" value={anchor.lineRange} />
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.role}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.evidence}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#EAF8F0] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Nockup Capabilities</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedCapabilities.map((capability) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={capability.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {capability.id}
                </p>
                <h3 className="mt-1 font-semibold">{capability.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {capability.interpretation}
                </p>
                <Callout label="sourceAnchorIds" value={capability.sourceAnchorIds.join(", ")} />
                <Callout label="receiptFields" value={capability.receiptFields.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trace.receiptContract.requiredFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={field}>
                {field}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {highlightedReceiptFields.map((field) => (
              <Callout key={field} label="highlightedField" value={field} />
            ))}
            {trace.receiptContract.reviewRules.map((rule) => (
              <Callout key={rule} label="reviewRule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Upstream Watch</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{trace.upstreamWatch.interpretation}</p>
          <div className="mt-4 grid gap-3">
            {highlightedWatchLabels.map((label) => (
              <Callout key={label} label="highlightedWatch" value={label} />
            ))}
            {trace.upstreamWatch.watchItems.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={item.prNumber}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  PR #{item.prNumber}
                </p>
                <h3 className="mt-1 font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{item.expectedImpact}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Local Verification</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="status" value={trace.localVerification.status} />
            <Callout label="inspectedSourceCommit" value={trace.localVerification.inspectedSourceCommit} />
            {highlightedVerificationCommands.map((command) => (
              <Callout key={command} label="highlightedCommand" value={command} />
            ))}
            {trace.localVerification.recommendedCommands.map((command) => (
              <Callout key={command} label="command" value={command} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Forbidden Evidence</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.receiptContract.forbiddenFields.map((field) => (
              <Callout key={field} label="forbiddenField" value={field} />
            ))}
            {highlightedForbiddenFields.map((field) => (
              <Callout key={field} label="highlightedForbidden" value={field} />
            ))}
            {highlightedSymbols.map((symbol) => (
              <Callout key={symbol} label="symbol" value={symbol} />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <PackageCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
