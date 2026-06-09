import {
  ArrowLeft,
  BookOpenText,
  Code2,
  Fingerprint,
  GitBranch,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainRustSourceGuide } from "@/lib/nockchain-rust-source-guide";

export const dynamic = "force-dynamic";

const highlightedDomainOrder: readonly string[] = [
  "node-runtime",
  "mining-runtime",
  "p2p-sync-gossip",
  "nockapp-runtime",
  "pma-durability",
  "runtime-stack-safety",
  "wallet-cli",
  "wallet-transaction-builder",
  "public-api-grpc",
  "bridge-withdrawal",
  "bridge-sequencer",
  "bridge-dev-scenarios",
  "nockup-scaffold"
];
const highlightedAnchorOrder: readonly string[] = [
  "nockchain-node-main",
  "libp2p-catch-up-signal",
  "libp2p-gossip-suppression",
  "nockapp-poke-peek",
  "pma-open-growth",
  "nockstack-frame-safety",
  "wallet-cli-commands",
  "wallet-tx-planner",
  "bridge-sequencer-journal",
  "bridge-dev-scenario-readme",
  "bridge-dev-withdrawal-scenarios"
];
const highlightedForbiddenFields: readonly string[] = [
  "rawPmaSlab",
  "walletSeedPhrase",
  "sequencerJournalSigningKey",
  "tenderlyAccessKey",
  "r2TestToken"
];

export default function NockchainRustSourceGuidePage() {
  const guide = createNockchainRustSourceGuide();
  const orderedDomains = highlightedDomainOrder
    .map((domainId) => guide.sourceDomains.find((domain) => domain.id === domainId))
    .filter((domain): domain is NonNullable<typeof domain> => Boolean(domain))
    .concat(guide.sourceDomains.filter((domain) => !highlightedDomainOrder.includes(domain.id)));
  const highlightedAnchors = highlightedAnchorOrder
    .map((anchorId) => guide.sourceAnchors.find((anchor) => anchor.id === anchorId))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor));
  const contractForbiddenFields: readonly string[] = guide.sourceTraceContract.forbiddenFields;
  const orderedForbiddenFields = highlightedForbiddenFields
    .filter((field) => contractForbiddenFields.includes(field))
    .concat(
      contractForbiddenFields.filter(
        (field) => !highlightedForbiddenFields.includes(field)
      )
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
                Rust source anchors
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Rust Source Guide</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Exact upstream Rust files, symbols, line ranges, cargo gates, receipt fields,
                and forbidden raw artifacts for learning Nockchain as source code instead of
                only as crate names.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/rust-source" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Source API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/rust"
              >
                <GitBranch size={16} aria-hidden="true" />
                Rust Atlas
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/runtime-safety"
              >
                <ShieldAlert size={16} aria-hidden="true" />
                Runtime Safety
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/nockapp/source"
              >
                <Fingerprint size={16} aria-hidden="true" />
                NockApp Source
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Domains" value={guide.sourceDomains.length.toString()} />
        <Metric label="Source Anchors" value={guide.sourceAnchors.length.toString()} />
        <Metric label="Commit" value={guide.upstream.commit.shortSha} />
        <Metric label="Release" value={guide.upstream.release.tag} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Learning Path</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {guide.learningPath.map((step) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={step.domainId}>
                <p className="font-mono text-xs uppercase tracking-[0.12em]">{step.domainId}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.objective}</p>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#0B0B0B]">
                  {step.anchorIds.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Trace Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="requiredFields" value={guide.sourceTraceContract.requiredFields.join(", ")} />
            <Callout label="forbiddenFields" value={orderedForbiddenFields.join(", ")} />
          </div>
          <div className="mt-4 grid gap-3">
            {guide.sourceTraceContract.reviewRules.map((rule) => (
              <Callout key={rule} label="reviewRule" value={rule} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Domains</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {orderedDomains.map((domain) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={domain.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em]">{domain.id}</p>
                <h3 className="mt-1 font-semibold">{domain.label}</h3>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#0B0B0B]">
                  {domain.crateNames.join(", ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {domain.nocksperimentalUse}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Anchors</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {highlightedAnchors.map((anchor) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={anchor.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em]">{anchor.id}</p>
                <h3 className="mt-1 font-semibold">{anchor.symbol}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.interpretation}</p>
                <Callout label="domainId" value={anchor.domainId} />
                <Callout label="sourcePath" value={`${anchor.sourcePath} ${anchor.lineRange}`} />
                <Callout label="cargoGate" value={anchor.cargoGate} />
                <Callout label="receiptFields" value={anchor.receiptFields.join(", ")} />
                <Callout label="forbiddenFields" value={anchor.forbiddenFields.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Implementation Links</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="rustAtlas" value={guide.links.rustAtlas} />
            <Callout label="syncGossip" value={guide.links.syncGossip} />
            <Callout label="bridgeSource" value={guide.links.bridgeSource} />
            <Callout label="stateJams" value={guide.links.stateJams} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Nocksperimental Implications</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {guide.nocksperimentalImplications.map((implication) => (
              <Callout key={implication} label="implication" value={implication} />
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
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em]">
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
