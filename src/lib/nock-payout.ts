// One-way native NOCK payout helper (e.g. paying casino winners on Nockchain mainnet).
//
// A payout is a UNIDIRECTIONAL transfer — not a swap. A browser cannot drive a local CLI wallet, so this
// produces the exact `nockchain-wallet create-tx` command the operator runs (single OR batched), reusing
// the donation module's exact NICKS math and shell-injection-hardened base58 validation. No counterparty,
// no timelocks, no HTLC — and the operator's signing keys never touch the browser (they sign locally).
//
// (This is deliberately distinct from the atomic-swap HTLC approach in nocktoshi/atomic-nock: a swap is
// bidirectional and exposes both parties to timelock/hash-binding risk; a payout has none of that.)

import {
  buildCreateTxCommand,
  CREATE_TX_NAMES_PLACEHOLDER,
  isPlaceholder,
  isValidNockAddress,
  nicksToNock,
  nockToNicks
} from "@/lib/donation";

export type PayoutRecipient = {
  /** Winner's Nockchain P2PKH base58 address. */
  address: string;
  /** Amount to pay, in NOCK. */
  nock: number | string;
};

const NAMES_RE = /^[\][A-Za-z0-9 _-]+$/;

function assertNames(names: string): void {
  if (!NAMES_RE.test(names)) {
    throw new Error("Invalid --names value (allowed: letters, digits, space, [ ] _ -)");
  }
}

function assertWholeNicks(feeNicks: number | string): string {
  const s = typeof feeNicks === "number" ? String(feeNicks) : feeNicks.trim();
  if (!/^\d+$/.test(s)) throw new Error(`Fee must be a whole number of nicks: ${JSON.stringify(feeNicks)}`);
  return BigInt(s).toString();
}

// Single-recipient payout — reuse the validated donation builder verbatim.
export function buildPayoutCommand(
  recipient: PayoutRecipient,
  feeNicks: number | string = 10,
  names?: string
): string {
  return buildCreateTxCommand({ address: recipient.address, nock: recipient.nock, feeNicks, names });
}

// Batched payout: `nockchain-wallet create-tx` accepts multiple --recipient args, settling many winners
// in one transaction (one fee). Every recipient address is base58-validated (rejecting shell metachars)
// and every amount is coerced through bigint nicks, so only digits reach the command string.
export function buildBatchPayoutCommand(
  recipients: PayoutRecipient[],
  feeNicks: number | string = 10,
  names?: string
): string {
  if (recipients.length === 0) throw new Error("No payout recipients");
  const nm = names && names.trim() ? names.trim() : CREATE_TX_NAMES_PLACEHOLDER;
  assertNames(nm);
  const fee = assertWholeNicks(feeNicks);

  const recipientArgs = recipients.map((r, i) => {
    if (isPlaceholder(r.address) || !isValidNockAddress(r.address)) {
      throw new Error(`Recipient ${i + 1} has a missing/invalid Nockchain address`);
    }
    const amountNicks = nockToNicks(r.nock).toString();
    return `--recipient '{"kind":"p2pkh","address":"${r.address}","amount":${amountNicks}}'`;
  });

  return ["nockchain-wallet create-tx", `--names "${nm}"`, ...recipientArgs, `--fee ${fee}`].join(" ");
}

// Exact total of a payout batch, in NOCK (bigint nicks summed, then formatted losslessly).
export function totalPayoutNock(recipients: PayoutRecipient[]): string {
  let nicks = BigInt(0);
  for (const r of recipients) nicks += nockToNicks(r.nock);
  return nicksToNock(nicks);
}
