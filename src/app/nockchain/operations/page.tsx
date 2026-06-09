import {
  AlertTriangle,
  ArrowLeft,
  Code2,
  Database,
  GitBranch,
  ListChecks,
  Network,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainOperationsAtlas } from "@/lib/nockchain-operations-atlas";

export const dynamic = "force-dynamic";

const priorityScenarioIds = [
  "wrong-block-commitment",
  "empty-routing-table",
  "no-connected-peers",
  "behind-tip-gossip-suppression"
];
const priorityScriptPaths = [
  "scripts/run_nockchain_node_fakenet.sh",
  "scripts/run_nockchain_miner_fakenet.sh"
];

export default function NockchainOperationsPage() {
  const atlas = createNockchainOperationsAtlas();
  const priorityScenarios = priorityScenarioIds
    .map((id) => atlas.triageScenarios.find((scenario) => scenario.id === id))
    .filter((scenario): scenario is NonNullable<typeof scenario> => Boolean(scenario));
  const remainingScenarios = atlas.triageScenarios.filter(
    (scenario) => !priorityScenarioIds.includes(scenario.id)
  );
  const orderedScripts = atlas.scriptSources
    .filter((script) => priorityScriptPaths.includes(script.path))
    .concat(atlas.scriptSources.filter((script) => !priorityScriptPaths.includes(script.path)));

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
                Fakenet and mining runbook
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Operations</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Upstream-script-backed triage for fakenet nodes, miners, empty
                routing tables, no peers, wrong block commitments, behind-tip gossip
                suppression, wallet checks, and PMA/state-jam provenance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/operations" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Operations API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/fakenet/diagnostics" target="_blank" rel="noreferrer"
              >
                <Network size={16} aria-hidden="true" />
                Diagnostics
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/fakenet/runbook.sh" target="_blank" rel="noreferrer"
              >
                <Terminal size={16} aria-hidden="true" />
                Runbook
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Build" value={atlas.upstream.commit.shortSha} />
        <Metric label="Scripts" value={atlas.scriptSources.length.toString()} />
        <Metric label="Scenarios" value={atlas.triageScenarios.length.toString()} />
        <Metric label="Release" value={atlas.upstream.release.tag.slice(0, 18)} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Upstream Script Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedScripts.map((script) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={script.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {script.id}
                </p>
                <h3 className="mt-1 font-semibold">{script.path}</h3>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
                  {script.command}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{script.operationalUse}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Priority Triage</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityScenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Checklist</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.operatorChecklist.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">State Artifact Safety</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="posture" value={atlas.stateArtifactSafety.posture} />
            <Callout label="doNotStore" value={atlas.stateArtifactSafety.doNotStore.join(", ")} />
            <Callout label="metadataToTrack" value={atlas.stateArtifactSafety.metadataToTrack.join(", ")} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Network size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Scenarios</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingScenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Links</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="localDiagnostics" value={atlas.links.localDiagnostics} />
            <Callout label="fakenetRunbook" value={atlas.links.fakenetRunbook} />
            <Callout label="stateJams" value={atlas.links.stateJams} />
            <Callout label="rustAtlas" value={atlas.links.rustAtlas} />
            <Callout label="release" value={atlas.links.release} />
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

function ScenarioCard({
  scenario
}: {
  scenario: ReturnType<typeof createNockchainOperationsAtlas>["triageScenarios"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{scenario.id}</p>
      <h3 className="mt-1 font-semibold">{scenario.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{scenario.interpretation}</p>
      <Callout label="symptom" value={scenario.symptom} />
      <Callout label="upstreamSignal" value={scenario.upstreamSignal} />
      <Callout label="relatedCrates" value={scenario.relatedCrates.join(", ")} />
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
