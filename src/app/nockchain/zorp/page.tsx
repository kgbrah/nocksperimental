import {
  AlertTriangle,
  ArrowLeft,
  Code2,
  Database,
  GitBranch,
  ListChecks,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

export const dynamic = "force-dynamic";

const driveFolderCorrection = "state-jam folder, not a VESL folder";
const canonicalRelocationLabel = "zorp-corp/nockchain redirects to nockchain/nockchain";
const prioritySourceOrder: readonly string[] = [
  "zorp-corp/jock-lang",
  "zorp-corp/nockapp",
  "zorp-corp/sword",
  "nockchain/nockchain"
];
const riskFlagOrder: readonly string[] = [
  "legacy-repos-are-lineage-not-authority",
  "zorp-corp-nockchain-redirects-to-canonical-nockchain-org",
  "state-jam-folder-is-metadata-only"
];
const sourceAuthorityRoleOrder: readonly string[] = [
  "canonical-protocol-authority",
  "lineage-and-authoring-signal",
  "state-artifact-provenance"
];
const watchMatrixEntryOrder: readonly string[] = [
  "canonical-runtime",
  "authoring-fixtures",
  "lineage-runtime",
  "proof-and-semantics",
  "low-signal-tooling"
];
const sourceNoteOrder: readonly string[] = [
  "jock-language-preview",
  "nockapp-poke-peek-lineage",
  "sword-persistence-lineage"
];
const sourceSignalOrder: readonly string[] = [
  "jock-compiles-to-nock",
  "developer-preview-language",
  "pure-functional-state-machines",
  "poke-peek-interface",
  "automatic-persistence-lineage",
  "archived-runtime-reference"
];
const monitorReviewClassOrder: readonly string[] = [
  "canonical-nockchain",
  "zorp-authoring",
  "zorp-lineage",
  "state-artifact-provenance",
  "low-signal-tooling"
];
const collaborationPhaseOrder: readonly string[] = [
  "observe-upstream",
  "classify-authority",
  "route-product-slice",
  "verify-receipts",
  "share-collab-note"
];
const highlightedFlywheelId = "zorp-monitor-to-fixture-flywheel";
const highlightedCollaborationEvidenceFields: readonly string[] = [
  "reviewDecision",
  "collaborationNoteUrl"
];
const highlightedCollaborationForbiddenField = "rawStateJam";
const sourceRouteOrder: readonly string[] = [
  "canonical-runtime-refresh",
  "authoring-fixture-review",
  "lineage-language-review",
  "pma-runtime-vocabulary-review",
  "state-jam-provenance-inventory"
];
const highlightedReviewEvidenceField = "nocksperimentalSurface";
const highlightedWatchMatrixTrigger = "nockchain release/build tag change";
const highlightedWatchMatrixAction = "Refresh upstream commit";
const highlightedZorpDriftCommand = "npm run check:zorp-org-drift -- --json";
const highlightedZorpDriftSourceUrl =
  "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public";
const highlightedZorpDriftCompareField = "defaultBranch";

export default function ZorpIntelligencePage() {
  const zorp = createZorpUpstreamMap();
  const monitorBrief = zorp.monitorBrief;
  const priorityRepos: readonly string[] = monitorBrief.priorityRepos;
  const riskFlags: readonly string[] = monitorBrief.riskFlags;
  const sourceAuthority = [
    {
      label: "protocol",
      role: zorp.sourceAuthority.protocol.sourceRole,
      source: zorp.sourceAuthority.protocol.repository,
      interpretation: zorp.sourceAuthority.protocol.interpretation
    },
    {
      label: "lineage",
      role: zorp.sourceAuthority.zorpOrg.sourceRole,
      source: zorp.sourceAuthority.zorpOrg.organization,
      interpretation: zorp.sourceAuthority.zorpOrg.interpretation
    },
    {
      label: "state",
      role: zorp.sourceAuthority.stateJams.sourceRole,
      source: zorp.sourceAuthority.stateJams.url,
      interpretation: zorp.sourceAuthority.stateJams.interpretation
    }
  ].sort(
    (left, right) =>
      sourceAuthorityRoleOrder.indexOf(left.role) - sourceAuthorityRoleOrder.indexOf(right.role)
  );
  const orderedPrioritySources = prioritySourceOrder
    .filter((source) => priorityRepos.includes(source))
    .concat(priorityRepos.filter((source) => !prioritySourceOrder.includes(source)));
  const orderedRiskFlags = riskFlagOrder
    .filter((flag) => riskFlags.includes(flag))
    .concat(riskFlags.filter((flag) => !riskFlagOrder.includes(flag)));
  const primaryWatchMatrixEntry =
    zorp.repositoryWatchMatrix.find((entry) =>
      entry.triggers.some((trigger) => trigger === highlightedWatchMatrixTrigger)
    ) ?? zorp.repositoryWatchMatrix[0];
  const primaryWatchMatrixAction =
    primaryWatchMatrixEntry?.nocksperimentalActions.find((action) =>
      action.startsWith(highlightedWatchMatrixAction)
    ) ?? primaryWatchMatrixEntry?.nocksperimentalActions[0];
  const orderedWatchMatrix = watchMatrixEntryOrder
    .map((id) => zorp.repositoryWatchMatrix.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .concat(zorp.repositoryWatchMatrix.filter((entry) => !watchMatrixEntryOrder.includes(entry.id)));
  const orderedSourceNotes = sourceNoteOrder
    .map((id) => zorp.sourceNotes.find((note) => note.id === id))
    .filter((note): note is NonNullable<typeof note> => Boolean(note))
    .concat(zorp.sourceNotes.filter((note) => !sourceNoteOrder.includes(note.id)));
  const orderedMonitorReviewClasses = monitorReviewClassOrder
    .map((id) => zorp.monitorReviewContract.classes.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .concat(
      zorp.monitorReviewContract.classes.filter(
        (entry) => !monitorReviewClassOrder.includes(entry.id)
      )
    );
  const orderedCollaborationPhases = collaborationPhaseOrder
    .map((id) => zorp.collaborationFlywheel.phases.find((phase) => phase.id === id))
    .filter((phase): phase is NonNullable<typeof phase> => Boolean(phase))
    .concat(
      zorp.collaborationFlywheel.phases.filter(
        (phase) => !collaborationPhaseOrder.includes(phase.id)
      )
    );
  const orderedSourceRoutes = sourceRouteOrder
    .map((id) => zorp.collaborationFlywheel.sourceRoutes.find((route) => route.routeId === id))
    .filter((route): route is NonNullable<typeof route> => Boolean(route))
    .concat(
      zorp.collaborationFlywheel.sourceRoutes.filter(
        (route) => !sourceRouteOrder.includes(route.routeId)
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
                Zorp source interpretation
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Zorp Intelligence</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Repo and state-jam monitoring context for separating current
                Nockchain authority from Zorp lineage, Jock authoring signals,
                NockApp runtime history, and metadata-only state artifacts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/zorp"
              >
                <Code2 size={16} aria-hidden="true" />
                Zorp API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/zorp/monitor"
              >
                <ListChecks size={16} aria-hidden="true" />
                Monitor
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/state-jams"
              >
                <Database size={16} aria-hidden="true" />
                State Jams
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Repos" value={monitorBrief.snapshot.publicRepoCount.toString()} />
        <Metric label="Core Active" value={monitorBrief.snapshot.activeCoreRepos.toString()} />
        <Metric label="Lineage Archived" value={monitorBrief.snapshot.archivedLineageRepos.toString()} />
        <Metric label="Nockchain" value={zorp.nockchain.latestCommit.shortSha} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Authority</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {sourceAuthority.map((source) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={source.role}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {source.label}
                </p>
                <h3 className="mt-1 break-all font-mono text-sm font-semibold">{source.role}</h3>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  {source.source}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{source.interpretation}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="canonicalRelocation" value={canonicalRelocationLabel} />
            <Callout
              label="legacyUrl"
              value={zorp.nockchain.canonicalRelocation.legacyUrl}
            />
            <Callout
              label="canonicalUrl"
              value={zorp.nockchain.canonicalRelocation.canonicalUrl}
            />
            {zorp.sourceAuthority.decisionRules.map((rule) => (
              <Callout key={rule} label="decisionRule" value={rule} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Monitor Brief</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#2F2A14]">{monitorBrief.interpretation}</p>
          <div className="mt-4 grid gap-3">
            {orderedRiskFlags.map((flag) => (
              <Callout key={flag} label="riskFlag" value={flag} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Priority Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedPrioritySources.map((repo) => (
              <Callout key={repo} label="source" value={repo} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Drift Check</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            {zorp.driftCheck.interpretation}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="command" value={highlightedZorpDriftCommand} />
            <Callout label="testCommand" value={zorp.driftCheck.testCommand} />
            <Callout
              label="sourceUrls"
              value={[
                highlightedZorpDriftSourceUrl,
                ...zorp.driftCheck.sourceUrls.filter(
                  (sourceUrl) => sourceUrl !== highlightedZorpDriftSourceUrl
                )
              ].join(", ")}
            />
            <Callout label="highlightedCompareField" value={highlightedZorpDriftCompareField} />
            <Callout label="compareFields" value={zorp.driftCheck.compareFields.join(", ")} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Notes</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {orderedSourceNotes.map((note) => {
              const noteSourceSignals: readonly string[] = note.sourceSignals;
              const orderedSourceSignals = sourceSignalOrder
                .filter((signal) => noteSourceSignals.includes(signal))
                .concat(noteSourceSignals.filter((signal) => !sourceSignalOrder.includes(signal)));

              return (
                <div className="border border-[#0B0B0B] bg-white p-3" key={note.id}>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {note.id}
                  </p>
                  <h3 className="mt-1 font-semibold">{note.repository}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{note.interpretation}</p>
                  <Callout label="sourcePath" value={note.sourcePath} />
                  <Callout label="sourceSha" value={note.sourceSha} />
                  <Callout label="sourceSignals" value={orderedSourceSignals.join(", ")} />
                  <Callout label="targetSurfaces" value={note.targetSurfaces.join(", ")} />
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Actions</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {monitorBrief.operatorActions.map((action) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={action}>
                {action}
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">State Artifact Boundary</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="driveCorrection" value={driveFolderCorrection} />
            <Callout label="classification" value={zorp.stateJamDrive.classification} />
            <Callout label="artifactPolicy" value={zorp.stateJamDrive.artifactPolicy} />
            <Callout label="driveFolder" value={zorp.stateJamDrive.url} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Watch Matrix</h2>
          </div>
          {primaryWatchMatrixEntry && primaryWatchMatrixAction ? (
            <div className="mt-4 border border-[#0B0B0B] bg-[#E7F7FF] p-3">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                {primaryWatchMatrixEntry.id}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#22313A]">{primaryWatchMatrixAction}</p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {orderedWatchMatrix.map((entry) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={entry.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {entry.id}
                </p>
                <h3 className="mt-1 font-semibold">{entry.label}</h3>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">
                  escalation: {entry.escalation}
                </p>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  {entry.sources.join(", ")}
                </p>
                <div className="mt-3 grid gap-2">
                  {entry.triggers.map((trigger) => (
                    <Callout key={trigger} label="trigger" value={trigger} />
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  {entry.nocksperimentalActions.map((action) => (
                    <Callout key={action} label="action" value={action} />
                  ))}
                </div>
                <p className="mt-3 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  fields: {entry.receiptFields.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Monitor Review Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="sourcePolicy" value={zorp.monitorReviewContract.sourcePolicy} />
            <Callout
              label="requiredEvidenceFields"
              value={zorp.monitorReviewContract.requiredEvidenceFields.join(", ")}
            />
            <Callout label="highlightedEvidenceField" value={highlightedReviewEvidenceField} />
          </div>
          <div className="mt-4 grid gap-3">
            {zorp.monitorReviewContract.reviewOutputContract.map((rule) => (
              <Callout key={rule} label="reviewRule" value={rule} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {orderedMonitorReviewClasses.map((reviewClass) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={reviewClass.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {reviewClass.id}
                </p>
                <h3 className="mt-1 font-semibold">{reviewClass.label}</h3>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">
                  escalation: {reviewClass.escalation}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {reviewClass.receiptRisk}
                </p>
                <Callout
                  label="targetSurfaces"
                  value={reviewClass.targetSurfaces.join(", ")}
                />
                <Callout label="requiredAction" value={reviewClass.requiredAction} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Collaboration Flywheel</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="cycleId" value={zorp.collaborationFlywheel.cycleId} />
            <Callout label="cadence" value={zorp.collaborationFlywheel.cadence} />
            <Callout label="highlightedFlywheelId" value={highlightedFlywheelId} />
            <Callout
              label="highlightedEvidenceFields"
              value={highlightedCollaborationEvidenceFields.join(", ")}
            />
            <Callout
              label="highlightedForbiddenField"
              value={highlightedCollaborationForbiddenField}
            />
            <Callout
              label="requiredEvidenceFields"
              value={zorp.collaborationFlywheel.requiredEvidenceFields.join(", ")}
            />
            <Callout
              label="forbiddenFields"
              value={zorp.collaborationFlywheel.forbiddenFields.join(", ")}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#4A4A4A]">
            {zorp.collaborationFlywheel.purpose}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {orderedCollaborationPhases.map((phase) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={phase.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {phase.id}
                </p>
                <h3 className="mt-1 font-semibold">{phase.label}</h3>
                <Callout label="output" value={phase.output} />
                <Callout label="targetSurfaces" value={phase.targetSurfaces.join(", ")} />
                <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
                  {phase.operatorAction}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {orderedSourceRoutes.map((route) => (
              <div className="border border-[#0B0B0B] bg-[#F5F5F5] p-3" key={route.routeId}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {route.routeId}
                </p>
                <h3 className="mt-1 break-all font-semibold">{route.source}</h3>
                <Callout label="authority" value={route.authority} />
                <Callout label="targetSurfaces" value={route.targetSurfaces.join(", ")} />
                <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
                  {route.collaborationUse}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Signal Layers</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {zorp.layers.map((layer) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={layer.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {layer.id}
                </p>
                <h3 className="mt-1 font-semibold">{layer.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{layer.interpretation}</p>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  {layer.sources.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Repository Watch</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {zorp.repositories.map((repo) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={repo.fullName}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {repo.primarySignal}
                </p>
                <h3 className="mt-1 font-semibold">{repo.fullName}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{repo.nocksperimentalUse}</p>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  updated {repo.updatedAt} / pushed {repo.pushedAt}
                </p>
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
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
