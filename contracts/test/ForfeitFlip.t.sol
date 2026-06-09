// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForfeitFlip} from "../src/ForfeitFlip.sol";

contract ForfeitFlipTest is Test {
    ForfeitFlip internal flip;
    address internal house = makeAddr("house");
    address internal player = makeAddr("player");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant MIN = 0.001 ether;
    uint256 internal constant MAX = 1 ether;
    uint256 internal constant WINDOW = 1 hours;
    uint256 internal constant BANKROLL = 10 ether;

    function setUp() public {
        vm.deal(house, 100 ether);
        vm.deal(player, 100 ether);
        vm.deal(stranger, 10 ether);
        vm.prank(house);
        flip = new ForfeitFlip{value: BANKROLL}(MIN, MAX, WINDOW);
    }

    // ---- the core safety invariant: the contract is always exactly solvent ----
    function _assertSolvent() internal view {
        assertEq(
            address(flip).balance,
            flip.houseBankroll() + 2 * flip.lockedLiabilities() + flip.totalCredits(),
            "solvency invariant broken"
        );
    }

    // Find a serverSeed whose outcome parity matches `wantPlayerWin` for a fixed (clientSeed, roundId).
    function _seedFor(bytes32 clientSeed, uint256 roundId, bool wantPlayerWin)
        internal
        pure
        returns (bytes32)
    {
        for (uint256 i = 0; i < 512; i++) {
            bytes32 s = keccak256(abi.encodePacked("server-seed", i));
            bytes32 o = keccak256(abi.encodePacked(s, clientSeed, roundId));
            if (((uint256(o) & 1) == 1) == wantPlayerWin) return s;
        }
        revert("no seed found");
    }

    function _open(bytes32 serverSeed) internal returns (uint256 id) {
        vm.prank(house);
        id = flip.openRound(keccak256(abi.encodePacked(serverSeed)));
    }

    // ============================================================== happy paths

    function test_playerWins_creditedFullPot() public {
        uint256 stake = 0.5 ether;
        uint256 rid = flip.nextRoundId();
        bytes32 client = keccak256("client-A");
        bytes32 server = _seedFor(client, rid, true);
        uint256 id = _open(server);

        vm.prank(player);
        flip.play{value: stake}(id, client);
        _assertSolvent();

        vm.prank(house);
        flip.reveal(id, server);

        assertEq(flip.credits(player), stake * 2, "player should be credited the full pot");
        assertEq(flip.houseBankroll(), BANKROLL - stake, "house lost its matched stake");
        assertEq(flip.lockedLiabilities(), 0);
        _assertSolvent();

        uint256 before = player.balance;
        vm.prank(player);
        flip.withdraw();
        assertEq(player.balance, before + stake * 2);
        assertEq(flip.credits(player), 0);
        _assertSolvent();
    }

    function test_houseWins_keepsPot() public {
        uint256 stake = 0.5 ether;
        uint256 rid = flip.nextRoundId();
        bytes32 client = keccak256("client-B");
        bytes32 server = _seedFor(client, rid, false);
        uint256 id = _open(server);

        vm.prank(player);
        flip.play{value: stake}(id, client);
        vm.prank(house);
        flip.reveal(id, server);

        assertEq(flip.credits(player), 0, "losing player credited nothing");
        assertEq(flip.houseBankroll(), BANKROLL + stake, "house won the player's stake");
        assertEq(flip.lockedLiabilities(), 0);
        _assertSolvent();
    }

    // ============================================================== fairness / commit binding

    function test_reveal_wrongSeed_reverts() public {
        bytes32 server = keccak256("real-seed");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"));
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.BadReveal.selector);
        flip.reveal(id, keccak256("WRONG-seed"));
    }

    function test_openRound_emptyCommit_reverts() public {
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.EmptyCommit.selector);
        flip.openRound(bytes32(0));
    }

    function test_openRound_commitReuse_reverts() public {
        bytes32 commit = keccak256(abi.encodePacked(keccak256("seed-x")));
        vm.prank(house);
        flip.openRound(commit);
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.CommitReused.selector);
        flip.openRound(commit);
    }

    function test_computeOutcome_matchesSettlement() public {
        uint256 rid = flip.nextRoundId();
        bytes32 client = keccak256("client-C");
        bytes32 server = _seedFor(client, rid, true);
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, client);
        vm.prank(house);
        flip.reveal(id, server);

        (, bool predictedWin) = flip.computeOutcome(server, client, id);
        ForfeitFlip.Round memory r = flip.getRound(id);
        assertEq(r.playerWon, predictedWin, "recorded outcome must equal recomputed outcome");
        assertTrue(predictedWin);
    }

    // ============================================================== timeout protection

    function test_timeout_refundsFullPot() public {
        uint256 stake = 0.3 ether;
        bytes32 server = keccak256("never-revealed");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: stake}(id, keccak256("c"));

        vm.warp(block.timestamp + WINDOW + 1);
        // anyone can trigger the rescue; funds go to the player.
        vm.prank(stranger);
        flip.claimTimeout(id);

        assertEq(flip.credits(player), stake * 2, "player reclaims their stake + house's matched stake");
        assertEq(flip.lockedLiabilities(), 0);
        _assertSolvent();
    }

    function test_timeout_beforeWindow_reverts() public {
        bytes32 server = keccak256("s");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"));
        vm.expectRevert(ForfeitFlip.RevealWindowOpen.selector);
        flip.claimTimeout(id);
    }

    function test_reveal_afterTimeoutClaimed_reverts() public {
        bytes32 server = keccak256("s2");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"));
        vm.warp(block.timestamp + WINDOW + 1);
        flip.claimTimeout(id);
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.WrongStatus.selector);
        flip.reveal(id, server);
    }

    // ============================================================== access control

    function test_onlyHouse_openReveal() public {
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NotHouse.selector);
        flip.openRound(keccak256("x"));

        bytes32 server = keccak256("s3");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"));
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NotHouse.selector);
        flip.reveal(id, server);
    }

    function test_onlyHouse_withdrawBankroll() public {
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NotHouse.selector);
        flip.withdrawBankroll(1 ether);
    }

    // ============================================================== bankroll / stake guards

    function test_play_stakeOutOfRange_reverts() public {
        bytes32 server = keccak256("s4");
        uint256 id = _open(server);
        vm.prank(player);
        vm.expectRevert(ForfeitFlip.StakeOutOfRange.selector);
        flip.play{value: MIN - 1}(id, keccak256("c"));

        vm.prank(player);
        vm.expectRevert(ForfeitFlip.StakeOutOfRange.selector);
        flip.play{value: MAX + 1}(id, keccak256("c"));
    }

    function test_play_insufficientBankroll_reverts() public {
        // Drain bankroll below maxStake, then a max-stake play cannot be matched.
        vm.prank(house);
        flip.withdrawBankroll(BANKROLL); // all free funds -> house credit
        bytes32 server = keccak256("s5");
        uint256 id = _open(server);
        vm.prank(player);
        vm.expectRevert(ForfeitFlip.InsufficientBankroll.selector);
        flip.play{value: MAX}(id, keccak256("c"));
    }

    function test_house_cannotWithdrawLockedFunds() public {
        uint256 stake = MAX;
        bytes32 server = keccak256("s6");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: stake}(id, keccak256("c")); // locks `stake` from bankroll
        // free bankroll is now BANKROLL - stake; withdrawing more must revert.
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.InsufficientBankroll.selector);
        flip.withdrawBankroll(BANKROLL - stake + 1);
        // exactly the free amount is fine.
        vm.prank(house);
        flip.withdrawBankroll(BANKROLL - stake);
        _assertSolvent();
    }

    // ============================================================== status guards

    function test_play_onClosedRound_reverts() public {
        bytes32 server = keccak256("s7");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"));
        // second play on a Played round
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.WrongStatus.selector);
        flip.play{value: MIN}(id, keccak256("c2"));
    }

    function test_withdraw_nothing_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NothingToWithdraw.selector);
        flip.withdraw();
    }

    // ============================================================== reentrancy

    function test_withdraw_reentrancy_safe() public {
        ReentrantPlayer attacker = new ReentrantPlayer(flip);
        vm.deal(address(attacker), 10 ether);
        uint256 stake = 0.5 ether;
        uint256 rid = flip.nextRoundId();
        bytes32 client = keccak256("atk");
        bytes32 server = _seedFor(client, rid, true); // make the attacker win so it has credit
        uint256 id = _open(server);
        attacker.play{value: stake}(id, client);
        vm.prank(house);
        flip.reveal(id, server);

        // attacker has credit = 2*stake; its receive() re-enters withdraw() during the payout.
        assertEq(flip.credits(address(attacker)), stake * 2);
        uint256 beforeAttack = address(attacker).balance;
        attacker.attack();
        // It must receive EXACTLY its credit once (no reentrant double-payment), credit zeroed, solvent.
        assertEq(address(attacker).balance, beforeAttack + stake * 2, "attacker overpaid via reentrancy");
        assertEq(flip.credits(address(attacker)), 0);
        _assertSolvent();
    }

    // ============================================================== constructor validation

    function test_constructor_badConfig_reverts() public {
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(0, MAX, WINDOW); // minStake 0
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(MAX, MIN, WINDOW); // max < min
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(MIN, MAX, 30); // window too short
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(MIN, uint256(type(uint96).max) + 1, WINDOW); // maxStake overflows uint96
    }

    // ============================================================== fuzz

    function testFuzz_play_preservesSolvency(uint256 stake, bytes32 client) public {
        stake = bound(stake, MIN, MAX);
        bytes32 server = keccak256(abi.encodePacked("fuzz", client));
        uint256 id = _open(server);
        vm.deal(player, stake);
        vm.prank(player);
        flip.play{value: stake}(id, client);
        _assertSolvent();
        vm.prank(house);
        flip.reveal(id, server);
        _assertSolvent();
    }

    function testFuzz_outcome_isDeterministicAndBinary(bytes32 s, bytes32 c, uint256 id) public view {
        (bytes32 outcome, bool won) = flip.computeOutcome(s, c, id);
        assertEq(outcome, keccak256(abi.encodePacked(s, c, id)));
        assertEq(won, (uint256(outcome) & 1) == 1);
    }

    // ============================================================== review follow-up coverage

    function test_cancelRound_onlyHouse_openOnly_keepsCommitBurned() public {
        bytes32 server = keccak256("cancel-seed");
        uint256 id = _open(server);
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NotHouse.selector);
        flip.cancelRound(id);
        vm.prank(house);
        flip.cancelRound(id);
        assertEq(uint8(flip.getRound(id).status), uint8(ForfeitFlip.Status.Cancelled));
        // cancelled round is unplayable and un-re-cancellable
        vm.prank(player);
        vm.expectRevert(ForfeitFlip.WrongStatus.selector);
        flip.play{value: MIN}(id, keccak256("c"));
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.WrongStatus.selector);
        flip.cancelRound(id);
        // commit stays burned (no serverSeed reuse)
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.CommitReused.selector);
        flip.openRound(keccak256(abi.encodePacked(server)));
        _assertSolvent();
    }

    function test_maxStake_uint96Max_noOverflow() public {
        uint96 big = type(uint96).max;
        vm.deal(house, uint256(big) * 3);
        vm.prank(house);
        ForfeitFlip f = new ForfeitFlip{value: uint256(big)}(1, big, WINDOW);
        bytes32 client = keccak256("big");
        bytes32 server = keccak256("big-server");
        vm.prank(house);
        uint256 id = f.openRound(keccak256(abi.encodePacked(server)));
        vm.deal(player, uint256(big));
        vm.prank(player);
        f.play{value: big}(id, client);
        vm.prank(house);
        f.reveal(id, server);
        (, bool won) = f.computeOutcome(server, client, id);
        if (won) {
            assertEq(f.credits(player), uint256(big) * 2);
        } else {
            assertEq(f.houseBankroll(), uint256(big) * 2);
        }
        assertEq(address(f).balance, f.houseBankroll() + 2 * f.lockedLiabilities() + f.totalCredits());
    }

    function test_zeroClientSeed_settles() public {
        uint256 rid = flip.nextRoundId();
        bytes32 client = bytes32(0);
        bytes32 server = _seedFor(client, rid, true);
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, client);
        vm.prank(house);
        flip.reveal(id, server);
        assertEq(flip.credits(player), MIN * 2);
        _assertSolvent();
    }

    function test_claimTimeout_exactBoundary_revertsThenSucceeds() public {
        bytes32 server = keccak256("boundary");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"));
        uint256 played = block.timestamp;
        vm.warp(played + WINDOW); // exactly at the deadline -> still open (guard is <=)
        vm.expectRevert(ForfeitFlip.RevealWindowOpen.selector);
        flip.claimTimeout(id);
        vm.warp(played + WINDOW + 1); // strictly past -> succeeds
        flip.claimTimeout(id);
        assertEq(flip.credits(player), MIN * 2);
        _assertSolvent();
    }
}

// A player that re-enters withdraw() from its receive() hook to test reentrancy safety.
contract ReentrantPlayer {
    ForfeitFlip internal immutable flip;
    bool internal attacking;

    constructor(ForfeitFlip _flip) {
        flip = _flip;
    }

    function play(uint256 id, bytes32 clientSeed) external payable {
        flip.play{value: msg.value}(id, clientSeed);
    }

    function attack() external {
        attacking = true;
        flip.withdraw();
        attacking = false;
    }

    receive() external payable {
        if (attacking) {
            // Re-enter: a vulnerable contract would pay again. This one zeroed the credit first, so the
            // nested call reverts NothingToWithdraw (swallowed) and no double-payment occurs.
            try flip.withdraw() {} catch {}
        }
    }
}
