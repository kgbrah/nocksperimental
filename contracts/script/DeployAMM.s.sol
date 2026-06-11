// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {NockEthAMM} from "../src/NockEthAMM.sol";

interface IERC20Deploy {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Deploys NockEthAMM (ETH/tNOCK) to Base Sepolia and seeds initial liquidity from the
///         deployer. The deployer key is read from DEPLOYER_PRIVATE_KEY (vm.envUint) so it never
///         appears in argv/logs.
///
///         AMM_TNOCK     — tNOCK token (default: our bridge Nock.sol on Base Sepolia)
///         AMM_DONATION  — 0.01%-per-swap fee recipient (default: project Base donation wallet)
///         AMM_SEED_ETH  — initial ETH liquidity (default 0.004 ETH)
///         AMM_SEED_TNOCK— initial tNOCK liquidity (default 400 tNOCK => 100,000 tNOCK/ETH)
///
/// Usage:
///   DEPLOYER_PRIVATE_KEY=$(cat ~/.config/nocklab/base-sepolia-deployer.key) \
///   forge script script/DeployAMM.s.sol:DeployAMM --rpc-url https://sepolia.base.org --broadcast
contract DeployAMM is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address tnock = vm.envOr("AMM_TNOCK", address(0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3));
        address donation = vm.envOr("AMM_DONATION", address(0xb405EbdE5F5c84372b5663D9D3A5758bb38025Da));
        uint256 seedEth = vm.envOr("AMM_SEED_ETH", uint256(0.004 ether));
        uint256 seedTnock = vm.envOr("AMM_SEED_TNOCK", uint256(400 * 1e16));

        vm.startBroadcast(deployerKey);
        NockEthAMM amm = new NockEthAMM(tnock, donation);
        if (seedEth > 0 && seedTnock > 0) {
            IERC20Deploy(tnock).approve(address(amm), seedTnock);
            amm.addLiquidity{value: seedEth}(seedTnock, 0);
        }
        vm.stopBroadcast();

        console.log("NockEthAMM deployed at:", address(amm));
        console.log("tnock:", tnock);
        console.log("donationWallet:", donation);
        console.log("seedEth:", seedEth);
        console.log("seedTnock:", seedTnock);
        console.log("reserveEth:", amm.reserveEth());
        console.log("reserveTnock:", amm.reserveTnock());
    }
}
