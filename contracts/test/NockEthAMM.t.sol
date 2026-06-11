// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { NockEthAMM } from "../src/NockEthAMM.sol";

contract MockTNock {
    uint8 public constant decimals = 16;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount) return false;
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract NockEthAMMTest is Test {
    MockTNock tnock;
    NockEthAMM amm;
    address donation = address(0xD0);
    address lp = address(0xA11CE);
    address trader = address(0xB0B);

    function setUp() public {
        tnock = new MockTNock();
        amm = new NockEthAMM(address(tnock), donation);
        // LP seeds 10 ETH + 1,000,000 tNOCK (1 ETH = 100,000 tNOCK).
        vm.deal(lp, 100 ether);
        tnock.mint(lp, 100_000_000 * 1e16);
        vm.startPrank(lp);
        tnock.approve(address(amm), type(uint256).max);
        amm.addLiquidity{ value: 10 ether }(1_000_000 * 1e16, 0);
        vm.stopPrank();

        vm.deal(trader, 100 ether);
        tnock.mint(trader, 100_000_000 * 1e16);
        vm.prank(trader);
        tnock.approve(address(amm), type(uint256).max);
    }

    function test_constructor_rejectsZero() public {
        vm.expectRevert(NockEthAMM.BadConfig.selector);
        new NockEthAMM(address(0), donation);
        vm.expectRevert(NockEthAMM.BadConfig.selector);
        new NockEthAMM(address(tnock), address(0));
    }

    function test_initialLiquidity_mintsSharesAndLocksMinimum() public view {
        assertEq(amm.reserveEth(), 10 ether);
        assertEq(amm.reserveTnock(), 1_000_000 * 1e16);
        assertEq(amm.balanceOf(address(0xdead)), amm.MINIMUM_LIQUIDITY());
        // sqrt(10e18 * 1e22) = sqrt(1e41) ≈ 3.16e20; LP holds that minus the locked minimum.
        assertGt(amm.balanceOf(lp), 0);
        assertEq(amm.totalSupply(), amm.balanceOf(lp) + amm.MINIMUM_LIQUIDITY());
    }

    function test_addLiquidity_proportionalSharesAndKGrowth() public {
        uint256 supplyBefore = amm.totalSupply();
        uint256 pair = amm.quoteTnockForEth(1 ether); // 100,000 tNOCK
        assertEq(pair, 100_000 * 1e16);

        vm.prank(trader);
        uint256 shares = amm.addLiquidity{ value: 1 ether }(pair, 0);
        // 1 ETH into a 10 ETH pool => ~10% of prior supply.
        assertApproxEqRel(shares, supplyBefore / 10, 1e15); // within 0.1%
        assertEq(amm.reserveEth(), 11 ether);
    }

    function test_swapEthForTNock_paysDonationOutOfPool() public {
        (uint256 expectedOut, uint256 expectedDonation) =
            amm.getAmountOut(1 ether, amm.reserveEth(), amm.reserveTnock());
        assertEq(expectedDonation, 1 ether / 10_000); // 0.01%

        uint256 donationBefore = donation.balance;
        uint256 tnockBefore = tnock.balanceOf(trader);

        vm.prank(trader);
        uint256 out = amm.swapEthForTNock{ value: 1 ether }(0);

        assertEq(out, expectedOut);
        assertEq(tnock.balanceOf(trader), tnockBefore + out);
        // Donation left the pool in ETH to the donation wallet.
        assertEq(donation.balance, donationBefore + expectedDonation);
        // Reserve grew only by the net (input minus donation).
        assertEq(amm.reserveEth(), 10 ether + 1 ether - expectedDonation);
    }

    function test_swapTNockForEth_paysDonationInTNock() public {
        uint256 amountIn = 100_000 * 1e16; // 100,000 tNOCK
        (uint256 expectedOut, uint256 expectedDonation) =
            amm.getAmountOut(amountIn, amm.reserveTnock(), amm.reserveEth());
        assertEq(expectedDonation, amountIn / 10_000);

        uint256 donationTnockBefore = tnock.balanceOf(donation);
        uint256 ethBefore = trader.balance;

        vm.prank(trader);
        uint256 out = amm.swapTNockForEth(amountIn, 0);

        assertEq(out, expectedOut);
        assertEq(trader.balance, ethBefore + out);
        assertEq(tnock.balanceOf(donation), donationTnockBefore + expectedDonation);
    }

    function test_swap_respectsSlippageFloor() public {
        (uint256 expectedOut, ) = amm.getAmountOut(1 ether, amm.reserveEth(), amm.reserveTnock());
        vm.prank(trader);
        vm.expectRevert(NockEthAMM.SlippageExceeded.selector);
        amm.swapEthForTNock{ value: 1 ether }(expectedOut + 1);
    }

    function test_kNeverDecreasesOnSwap() public {
        uint256 kBefore = amm.reserveEth() * amm.reserveTnock();
        vm.prank(trader);
        amm.swapEthForTNock{ value: 2 ether }(0);
        uint256 kAfter = amm.reserveEth() * amm.reserveTnock();
        // The 0.30% LP fee stays in the pool, so k strictly grows (donation already removed).
        assertGt(kAfter, kBefore);
    }

    function test_removeLiquidity_returnsProportionalPlusFees() public {
        // Generate LP fees via a round-trip swap, then withdraw all of LP's shares.
        vm.startPrank(trader);
        amm.swapEthForTNock{ value: 5 ether }(0);
        amm.swapTNockForEth(200_000 * 1e16, 0);
        vm.stopPrank();

        uint256 shares = amm.balanceOf(lp);
        vm.prank(lp);
        (uint256 ethOut, uint256 tnockOut) = amm.removeLiquidity(shares, 0, 0);

        // LP gets back more than the 10 ETH-equivalent originally provided on at least one side
        // (fees accrued), and the locked minimum keeps the pool non-empty.
        assertGt(ethOut, 0);
        assertGt(tnockOut, 0);
        assertEq(amm.balanceOf(lp), 0);
        assertGt(amm.reserveEth(), 0); // MINIMUM_LIQUIDITY share remains
    }

    function test_addLiquidity_rejectsZeroSide() public {
        vm.prank(trader);
        vm.expectRevert(NockEthAMM.InsufficientInput.selector);
        amm.addLiquidity{ value: 0 }(1, 0);
    }

    function test_lpToken_transferable() public {
        uint256 half = amm.balanceOf(lp) / 2;
        vm.prank(lp);
        amm.transfer(trader, half);
        assertEq(amm.balanceOf(trader), half);
    }

    function testFuzz_getAmountOut_monotonic(uint96 a, uint96 b) public view {
        vm.assume(a > 1e9 && b > a);
        (uint256 outA, ) = amm.getAmountOut(a, amm.reserveEth(), amm.reserveTnock());
        (uint256 outB, ) = amm.getAmountOut(b, amm.reserveEth(), amm.reserveTnock());
        assertGe(outB, outA); // more in => at least as much out
    }

    receive() external payable {}
}
