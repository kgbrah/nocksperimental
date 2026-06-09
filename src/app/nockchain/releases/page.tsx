import { ArrowLeft, Boxes, Code2, Download, FileCode2, PackageCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createNockchainReleaseAssets } from "@/lib/nockchain-release-assets";

export const dynamic = "force-dynamic";

const featuredAssetNames = [
  "nockchain-manifest.toml",
  "nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz"
] as const;
const highlightedReleaseAssetDriftCommand =
  "npm run check:nockchain-release-assets-drift -- --json";
const highlightedReleaseAssetDriftSourceUrl =
  "https://api.github.com/repos/nockchain/nockchain/releases/latest";

export default function NockchainReleaseAssetsPage() {
  const manifest = createNockchainReleaseAssets();
  const featuredAssets = featuredAssetNames
    .map((name) => manifest.assets.find((asset) => asset.name === name))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

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
                Build provenance
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Release Assets</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Metadata for the current Nockchain build release, grouped by binary,
                platform, manifest asset, and receipt fields needed before a local
                fakenet, wallet, or Nockup run can cite downloaded tooling.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/release-assets" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Assets API
              </Link>
              <a
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href={manifest.links.release}
              >
                <Download size={16} aria-hidden="true" />
                GitHub Release
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={manifest.upstream.commit.shortSha} />
        <Metric label="Assets" value={manifest.release.assetCount.toString()} />
        <Metric label="Hashed" value={manifest.manifest.coverage.hashedAssetCount.toString()} />
        <Metric label="Targets" value={manifest.manifest.targetCount.toString()} />
        <Metric label="Manifest" value={manifest.manifest.version} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Pinned Release</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="tag" value={manifest.release.tag} />
            <Callout label="publishedAt" value={manifest.release.publishedAt} />
            <Callout label="targetCommitish" value={manifest.release.targetCommitish} />
            <Callout label="commitMatchesTag" value={String(manifest.release.commitMatchesTag)} />
            <Callout label="nockchain-manifest.toml" value={manifest.links.manifest} />
            <Callout
              label="hashCoverage"
              value={`hashed=${manifest.manifest.coverage.hashedAssetCount} unhashed=${manifest.manifest.coverage.unhashedAssetCount}`}
            />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Contract</h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {manifest.provenance.requiredReceiptFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={field}>
                {field}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {featuredAssets.map((asset) => (
              <Callout key={asset.name} label={asset.name} value={asset.downloadUrl} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Drift Check</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            {manifest.driftCheck.interpretation}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="command" value={highlightedReleaseAssetDriftCommand} />
            <Callout label="testCommand" value={manifest.driftCheck.testCommand} />
            <Callout
              label="sourceUrls"
              value={[
                highlightedReleaseAssetDriftSourceUrl,
                ...manifest.driftCheck.sourceUrls.filter(
                  (sourceUrl) => sourceUrl !== highlightedReleaseAssetDriftSourceUrl
                )
              ].join(", ")}
            />
            <Callout label="compareFields" value={manifest.driftCheck.compareFields.join(", ")} />
            <Callout label="sourceArchivePolicy" value={manifest.driftCheck.sourceArchivePolicy} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Boxes size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Asset Groups</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {manifest.assetGroups.map((group) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={group.tool}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {group.tool}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {group.count} assets across {group.platforms.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Download size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Assets</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {manifest.assets.map((asset) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={asset.name}>
                <p className="break-all font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {asset.name}
                </p>
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                  <span className="border border-[#0B0B0B] px-2 py-1 font-mono">{asset.tool}</span>
                  <span className="border border-[#0B0B0B] px-2 py-1 font-mono">{asset.platform}</span>
                  <span className="border border-[#0B0B0B] px-2 py-1 font-mono">{asset.size} bytes</span>
                </div>
                <div className="mt-2 grid gap-2 text-xs">
                  <span className="break-all border border-[#0B0B0B] px-2 py-1 font-mono">
                    hash_blake3={asset.hashBlake3 ?? "not-in-manifest"}
                  </span>
                  <span className="break-all border border-[#0B0B0B] px-2 py-1 font-mono">
                    hash_sha1={asset.hashSha1 ?? "not-in-manifest"}
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  {asset.downloadUrl}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <Checklist title="Operator Checklist" items={manifest.provenance.operatorChecklist} />
        <Checklist title="Do Not Store" items={manifest.provenance.doNotStore} />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} aria-hidden="true" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div className="border border-[#0B0B0B] bg-white p-3" key={item}>
            <p className="text-sm leading-6 text-[#4A4A4A]">{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
