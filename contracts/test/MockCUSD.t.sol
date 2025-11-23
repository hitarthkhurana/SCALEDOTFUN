// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {MockCUSD} from "../src/MockCUSD.sol";

contract MockCUSDTest is Test {
    MockCUSD public mockCUSD;
    address public owner;
    address public user1;
    address public user2;

    uint256 public constant INITIAL_SUPPLY = 1000000; // 1 million cUSD

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        mockCUSD = new MockCUSD(INITIAL_SUPPLY);
    }

    function test_InitialSetup() public view {
        assertEq(mockCUSD.name(), "Celo Dollar");
        assertEq(mockCUSD.symbol(), "cUSD");
        assertEq(mockCUSD.decimals(), 18);
        assertEq(mockCUSD.totalSupply(), INITIAL_SUPPLY * 10**18);
        assertEq(mockCUSD.balanceOf(owner), INITIAL_SUPPLY * 10**18);
    }

    function test_MintToAddress() public {
        uint256 mintAmount = 1000;
        
        mockCUSD.mint(user1, mintAmount);
        
        assertEq(mockCUSD.balanceOf(user1), mintAmount * 10**18);
        assertEq(mockCUSD.totalSupply(), (INITIAL_SUPPLY + mintAmount) * 10**18);
    }

    function test_MintWei() public {
        uint256 mintAmountWei = 1234567890123456789; // 1.234... cUSD
        
        mockCUSD.mintWei(user1, mintAmountWei);
        
        assertEq(mockCUSD.balanceOf(user1), mintAmountWei);
    }

    function test_Transfer() public {
        uint256 transferAmount = 100 * 10**18;
        
        mockCUSD.transfer(user1, transferAmount);
        
        assertEq(mockCUSD.balanceOf(user1), transferAmount);
        assertEq(mockCUSD.balanceOf(owner), (INITIAL_SUPPLY * 10**18) - transferAmount);
    }

    function test_Burn() public {
        uint256 burnAmount = 100;
        uint256 initialBalance = mockCUSD.balanceOf(owner);
        
        mockCUSD.burn(burnAmount);
        
        assertEq(mockCUSD.balanceOf(owner), initialBalance - (burnAmount * 10**18));
        assertEq(mockCUSD.totalSupply(), (INITIAL_SUPPLY - burnAmount) * 10**18);
    }

    function test_BurnWei() public {
        uint256 burnAmountWei = 1234567890123456789;
        uint256 initialBalance = mockCUSD.balanceOf(owner);
        
        mockCUSD.burnWei(burnAmountWei);
        
        assertEq(mockCUSD.balanceOf(owner), initialBalance - burnAmountWei);
    }

    function test_OnlyOwnerCanMint() public {
        vm.prank(user1);
        vm.expectRevert();
        mockCUSD.mint(user2, 100);
    }

    function test_OnlyOwnerCanMintWei() public {
        vm.prank(user1);
        vm.expectRevert();
        mockCUSD.mintWei(user2, 100 * 10**18);
    }

    function test_ApproveAndTransferFrom() public {
        uint256 approvalAmount = 500 * 10**18;
        uint256 transferAmount = 200 * 10**18;
        
        mockCUSD.approve(user1, approvalAmount);
        
        vm.prank(user1);
        mockCUSD.transferFrom(owner, user2, transferAmount);
        
        assertEq(mockCUSD.balanceOf(user2), transferAmount);
        assertEq(mockCUSD.allowance(owner, user1), approvalAmount - transferAmount);
    }

    function testFuzz_Mint(address to, uint256 amount) public {
        vm.assume(to != address(0));
        vm.assume(amount < type(uint256).max / 10**18); // Avoid overflow
        
        mockCUSD.mint(to, amount);
        
        assertEq(mockCUSD.balanceOf(to), amount * 10**18);
    }

    function testFuzz_Transfer(uint256 amount) public {
        amount = bound(amount, 0, INITIAL_SUPPLY * 10**18);
        
        mockCUSD.transfer(user1, amount);
        
        assertEq(mockCUSD.balanceOf(user1), amount);
    }
}

