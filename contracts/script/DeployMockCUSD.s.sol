// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockCUSD} from "../src/MockCUSD.sol";

/**
 * @title DeployMockCUSD
 * @dev Deployment script for MockCUSD token
 * 
 * Usage:
 * 
 * 1. Deploy with initial supply to deployer:
 *    forge script script/DeployMockCUSD.s.sol:DeployMockCUSD --rpc-url <your_rpc_url> --broadcast --verify
 * 
 * 2. Deploy and mint to a specific address:
 *    forge script script/DeployMockCUSD.s.sol:DeployMockCUSD --sig "run(address,uint256)" <recipient_address> <amount> --rpc-url <your_rpc_url> --broadcast
 * 
 * Example for local testing (Anvil):
 *    forge script script/DeployMockCUSD.s.sol:DeployMockCUSD --rpc-url http://localhost:8545 --broadcast --private-key <your_private_key>
 * 
 * Example for Celo Alfajores testnet:
 *    forge script script/DeployMockCUSD.s.sol:DeployMockCUSD --rpc-url https://alfajores-forno.celo-testnet.org --broadcast --legacy
 */
contract DeployMockCUSD is Script {
    MockCUSD public mockCUSD;
    
    // Default initial supply (can be overridden)
    uint256 public constant DEFAULT_INITIAL_SUPPLY = 1000000; // 1 million cUSD

    /**
     * @dev Default deployment with initial supply to deployer
     */
    function run() public {
        vm.startBroadcast();

        // Deploy MockCUSD with default initial supply
        mockCUSD = new MockCUSD(DEFAULT_INITIAL_SUPPLY);
        
        console.log("MockCUSD deployed at:", address(mockCUSD));
        console.log("Initial supply:", DEFAULT_INITIAL_SUPPLY, "cUSD");
        console.log("Deployer address:", msg.sender);
        console.log("Deployer balance:", mockCUSD.balanceOf(msg.sender) / 10**18, "cUSD");

        vm.stopBroadcast();
    }

    /**
     * @dev Deploy and mint to a specific address
     * @param recipient Address to receive the minted tokens
     * @param amount Amount of tokens to mint (in whole units)
     */
    function run(address recipient, uint256 amount) public {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        vm.startBroadcast();

        // Deploy MockCUSD with 0 initial supply
        mockCUSD = new MockCUSD(0);
        
        console.log("MockCUSD deployed at:", address(mockCUSD));
        console.log("Deployer address:", msg.sender);
        
        // Mint tokens to recipient
        mockCUSD.mint(recipient, amount);
        
        console.log("Minted", amount, "cUSD to:", recipient);
        console.log("Recipient balance:", mockCUSD.balanceOf(recipient) / 10**18, "cUSD");

        vm.stopBroadcast();
    }

    /**
     * @dev Deploy with custom initial supply
     * @param initialSupply Initial supply to mint to deployer
     */
    function runWithSupply(uint256 initialSupply) public {
        vm.startBroadcast();

        // Deploy MockCUSD with custom initial supply
        mockCUSD = new MockCUSD(initialSupply);
        
        console.log("MockCUSD deployed at:", address(mockCUSD));
        console.log("Initial supply:", initialSupply, "cUSD");
        console.log("Deployer address:", msg.sender);
        console.log("Deployer balance:", mockCUSD.balanceOf(msg.sender) / 10**18, "cUSD");

        vm.stopBroadcast();
    }
}

