import {
  ArrowLeft,
  Binary,
  Code2,
  FileCode2,
  Layers3,
  Network,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainHoonKernelAtlas } from "@/lib/nockchain-hoon-kernels";

export const dynamic = "force-dynamic";

const highlightedKernelIds = [
  "dumbnet-consensus",
  "wallet",
  "nockchain-peek",
  "bridge",
  "dumbnet-miner"
] as const;
const visibleJamAssets = [
  "assets/dumb.jam",
  "assets/miner.jam",
  "assets/wal.jam",
  "assets/peek.jam",
  "assets/bridge.jam"
] as const;
const highlightedForbiddenFields = ["rawJamBytes", "walletSeedPhrase"] as const;

export default function NockchainHoonKernelAtlasPage() {
  const atlas = createNockchainHoonKernelAtlas();
  const orderedKernels = highlightedKernelIds
    .map((id) => atlas.kernels.find((kernel) => kernel.id === id))
    .filter((kernel): kernel is NonNullable<typeof kernel> => Boolean(kernel))
    .concat(
      atlas.kernels.filter(
        (kernel) => !highlightedKernelIds.includes(kernel.id as (typeof highlightedKernelIds)[number])
      )
    );
  const primaryForbiddenFields = highlightedForbiddenFields.filter((field) =>
    (atlas.evidenceContract.forbiddenFields as readonly string[]).includes(field)
  );
  const remainingForbiddenFields = atlas.evidenceContract.forbiddenFields.filter(
    (field) => !(highlightedForbiddenFields as readonly string[]).includes(field)
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
                Hoon and jam boundary
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Hoon Kernel Atlas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A source-backed map of the Hoon kernels, compiled jam assets,
                Rust embedding crates, cause/effect tags, and receipt fields
                that connect Nockchain runtime behavior back to deterministic
                Nock state machines.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/hoon-kernels"
              >
                <Code2 size={16} aria-hidden="true" />
                Hoon API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/cargo-surface"
              >
                <Layers3 size={16} aria-hidden="true" />
                Cargo Surface
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/nockapp/source"
              >
                <Network size={16} aria-hidden="true" />
                NockApp Source
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Kernels" value={atlas.kernels.length.toString()} />
        <Metric label="Jam Assets" value={atlas.buildPipeline.assetTargets.length.toString()} />
        <Metric label="Compiler" value={atlas.buildPipeline.compiler} />
        <Metric label="Commit" value={atlas.upstream.commit.shortSha} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Binary size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Compiled Jam Targets</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{atlas.buildPipeline.interpretation}</p>
          <div className="mt-4 grid gap-3">
            {visibleJamAssets
              .filter((target) => (atlas.buildPipeline.assetTargets as readonly string[]).includes(target))
              .concat(
                atlas.buildPipeline.assetTargets.filter(
                  (target) => !(visibleJamAssets as readonly string[]).includes(target)
                )
              )
              .map((target) => (
              <Callout key={target} label="jamAsset" value={target} />
            ))}
            <Callout label="makefile" value={`${atlas.buildPipeline.makefileSource} ${atlas.buildPipeline.makefileLineRange}`} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Rust Embedding</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#2F2A14]">{atlas.rustEmbedding.interpretation}</p>
          <div className="mt-4 grid gap-3">
            <Callout label="kernelCrates" value={atlas.rustEmbedding.kernelCrates.join(", ")} />
            <Callout label="consumers" value={atlas.rustEmbedding.consumers.join(" | ")} />
            <Callout label="availableTooling" value={atlas.verificationMatrix.availableTooling.join(", ")} />
            {atlas.verificationMatrix.localCautions.map((caution) => (
              <Callout key={caution} label="caution" value={caution} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Kernel Interfaces</h2>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {orderedKernels.map((kernel) => (
              <div className="border border-[#0B0B0B] bg-white p-4" key={kernel.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {kernel.jamAsset}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{kernel.id}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{kernel.role}</p>
                <Callout label="entrySource" value={kernel.entrySource} />
                <Callout label="kernelCrate" value={kernel.kernelCrate} />
                <Callout label="consumerCrate" value={kernel.consumerCrate} />
                <Callout label="stateVersion" value={kernel.stateVersion} />
                <Callout label="interfaceArms" value={kernel.interfaceArms.join(", ")} />
                <Callout label="causeTags" value={kernel.causeTags.join(", ")} />
                <Callout label="effectTags" value={kernel.effectTags.join(", ")} />
                <Callout label="receiptFields" value={kernel.receiptFields.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Contract</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{atlas.evidenceContract.interpretation}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Required Fields</h3>
              <div className="mt-3 grid gap-2">
                {atlas.evidenceContract.requiredFields.map((field) => (
                  <Callout key={field} label="required" value={field} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Forbidden Fields</h3>
              <div className="mt-3 grid gap-2">
                {[...primaryForbiddenFields, ...remainingForbiddenFields].map((field) => (
                  <Callout key={field} label="forbidden" value={field} />
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Commands</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.verificationMatrix.sourceCommands.slice(0, 5).map((command) => (
              <Callout key={command} label="source" value={command} />
            ))}
            {atlas.verificationMatrix.crateChecks.slice(0, 5).map((command) => (
              <Callout key={command} label="crate" value={command} />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-4 shadow-[4px_4px_0_#0B0B0B]">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</p>
      <p className="mt-1 break-words font-mono text-xs leading-6">{value}</p>
    </div>
  );
}
