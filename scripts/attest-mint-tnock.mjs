#!/usr/bin/env node
// Mint tNOCK to the house via OUR deployed MessageInbox + REAL 3-of-5 operator quorum (the bridge's
// genuine submitDeposit mint path). Keys are read from disk (never argv/console). This attests a deposit
// bundle signed by 3 of our 5 operators; the contract verifies the 3-of-5 + replay, then nock.mint().
import { createWalletClient, createPublicClient, http, encodePacked, keccak256, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const INBOX = "0xA7c373916665e89Aa52Dbd2Ecd36Ba3A45A6e942";
const TNOCK = "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3";
const HOUSE = "0x3906B6B42a008CA6fec05948f4Cf4f374C3d7290";
const OPDIR = `${homedir()}/.config/nocklab/bridge-operators`;
const opKey = (i) => JSON.parse(readFileSync(`${OPDIR}/op${i}.json`, "utf8"))[0].private_key;
const gasKey = readFileSync(`${homedir()}/.config/nocklab/base-sepolia-deployer.key`, "utf8").trim();
const RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

// Tip5 = 5 uint64 each < PRIME (0xffffffff00000001). Distinct, non-zero.
const tip5 = (s) => [s, s + 1n, s + 2n, s + 3n, s + 4n];
const txId = tip5(100001n), nameFirst = tip5(200001n), nameLast = tip5(300001n), asOf = tip5(400001n);
const recipient = HOUSE;
const amount = 20000000000000000000n; // 2000 tNOCK (16 decimals) — funds a 1000-tNOCK bankroll + margin
const blockHeight = 1n;
const depositNonce = 1n;

const tip5Type = { type: "tuple", components: [{ name: "limbs", type: "uint64[5]" }] };
const submitAbi = [{
  type: "function", name: "submitDeposit", stateMutability: "nonpayable",
  inputs: [
    { name: "txId", ...tip5Type }, { name: "nameFirst", ...tip5Type }, { name: "nameLast", ...tip5Type },
    { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "blockHeight", type: "uint256" },
    { name: "asOf", ...tip5Type }, { name: "depositNonce", type: "uint256" }, { name: "ethSigs", type: "bytes[]" }
  ], outputs: []
}];
const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }
];

// messageHash matches the contract's _computeDepositHash (abi.encodePacked of the limbs + fields, in order).
const messageHash = keccak256(encodePacked(
  ["uint64", "uint64", "uint64", "uint64", "uint64",
    "uint64", "uint64", "uint64", "uint64", "uint64",
    "uint64", "uint64", "uint64", "uint64", "uint64",
    "address", "uint256", "uint256",
    "uint64", "uint64", "uint64", "uint64", "uint64",
    "uint256"],
  [...txId, ...nameFirst, ...nameLast, recipient, amount, blockHeight, ...asOf, depositNonce]
));

const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

const before = await pc.readContract({ address: TNOCK, abi: erc20, functionName: "balanceOf", args: [HOUSE] });
console.log(`house tNOCK before: ${formatUnits(before, 16)} tNOCK`);

// 3 operator signatures over the EIP-191 personal_sign of the raw messageHash.
const sigs = [];
for (const i of [0, 1, 2]) {
  const acct = privateKeyToAccount(opKey(i));
  sigs.push(await acct.signMessage({ message: { raw: messageHash } }));
  console.log(`signed by operator ${i}: ${acct.address}`);
}

const wallet = createWalletClient({ account: privateKeyToAccount(gasKey), chain: baseSepolia, transport: http(RPC) });
const hash = await wallet.writeContract({
  address: INBOX, abi: submitAbi, functionName: "submitDeposit",
  args: [{ limbs: txId }, { limbs: nameFirst }, { limbs: nameLast }, recipient, amount, blockHeight, { limbs: asOf }, depositNonce, sigs]
});
console.log(`submitDeposit tx: ${hash}`);
const rcpt = await pc.waitForTransactionReceipt({ hash });
console.log(`status: ${rcpt.status}`);
if (rcpt.status !== "success") {
  console.error("submitDeposit reverted on-chain — no tNOCK minted");
  process.exit(1);
}

const after = await pc.readContract({ address: TNOCK, abi: erc20, functionName: "balanceOf", args: [HOUSE] });
console.log(`house tNOCK after:  ${formatUnits(after, 16)} tNOCK  (minted ${formatUnits(after - before, 16)})`);
