// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ScaleDotFunVerification } from "../src/ScaleDotFunVerification.sol";
import { BaseScript } from "./Base.s.sol";
import { CountryCodes } from "@selfxyz/contracts/contracts/libraries/CountryCode.sol";
import { console } from "forge-std/console.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";

/// @title DeployScaleDotFun
/// @notice Deployment script for scale.fun verification contract
contract DeployScaleDotFun is BaseScript {
    // Custom errors
    error DeploymentFailed();

    /// @notice Main deployment function
    /// @return verification The deployed ScaleDotFunVerification contract instance
    /// @dev Requires environment variables:
    ///      - IDENTITY_VERIFICATION_HUB_ADDRESS: Self Protocol verification hub
    ///      - SCOPE_SEED: Unique scope for scale.fun (e.g., "scaledotfun-labeling")

    function run() public broadcast returns (ScaleDotFunVerification verification) {
        address hubAddress = vm.envAddress("IDENTITY_VERIFICATION_HUB_ADDRESS");
        string memory scopeSeed = vm.envString("SCOPE_SEED");
        
        console.log("\n==================================================");
        console.log("Deploying scale.fun Verification Contract");
        console.log("==================================================\n");
        
        // Configuration for scale.fun
        // These settings should match your frontend config!
        string[] memory forbiddenCountries = new string[](0); // No country restrictions initially
        
        SelfUtils.UnformattedVerificationConfigV2 memory verificationConfig = SelfUtils.UnformattedVerificationConfigV2({
            olderThan: 18,              // Must be at least 18 years old
            forbiddenCountries: forbiddenCountries,
            ofacEnabled: false          // Can enable OFAC sanctions checking if needed
        });

        console.log("Configuration:");
        console.log("- Minimum Age: 18");
        console.log("- Forbidden Countries: None (all countries allowed)");
        console.log("- OFAC Enabled: false");
        console.log("- Hub Address:", hubAddress);
        console.log("- Scope Seed:", scopeSeed);
        console.log("");

        // Deploy the contract
        verification = new ScaleDotFunVerification(hubAddress, scopeSeed, verificationConfig);

        // Verify deployment was successful
        if (address(verification) == address(0)) revert DeploymentFailed();

        console.log("==================================================");
        console.log("Deployment Successful!");
        console.log("==================================================");
        console.log("");
        console.log("Contract Address:", address(verification));
        console.log("Scope Value:", verification.scope());
        console.log("Config ID:", uint256(verification.verificationConfigId()));
        console.log("");
        console.log("IMPORTANT: Copy this address to your frontend!");
        console.log("Update: miniapp/apps/web/src/config/self.config.ts");
        console.log("Set CONTRACT_ADDRESS =", address(verification));
        console.log("==================================================\n");
    }
}

