// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForfeitFlip} from "../src/ForfeitFlip.sol";

// Minimal ERC20 used by the token tests. Crucially, transfer/transferFrom return FALSE (do not revert)
// on insufficient funds/allowance, so the contract's `if (!transfer(...)) revert TransferFailed()` guard
// is actually exercised. decimals=16 mirrors the real Base NOCK token.
contract MockERC20 {
    string public name = "Mock Nock";
    string public symbol = "MOCK";
    uint8 public decimals = 16;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        if (balanceOf[msg.sender] < amt) return false;
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        if (balanceOf[from] < amt || allowance[from][msg.sender] < amt) return false;
        allowance[from][msg.sender] -= amt;
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}

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
        flip = new ForfeitFlip{value: BANKROLL}(address(0), MIN, MAX, WINDOW);
    }

    // ---- the core safety invariant: the contract is always exactly solvent ----
    function _assertSolvent() internal view {
        assertEq(
            flip.reserves(),
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
        flip.play{value: stake}(id, client, stake);
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
        flip.play{value: stake}(id, client, stake);
        vm.prank(house);
        flip.reveal(id, server);

        assertEq(flip.credits(player), 0, "losing player credited nothing");
        assertEq(flip.houseBankroll(), BANKROLL + stake, "house won the player's stake");
        assertEq(flip.lockedLiabilities(), 0);
        _assertSolvent();
    }

    // ============================================================== native value guards

    function test_play_valueMismatch_reverts() public {
        bytes32 server = keccak256("vm-seed");
        uint256 id = _open(server);
        // declared amount != msg.value on a native game
        vm.prank(player);
        vm.expectRevert(ForfeitFlip.ValueMismatch.selector);
        flip.play{value: MIN}(id, keccak256("c"), MIN + 1);
    }

    function test_constructor_nativeValueForToken_reverts() public {
        MockERC20 tok = new MockERC20();
        vm.prank(house);
        vm.expectRevert(ForfeitFlip.NativeValueForToken.selector);
        new ForfeitFlip{value: 1 ether}(address(tok), MIN, MAX, WINDOW); // ETH bankroll on an ERC20 game
    }

    // ============================================================== fairness / commit binding

    function test_reveal_wrongSeed_reverts() public {
        bytes32 server = keccak256("real-seed");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"), MIN);
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
        flip.play{value: MIN}(id, client, MIN);
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
        flip.play{value: stake}(id, keccak256("c"), stake);

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
        flip.play{value: MIN}(id, keccak256("c"), MIN);
        vm.expectRevert(ForfeitFlip.RevealWindowOpen.selector);
        flip.claimTimeout(id);
    }

    function test_reveal_afterTimeoutClaimed_reverts() public {
        bytes32 server = keccak256("s2");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"), MIN);
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
        flip.play{value: MIN}(id, keccak256("c"), MIN);
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
        flip.play{value: MIN - 1}(id, keccak256("c"), MIN - 1);

        vm.prank(player);
        vm.expectRevert(ForfeitFlip.StakeOutOfRange.selector);
        flip.play{value: MAX + 1}(id, keccak256("c"), MAX + 1);
    }

    function test_play_insufficientBankroll_reverts() public {
        // Drain bankroll below maxStake, then a max-stake play cannot be matched.
        vm.prank(house);
        flip.withdrawBankroll(BANKROLL); // all free funds -> house credit
        bytes32 server = keccak256("s5");
        uint256 id = _open(server);
        vm.prank(player);
        vm.expectRevert(ForfeitFlip.InsufficientBankroll.selector);
        flip.play{value: MAX}(id, keccak256("c"), MAX);
    }

    function test_house_cannotWithdrawLockedFunds() public {
        uint256 stake = MAX;
        bytes32 server = keccak256("s6");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: stake}(id, keccak256("c"), stake); // locks `stake` from bankroll
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
        flip.play{value: MIN}(id, keccak256("c"), MIN);
        // second play on a Played round
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.WrongStatus.selector);
        flip.play{value: MIN}(id, keccak256("c2"), MIN);
    }

    function test_withdraw_nothing_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NothingToWithdraw.selector);
        flip.withdraw();
    }

    // ============================================================== reentrancy (native)

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
        new ForfeitFlip(address(0), 0, MAX, WINDOW); // minStake 0
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(address(0), MAX, MIN, WINDOW); // max < min
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(address(0), MIN, MAX, 30); // window too short
        vm.expectRevert(ForfeitFlip.BadConfig.selector);
        new ForfeitFlip(address(0), MIN, uint256(type(uint96).max) + 1, WINDOW); // maxStake overflows uint96
    }

    // ============================================================== fuzz

    function testFuzz_play_preservesSolvency(uint256 stake, bytes32 client) public {
        stake = bound(stake, MIN, MAX);
        bytes32 server = keccak256(abi.encodePacked("fuzz", client));
        uint256 id = _open(server);
        vm.deal(player, stake);
        vm.prank(player);
        flip.play{value: stake}(id, client, stake);
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
        flip.play{value: MIN}(id, keccak256("c"), MIN);
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
        ForfeitFlip f = new ForfeitFlip{value: uint256(big)}(address(0), 1, big, WINDOW);
        bytes32 client = keccak256("big");
        bytes32 server = keccak256("big-server");
        vm.prank(house);
        uint256 id = f.openRound(keccak256(abi.encodePacked(server)));
        vm.deal(player, uint256(big));
        vm.prank(player);
        f.play{value: big}(id, client, big);
        vm.prank(house);
        f.reveal(id, server);
        (, bool won) = f.computeOutcome(server, client, id);
        if (won) {
            assertEq(f.credits(player), uint256(big) * 2);
        } else {
            assertEq(f.houseBankroll(), uint256(big) * 2);
        }
        assertEq(f.reserves(), f.houseBankroll() + 2 * f.lockedLiabilities() + f.totalCredits());
    }

    function test_zeroClientSeed_settles() public {
        uint256 rid = flip.nextRoundId();
        bytes32 client = bytes32(0);
        bytes32 server = _seedFor(client, rid, true);
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, client, MIN);
        vm.prank(house);
        flip.reveal(id, server);
        assertEq(flip.credits(player), MIN * 2);
        _assertSolvent();
    }

    function test_claimTimeout_exactBoundary_revertsThenSucceeds() public {
        bytes32 server = keccak256("boundary");
        uint256 id = _open(server);
        vm.prank(player);
        flip.play{value: MIN}(id, keccak256("c"), MIN);
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

// =================================================================== ERC20-settled game
contract ForfeitFlipErc20Test is Test {
    ForfeitFlip internal flip;
    MockERC20 internal tok;
    address internal house = makeAddr("house");
    address internal player = makeAddr("player");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant MIN = 1e16; // 1 NOCK (16 decimals)
    uint256 internal constant MAX = 1000e16;
    uint256 internal constant WINDOW = 1 hours;
    uint256 internal constant BANKROLL = 10000e16;

    function setUp() public {
        tok = new MockERC20();
        tok.mint(house, 1_000_000e16);
        tok.mint(player, 1_000_000e16);
        vm.prank(house);
        flip = new ForfeitFlip(address(tok), MIN, MAX, WINDOW);
        // House funds the bankroll: approve then fundBankroll (no msg.value on an ERC20 game).
        vm.startPrank(house);
        tok.approve(address(flip), BANKROLL);
        flip.fundBankroll(BANKROLL);
        vm.stopPrank();
    }

    function _assertSolvent() internal view {
        assertEq(
            flip.reserves(),
            flip.houseBankroll() + 2 * flip.lockedLiabilities() + flip.totalCredits(),
            "ERC20 solvency invariant broken"
        );
    }

    function _seedFor(bytes32 clientSeed, uint256 roundId, bool wantPlayerWin) internal pure returns (bytes32) {
        for (uint256 i = 0; i < 512; i++) {
            bytes32 s = keccak256(abi.encodePacked("erc20-seed", i));
            bytes32 o = keccak256(abi.encodePacked(s, clientSeed, roundId));
            if (((uint256(o) & 1) == 1) == wantPlayerWin) return s;
        }
        revert("no seed found");
    }

    function _open(bytes32 serverSeed) internal returns (uint256 id) {
        vm.prank(house);
        id = flip.openRound(keccak256(abi.encodePacked(serverSeed)));
    }

    function test_setup_bankrollFunded() public view {
        assertEq(flip.token(), address(tok));
        assertEq(flip.houseBankroll(), BANKROLL);
        assertEq(flip.reserves(), BANKROLL);
        _assertSolvent();
    }

    function test_erc20_playerWins_creditedAndWithdraws() public {
        uint256 stake = 5e16;
        uint256 rid = flip.nextRoundId();
        bytes32 client = keccak256("erc20-A");
        bytes32 server = _seedFor(client, rid, true);
        uint256 id = _open(server);

        vm.startPrank(player);
        tok.approve(address(flip), stake);
        flip.play(id, client, stake);
        vm.stopPrank();
        _assertSolvent();

        vm.prank(house);
        flip.reveal(id, server);
        assertEq(flip.credits(player), stake * 2, "player credited the full pot in tokens");
        _assertSolvent();

        uint256 before = tok.balanceOf(player);
        vm.prank(player);
        flip.withdraw();
        assertEq(tok.balanceOf(player), before + stake * 2, "player receives pot in tokens");
        assertEq(flip.credits(player), 0);
        _assertSolvent();
    }

    function test_erc20_houseWins_keepsPot() public {
        uint256 stake = 5e16;
        uint256 rid = flip.nextRoundId();
        bytes32 client = keccak256("erc20-B");
        bytes32 server = _seedFor(client, rid, false);
        uint256 id = _open(server);

        vm.startPrank(player);
        tok.approve(address(flip), stake);
        flip.play(id, client, stake);
        vm.stopPrank();

        vm.prank(house);
        flip.reveal(id, server);
        assertEq(flip.credits(player), 0, "losing player credited nothing");
        assertEq(flip.houseBankroll(), BANKROLL + stake, "house won the player's stake");
        _assertSolvent();
    }

    function test_erc20_play_rejectsNativeValue() public {
        bytes32 server = keccak256("erc20-nv");
        uint256 id = _open(server);
        vm.deal(player, 1 ether);
        vm.startPrank(player);
        tok.approve(address(flip), MIN);
        vm.expectRevert(ForfeitFlip.NativeValueForToken.selector);
        flip.play{value: 1}(id, keccak256("c"), MIN); // stray ETH on an ERC20 game
        vm.stopPrank();
    }

    function test_erc20_fundBankroll_rejectsNativeValue() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(ForfeitFlip.NativeValueForToken.selector);
        flip.fundBankroll{value: 1}(MIN);
    }

    function test_erc20_play_insufficientAllowance_reverts() public {
        bytes32 server = keccak256("erc20-allow");
        uint256 id = _open(server);
        // No approve() -> transferFrom returns false -> contract reverts TransferFailed.
        vm.prank(player);
        vm.expectRevert(ForfeitFlip.TransferFailed.selector);
        flip.play(id, keccak256("c"), MIN);
    }

    function test_erc20_timeout_refundsFullPot() public {
        uint256 stake = 3e16;
        bytes32 server = keccak256("erc20-timeout");
        uint256 id = _open(server);
        vm.startPrank(player);
        tok.approve(address(flip), stake);
        flip.play(id, keccak256("c"), stake);
        vm.stopPrank();

        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(stranger);
        flip.claimTimeout(id);
        assertEq(flip.credits(player), stake * 2);
        _assertSolvent();

        uint256 before = tok.balanceOf(player);
        vm.prank(player);
        flip.withdraw();
        assertEq(tok.balanceOf(player), before + stake * 2);
        _assertSolvent();
    }

    function testFuzz_erc20_play_preservesSolvency(uint256 stake, bytes32 client) public {
        stake = bound(stake, MIN, MAX);
        bytes32 server = keccak256(abi.encodePacked("erc20-fuzz", client));
        uint256 id = _open(server);
        vm.startPrank(player);
        tok.approve(address(flip), stake);
        flip.play(id, client, stake);
        vm.stopPrank();
        _assertSolvent();
        vm.prank(house);
        flip.reveal(id, server);
        _assertSolvent();
    }
}

// A player that re-enters withdraw() from its receive() hook to test reentrancy safety (native game).
contract ReentrantPlayer {
    ForfeitFlip internal immutable flip;
    bool internal attacking;

    constructor(ForfeitFlip _flip) {
        flip = _flip;
    }

    function play(uint256 id, bytes32 clientSeed) external payable {
        flip.play{value: msg.value}(id, clientSeed, msg.value);
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
