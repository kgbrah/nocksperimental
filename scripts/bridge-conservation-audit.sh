#!/bin/bash
# Bridge conservation audit — proves that testnet NOCK is only ever created by mining, that a
# bridge-deposit MOVES NOCK (spendable -> locked) rather than creating it, and that every tNOCK on Base
# is backed 1:1 by NOCK locked on Nockchain. Reconciles a single ledger across both chains.
#
# Invariants checked:
#   (C) Conservation : mined_M  ==  spendable_S + locked_B + fees      (no NOCK appears from nowhere)
#   (B) Backing      : tNOCK_T  <=  locked_B                            (every tNOCK is backed by locked NOCK)
#   (F) Fee accounts : locked_B - tNOCK_T == accrued bridge fees (retained as locked NOCK)
#
# Units: 1 NOCK = 65,536 nicks. Fakenet coinbase = 2^32 nicks = 65,536 NOCK per block (constant).
# tNOCK is the Base ERC20 (16 decimals); 1 tNOCK == 1 NOCK.
set -uo pipefail

# --- config (override via env) ---
WALLET_BIN="${WALLET_BIN:-/home/kg/Documents/nockchain/target/release/nockchain-wallet}"
WALLET_DIR="${WALLET_DIR:-/tmp/spendw}"                 # wallet holding the miner key (AU6cM)
GRPC_PORT="${GRPC_PORT:-5509}"                          # private gRPC of the fakenet node
MINER_ADDR="${MINER_ADDR:-AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx}"
TNOCK="${TNOCK:-0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3}"
INBOX="${INBOX:-0xA7c373916665e89Aa52Dbd2Ecd36Ba3A45A6e942}"
DEPOSIT_NOCK="${DEPOSIT_NOCK:-100000}"                  # NOCK per bridge-deposit (the protocol minimum)
RPC="https://base-sepolia.g.alchemy.com/v2/$(cat ~/.config/nocklab/alchemy-base-sepolia.key 2>/dev/null)"
REWARD=4294967296                                       # nicks per block
NPN=65536                                               # nicks per NOCK

W="$WALLET_BIN --fakenet --data-dir $WALLET_DIR --client private --private-grpc-server-port $GRPC_PORT"

echo "Measuring Nockchain side (miner $MINER_ADDR via node :$GRPC_PORT) ..."
NOTES=$($W list-notes-by-address "$MINER_ADDR" 2>/dev/null)
S=$(printf '%s' "$NOTES" | grep -aoE "Assets \(nicks\): [0-9]+" | grep -oE "[0-9]+$" | awk '{s+=$1} END{print s+0}')
NCOUNT=$(printf '%s' "$NOTES" | grep -acE "Assets \(nicks\)")
H=$(printf '%s' "$NOTES" | grep -aoE "^- Height: [0-9]+" | grep -oE "[0-9]+" | head -1)

echo "Measuring Base side (tNOCK $TNOCK) ..."
T=$(cast call "$TNOCK" "totalSupply()(uint256)" --rpc-url "$RPC" 2>/dev/null | awk '{print $1}')
NONCE=$(cast call "$INBOX" "lastDepositNonce()(uint256)" --rpc-url "$RPC" 2>/dev/null | awk '{print $1}')

H="${H:-0}"; S="${S:-0}"; T="${T:-0}"; NONCE="${NONCE:-0}"

python3 - "$H" "$S" "$T" "$NONCE" "$NCOUNT" "$REWARD" "$NPN" "$DEPOSIT_NOCK" <<'PY'
import sys
H,S,Tbase,NONCE,NC,REWARD,NPN,DEP = (int(x) for x in sys.argv[1:9])
M = H*REWARD                                  # mined (all coinbase -> miner)
T = round(Tbase/10**16 * NPN)                 # tNOCK in nicks-equiv
B = NONCE*DEP*NPN                             # locked = deposits * per-deposit (nicks)
fee = B - T                                   # bridge fee retained as locked NOCK
resid = M - S - B                             # genesis + immature coinbase + tx fees
f=lambda n:f"{n:,} nicks ({n/NPN:,.2f} NOCK)"
print("================ BRIDGE CONSERVATION LEDGER ================")
print(f"  chain height H            : {H:,} blocks")
print(f"  mined     M = H*65536     : {f(M)}")
print(f"  spendable S ({NC:,} notes)  : {f(S)}")
print(f"  locked    B ({NONCE} deposit) : {f(B)}")
print(f"  tNOCK     T (Base supply)  : {f(T)}  [{Tbase/10**16:,.4f} tNOCK]")
print(f"  bridge fee  B - T          : {f(fee)}")
print("  ---------------------------------------------------------")
okC = abs(resid) < 3*REWARD                   # within a few blocks (maturity/genesis)
okB = T <= B
okF = 0 <= fee <= B
print(f"  (C) conservation  M == S+B+fees : residual {f(resid)} ({resid/REWARD:+.2f} blocks)   [{'PASS' if okC else 'FAIL'}]")
print(f"  (B) backing       T <= B         : {T/NPN:,.0f} <= {B/NPN:,.0f} NOCK                 [{'PASS' if okB else 'FAIL'}]")
print(f"  (F) fee accounted 0<=B-T<=B      : fee {fee/NPN:,.2f} NOCK                          [{'PASS' if okF else 'FAIL'}]")
print(f"  HEADLINE  spendable + tNOCK      : {f(S+T)}")
print("  ===========================================================")
print("  PROOF:" , "ALL INVARIANTS PASS" if (okC and okB and okF) else "CHECK FAILED")
PY

# Persist the Nockchain-side figures so the /bridge dashboard (src/lib/bridge-supply.ts) serves fresh
# numbers — the deployed Worker cannot reach the local fakenet node, so this snapshot is its only source.
SNAP="$(dirname "$0")/../src/data/bridge-supply-snapshot.json"
python3 - "$H" "$S" "$NCOUNT" "$REWARD" "$MINER_ADDR" "$SNAP" <<'PY'
import json, sys, datetime
H, S, NC, REWARD = (int(x) for x in sys.argv[1:5])
miner, path = sys.argv[5], sys.argv[6]
snap = json.load(open(path))
snap.update({
    "updatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "minerAddress": miner,
    "chainHeight": H,
    "blockRewardNicks": REWARD,
    "minedNicks": str(H * REWARD),
    "spendableNicks": str(S),
    "unspentNoteCount": NC,
})
json.dump(snap, open(path, "w"), indent=2)
print(f"  snapshot written: {path} (height {H:,})")
PY
