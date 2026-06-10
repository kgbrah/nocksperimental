#!/usr/bin/env node
// Send tNOCK (Base Sepolia testnet ERC20, 16 decimals) from the house wallet to a recipient.
// House key is read from disk (never argv/console). Args: <recipient> <amount-in-tNOCK>.
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const TNOCK = "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3";
const DECIMALS = 16;
const recipient = getAddress(process.argv[2] || "0x2069A7ae468D0b0bD4c388eE38ae498e6A80761e");
const amount = parseUnits(process.argv[3] || "10000", DECIMALS);

const KEY = readFileSync(`${homedir()}/.config/nocklab/base-sepolia-deployer.key`, "utf8").trim();
const ALCHEMY = readFileSync(`${homedir()}/.config/nocklab/alchemy-base-sepolia.key`, "utf8").trim();
const RPC = `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY}`;
const erc20 = [
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }
];

const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

const houseBefore = await pc.readContract({ address: TNOCK, abi: erc20, functionName: "balanceOf", args: [account.address] });
const recipBefore = await pc.readContract({ address: TNOCK, abi: erc20, functionName: "balanceOf", args: [recipient] });
console.log(`house ${account.address} tNOCK before: ${formatUnits(houseBefore, DECIMALS)}`);
console.log(`sending ${formatUnits(amount, DECIMALS)} tNOCK -> ${recipient}`);
if (houseBefore < amount) { console.error("insufficient house tNOCK"); process.exit(1); }

const hash = await wc.writeContract({ address: TNOCK, abi: erc20, functionName: "transfer", args: [recipient, amount] });
const rcpt = await pc.waitForTransactionReceipt({ hash });
console.log(`tx: ${hash}  status: ${rcpt.status}`);

const recipAfter = await pc.readContract({ address: TNOCK, abi: erc20, functionName: "balanceOf", args: [recipient] });
console.log(`recipient tNOCK: ${formatUnits(recipBefore, DECIMALS)} -> ${formatUnits(recipAfter, DECIMALS)}`);
