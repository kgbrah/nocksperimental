// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForfeitFlip} from "../src/ForfeitFlip.sol";

interface IERC20Deploy {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Deploys ForfeitFlip to Base Sepolia. The deployer key is read from the DEPLOYER_PRIVATE_KEY
///         env var (via vm.envUint) so it never appears in argv/logs. Stake/bankroll params are
///         env-overridable so they can be tuned to the funded balance.
///
///         FLIP_TOKEN selects the stake asset: unset / 0x0 = native ETH (bankroll via msg.value);
///         a token address = ERC20 game (bankroll funded post-deploy via approve + fundBankroll, so the
///         deployer must already hold FLIP_BANKROLL of that token).
///
/// Usage (ETH, unchanged):
///   DEPLOYER_PRIVATE_KEY=$(cat ~/.config/nocklab/base-sepolia-deployer.key) \
///   forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast
///
/// Usage (NOCK ERC20 on Base Sepolia):
///   FLIP_TOKEN=0xA9cd4087D9B050D8B35727AAf810296CA957c7B3 \
///   FLIP_MIN_STAKE=10000000000000000 FLIP_MAX_STAKE=1000000000000000000 \
///   FLIP_BANKROLL=20000000000000000000 \
///   DEPLOYER_PRIVATE_KEY=... forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address token = vm.envOr("FLIP_TOKEN", address(0)); // address(0) = native ETH
        // Conservative testnet defaults (smallest unit); override via env to match the funded amount.
        uint256 minStake = vm.envOr("FLIP_MIN_STAKE", uint256(0.0001 ether));
        uint256 maxStake = vm.envOr("FLIP_MAX_STAKE", uint256(0.005 ether));
        uint256 revealWindow = vm.envOr("FLIP_REVEAL_WINDOW", uint256(1 hours));
        uint256 bankroll = vm.envOr("FLIP_BANKROLL", uint256(0.02 ether));

        vm.startBroadcast(deployerKey);
        ForfeitFlip flip;
        if (token == address(0)) {
            // Native ETH: fund the bankroll in the constructor.
            flip = new ForfeitFlip{value: bankroll}(token, minStake, maxStake, revealWindow);
        } else {
            // ERC20: deploy unfunded, then approve + fundBankroll (deployer must hold the token).
            flip = new ForfeitFlip(token, minStake, maxStake, revealWindow);
            if (bankroll > 0) {
                IERC20Deploy(token).approve(address(flip), bankroll);
                flip.fundBankroll(bankroll);
            }
        }
        vm.stopBroadcast();

        console.log("ForfeitFlip deployed at:", address(flip));
        console.log("token (0x0 = ETH):", token);
        console.log("house:", flip.house());
        console.log("minStake:", minStake);
        console.log("maxStake:", maxStake);
        console.log("bankroll:", bankroll);
    }
}
