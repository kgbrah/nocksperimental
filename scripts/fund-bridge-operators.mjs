#!/usr/bin/env node
// Fund the 5 bridge operator ETH addresses with a little Base Sepolia ETH so the rotating
// proposer can pay gas for submitDeposit. Deployer key is read from disk (never argv/console).
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const KEY = readFileSync(`${homedir()}/.config/nocklab/base-sepolia-deployer.key`, "utf8").trim();
const ALCHEMY = readFileSync(`${homedir()}/.config/nocklab/alchemy-base-sepolia.key`, "utf8").trim();
const RPC = `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY}`;
const OPERATORS = [
  "0x00F0e3658BEF0Fc79Cd185ceD5C55230440A7Fdc",
  "0xfeCe7cf0C93114784A421a27adCbc6b03df858eB",
  "0x507Ea8bD7170e8d447604f737e562A0328c9D337",
  "0xA2e826F5c06C688aeFD8e58afE34F395D211bD09",
  "0x318B11A5Da81Fd170343adF9Cc304c9Bd372D5c2",
];
const AMOUNT = parseEther("0.008");

const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
console.log(`funding from ${account.address}, balance ${formatEther(await pc.getBalance({ address: account.address }))} ETH`);

for (const op of OPERATORS) {
  const before = await pc.getBalance({ address: op });
  if (before >= AMOUNT) { console.log(`${op} already has ${formatEther(before)} ETH — skip`); continue; }
  const hash = await wc.sendTransaction({ to: op, value: AMOUNT });
  const rcpt = await pc.waitForTransactionReceipt({ hash });
  console.log(`${op} <- 0.008 ETH  tx=${hash} status=${rcpt.status}`);
}
console.log("done. operator balances now:");
for (const op of OPERATORS) console.log(`  ${op}: ${formatEther(await pc.getBalance({ address: op }))} ETH`);
