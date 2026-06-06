import {
  ArrowLeft,
  Binary,
  Boxes,
  Code2,
  FileCode2,
  FlaskConical,
  Layers3,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainCargoSurface } from "@/lib/nockchain-cargo-surface";

export const dynamic = "force-dynamic";

const highlightedCrates = [
  "nockchain",
  "nockchain-wallet",
  "nockapp",
  "nockchain-libp2p-io",
  "wallet-tx-builder"
];
const highlightedBenchmarks = ["pma_growth", "bench_nockchain_kernel"];
const highlightedHelperTargets = ["nockapp-chkjam-to-state-jam"];
const highlightedAvailableTooling = "cargo 1.96.0";
const highlightedLocalLimitation = "$HOME/.cargo/bin must be present on PATH";
const highlightedForbiddenFields = ["rawPmaSlab", "walletSeedPhrase"];
const highlightedManifestDriftCommand = "npm run check:nockchain-cargo-manifests-drift -- --json";
const highlightedDependencyRiskFamilies = [
  "libp2p-sync",
  "wallet-transaction",
  "nockapp-pma",
  "bridge-settlement",
  "zk-proof-compute",
  "noun-serialization"
];

export default function NockchainCargoSurfacePage() {
  const surface = createNockchainCargoSurface();
  const primaryCrates = highlightedCrates
    .map((crateName) => surface.crates.find((crateDetail) => crateDetail.name === crateName))
    .filter((crateDetail): crateDetail is NonNullable<typeof crateDetail> => Boolean(crateDetail));
  const remainingCrates = surface.crates.filter(
    (crateDetail) => !(highlightedCrates as readonly string[]).includes(crateDetail.name)
  );
  const primaryBenchmarks = highlightedBenchmarks.filter((target) =>
    (surface.targetSummary.benchmarkTargets as readonly string[]).includes(target)
  );
  const helperTargetLabels = highlightedHelperTargets.filter((target) =>
    surface.crates.some((crateDetail) =>
      crateDetail.targets.some((crateTarget) => crateTarget.name === target)
    )
  );
  const primaryLimitations = surface.verificationMatrix.localLimitations.filter((limitation) =>
    limitation.includes(highlightedLocalLimitation)
  );
  const remainingLimitations = surface.verificationMatrix.localLimitations.filter(
    (limitation) => !limitation.includes(highlightedLocalLimitation)
  );
  const primaryForbiddenFields = highlightedForbiddenFields.filter((field) =>
    (surface.evidenceContract.forbiddenFields as readonly string[]).includes(field)
  );
  const remainingForbiddenFields = surface.evidenceContract.forbiddenFields.filter(
    (field) => !(highlightedForbiddenFields as readonly string[]).includes(field)
  );
  const manifestDriftCommand =
    surface.workspace.manifestDriftCheck.command || highlightedManifestDriftCommand;
  const primaryDependencyFamilies = highlightedDependencyRiskFamilies
    .map((familyId) => surface.dependencyRiskMatrix.families.find((family) => family.id === familyId))
    .filter((family): family is NonNullable<typeof family> => Boolean(family));
  const remainingDependencyFamilies = surface.dependencyRiskMatrix.families.filter(
    (family) => !(highlightedDependencyRiskFamilies as readonly string[]).includes(family.id)
  );

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
                Rust target map
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Cargo Surface</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A manifest-backed map of high-signal Nockchain Cargo crates, binary
                and library targets, benchmark surfaces, source entrypoints,
                dependency pins, and the crate-scoped checks Nocksperimental should
                run before turning Rust behavior into evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/cargo-surface"
              >
                <Code2 size={16} aria-hidden="true" />
                Cargo API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/rust"
              >
                <Layers3 size={16} aria-hidden="true" />
                Rust Atlas
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/knowledge-spine"
              >
                <FileCode2 size={16} aria-hidden="true" />
                Knowledge Spine
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-5 lg:px-8">
        <Metric label="Crates" value={surface.targetSummary.crateCount.toString()} />
        <Metric label="Targets" value={surface.targetSummary.targetCount.toString()} />
        <Metric label="Workspace" value={`${surface.workspace.memberCount} members`} />
        <Metric label="Manifests" value={surface.workspace.manifestSnapshots.length.toString()} />
        <Metric label="Commit" value={surface.upstream.commit.shortSha} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Binary size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Target Summary</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="binaryCrates" value={surface.targetSummary.binaryCrates.join(", ")} />
            <Callout label="libraryCrates" value={surface.targetSummary.libraryCrates.join(", ")} />
            <Callout
              label="benchmarkTargets"
              value={primaryBenchmarks
                .concat(surface.targetSummary.benchmarkTargets.filter((target) => !primaryBenchmarks.includes(target)))
                .join(", ")}
            />
            <Callout label="helperTargets" value={helperTargetLabels.join(", ")} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#EAF7FF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Manifest Drift Check</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="command" value={manifestDriftCommand} />
            <Callout label="script" value={surface.workspace.manifestDriftCheck.script} />
            <Callout label="manifestCatalogHash" value={surface.workspace.manifestCatalogHash} />
            <Callout
              label="compareFields"
              value={surface.workspace.manifestDriftCheck.compareFields.join(", ")}
            />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Matrix</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {surface.verificationMatrix.requiredCommands.slice(0, 6).map((command) => (
              <Callout key={command} label="required" value={command} />
            ))}
            {surface.verificationMatrix.availableTooling
              .filter((tooling) => tooling.includes(highlightedAvailableTooling))
              .concat(
                surface.verificationMatrix.availableTooling.filter(
                  (tooling) => !tooling.includes(highlightedAvailableTooling)
                )
              )
              .map((tooling) => (
                <Callout key={tooling} label="availableTooling" value={tooling} />
              ))}
            {primaryLimitations.concat(remainingLimitations).map((limitation) => (
              <Callout key={limitation} label="localLimitation" value={limitation} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="mb-5 border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Dependency Risk Matrix</h2>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {primaryDependencyFamilies.concat(remainingDependencyFamilies).map((family) => (
              <div className="border border-[#0B0B0B] bg-white p-4" key={family.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {family.id}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{family.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{family.reviewRule}</p>
                <Callout label="dependencies" value={family.dependencyNames.join(", ")} />
                <Callout label="impactedCrates" value={family.impactedCrates.join(", ")} />
                <Callout label="targetSurfaces" value={family.targetSurfaces.join(", ")} />
                <Callout label="receiptFields" value={family.receiptFields.join(", ")} />
                <Callout label="verification" value={family.verificationCommands.join(" | ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Boxes size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">High-Signal Cargo Crates</h2>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {primaryCrates.concat(remainingCrates).map((crateDetail) => (
              <div className="border border-[#0B0B0B] bg-white p-4" key={crateDetail.name}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {crateDetail.manifestPath}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{crateDetail.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{crateDetail.role}</p>
                <Callout
                  label="targets"
                  value={crateDetail.targets
                    .map((target) => `${target.kind}:${target.name}:${target.source}`)
                    .join(" | ")}
                />
                <Callout label="features" value={crateDetail.features.length ? crateDetail.features.join(", ") : "none"} />
                <Callout label="sourceFocus" value={crateDetail.sourceFocus.join(" | ")} />
                <Callout label="primaryCheck" value={crateDetail.primaryCheck} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Workspace Dependency Pins</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="libp2p" value={surface.workspaceDependencyHighlights.libp2p.rev} />
            <Callout
              label="libp2pFeatures"
              value={surface.workspaceDependencyHighlights.libp2p.features.join(", ")}
            />
            <Callout label="snmalloc" value={surface.workspaceDependencyHighlights.snmalloc.rev} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Required Fields</h3>
              <div className="mt-3 grid gap-2">
                {surface.evidenceContract.requiredFields.map((field) => (
                  <Callout key={field} label="required" value={field} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Forbidden Fields</h3>
              <div className="mt-3 grid gap-2">
                {primaryForbiddenFields.concat(remainingForbiddenFields).map((field) => (
                  <Callout key={field} label="forbidden" value={field} />
                ))}
              </div>
            </div>
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
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
