import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Code2,
  FileWarning,
  GitBranch,
  ListChecks,
  RadioTower,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createZorpMonitorRunbook } from "@/lib/zorp-monitor-runbook";

export const dynamic = "force-dynamic";

const priorityRouteIds = [
  "canonical-nockchain-runtime",
  "zorp-authoring-fixtures",
  "state-jam-artifacts",
  "lineage-runtime-context"
] as const;

const priorityClassIds = [
  "canonical-nockchain",
  "zorp-authoring",
  "zorp-lineage",
  "state-artifact-provenance"
] as const;

const monitorAutomationId = "monitor-zorp-and-nockchain-sources";
const highlightedSupersededAutomationIds = [
  "watch-vesl-drive-folder",
  "watch-zorp-nockchain-repos-and-state-jams",
  "zorp-nockchain-watch"
] as const;
const highlightedWatchedSourceIds = [
  "zorp-github-org",
  "zorp-nockchain-legacy-redirect",
  "canonical-nockchain-repository",
  "zorp-state-jam-drive"
] as const;
const highlightedFindingFields = [
  "upstreamSourceUrl",
  "sourceAuthority",
  "nocksperimentalSurface",
  "verificationCommand",
  "rawArtifactPolicy"
] as const;

const highlightedForbiddenFields = ["rawStateJam", "rawPmaSlab", "walletSeedPhrase"] as const;
const highlightedRouteTargets = ["nockchainMiningSourceTrace", "nockchainPmaSourceTrace"] as const;

export default function ZorpMonitorRunbookPage() {
  const runbook = createZorpMonitorRunbook();
  const priorityRoutes = priorityRouteIds
    .map((id) => runbook.routeMatrix.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const priorityClasses = priorityClassIds
    .map((id) => runbook.monitorClasses.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const highlightedCommand = runbook.localVerification.recommendedCommands.find((command) =>
    command.includes("run-zorp-monitor-snapshot")
  );

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain/zorp">
            <ArrowLeft size={16} aria-hidden="true" />
            Zorp intelligence
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Monitor evidence
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Zorp Monitor Runbook</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Receipt-safe contract for turning Zorp/Nockchain monitor output into classified
                findings, routed Nocksperimental updates, and verification commands without
                importing raw state artifacts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/zorp/monitor"
              >
                <Code2 size={16} aria-hidden="true" />
                Monitor API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/watch"
              >
                <BellRing size={16} aria-hidden="true" />
                Nockchain Watch
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain"
              >
                <GitBranch size={16} aria-hidden="true" />
                Nockchain
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Automation" value={monitorAutomationId} />
        <Metric label="Cadence" value={runbook.automation.interval.replace("FREQ=", "")} />
        <Metric label="Repos" value={runbook.currentSnapshot.zorp.publicRepoCount.toString()} />
        <Metric label="Commit" value={runbook.currentSnapshot.nockchain.commit.shortSha} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <BellRing size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Monitor Run Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="automationId" value={runbook.automation.automationId} />
            <Callout label="supersededAutomationIds" value={highlightedSupersededAutomationIds.join(", ")} />
            <Callout label="workspace" value={runbook.automation.workspace} />
            <Callout label="stateJamDrive" value={runbook.currentSnapshot.stateJamDrive.classification} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Watched Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="highlightedWatchedSourceIds" value={highlightedWatchedSourceIds.join(", ")} />
            {runbook.watchedSources.map((source) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={source.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {source.id}
                </p>
                <Callout label="kind" value={source.kind} />
                <Callout label="authority" value={source.authority} />
                <Callout label="url" value={source.url} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <FileWarning size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Finding Schema</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="requiredFields" value={runbook.findingSchema.requiredFields.join(", ")} />
            <Callout label="highlightedFields" value={highlightedFindingFields.join(", ")} />
            <Callout label="forbiddenFields" value={runbook.findingSchema.forbiddenFields.join(", ")} />
            <Callout label="highlightedForbidden" value={highlightedForbiddenFields.join(", ")} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Classification Flow</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {runbook.classificationFlow.map((step) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={step.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {step.id}
                </p>
                <h3 className="mt-1 font-semibold">{step.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.action}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Route Matrix</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {priorityRoutes.map((entry) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={entry.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {entry.id}
                </p>
                <Callout label="authorities" value={entry.sourceAuthorities.join(", ")} />
                <Callout label="targetSurfaces" value={entry.targetSurfaces.join(", ")} />
                <Callout label="verificationCommands" value={entry.verificationCommands.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Highlighted Route Targets</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {highlightedRouteTargets.map((target) => (
              <Callout key={target} label="targetSurface" value={target} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Monitor Classes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityClasses.map((monitorClass) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={monitorClass.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {monitorClass.id}
                </p>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">
                  {monitorClass.escalation}
                </p>
                <Callout label="targetSurfaces" value={monitorClass.targetSurfaces.join(", ")} />
                <Callout label="requiredAction" value={monitorClass.requiredAction} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Freshness Probes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="snapshotCommand" value={highlightedCommand ?? "node scripts/run-zorp-monitor-snapshot.mjs --json"} />
            {runbook.localVerification.recommendedCommands.map((command) => (
              <Callout key={command} label="verificationCommand" value={command} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Monitor Run Templates</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {runbook.monitorRunTemplates.map((template) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={template.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {template.id}
                </p>
                <Callout label="sourceId" value={template.sourceId} />
                <Callout label="rawArtifactPolicy" value={template.rawArtifactPolicy} />
                <Callout label="requiredEvidence" value={template.requiredEvidence.join(", ")} />
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
