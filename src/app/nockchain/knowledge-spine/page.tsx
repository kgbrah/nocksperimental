import {
  ArrowLeft,
  BookOpenText,
  Code2,
  FileCheck2,
  Fingerprint,
  GitBranch,
  GitPullRequest,
  Layers3,
  Map,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainKnowledgeSpine } from "@/lib/nockchain-knowledge-spine";

export const dynamic = "force-dynamic";

const highlightedDocuments = ["START_HERE.md", "PROTOCOL.md", "crates/nockchain-wallet/README.md"];
const highlightedStartHereHash = "61f86959050831147bebb6f350be297d7a0f2f68d476c8bfac15928efebd71aa";
const highlightedForbiddenFields = ["rawPmaSlab", "walletSeedPhrase"];

export default function NockchainKnowledgeSpinePage() {
  const spine = createNockchainKnowledgeSpine();
  const primaryDocuments = highlightedDocuments
    .map((docPath) => spine.documentFingerprints.find((doc) => doc.path === docPath))
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
    .sort((left, right) => {
      if (left.sha256 === highlightedStartHereHash) {
        return -1;
      }

      if (right.sha256 === highlightedStartHereHash) {
        return 1;
      }

      return 0;
    });
  const remainingDocuments = spine.documentFingerprints.filter(
    (doc) => !highlightedDocuments.includes(doc.path)
  );
  const primaryForbiddenFields = highlightedForbiddenFields.filter((field) =>
    (spine.monitoringContract.forbiddenFields as readonly string[]).includes(field)
  );
  const remainingForbiddenFields = spine.monitoringContract.forbiddenFields.filter(
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
                Canonical integrity map
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Knowledge Spine</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A compact authority map that binds the current Nockchain commit to
                Tier 0 and promoted Tier 1 document fingerprints, Rust workspace
                coverage, Zorp monitoring, and the Nocksperimental surfaces that
                turn that source knowledge into evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/knowledge-spine"
              >
                <Code2 size={16} aria-hidden="true" />
                Spine API
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
                href="/nockchain/cargo-surface"
              >
                <Code2 size={16} aria-hidden="true" />
                Cargo Surface
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/pr-radar"
              >
                <GitPullRequest size={16} aria-hidden="true" />
                PR Radar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={spine.upstream.commit.shortSha} />
        <Metric label="Documents" value={spine.documentFingerprints.length.toString()} />
        <Metric label="Workspace" value={`${spine.workspaceManifest.memberCount} members`} />
        <Metric label="Coverage" value={`${spine.coverageMatrix.length} domains`} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Fingerprint size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Document Fingerprints</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {primaryDocuments.concat(remainingDocuments).map((doc) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={doc.path}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all font-mono text-sm font-semibold">{doc.path}</p>
                  <span className="border border-[#0B0B0B] px-2 py-1 font-mono text-xs uppercase">
                    {doc.tier}
                  </span>
                </div>
                <Callout label="authority" value={doc.authority} />
                <Callout label="sha256" value={doc.sha256} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Workspace Manifest</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="language" value={spine.workspaceManifest.language} />
            <Callout label="resolver" value={spine.workspaceManifest.resolver} />
            <Callout
              label="workspaceMemberHash"
              value={spine.workspaceManifest.workspaceMemberHash}
            />
            <Callout
              label="validationGates"
              value={spine.workspaceManifest.validationGates.join(" | ")}
            />
          </div>
          <div className="mt-4 max-h-80 overflow-auto border border-[#0B0B0B] bg-white p-3">
            {spine.workspaceManifest.members.map((member) => (
              <p className="break-all font-mono text-xs leading-6 text-[#0B0B0B]" key={member}>
                {member}
              </p>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Map size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Coverage Matrix</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {spine.coverageMatrix.map((entry) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={entry.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {entry.id}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{entry.upstreamAuthority}</p>
                <Callout label="pagePath" value={entry.pagePath} />
                <Callout label="checkpointSurface" value={entry.checkpointSurface} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Monitoring Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Required Evidence</h3>
              <div className="mt-3 grid gap-2">
                {spine.monitoringContract.requiredEvidence.map((field) => (
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

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Expertise Ladder</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {spine.expertiseLadder.map((entry) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={entry.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {entry.id}
                </p>
                <h3 className="mt-1 font-semibold">{entry.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{entry.requirement}</p>
                <Callout label="primarySurfaces" value={entry.primarySurfaces.join(", ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Update Triggers</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {spine.monitoringContract.updateTriggers.map((trigger) => (
              <Callout key={trigger} label="trigger" value={trigger} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="inline-flex items-center gap-2 border border-[#0B0B0B] px-3 py-2 text-sm" href="/api/nockchain/zorp">
              <GitBranch size={15} aria-hidden="true" />
              Zorp API
            </Link>
            <Link className="inline-flex items-center gap-2 border border-[#0B0B0B] px-3 py-2 text-sm" href="/api/registry/checkpoint">
              <Code2 size={15} aria-hidden="true" />
              Checkpoint
            </Link>
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
