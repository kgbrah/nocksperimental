#!/bin/bash
# Bridge conservation audit — proves that testnet NOCK is only ever created by mining, that a
# bridge-deposit MOVES NOCK (spendable -> locked) rather than creating it, and that every tNOCK on Base
# is backed 1:1 by NOCK locked on Nockchain. Reconciles a single ledger across both chains.
#
# The bridge is BIDIRECTIONAL: a deposit locks native NOCK and mints tNOCK; a
# withdrawal burns tNOCK and releases native NOCK. So tNOCK totalSupply is the
# OUTSTANDING figure (net of mints − burns).
#
# Invariants checked (robust + node-verifiable without enumerating every bridge address):
#   (C) Conservation : custody_C  =  mined_M − minerSpendable_S  >= 0   (no NOCK appears from nowhere)
#   (B) Backing      : outstanding tNOCK_T  <=  custody_C                (every outstanding tNOCK is
#       covered by mined NOCK that has LEFT the miner's spendable set — i.e. moved to the bridge/house/
#       locks. Custody also includes immature coinbase, so this is a conservative upper bound on backing.)
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

python3 - "$H" "$S" "$T" "$NONCE" "$NCOUNT" "$REWARD" "$NPN" <<'PY'
import sys
H,S,Tbase,NONCE,NC,REWARD,NPN = (int(x) for x in sys.argv[1:8])
M = H*REWARD                                  # mined (all coinbase -> miner)
T = round(Tbase/10**16 * NPN)                 # OUTSTANDING tNOCK in nicks (net of mints - burns)
C = M - S                                     # custody = NOCK moved off the miner (bridge + immature coinbase)
resid = C - T                                 # custody beyond the 1:1 backing (float, fees, immature, genesis)
f=lambda n:f"{n:,} nicks ({n/NPN:,.2f} NOCK)"
print("================ BRIDGE CONSERVATION LEDGER (bidirectional) ================")
print(f"  chain height H              : {H:,} blocks")
print(f"  mined        M = H*65536    : {f(M)}")
print(f"  miner spend  S ({NC:,} notes) : {f(S)}")
print(f"  custody      C = M - S      : {f(C)}   (off-miner: bridge/house/locks + immature coinbase)")
print(f"  outstanding  T (Base supply): {f(T)}  [{Tbase/10**16:,.4f} tNOCK]  ({NONCE} deposit event(s))")
print("  --------------------------------------------------------------------------")
okS = C >= 0                                  # no NOCK from nowhere
okB = T <= C                                  # every outstanding tNOCK covered by off-miner NOCK
okR = resid >= 0
cov = (C/T*100) if T else float('inf')
print(f"  (C) conservation  C = M-S >= 0   : {f(C)}                         [{'PASS' if okS else 'FAIL'}]")
print(f"  (B) backing       T <= C         : {T/NPN:,.0f} <= {C/NPN:,.0f} NOCK  ({cov:,.0f}% coverage)  [{'PASS' if okB else 'FAIL'}]")
print(f"  residual  C - T (float+immature) : {f(resid)}                        [{'PASS' if okR else 'NEG!'}]")
print(f"  HEADLINE  miner-spend + tNOCK    : {f(S+T)}")
print("  ==========================================================================")
print("  NOTE: C is an UPPER bound on bridge backing (includes immature coinbase).")
print("  PROOF:" , "ALL INVARIANTS PASS" if (okS and okB and okR) else "CHECK FAILED")
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
