// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DataAnnotateEscrow} from "../src/DataAnnotateEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployDataAnnotateEscrow
 * @dev Deployment script for DataAnnotateEscrow contract
 * 
 * Usage:
 * 
 * 1. Deploy with specific USDC/token address:
 *    forge script script/DeployDataAnnotateEscrow.s.sol:DeployDataAnnotateEscrow --sig "run(address)" <token_address> --rpc-url <your_rpc_url> --broadcast --private-key <your_private_key>
 * 
 * 2. Deploy with default MockCUSD address (Celo Sepolia):
 *    forge script script/DeployDataAnnotateEscrow.s.sol:DeployDataAnnotateEscrow --rpc-url <your_rpc_url> --broadcast --private-key <your_private_key>
 * 
 * Example for Celo Sepolia testnet:
 *    forge script script/DeployDataAnnotateEscrow.s.sol:DeployDataAnnotateEscrow --rpc-url https://forno.celo-sepolia.celo-testnet.org --broadcast --private-key <your_private_key> --legacy
 */
contract DeployDataAnnotateEscrow is Script {
    DataAnnotateEscrow public escrow;
    
    // Default MockCUSD address on Celo Sepolia
    address public constant DEFAULT_TOKEN_ADDRESS = 0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0;

    /**
     * @dev Default deployment with MockCUSD address
     */
    function run() public {
        _deploy(DEFAULT_TOKEN_ADDRESS);
    }

    /**
     * @dev Deploy with custom token address
     * @param tokenAddress Address of the ERC20 token to use (USDC or MockCUSD)
     */
    function run(address tokenAddress) public {
        require(tokenAddress != address(0), "Invalid token address");
        _deploy(tokenAddress);
    }

    /**
     * @dev Internal deployment logic
     * @param tokenAddress Address of the ERC20 token to use
     */
    function _deploy(address tokenAddress) internal {
        console.log("========================================");
        console.log("Deploying DataAnnotateEscrow");
        console.log("========================================");
        console.log("Token (USDC) address:", tokenAddress);
        console.log("Deployer address:", msg.sender);
        console.log("");

        vm.startBroadcast();

        // Deploy DataAnnotateEscrow with token address
        escrow = new DataAnnotateEscrow(IERC20(tokenAddress));
        
        console.log("DataAnnotateEscrow deployed at:", address(escrow));
        console.log("USDC token configured:", address(escrow.USDC()));
        console.log("Next dataset ID:", escrow.nextDatasetId());
        console.log("");
        console.log("========================================");
        console.log("Deployment Summary");
        console.log("========================================");
        console.log("Escrow Contract:", address(escrow));
        console.log("Token Address:", tokenAddress);
        console.log("Deployer:", msg.sender);
        console.log("========================================");

        vm.stopBroadcast();
    }

    /**
     * @dev Deploy and create a test dataset
     * @param tokenAddress Address of the ERC20 token
     * @param budget Initial budget for the test dataset
     * @param curator Curator address for the test dataset
     */
    function runWithTestDataset(
        address tokenAddress,
        uint256 budget,
        address curator
    ) public {
        require(tokenAddress != address(0), "Invalid token address");
        require(budget > 0, "Budget must be > 0");
        require(curator != address(0), "Invalid curator address");

        vm.startBroadcast();

        // Deploy DataAnnotateEscrow
        escrow = new DataAnnotateEscrow(IERC20(tokenAddress));
        
        console.log("DataAnnotateEscrow deployed at:", address(escrow));
        console.log("Token address:", tokenAddress);
        
        // Approve escrow to spend tokens
        IERC20(tokenAddress).approve(address(escrow), budget);
        console.log("Approved", budget, "tokens for escrow");
        
        // Create test dataset
        uint256 datasetId = escrow.createDataset(budget, curator);
        
        console.log("");
        console.log("Test dataset created!");
        console.log("Dataset ID:", datasetId);
        console.log("Curator:", curator);
        console.log("Budget:", budget);

        vm.stopBroadcast();
    }
}

