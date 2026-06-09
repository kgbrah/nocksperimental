// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForfeitFlip} from "../src/ForfeitFlip.sol";

/// @notice Deploys ForfeitFlip to Base Sepolia. The deployer key is read from the DEPLOYER_PRIVATE_KEY
///         env var (via vm.envUint) so it never appears in argv/logs. Stake/bankroll params are
///         env-overridable so they can be tuned to the funded balance.
///
/// Usage:
///   DEPLOYER_PRIVATE_KEY=$(cat ~/.config/nocklab/base-sepolia-deployer.key) \
///   forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        // Conservative testnet defaults (wei); override via env to match the funded amount.
        uint256 minStake = vm.envOr("FLIP_MIN_STAKE", uint256(0.0001 ether));
        uint256 maxStake = vm.envOr("FLIP_MAX_STAKE", uint256(0.005 ether));
        uint256 revealWindow = vm.envOr("FLIP_REVEAL_WINDOW", uint256(1 hours));
        uint256 bankroll = vm.envOr("FLIP_BANKROLL", uint256(0.02 ether));

        vm.startBroadcast(deployerKey);
        ForfeitFlip flip = new ForfeitFlip{value: bankroll}(minStake, maxStake, revealWindow);
        vm.stopBroadcast();

        console.log("ForfeitFlip deployed at:", address(flip));
        console.log("house:", flip.house());
        console.log("minStake:", minStake);
        console.log("maxStake:", maxStake);
        console.log("bankroll:", bankroll);
    }
}
