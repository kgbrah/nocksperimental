import { readFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const TNOCK = "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3";
const RPC = "https://sepolia.base.org";
const KEYFILE = "/home/kg/.config/nocklab/base-sepolia-deployer.key";
const lockRoot = process.argv[2];
const amount = BigInt(process.argv[3] || "100000000000000000"); // default 1e17 = 10 tNOCK

if (!/^0x[0-9a-fA-F]{64}$/.test(lockRoot)) { console.error("bad lockRoot"); process.exit(1); }

let k = readFileSync(KEYFILE, "utf8").trim();
if (!k.startsWith("0x")) k = "0x" + k;
const account = privateKeyToAccount(k);

const abi = [{
  type: "function", name: "burn", stateMutability: "nonpayable",
  inputs: [{ name: "amount", type: "uint256" }, { name: "lockRoot", type: "bytes32" }], outputs: []
}];

const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

console.log(`burner=${account.address}`);
console.log(`amount_base=${amount}  lockRoot=${lockRoot}`);
const hash = await wallet.writeContract({ address: TNOCK, abi, functionName: "burn", args: [amount, lockRoot] });
console.log(`BURN_TX=${hash}`);
const rcpt = await pub.waitForTransactionReceipt({ hash, confirmations: 2 });
console.log(`STATUS=${rcpt.status}  block=${rcpt.blockNumber}`);
const head = await pub.getBlockNumber();
console.log(`confirmations=${head - rcpt.blockNumber + 1n}`);
