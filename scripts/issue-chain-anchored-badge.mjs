#!/usr/bin/env node
// Issue a CHAIN-ANCHORED trust cert over a REAL on-chain transaction. Unlike a
// lab-report cert, the evidence here is the chain itself: the signed payload binds
// a ChainAnchor (block + tx + log), and /api/receipts/verify-chain independently
// re-reads the chain to confirm it. Fail-closed signing (prod seed required).
//
//   NOCKS_BADGE_ISSUER_SIGNING_SEED=<secret> NOCKS_BADGE_ISSUER_KEY_ID=<active> \
//     node scripts/issue-chain-anchored-badge.mjs
//
// Anchored to a real Base Sepolia bridge-redeem burn from this project's history.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const REPO = process.cwd();
const { loadTS } = createTsLoader(REPO);
const fail = (m) => {
  process.stderr.write(`issue-chain-anchored: REFUSED — ${m}\n`);
  process.exit(1);
};

const crypto = loadTS("src/lib/trust-badge-crypto.ts");
const anchorLib = loadTS("src/lib/chain-anchor.ts");

const keyId = crypto.resolveActiveIssuerKeyId();
if (crypto.isDevIssuerKey(keyId) && process.env.NOCKS_ALLOW_DEV_SIGNING !== "1") {
  fail(`active signing key (${keyId}) is a public demo key — set NOCKS_BADGE_ISSUER_SIGNING_SEED + NOCKS_BADGE_ISSUER_KEY_ID`);
}
const seed = crypto.badgeIssuerSigningSeed(keyId); // throws fail-closed without a seed/opt-in

// Real Base Sepolia bridge-redeem burn (BurnForWithdrawal on the tNOCK token),
// fetched on-chain: block 42,649,893, log #57. The verifier re-confirms all of it.
const anchor = anchorLib.buildBaseAnchor({
  network: "base-sepolia",
  chainId: 84532,
  blockHash: "0xd298e7b90529076275f55f00d78548f703c7c2a91700153d7fafedbc5e284ebc",
  blockNumber: 42649893,
  txHash: "0xf14397f1ae042cd2f5930534d3ddcc93d0b92ada4edf3efc9b18c3ed19867a89",
  contract: "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3",
  eventTopic: "0x934d4a16140d0cf22c85c70dc423d2030b3473b02e5c37c5edc50c09a8fb2d8c",
  logIndex: 57,
});
if (!anchorLib.isWellFormedAnchor(anchor)) fail("built anchor is not well-formed");

const badgeId = "badge-chain-anchored-base-redeem-001";
const reportSlug = "chain-anchored-base-redeem";
// The chain anchor IS the evidence: bind the cert to the exact anchor (reportHash)
// and to a real chain commitment (snapshotRoot = the block hash).
const reportHash = "sha256:" + createHash("sha256").update(anchorLib.canonicalAnchor(anchor)).digest("hex");
const snapshotRoot = anchor.blockHash;
const now = "2026-06-11T00:00:00.000Z";
const expires = "2027-06-11T00:00:00.000Z";
const sourceAnchor = { commit: "chain-anchored", build: "chain-anchor-v0" };

const signedPayload = {
  badgeId,
  status: "verified",
  reportHash,
  snapshotRoot,
  issuedAt: now,
  expiresAt: expires,
  sourceAnchor,
  kind: "chain-anchored",
  chainAnchor: anchor,
};
const signed = crypto.signBadgePayload(signedPayload, seed);

const badge = {
  id: badgeId,
  label: "Base bridge-redeem — chain-anchored",
  kind: "chain-anchored",
  status: "verified",
  reportSlug,
  fixtureId: "chain-anchored-base-redeem-v0",
  issuedAt: now,
  expiresAt: expires,
  issuer: "Nocksperimental Trust Registry",
  evidence: { reportHash, snapshotRoot, signature: signed.signature, invariantPacks: [], chainAnchor: anchor },
  sourceAnchor,
};
const issuance = {
  id: `issue-${badgeId}`,
  badgeId,
  issuedAt: now,
  issuer: "Nocksperimental Trust Registry",
  issuerKeyId: keyId,
  payloadDigest: signed.payloadDigest,
  signature: signed.signature,
  signedPayload,
  verification: { status: "valid", algorithm: signed.algorithm, checkedAt: now },
};

// Merge into the committed registry (idempotent on id).
const dsPath = path.join(REPO, "src/data/trust-signals.json");
const ds = JSON.parse(readFileSync(dsPath, "utf8"));
if (!ds.verifiedBadges.some((b) => b.id === badge.id)) ds.verifiedBadges.push(badge);
else ds.verifiedBadges = ds.verifiedBadges.map((b) => (b.id === badge.id ? badge : b));
if (!ds.badgeIssuanceReceipts.some((r) => r.id === issuance.id)) ds.badgeIssuanceReceipts.push(issuance);
else ds.badgeIssuanceReceipts = ds.badgeIssuanceReceipts.map((r) => (r.id === issuance.id ? issuance : r));
writeFileSync(dsPath, JSON.stringify(ds, null, 2) + "\n");

process.stderr.write(
  `issue-chain-anchored: ISSUED ${badgeId} (key=${keyId}); anchored to Base Sepolia tx ${anchor.txId.slice(0, 12)}… block ${anchor.blockHeight}\n`
);
process.stdout.write(JSON.stringify({ issued: true, badgeId, anchor, payloadDigest: signed.payloadDigest }, null, 2) + "\n");
