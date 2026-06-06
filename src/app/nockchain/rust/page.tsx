import {
  ArrowLeft,
  BookOpenText,
  Code2,
  Cpu,
  GitBranch,
  Layers3,
  Package,
  ShieldAlert,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";

export const dynamic = "force-dynamic";

const highlightedValidationGates = [
  "cargo check -p nockchain",
  "cargo check -p nockapp",
  "cargo check -p nockchain-wallet"
];
const highlightedCrateNames = [
  "nockchain",
  "nockchain-libp2p-io",
  "nockapp",
  "nockchain-wallet",
  "nockchain-api",
  "wallet-tx-builder",
  "nockchain-bridge-sequencer",
  "nockup"
];
const highlightedWatchTheme = "PMA dynamic growth";
const highlightedNextUse = "Attach crate-level provenance";

export default function NockchainRustAtlasPage() {
  const atlas = createNockchainRustAtlas();
  const highlightedCrates = highlightedCrateNames
    .map((crateName) => atlas.crates.find((crateDetail) => crateDetail.name === crateName))
    .filter((crateDetail): crateDetail is NonNullable<typeof crateDetail> => Boolean(crateDetail));
  const rustWorkspaceSummary = `${atlas.workspace.language} / resolver ${atlas.workspace.resolver}`;
  const primaryWatchThemes = atlas.watchThemes.filter((theme) => theme.includes(highlightedWatchTheme));
  const primaryNextUses = atlas.nocksperimentalNextUses.filter((use) =>
    use.includes(highlightedNextUse)
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
                Rust workspace
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Rust Atlas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A crate-level operating map for learning Nockchain as a Rust system:
                consensus/runtime crates, NockApp boundaries, wallet/API surfaces,
                scaffolding, bridge/proof work, and the checks Nocksperimental should
                run before trusting evidence from each layer.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/rust-atlas"
              >
                <Code2 size={16} aria-hidden="true" />
                Rust Atlas API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/upstream"
              >
                <GitBranch size={16} aria-hidden="true" />
                Upstream
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/knowledge-spine"
              >
                <BookOpenText size={16} aria-hidden="true" />
                Knowledge Spine
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/cargo-surface"
              >
                <Code2 size={16} aria-hidden="true" />
                Cargo Surface
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/hoon-kernels"
              >
                <Package size={16} aria-hidden="true" />
                Hoon Kernels
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Workspace" value={rustWorkspaceSummary} />
        <Metric label="Crates" value={atlas.crates.length.toString()} />
        <Metric label="Members" value={atlas.workspace.memberCount.toString()} />
        <Metric label="Groups" value={atlas.groups.length.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Workspace Coverage</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout
              label="trackedWorkspaceMemberCount"
              value={atlas.workspace.coverage.trackedWorkspaceMemberCount.toString()}
            />
            <Callout
              label="missingWorkspaceMembers"
              value={
                atlas.workspace.coverage.missingWorkspaceMembers.length === 0
                  ? "none"
                  : atlas.workspace.coverage.missingWorkspaceMembers.join(", ")
              }
            />
            <Callout
              label="nonWorkspaceTrackedCrates"
              value={atlas.workspace.coverage.nonWorkspaceTrackedCrates.join(", ")}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Validation Gates</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {highlightedValidationGates.map((gate) => (
              <Callout key={gate} label="check" value={gate} />
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.workspace.validationGates
              .filter((gate) => !highlightedValidationGates.includes(gate))
              .map((gate) => (
                <Callout key={gate} label="additional" value={gate} />
              ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Rust Evidence Watch</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {primaryWatchThemes.concat(atlas.watchThemes.filter((theme) => !primaryWatchThemes.includes(theme))).map(
              (theme) => (
                <Callout key={theme} label="watch" value={theme} />
              )
            )}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Workspace Groups</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.groups.map((group) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={group.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {group.id}
                </p>
                <h3 className="mt-1 font-semibold">{group.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{group.role}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{group.nocksperimentalUse}</p>
                <p className="mt-3 break-all font-mono text-xs leading-5 text-[#0B0B0B]">
                  {group.crates.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Package size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">High-Signal Crates</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {highlightedCrates.map((crateDetail) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={crateDetail.name}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {crateDetail.group}
                </p>
                <h3 className="mt-1 font-semibold">{crateDetail.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{crateDetail.role}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {crateDetail.nocksperimentalUse}
                </p>
                <Callout label="primaryCheck" value={crateDetail.primaryCheck} />
                <Callout label="riskPosture" value={crateDetail.riskPosture} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Authority Chain</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.upstream.docs.map((docPath, index) => (
              <div className="flex items-start gap-3 border border-[#0B0B0B] bg-white p-3" key={docPath}>
                <span className="font-mono text-xs uppercase text-[#0B0B0B]">{index + 1}</span>
                <span className="break-all font-mono text-sm text-[#0B0B0B]">{docPath}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Cpu size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Next Nocksperimental Uses</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {primaryNextUses
              .concat(atlas.nocksperimentalNextUses.filter((nextUse) => !primaryNextUses.includes(nextUse)))
              .map((nextUse) => (
                <Callout key={nextUse} label="next" value={nextUse} />
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
