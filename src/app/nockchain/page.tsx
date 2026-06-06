import {
  ArrowLeft,
  BellRing,
  BookOpenText,
  Cable,
  Code2,
  FileWarning,
  Fingerprint,
  GitBranch,
  GitPullRequest,
  Layers3,
  Database,
  PackageCheck,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
import { createNockchainReceiptProvenance } from "@/lib/nockchain-upstream";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

export const dynamic = "force-dynamic";

const expectedProtocolAlertId = "protocol-014-status-drift";
const expectedZorpOrgSlug = "zorp-corp";
const expectedStateJamClassification = "Zorp/Nockchain state-jam folder, not a VESL folder.";
const highlightedPmaBootSources = ["checkpoint-bootstrap", "pma-fast-path"] as const;

export default function NockchainEvidencePage() {
  const docsAtlas = createNockchainDocsAtlas();
  const stateJamRegistry = createNockchainStateJamRegistry();
  const zorpMap = createZorpUpstreamMap();
  const receiptProvenance = createNockchainReceiptProvenance({
    network: "local-fakenet",
    endpoint: "http://127.0.0.1:5555",
    walletAddress: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
    project: "nocksperimental",
    settlementMode: "fakenet"
  });
  const latestConsensusCritical = receiptProvenance.protocol.specs.latestConsensusCritical;
  const nextSpec = receiptProvenance.protocol.specs.next;
  const protocolIndexStatus =
    latestConsensusCritical && "protocolIndexStatus" in latestConsensusCritical
      ? latestConsensusCritical.protocolIndexStatus
      : "not recorded";
  const primaryStateJamSource = stateJamRegistry.sources[0];
  const zorpOrganizationSlug = zorpMap.organization.slug || expectedZorpOrgSlug;
  const stateJamClassification =
    zorpMap.stateJamDrive.classification || expectedStateJamClassification;
  const protocolAlert =
    docsAtlas.consistencyChecks.alerts.find((alert) => alert.id === expectedProtocolAlertId) ?? {
      id: expectedProtocolAlertId,
      observed: "No protocol drift alert was found in the docs atlas.",
      nocksperimentalAction: "Recheck docs atlas provenance before using protocol-sensitive receipts."
    };

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Canonical upstream context
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Evidence</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Nocksperimental pins receipts to the current Nockchain build, canonical
                docs order, selected protocol specs, and active source-consistency
                warnings before treating fakenet or NockApp evidence as explainable.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/docs-atlas"
              >
                <Code2 size={16} aria-hidden="true" />
                Docs Atlas
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
                <FileWarning size={16} aria-hidden="true" />
                Hoon Kernels
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/protocol"
              >
                <BookOpenText size={16} aria-hidden="true" />
                Protocol
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/bridge"
              >
                <Cable size={16} aria-hidden="true" />
                Bridge
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/releases"
              >
                <PackageCheck size={16} aria-hidden="true" />
                Releases
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
                href="/api/nockchain/zorp"
              >
                <GitBranch size={16} aria-hidden="true" />
                Zorp Map
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/zorp"
              >
                <GitBranch size={16} aria-hidden="true" />
                Zorp Intel
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
                href="/nockchain/rust/source"
              >
                <Code2 size={16} aria-hidden="true" />
                Rust Source
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/nockapp"
              >
                <Fingerprint size={16} aria-hidden="true" />
                NockApp
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/operations"
              >
                <Terminal size={16} aria-hidden="true" />
                Operations
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/wallet"
              >
                <Wallet size={16} aria-hidden="true" />
                Wallet
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/watch"
              >
                <BellRing size={16} aria-hidden="true" />
                Watch
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/pr-radar"
              >
                <GitPullRequest size={16} aria-hidden="true" />
                PR Radar
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/impact"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Impact Queue
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/sync-gossip"
              >
                <RadioTower size={16} aria-hidden="true" />
                Sync/Gossip
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/state-jams"
              >
                <Database size={16} aria-hidden="true" />
                State Jams
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/pma"
              >
                <FileWarning size={16} aria-hidden="true" />
                PMA Trace
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
                href="/api/nockchain/state-jams"
              >
                <Code2 size={16} aria-hidden="true" />
                State Jams API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/nockup/receipts"
              >
                <Fingerprint size={16} aria-hidden="true" />
                Receipts
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Build" value={docsAtlas.upstream.commit.shortSha} />
        <Metric label="Release" value={docsAtlas.upstream.release.tag.slice(0, 18)} />
        <Metric label="Protocol Specs" value={docsAtlas.protocolSpecs.specs.length.toString()} />
        <Metric label="Doc Alerts" value={docsAtlas.consistencyChecks.alerts.length.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Protocol Drift Alert</h2>
          </div>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
            {protocolAlert.id}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#2F2A14]">{protocolAlert.observed}</p>
          <p className="mt-3 text-sm leading-6 text-[#2F2A14]">
            {protocolAlert.nocksperimentalAction}
          </p>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileWarning size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Provenance</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="docsAtlas" value={receiptProvenance.links.docsAtlas} />
            <Callout label="docConsistencyAlerts" value={protocolAlert.id} />
            <Callout
              label="latestConsensusCritical"
              value={`${latestConsensusCritical?.sequence ?? "unknown"} ${latestConsensusCritical?.codename ?? "unknown"} ${latestConsensusCritical?.status ?? "unknown"}`}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Zorp State-Jam Watch</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="classification" value={stateJamClassification} />
            <Callout label="driveFolder" value={stateJamRegistry.links.driveFolder} />
            <Callout label="artifactPolicy" value={stateJamRegistry.policy.mode} />
          </div>
          <div className="mt-5 border border-[#0B0B0B] bg-[#FFF7D6] p-3">
            <h3 className="font-semibold">PMA Safety</h3>
            <p className="mt-2 text-sm leading-6 text-[#2F2A14]">
              {stateJamRegistry.pmaSafety.interpretation}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {highlightedPmaBootSources
                .filter((source) => stateJamRegistry.pmaSafety.bootSources.includes(source))
                .map((source) => (
                <span className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs" key={source}>
                  {source}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {primaryStateJamSource.verificationQuestions.slice(0, 4).map((question) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={question}>
                {question}
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Zorp/Nockchain Monitor</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="organization" value={zorpOrganizationSlug} />
            <Callout label="canonicalRepo" value={zorpMap.nockchain.repository.fullName} />
            <Callout label="automation" value={zorpMap.monitor.automationName} />
          </div>
          <div className="mt-5 grid gap-3">
            {zorpMap.monitor.watchedSources.map((source) => (
              <div className="break-all border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={source}>
                {source}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Docs Authority</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="Policy" value={docsAtlas.trustContract.conflictRule} />
            <Callout label="Crate README Rule" value={docsAtlas.trustContract.crateReadmeIsolationRule} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SourceList label="Tier 0" sources={docsAtlas.tier0.map((source) => source.path)} />
            <SourceList label="Tier 1" sources={docsAtlas.tier1.map((source) => source.path)} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Protocol Track</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout
              label="Next"
              value={`${nextSpec?.sequence ?? "unknown"} ${nextSpec?.codename ?? "unknown"} ${nextSpec?.status ?? "unknown"}`}
            />
            <Callout
              label="Latest Consensus Critical"
              value={`${latestConsensusCritical?.sequence ?? "unknown"} ${latestConsensusCritical?.codename ?? "unknown"} ${latestConsensusCritical?.status ?? "unknown"}`}
            />
            <Callout
              label="Activation Height"
              value={
                latestConsensusCritical?.activationHeight === undefined
                  ? "unknown"
                  : latestConsensusCritical.activationHeight.toString()
              }
            />
            <Callout
              label="Protocol Index Status"
              value={protocolIndexStatus}
            />
          </div>
          <div className="mt-5 grid gap-3">
            {receiptProvenance.docs.atlas.trustContract.readOrder.map((source, index) => (
              <div className="flex items-start gap-3 border border-[#0B0B0B] bg-white p-3" key={source}>
                <span className="font-mono text-xs uppercase text-[#0B0B0B]">{index + 1}</span>
                <span className="break-all font-mono text-sm text-[#0B0B0B]">{source}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Fields To Preserve</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docsAtlas.nocksperimentalImplications.receiptFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-sm" key={field}>
                {field}
              </div>
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
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}

function SourceList({ label, sources }: { label: string; sources: string[] }) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</h3>
      <div className="mt-3 grid gap-2">
        {sources.map((source) => (
          <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={source}>
            {source}
          </div>
        ))}
      </div>
    </div>
  );
}
