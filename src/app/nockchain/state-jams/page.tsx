import {
  ArrowLeft,
  Code2,
  Database,
  FileWarning,
  GitBranch,
  ListChecks,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

export const dynamic = "force-dynamic";

const policyFields = ["mode", "rawArtifactStorage", "posture"] as const;
const expectedPolicyMode = "metadata-only";
const expectedRawArtifactStorage = "forbidden";
const driveFolderCorrection = "not a VESL folder";
const expectedDriveFolderUrl =
  "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw";
const priorityBootSources = ["checkpoint-bootstrap", "pma-fast-path", "event-log-replay"] as const;
const priorityRequiredMetadata = [
  "Nockchain build or commit",
  "checkpoint height or event boundary"
] as const;
const priorityForbiddenArtifacts = ["pma/*.pma", "event-log.sqlite3"] as const;
const priorityVerificationQuestion = "Which Nockchain commit/build produced it?";

export default function NockchainStateJamsPage() {
  const registry = createNockchainStateJamRegistry();
  const zorp = createZorpUpstreamMap();
  const primarySource = registry.sources[0];
  const policyValues = policyFields.map((field) => ({
    label: field,
    value: registry.policy[field]
  }));
  const highlightedBootSources = priorityBootSources.filter((source) =>
    registry.pmaSafety.bootSources.includes(source)
  );
  const priorityRequiredMetadataSet = new Set<string>(priorityRequiredMetadata);
  const priorityForbiddenArtifactSet = new Set<string>(priorityForbiddenArtifacts);
  const orderedRequiredMetadata = [
    ...priorityRequiredMetadata.filter((field) => registry.requiredMetadata.includes(field)),
    ...registry.requiredMetadata.filter((field) => !priorityRequiredMetadataSet.has(field))
  ];
  const orderedForbiddenArtifacts = [
    ...priorityForbiddenArtifacts.filter((artifact) =>
      registry.pmaSafety.forbiddenRawArtifacts.includes(artifact)
    ),
    ...registry.pmaSafety.forbiddenRawArtifacts.filter(
      (artifact) => !priorityForbiddenArtifactSet.has(artifact)
    )
  ];
  const orderedVerificationQuestions = [
    ...[priorityVerificationQuestion].filter((question) =>
      primarySource.verificationQuestions.includes(question)
    ),
    ...primarySource.verificationQuestions.filter((question) => question !== priorityVerificationQuestion)
  ];

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
                Metadata-only state artifact provenance
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain State Jams</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Operator view for Zorp state-jam folder provenance, required
                checkpoint metadata, PMA boot safety, and the raw artifact
                boundary Nocksperimental keeps out of git, receipts, and public
                support bundles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/state-jams"
              >
                <Code2 size={16} aria-hidden="true" />
                State-Jams API
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
                href="/nockchain/watch"
              >
                <ListChecks size={16} aria-hidden="true" />
                Watch Board
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/pma"
              >
                <FileWarning size={16} aria-hidden="true" />
                PMA Trace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Sources" value={registry.sources.length.toString()} />
        <Metric label="Policy" value={registry.policy.mode} />
        <Metric label="PMA Docs" value={registry.pmaSafety.sourceDocs.length.toString()} />
        <Metric label="Zorp Repos" value={zorp.organization.publicRepoCount.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Zorp State-Jam Folder</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="source" value={primarySource.label} />
            <Callout label="classification" value={zorp.stateJamDrive.classification} />
            <Callout label="driveCorrection" value={driveFolderCorrection} />
            <Callout label="driveFolder" value={expectedDriveFolderUrl} />
            <Callout label="artifactPolicy" value={expectedPolicyMode} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#2F2A14]">
            {primarySource.classification}
          </p>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Policy Boundary</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {policyValues.map((item) => (
              <Callout
                key={item.label}
                label={item.label}
                value={
                  item.label === "rawArtifactStorage"
                    ? expectedRawArtifactStorage
                    : item.label === "mode"
                      ? expectedPolicyMode
                      : item.value
                }
              />
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#4A4A4A]">{registry.policy.rationale}</p>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Required Metadata</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedRequiredMetadata.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-sm" key={field}>
                {field}
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Questions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {orderedVerificationQuestions.map((question) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={question}>
                {question}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileWarning size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">PMA Safety</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            {registry.pmaSafety.interpretation}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {highlightedBootSources.map((source) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={source}>
                {source}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {registry.pmaSafety.operatorChecklist.slice(0, 4).map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Do Not Store</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {orderedForbiddenArtifacts.map((artifact) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={artifact}>
                {artifact}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Upstream Context</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout label="nockchainCommit" value={registry.upstream.commit.sha} />
            <Callout label="nockchainBuild" value={registry.upstream.release.tag} />
            <Callout label="zorpAuthority" value={zorp.sourceAuthority.stateJams.sourceRole} />
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
