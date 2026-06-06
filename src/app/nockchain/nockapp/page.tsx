import {
  ArrowLeft,
  Code2,
  Database,
  Fingerprint,
  GitBranch,
  Layers3,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainNockAppAtlas } from "@/lib/nockchain-nockapp-atlas";

export const dynamic = "force-dynamic";

const primaryBoundaryOrder = [
  "poke-effects",
  "peek-reads",
  "pma-durability",
  "grpc-private-endpoint",
  "nockup-fixture"
] as const;
const primaryProbeOrder = [
  "poke-roundtrip",
  "peek-state-read",
  "nockup-build-run",
  "state-export-snapshot"
] as const;
const highlightedForbiddenFields = ["rawPmaSlab", "walletSeedPhrase"] as const;
const highlightedForbiddenFieldSet = new Set<string>(highlightedForbiddenFields);

export default function NockchainNockAppPage() {
  const atlas = createNockchainNockAppAtlas();
  const orderedBoundaries = primaryBoundaryOrder
    .map((id) => atlas.runtimeBoundaries.find((boundary) => boundary.id === id))
    .filter((boundary): boundary is NonNullable<typeof boundary> => Boolean(boundary));
  const orderedProbeTemplates = primaryProbeOrder
    .map((id) => atlas.probeTemplates.find((template) => template.id === id))
    .filter((template): template is NonNullable<typeof template> => Boolean(template));
  const orderedForbiddenFields: readonly string[] = [
    ...highlightedForbiddenFields.filter((field) => atlas.safety.neverStore.includes(field)),
    ...atlas.safety.neverStore.filter((field) => !highlightedForbiddenFieldSet.has(field))
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
                Runtime evidence boundary
              </p>
              <h1 className="mt-2 text-4xl font-semibold">NockApp Runtime Atlas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A receipt-safe map for NockApp poke, peek, state, persistence,
                gRPC, and Nockup fixture evidence. Current claims stay anchored to
                nockchain/nockchain while Zorp lineage explains vocabulary and
                historical runtime context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/nockapp-atlas"
              >
                <Code2 size={16} aria-hidden="true" />
                NockApp API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/zorp"
              >
                <GitBranch size={16} aria-hidden="true" />
                Zorp lineage
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Runtime Boundaries" value={atlas.runtimeBoundaries.length.toString()} />
        <Metric label="Probe Templates" value={atlas.probeTemplates.length.toString()} />
        <Metric label="Commit" value={atlas.upstream.commit.shortSha} />
        <Metric label="Forbidden Fields" value={atlas.receiptContract.forbiddenFields.length.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Authority</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <AuthorityCard
              label="canonical"
              role={atlas.sourceAuthority.canonical.sourceRole}
              value={atlas.sourceAuthority.canonical.interpretation}
              sources={atlas.sourceAuthority.canonical.sources}
            />
            <AuthorityCard
              label="Zorp lineage"
              role={atlas.sourceAuthority.lineage.sourceRole}
              value={atlas.sourceAuthority.lineage.interpretation}
              sources={atlas.sourceAuthority.lineage.sources}
            />
            <AuthorityCard
              label="state"
              role={atlas.sourceAuthority.stateArtifacts.sourceRole}
              value={atlas.sourceAuthority.stateArtifacts.interpretation}
              sources={atlas.sourceAuthority.stateArtifacts.sources}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Runtime Boundaries</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedBoundaries.map((boundary) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={boundary.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {boundary.id}
                </p>
                <h3 className="mt-1 font-semibold">{boundary.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{boundary.role}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {boundary.nocksperimentalUse}
                </p>
                <Callout label="receiptFields" value={boundary.receiptFields.join(", ")} />
                <Callout label="riskPosture" value={boundary.riskPosture} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout
              label="required"
              value={atlas.receiptContract.requiredFields.join(", ")}
            />
            <Callout
              label="optional"
              value={atlas.receiptContract.optionalFields.join(", ")}
            />
            <Callout
              label="forbidden"
              value={atlas.receiptContract.forbiddenFields.join(", ")}
            />
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.receiptContract.interpretationRules.map((rule) => (
              <Callout key={rule} label="rule" value={rule} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Probe Templates</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedProbeTemplates.map((template) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={template.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {template.id}
                </p>
                <h3 className="mt-1 font-semibold">{template.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{template.intent}</p>
                <Callout label="requiredEvidence" value={template.requiredEvidence.join(", ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Safety Boundary</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{atlas.safety.operatorPosture}</p>
          <div className="mt-4 grid gap-3">
            {orderedForbiddenFields.map((field) => (
              <Callout key={field} label="neverStore" value={field} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Next Uses</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.nocksperimentalNextUses.map((nextUse) => (
              <Callout key={nextUse} label="next" value={nextUse} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Fingerprint size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Links</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="upstream" value={atlas.links.upstream} />
            <Callout label="rustAtlas" value={atlas.links.rustAtlas} />
            <Callout label="stateJams" value={atlas.links.stateJams} />
            <Callout label="nockupReceipts" value={atlas.links.nockupReceipts} />
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

function AuthorityCard({
  label,
  role,
  value,
  sources
}: {
  label: string;
  role: string;
  value: string;
  sources: readonly string[];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</p>
      <h3 className="mt-1 break-all font-mono text-sm font-semibold">{role}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{value}</p>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">
        {sources.join(", ")}
      </p>
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
