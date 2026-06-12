# Nock tx-inclusion proofs — Phase 2 design + correctness validation

Status: **DEPLOYED & live-validated on the casino-fresh testnet node (2026-06-12).**
`GetTransactionProof` serves kernel-self-verified inclusion proofs over gRPC.
Part of the chain-verifiable receipts plan (`.claude/plans/golden-nibbling-lampson.md`).

## Deployment result (Phase 2 complete)

Built (`hoonc` → `assets/dumb.jam` → `cargo build --release -p nockchain`, 0 errors),
staged-swapped onto `nock-testnet-node.service` (old binary kept as
`target/release/nockchain.rollback-known-good`, old kernel as
`assets/dumb.jam.rollback-known-good`). Post-swap, all live smoke tests passed:

- **Real tx in real block** (`ABWoU93…` in block `7FgdDFN5…`, height 10234, 1 tx) →
  a self-verified proof: `axis=2`, `pathLen=1`, `proof.root` = the canonical tx-root
  (single-tx block: the tx leaf is the root's left child, sibling = the `[L R]` subtree).
- **tx not in that block** → `notInBlock`.
- **nonexistent block** → `NotFound`.
- Mining resumed (`Found block!`, height advanced 10419→10420); orchestrator settlement/
  bridge/AMM-keeper/tunnel all healthy, treasury above floor; `GetTransactionBlock` and
  other existing RPCs intact (cache re-warmed on boot).

### Orchestrator integration (step 5) — DONE & LIVE

`services/orchestrator/src/nock-anchor.mjs` + `GET /round/:id/anchor`: given a
settled round's `claim_tx_id`/`refund_tx_id`, it resolves the block
(`GetTransactionBlock`), asks the kernel for the self-verified proof
(`GetTransactionProof`), and returns a re-derivable anchor with all digests in
base58 (`network`, `verifiability: nock-inclusion-node-attested`, `blockId`,
`height`, `txId`, `txRoot`, `axis`, `merkleProof{root,path}`, `engineVersion`).
The anchor is **served on demand, not frozen into the append-only receipt** (the
proof is deterministic from the chain, and the just-settled block may not be in
the explorer cache yet). Belt→base58 matches the node's Rust `Hash::to_base58`
(base-p LE int → BE bytes → bs58), pinned by `scripts/test-nock-anchor.mjs`.

Live-verified: real settled %fair round `f10599a0…` → anchor `{height 7889,
blockId D9bVXPt8…, axis 2, path[1]}`, reachable through the Cloudflare tunnel
(`https://orch.nocksperimental.com/round/:id/anchor`) so the hosted Worker can
consume it. Existing orchestrator endpoints (treasury/bridge) intact; service
healthy after restart.

Remaining: **Phase 3** — nocksperimental frontend consumes `/round/:id/anchor`
and shows it as chain-verifiable evidence; then a WASM Tip5 verifier so a client
re-checks the proof without trusting the node (upgrading the label from
`nock-inclusion-node-attested` to fully independent).

This is the node-extension leg: serve a **tx-in-block Merkle inclusion proof** from the
Nockchain kernel so a receipt's Nock anchor can be re-checked against the chain instead
of trusted. The blocker before doing this safely was a correctness question — *would the
proof we generate actually match the block's canonical commitment, or would we ship a
plausible-but-wrong "chain-verified" proof?* That question is now fully resolved.

## The commitment chain (what a proof must bind to)

From `nockchain/hoon/common/tx-engine-1.hoon`:

```
block-id            = (hash-hashable:tip5 (hashable-digest pag))      :: +compute-digest
hashable-digest     = [pow-wrapper  (hashable-block-commitment form)]
hashable-block-commitment =
  :*  hash+parent
      hash+(hash-hashable:tip5 (hashable-tx-ids tx-ids))   <-- TXROOT, field 2
      hash+coinbase  leaf+timestamp  leaf+epoch  leaf+target
      leaf+accumulated-work  leaf+height  leaf+msg
  ==
hashable-tx-ids tx-ids =                                    :: per treap node n=t, l=L, r=R
  ?@ tx-ids  leaf+tx-ids
  [hash+n.tx-ids  $(tx-ids l)  $(tx-ids r)]                 :: = [hash+t [L R]]
```

So `TXROOT = (hash-hashable:tip5 (hashable-tx-ids tx-ids))` is bound as **field 2** of the
9-field block commitment, which is hashed (with the pow wrapper) into `block-id`.

## Why the proof is correct (the resolved trap)

`hashable` (`ztd/three.hoon` L367) is `$^ [p=hashable q=hashable]` — **head-is-cell ⇒
binary node** — else a tagged leaf (`%leaf`/`%hash`/`%list`/`%mary`). `hash-hashable`
folds the cell case as `(hash-ten-cell [$(h p.h) $(h q.h)])`.

`hashable-tx-ids` emits `[hash+t [L R]]`: the head `hash+t` is `[%hash digest]`, whose own
head is the atom `%hash` → so `hash+t` is a **leaf** carrying the tx-id as its digest, and
the node is the binary cell `[leaf(hash+t)  [L R]]`. The tree therefore linearizes
**pre-order** (node, then left subtree, then right subtree), including the `leaf+~`
placeholders for empty subtrees.

`prove-hashable-by-index:merkle` (`ztd/three.hoon` L2002) walks that exact structure with
the **same** `hash-ten-cell`/`hash-hashable` folding and `leaf-count` navigation, returning
`[axis=@ proof=[root path]]`. Critical consequences:

1. **Root identity.** The proof's `root` = `(hash-hashable (hashable-tx-ids tx-ids))` =
   the block's `TXROOT`. Same arms, same tree ⇒ identical root by construction.
2. **Leaf = tx-id.** A tx leaf's digest is `(hash-hashable hash+t)` = `t` (the `%hash`
   case returns its payload). A verifier needs only the tx-id it already holds — no
   re-hash of transaction bytes.
