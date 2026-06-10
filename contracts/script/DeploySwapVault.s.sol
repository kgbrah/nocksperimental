// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {NockSwapVault} from "../src/NockSwapVault.sol";

interface IERC20Deploy {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Deploys NockSwapVault to Base Sepolia and seeds its tNOCK reserve from the deployer's
///         balance. The deployer key is read from DEPLOYER_PRIVATE_KEY (via vm.envUint) so it never
///         appears in argv/logs.
///
///         VAULT_TNOCK  — tNOCK token (default: our bridge's Nock.sol on Base Sepolia)
///         VAULT_RATE   — tNOCK base units (16 decimals) per 1 ETH; default 1e21 = 100,000 tNOCK/ETH
///         VAULT_FUND   — initial reserve transferred from the deployer; default 1e19 = 1,000 tNOCK
///
/// Usage:
///   DEPLOYER_PRIVATE_KEY=$(cat ~/.config/nocklab/base-sepolia-deployer.key) \
///   forge script script/DeploySwapVault.s.sol:DeploySwapVault --rpc-url https://sepolia.base.org --broadcast
contract DeploySwapVault is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address tnock = vm.envOr("VAULT_TNOCK", address(0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3));
        uint256 rate = vm.envOr("VAULT_RATE", uint256(100_000 * 1e16));
        uint256 fund = vm.envOr("VAULT_FUND", uint256(1_000 * 1e16));

        vm.startBroadcast(deployerKey);
        NockSwapVault vault = new NockSwapVault(tnock, rate);
        if (fund > 0) {
            require(IERC20Deploy(tnock).transfer(address(vault), fund), "reserve funding transfer failed");
        }
        vm.stopBroadcast();

        console.log("NockSwapVault deployed at:", address(vault));
        console.log("tnock:", tnock);
        console.log("rate (base units per ETH):", rate);
        console.log("reserve funded:", fund);
        console.log("owner:", vault.owner());
    }
}
