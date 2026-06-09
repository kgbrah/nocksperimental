import {
  AlertTriangle,
  ArrowLeft,
  Code2,
  KeyRound,
  ListChecks,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { createNockchainWalletAtlas } from "@/lib/nockchain-wallet-atlas";

export const dynamic = "force-dynamic";

const priorityCommandIds = ["show-balance", "list-notes", "list-notes-by-address", "watch-address"];
const priorityScenarioIds = [
  "balance-unknown",
  "watch-only-missing",
  "private-grpc-unreachable",
  "public-api-exposure-risk"
];
const secretSafetyAnchors = ["seed phrases", "private keys", "keys.export"];
const blockExplorerCacheSurfaceId = "block-explorer-cache";
const transactionAcceptanceSurfaceId = "transaction-acceptance";
const publicApiMetricAnchor = "nockchain_public_grpc.*";
const transactionAcceptanceCaveat = "accepted does not prove block inclusion";
const transactionSourceAnchorPaths = [
  "crates/wallet-tx-builder/src/planner.rs",
  "crates/nockchain-wallet/src/create_tx.rs"
];
const transactionSourceReceiptAnchors = [
  "walletTransactionSourceCommit",
  "feeBreakdown",
  "wordCountBreakdown",
  "lockResolutionSource"
];
const transactionSourcePrAnchors = ["memo", "blob", "open-pr-early-warning"];
const transactionSourceForbiddenAnchors = ["rawUnsignedTx", "rawTransactionJam"];
const transactionSourceDriftCheck = "npm run test:nockchain-upstream-drift-check";

export default function NockchainWalletPage() {
  const atlas = createNockchainWalletAtlas();
  const priorityCommands = priorityCommandIds
    .map((id) => atlas.walletCommands.find((command) => command.id === id))
    .filter((command): command is NonNullable<typeof command> => Boolean(command));
  const remainingCommands = atlas.walletCommands.filter(
    (command) => !priorityCommandIds.includes(command.id)
  );
  const priorityScenarios = priorityScenarioIds
    .map((id) => atlas.triageScenarios.find((scenario) => scenario.id === id))
    .filter((scenario): scenario is NonNullable<typeof scenario> => Boolean(scenario));
  const remainingScenarios = atlas.triageScenarios.filter(
    (scenario) => !priorityScenarioIds.includes(scenario.id)
  );
  const publicApiSurfaces = [
    blockExplorerCacheSurfaceId,
    transactionAcceptanceSurfaceId,
    "observability"
  ]
    .map((id) => atlas.publicApiEvidenceContract.surfaces.find((surface) => surface.id === id))
    .filter((surface): surface is NonNullable<typeof surface> => Boolean(surface));
  const transactionSourceAnchors = transactionSourceAnchorPaths
    .map((sourcePath) =>
      atlas.walletTransactionSourceContract.sourceAnchors.find((anchor) => anchor.path === sourcePath)
    )
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor));
  const transactionSourcePrSignal = atlas.walletTransactionSourceContract.openPrSignals.find(
    (signal) => signal.id === "wallet-memo-blob-pr-116"
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
                Wallet and API evidence
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Wallet</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Wallet command, endpoint mode, fakenet balance, watch-only,
                public API exposure, and key-material safety context for
                Nocksperimental receipts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/wallet" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Wallet API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/fakenet/commands" target="_blank" rel="noreferrer"
              >
                <Wallet size={16} aria-hidden="true" />
                Fakenet Commands
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Build" value={atlas.upstream.commit.shortSha} />
        <Metric label="Commands" value={atlas.walletCommands.length.toString()} />
        <Metric label="Endpoint Modes" value={atlas.endpointModes.length.toString()} />
        <Metric label="Unit" value={atlas.balanceEvidenceContract.preferredUnits} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Wallet size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Balance Commands</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityCommands.map((command) => (
              <CommandCard command={command} key={command.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Wallet Triage</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityScenarios.map((scenario) => (
              <ScenarioCard scenario={scenario} key={scenario.id} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Endpoint Modes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.endpointModes.map((mode) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={mode.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {mode.id}
                </p>
                <h3 className="mt-1 font-semibold">{mode.label}</h3>
                <Callout label="endpoint" value={mode.endpoint} />
                <Callout label="commandPattern" value={mode.commandPattern} />
                <Callout label="risk" value={mode.riskNotes.join(", ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Balance Evidence Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="walletAddress" value={atlas.localFakenetProfile.walletAddress} />
            <Callout label="endpoint" value={atlas.localFakenetProfile.endpoint} />
            <Callout label="conversion" value={atlas.balanceEvidenceContract.conversion} />
            <Callout label="requiredFields" value={atlas.balanceEvidenceContract.requiredFields.join(", ")} />
            <Callout label="receiptRule" value={atlas.balanceEvidenceContract.receiptRule} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#E7F7FF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Public API Evidence Contract</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#22313A]">
            Public API evidence is useful, but transaction acceptance, explorer cache
            responses, cache warm-up, metrics, and reorg windows must be recorded
            before treating a response as comparable test evidence.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout label="sourceDoc" value={atlas.publicApiEvidenceContract.sourceDoc} />
            <Callout label="services" value={atlas.publicApiEvidenceContract.services.join(", ")} />
            <Callout label="metric" value={publicApiMetricAnchor} />
            <Callout label="txCaveat" value={transactionAcceptanceCaveat} />
            <Callout
              label="requiredFields"
              value={atlas.publicApiEvidenceContract.requiredReceiptFields.join(", ")}
            />
            <Callout
              label="rules"
              value={atlas.publicApiEvidenceContract.interpretationRules.join(", ")}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {publicApiSurfaces.map((surface) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={surface.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {surface.id}
                </p>
                <h3 className="mt-1 font-semibold">{surface.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {surface.evidenceMeaning}
                </p>
                <Callout
                  label="endpoints"
                  value={"endpoints" in surface ? surface.endpoints?.join(", ") ?? "none" : "none"}
                />
                <Callout
                  label="limits"
                  value={"limits" in surface ? surface.limits?.join(", ") ?? "none" : "none"}
                />
                <Callout
                  label="observability"
                  value={
                    "observability" in surface
                      ? surface.observability?.join(", ") ?? "none"
                      : "none"
                  }
                />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#F2F6E8] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Transaction Source Contract</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#26311E]">
            Transaction construction evidence cites current released wallet Rust
            source from wallet-tx-builder and nockchain-wallet. Receipts should
            keep planner metadata and source hashes, not raw transaction files.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout
              label="release"
              value={`${atlas.walletTransactionSourceContract.releaseBuild} (${atlas.walletTransactionSourceContract.releaseCommit})`}
            />
            <Callout
              label="sourceAuthority"
              value={atlas.walletTransactionSourceContract.sourceAuthority}
            />
            <Callout
              label="crateSurfaces"
              value={atlas.walletTransactionSourceContract.crateSurfaces.join(", ")}
            />
            <Callout
              label="verification"
              value={[
                transactionSourceDriftCheck,
                ...atlas.walletTransactionSourceContract.verificationCommands
              ].join(", ")}
            />
            <Callout
              label="receiptFields"
              value={[
                ...transactionSourceReceiptAnchors,
                ...atlas.walletTransactionSourceContract.receiptFields
              ].join(", ")}
            />
            <Callout
              label="forbiddenFields"
              value={[
                ...transactionSourceForbiddenAnchors,
                ...atlas.walletTransactionSourceContract.forbiddenFields
              ].join(", ")}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {transactionSourceAnchors.map((anchor) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={anchor.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {anchor.crate}
                </p>
                <h3 className="mt-1 break-all font-semibold">{anchor.path}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.evidenceUse}</p>
                <Callout label="sha256" value={anchor.sha256} />
                <Callout label="symbols" value={anchor.lineAnchors.join(", ")} />
              </div>
            ))}
          </div>
          {transactionSourcePrSignal ? (
            <div className="mt-4 border border-[#0B0B0B] bg-white p-3">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                {transactionSourcePrSignal.sourceAuthority}
              </p>
              <h3 className="mt-1 font-semibold">{transactionSourcePrSignal.title}</h3>
              <Callout
                label="signals"
                value={[...transactionSourcePrAnchors, ...transactionSourcePrSignal.signals].join(", ")}
              />
              <Callout label="interpretation" value={transactionSourcePrSignal.interpretation} />
            </div>
          ) : null}
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <KeyRound size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Local Fakenet Profile</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="localWrapper" value={atlas.localFakenetProfile.commands.join(", ")} />
            <Callout
              label="upstreamEquivalents"
              value={atlas.localFakenetProfile.upstreamEquivalentCommands.join(", ")}
            />
            <Callout label="evidenceUse" value={atlas.localFakenetProfile.evidenceUse} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Safety Boundary</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="secretAnchors" value={secretSafetyAnchors.join(", ")} />
            <Callout label="doNotStore" value={atlas.safety.doNotStore.join(", ")} />
            <Callout label="safeWithHashing" value={atlas.safety.safeToStoreWithHashing.join(", ")} />
            <Callout label="publicApiWarnings" value={atlas.safety.publicApiWarnings.join(", ")} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Wallet size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Commands</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingCommands.map((command) => (
              <CommandCard command={command} key={command.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Scenarios</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingScenarios.map((scenario) => (
              <ScenarioCard scenario={scenario} key={scenario.id} />
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

function CommandCard({
  command
}: {
  command: ReturnType<typeof createNockchainWalletAtlas>["walletCommands"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{command.id}</p>
      <h3 className="mt-1 font-semibold">{command.command}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{command.description}</p>
      <Callout label="evidenceUse" value={command.evidenceUse} />
      <Callout label="risk" value={command.risk} />
    </div>
  );
}

function ScenarioCard({
  scenario
}: {
  scenario: ReturnType<typeof createNockchainWalletAtlas>["triageScenarios"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{scenario.id}</p>
      <h3 className="mt-1 font-semibold">{scenario.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{scenario.interpretation}</p>
      <Callout label="symptom" value={scenario.symptom} />
      <Callout label="checks" value={scenario.checks.join(", ")} />
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