3. **It is the chain's own merkle.** `prove-hashable-by-index` / `verify-merk-proof` are
   the audited arms the live chain uses for lock-Merkle proofs — not new crypto.

The one residual is computing the target tx's **leaf index** in that pre-order walk
(empties counted). We compute it with a `leaf-index-of` helper that mirrors
`prove-hashable-by-index`'s own leaf counting. And we make a wrong index **impossible to
ship**: the kernel **self-verifies** the proof with `verify-merk-proof` against the real
`TXROOT` before returning it — a bad index yields `~` (no proof), never a false one.

## Validation performed (no live-node touch)

- Authored the full peek logic — `hashable-tx-ids` + `leaf-index-of` +
  `prove-hashable-by-index:merkle` + `verify-merk-proof:merkle` + `z-silt`, composed over
  a built z-set — and **minted it clean with `hoonc`** (`--new`, no `nest-fail`/`mint`
  errors). Hoon's type system is strict: a clean mint confirms every arm is **reachable**
  from the peek surface and all noun shapes line up (proof `root` ≡ `tx-root` type, leaf
  digest type, etc.). Reachability via `:zeke` (inner.hoon already uses `proof-to-pow:zeke`,
  `based:zeke`), so `prove-hashable-by-index:merkle:zeke` / `verify-merk-proof:merkle:zeke`
  are in scope.
- Runtime poke/peek execution (`nockapp-run`) was attempted but is blocked on local
  `make build-hoon` harness setup (even the known-good `peek.hoon` did not emit `out.jam`
  in this env) — orthogonal to correctness. Covered instead by analytical proof + clean
  mint + audited arms + the fail-safe self-verify.

## Implementation (the gated, load-bearing work)

The proof generation is settled; what remains is plumbing + a **live-node redeploy** of
the running settlement/bridge/mining testnet node (`nock-testnet-node.service`).

1. **Kernel** `hoon/apps/dumbnet/inner.hoon ++peek` — add, additively, to the `?+ pole`:

   ```
   [%tx-inclusion-proof bid=@ tid=@ ~]
   ^- (unit (unit [block-id=@ height=@ tx-id=@ tx-root=noun-digest:tip5 axis=@ proof=merk-proof:zeke]))
   =/ block-id  (from-b58:hash:t bid.pole)
   =/ tx-id     (from-b58:hash:t tid.pole)
   =/ pag       (~(get h-by blocks.c.k) block-id)
   ?~ pag  ~
   =/ tx-ids    ~(tx-ids get:page:t u.pag)
   =/ ht        (hashable-tx-ids tx-ids)              :: local helper (or :t if re-exported)
   =/ tx-root   (hash-hashable:tip5:zeke ht)
   =/ li        (leaf-index-of ht tx-id)              :: local helper
   ?~ found.li  [~ ~]                                 :: tx not in this block
   =/ pr        (prove-hashable-by-index:merkle:zeke ht u.found.li)
   ?.  ?&(=(-.proof.pr tx-root) (verify-merk-proof:merkle:zeke tx-id axis.pr proof.pr))
     [~ ~]                                            :: self-check failed → no false proof
   ``[block-id ~(height get:page:t u.pag) tx-id tx-root axis.pr proof.pr]
   ```

   plus `leaf-index-of` and `hashable-tx-ids` helper arms in the peek `|^` core.
   Branch is **purely additive** — every other peek path keeps its current `~` default.

2. **proto** `crates/nockapp-grpc-proto/.../public/v2/nockchain.proto` — add
   `GetTransactionProof(tx_id, block_id) -> {block_id, height, tx_root, axis, MerkleProof}`,
   reusing the existing `common/v2 MerkleProof {root, path}`.

3. **Rust handler** `crates/nockapp-grpc/.../v2/server.rs` + `block_explorer.rs` — peek the
   new path and **decode the noun** into the proto (copy the `GetTransactionBlock` decode
   pattern). **No Merkle/Tip5 math in Rust.**

4. **Build + staged deploy** — `cargo build --release -p nockchain`; keep the current
   binary for rollback; `systemctl stop` → swap → `start`; `grpcurl` smoke a known
   fakenet tx; confirm settlement/bridge/mining healthy post-swap.

5. **Orchestrator** — embed the returned anchor (block-id, height, tx-root, axis, path,
   note name) in `%fair` settlement receipts (`services/orchestrator/src/nock-settle.mjs`).

## Phase 3 (independent verification, still pending)

The proof is only independently checkable once a verifier can recompute Tip5. Plan: WASM-
compile canonical Tip5 + `verify-merk-proof` into `src/lib/tip5/`, add
`src/lib/chain-verify-nock.ts`, extend `/api/receipts/verify-chain` + UI + forgery gate.
Until then a Nock anchor is labeled `nock-inclusion-node-attested` (honest tiering,
mirroring the Base leg's `evm-full`).
