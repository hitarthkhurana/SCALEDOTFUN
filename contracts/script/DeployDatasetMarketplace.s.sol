// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {DatasetMarketplace} from "../src/DatasetMarketplace.sol";
import {MockCUSD} from "../src/MockCUSD.sol";

contract DeployDatasetMarketplace is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address cusdAddress = vm.envAddress("CUSD_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy DatasetMarketplace
        DatasetMarketplace marketplace = new DatasetMarketplace(MockCUSD(cusdAddress));

        vm.stopBroadcast();

        console.log("===== Deployment Summary =====");
        console.log("DatasetMarketplace deployed at:", address(marketplace));
        console.log("cUSD Token:", cusdAddress);
        console.log("Owner:", msg.sender);
        console.log("Platform Fee:", marketplace.PLATFORM_FEE_BPS(), "bps (15%)");
    }
}

