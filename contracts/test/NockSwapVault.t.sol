// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { NockSwapVault } from "../src/NockSwapVault.sol";

/// Minimal 16-decimal ERC20 standing in for tNOCK (Nock.sol).
contract MockTNock {
    string public name = "Mock tNOCK";
    string public symbol = "tNOCK";
    uint8 public constant decimals = 16;
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract NockSwapVaultTest is Test {
    // 100,000 tNOCK per ETH: 100_000 * 1e16 base units per 1e18 wei.
    uint256 constant RATE = 100_000 * 1e16;

    MockTNock tnock;
    NockSwapVault vault;
    address owner = address(this);
    address alice = address(0xA11CE);

    function setUp() public {
        tnock = new MockTNock();
        vault = new NockSwapVault(address(tnock), RATE);
        tnock.mint(address(vault), 1_000_000 * 1e16); // 1M tNOCK reserve
        vm.deal(alice, 10 ether);
    }

    function test_constructor_rejectsBadConfig() public {
        vm.expectRevert(NockSwapVault.BadConfig.selector);
        new NockSwapVault(address(0), RATE);
        vm.expectRevert(NockSwapVault.BadConfig.selector);
        new NockSwapVault(address(tnock), 0);
    }

    function test_quote_matchesRate() public view {
        assertEq(vault.quote(1 ether), 100_000 * 1e16);
        assertEq(vault.quote(0.001 ether), 100 * 1e16);
        // Sub-unit dust floors to zero: less than 1 base unit's worth of wei.
        assertEq(vault.quote(1e18 / RATE / 2), 0);
    }

    function test_swap_paysTNockAndKeepsEth() public {
        vm.prank(alice);
        uint256 out = vault.swapEthForTNock{ value: 0.001 ether }();
        assertEq(out, 100 * 1e16);
        assertEq(tnock.balanceOf(alice), 100 * 1e16);
        assertEq(address(vault).balance, 0.001 ether);
        assertEq(tnock.balanceOf(address(vault)), 1_000_000 * 1e16 - 100 * 1e16);
    }

    function test_swap_noMinimum_tinyAmountsWork() public {
        // 1 wei of ETH * RATE / 1e18 = 1e21/1e18 = 1000 base units — accepted, no minimum.
        vm.prank(alice);
        uint256 out = vault.swapEthForTNock{ value: 1 }();
        assertEq(out, 1000);
    }

    function test_swap_revertsOnZeroOutput() public {
        vm.prank(alice);
        vm.expectRevert(NockSwapVault.ZeroOutput.selector);
        vault.swapEthForTNock{ value: 0 }();
    }

    function test_swap_revertsWhenReservesShort() public {
        // Reserves are 1M tNOCK (1e22 base units); 11 ETH quotes 1.1M tNOCK.
        vm.deal(alice, 11 ether);
        vm.prank(alice);
        vm.expectRevert(NockSwapVault.InsufficientReserves.selector);
        vault.swapEthForTNock{ value: 11 ether }();
    }

    function test_setRate_ownerOnly() public {
        vm.prank(alice);
        vm.expectRevert(NockSwapVault.NotOwner.selector);
        vault.setRate(1);

        vault.setRate(RATE * 2);
        assertEq(vault.quote(1 ether), 200_000 * 1e16);
    }

    function test_withdrawals_ownerOnly() public {
        vm.prank(alice);
        vault.swapEthForTNock{ value: 1 ether }();

        vm.prank(alice);
        vm.expectRevert(NockSwapVault.NotOwner.selector);
        vault.withdrawEth(payable(alice), 1 ether);

        uint256 before = address(this).balance;
        vault.withdrawEth(payable(address(this)), 1 ether);
        assertEq(address(this).balance, before + 1 ether);

        vault.withdrawTNock(address(0xB0B), 5 * 1e16);
        assertEq(tnock.balanceOf(address(0xB0B)), 5 * 1e16);
    }

    function test_receive_rejectsBlindSends() public {
        vm.prank(alice);
        (bool ok, ) = address(vault).call{ value: 1 ether }("");
        assertFalse(ok);
    }

    function test_transferOwnership() public {
        vault.transferOwnership(alice);
        vm.prank(alice);
        vault.setRate(1); // new owner can act
        vm.expectRevert(NockSwapVault.NotOwner.selector);
        vault.setRate(2); // old owner cannot
    }

    function testFuzz_swap_conservation(uint96 ethIn) public {
        vm.assume(ethIn > 0);
        uint256 expected = (uint256(ethIn) * RATE) / 1e18;
        vm.assume(expected > 0 && expected <= tnock.balanceOf(address(vault)));
        vm.deal(alice, ethIn);
        vm.prank(alice);
        uint256 out = vault.swapEthForTNock{ value: ethIn }();
        assertEq(out, expected);
        assertEq(address(vault).balance, ethIn);
    }

    receive() external payable {}
}
