// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {DataAnnotateEscrow} from "src/DataAnnotateEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6); // 1M USDC with 6 decimals
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/**
 * @title DataAnnotateEscrowTest
 * @notice Comprehensive unit tests for DataAnnotateEscrow
 */
contract DataAnnotateEscrowTest is Test {
    DataAnnotateEscrow public escrow;
    MockERC20 public usdc;

    address public curator = makeAddr("curator");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public user3 = makeAddr("user3");

    uint256 constant INITIAL_BALANCE = 100_000 * 10 ** 6; // 100k USDC
    uint256 constant DATASET_BUDGET = 10_000 * 10 ** 6; // 10k USDC

    event DatasetCreated(uint256 indexed datasetId, address curator, uint256 budget);
    event DatasetClosed(uint256 indexed datasetId, uint256 refunded);
    event Distributed(uint256 indexed datasetId, address indexed user, uint256 amount);

    function setUp() public {
        // Deploy contracts
        usdc = new MockERC20();
        escrow = new DataAnnotateEscrow(IERC20(address(usdc)));

        // Setup balances
        usdc.mint(curator, INITIAL_BALANCE);
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
    }

    // ============================================================
    // Constructor Tests
    // ============================================================

    function test_Constructor() public view {
        assertEq(address(escrow.USDC()), address(usdc), "USDC address mismatch");
        assertEq(escrow.nextDatasetId(), 0, "Initial nextDatasetId should be 0");
    }

    // ============================================================
    // Dataset Creation Tests
    // ============================================================

    function test_CreateDataset() public {
        uint256 budget = DATASET_BUDGET;

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 balanceBefore = usdc.balanceOf(curator);

        vm.expectEmit(true, true, true, true);
        emit DatasetCreated(0, curator, budget);

        uint256 datasetId = escrow.createDataset(budget, curator);

        vm.stopPrank();

        // Verify dataset
        assertEq(datasetId, 0, "First dataset ID should be 0");
        assertEq(escrow.nextDatasetId(), 1, "Next dataset ID should increment");

        (address dataFunder, address dataCurator, uint256 remaining, bool active) = escrow.datasets(datasetId);
        assertEq(dataFunder, curator, "Funder mismatch");
        assertEq(dataCurator, curator, "Curator mismatch");
        assertEq(remaining, budget, "Budget mismatch");
        assertTrue(active, "Dataset should be active");

        // Verify token transfer
        assertEq(usdc.balanceOf(curator), balanceBefore - budget, "Curator balance incorrect");
        assertEq(usdc.balanceOf(address(escrow)), budget, "Escrow balance incorrect");
    }

    function test_CreateDataset_MultipleDatasets() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);

        uint256 id1 = escrow.createDataset(1000, curator);
        uint256 id2 = escrow.createDataset(2000, curator);
        uint256 id3 = escrow.createDataset(3000, curator);

        vm.stopPrank();

        assertEq(id1, 0, "First ID incorrect");
        assertEq(id2, 1, "Second ID incorrect");
        assertEq(id3, 2, "Third ID incorrect");
        assertEq(escrow.nextDatasetId(), 3, "Next ID incorrect");
    }

    function test_RevertWhen_CreateDatasetWithZeroBudget() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), 0);

        vm.expectRevert("Budget must be > 0");
        escrow.createDataset(0, curator);

        vm.stopPrank();
    }

    function test_RevertWhen_CreateDatasetWithoutApproval() public {
        vm.startPrank(curator);

        vm.expectRevert();
        escrow.createDataset(DATASET_BUDGET, curator);

        vm.stopPrank();
    }

    function test_RevertWhen_CreateDatasetWithInsufficientBalance() public {
        address poorCurator = makeAddr("poorCurator");
        usdc.mint(poorCurator, 100);

        vm.startPrank(poorCurator);
        usdc.approve(address(escrow), type(uint256).max);

        vm.expectRevert();
        escrow.createDataset(1000, poorCurator);

        vm.stopPrank();
    }

    // ============================================================
    // TopUp Dataset Tests
    // ============================================================

    function test_TopUpDataset() public {
        // Create dataset
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        // Top up
        uint256 topUpAmount = 5_000 * 10 ** 6;
        uint256 balanceBefore = usdc.balanceOf(curator);

        escrow.topUpDataset(datasetId, topUpAmount);

        vm.stopPrank();

        // Verify
        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, DATASET_BUDGET + topUpAmount, "Budget not increased");
        assertEq(usdc.balanceOf(curator), balanceBefore - topUpAmount, "Curator balance incorrect");
    }

    function test_RevertWhen_TopUpDatasetNotCurator() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);
        vm.stopPrank();

        vm.startPrank(user1);
        usdc.approve(address(escrow), 1000);

        vm.expectRevert("Not dataset funder or curator");
        escrow.topUpDataset(datasetId, 1000);

        vm.stopPrank();
    }

    function test_RevertWhen_TopUpInactiveDataset() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        // Close dataset
        escrow.closeDataset(datasetId);

        // Try to top up
        vm.expectRevert("Dataset inactive");
        escrow.topUpDataset(datasetId, 1000);

        vm.stopPrank();
    }

    function test_RevertWhen_TopUpWithZeroAmount() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        vm.expectRevert("Amount must be > 0");
        escrow.topUpDataset(datasetId, 0);

        vm.stopPrank();
    }

    // ============================================================
    // Distribute Tests
    // ============================================================

    function test_Distribute() public {
        // Create dataset
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        // Distribute
        uint256 amount = 1_000 * 10 ** 6;
        uint256 userBalanceBefore = usdc.balanceOf(user1);

        vm.expectEmit(true, true, true, true);
        emit Distributed(datasetId, user1, amount);

        escrow.distribute(datasetId, user1, amount);

        vm.stopPrank();

        // Verify - user should receive USDC directly
        assertEq(usdc.balanceOf(user1), userBalanceBefore + amount, "User did not receive USDC");
        
        // Verify dataset budget reduced
        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, DATASET_BUDGET - amount, "Dataset budget not reduced");
    }

    function test_Distribute_MultipleUsers() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        uint256 amount1 = 1_000 * 10 ** 6;
        uint256 amount2 = 2_000 * 10 ** 6;
        uint256 amount3 = 3_000 * 10 ** 6;

        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        uint256 user3BalanceBefore = usdc.balanceOf(user3);

        escrow.distribute(datasetId, user1, amount1);
        escrow.distribute(datasetId, user2, amount2);
        escrow.distribute(datasetId, user3, amount3);

        vm.stopPrank();

        // Verify users received USDC
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + amount1, "User1 balance incorrect");
        assertEq(usdc.balanceOf(user2), user2BalanceBefore + amount2, "User2 balance incorrect");
        assertEq(usdc.balanceOf(user3), user3BalanceBefore + amount3, "User3 balance incorrect");

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, DATASET_BUDGET - amount1 - amount2 - amount3, "Dataset budget incorrect");
    }

    function test_Distribute_SameUserMultipleTimes() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        uint256 amount = 1_000 * 10 ** 6;
        uint256 userBalanceBefore = usdc.balanceOf(user1);

        escrow.distribute(datasetId, user1, amount);
        escrow.distribute(datasetId, user1, amount);
        escrow.distribute(datasetId, user1, amount);

        vm.stopPrank();

        assertEq(usdc.balanceOf(user1), userBalanceBefore + (amount * 3), "User balance incorrect");
    }

    function test_RevertWhen_DistributeExceedsBudget() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        vm.expectRevert("Dataset budget exceeded");
        escrow.distribute(datasetId, user1, DATASET_BUDGET + 1);

        vm.stopPrank();
    }

    function test_RevertWhen_DistributeNotCurator() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);
        vm.stopPrank();

        vm.startPrank(user1);

        vm.expectRevert("Not dataset curator");
        escrow.distribute(datasetId, user2, 1000);

        vm.stopPrank();
    }

    function test_RevertWhen_DistributeToInactiveDataset() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        escrow.closeDataset(datasetId);

        vm.expectRevert("Dataset inactive");
        escrow.distribute(datasetId, user1, 1000);

        vm.stopPrank();
    }

    function test_RevertWhen_DistributeToZeroAddress() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        vm.expectRevert("Cannot distribute to zero address");
        escrow.distribute(datasetId, address(0), 1000);

        vm.stopPrank();
    }

    function test_RevertWhen_DistributeZeroAmount() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        vm.expectRevert("Amount must be > 0");
        escrow.distribute(datasetId, user1, 0);

        vm.stopPrank();
    }

    // ============================================================
    // Close Dataset Tests
    // ============================================================

    function test_CloseDataset() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        uint256 balanceBefore = usdc.balanceOf(curator);

        vm.expectEmit(true, true, true, true);
        emit DatasetClosed(datasetId, DATASET_BUDGET);

        escrow.closeDataset(datasetId);

        vm.stopPrank();

        // Verify
        (,,, bool active) = escrow.datasets(datasetId);
        assertFalse(active, "Dataset should be inactive");

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, 0, "Remaining budget should be 0");

        assertEq(usdc.balanceOf(curator), balanceBefore + DATASET_BUDGET, "Refund incorrect");
    }

    function test_CloseDataset_WithPartialSpending() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        uint256 spent = 3_000 * 10 ** 6;
        escrow.distribute(datasetId, user1, spent);

        uint256 balanceBefore = usdc.balanceOf(curator);
        uint256 expectedRefund = DATASET_BUDGET - spent;

        vm.expectEmit(true, true, true, true);
        emit DatasetClosed(datasetId, expectedRefund);

        escrow.closeDataset(datasetId);

        vm.stopPrank();

        assertEq(usdc.balanceOf(curator), balanceBefore + expectedRefund, "Refund incorrect");
    }

    function test_CloseDataset_WithFullSpending() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        escrow.distribute(datasetId, user1, DATASET_BUDGET);

        uint256 balanceBefore = usdc.balanceOf(curator);

        vm.expectEmit(true, true, true, true);
        emit DatasetClosed(datasetId, 0);

        escrow.closeDataset(datasetId);

        vm.stopPrank();

        assertEq(usdc.balanceOf(curator), balanceBefore, "Balance should not change");
    }

    function test_RevertWhen_CloseDatasetNotCurator() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);
        vm.stopPrank();

        vm.startPrank(user1);

        vm.expectRevert("Not dataset funder or curator");
        escrow.closeDataset(datasetId);

        vm.stopPrank();
    }

    function test_RevertWhen_CloseDatasetAlreadyClosed() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        escrow.closeDataset(datasetId);

        vm.expectRevert("Already closed");
        escrow.closeDataset(datasetId);

        vm.stopPrank();
    }

    // ============================================================
    // Integration Tests
    // ============================================================

    function test_Integration_CompleteWorkflow() public {
        // 1. Curator creates dataset
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        // Track initial balances
        uint256 user1InitialBalance = usdc.balanceOf(user1);
        uint256 user2InitialBalance = usdc.balanceOf(user2);
        uint256 user3InitialBalance = usdc.balanceOf(user3);

        // 2. Curator distributes to multiple users (direct transfers)
        escrow.distribute(datasetId, user1, 2_000 * 10 ** 6);
        escrow.distribute(datasetId, user2, 3_000 * 10 ** 6);
        escrow.distribute(datasetId, user3, 1_000 * 10 ** 6);

        // Verify users received funds
        assertEq(usdc.balanceOf(user1), user1InitialBalance + 2_000 * 10 ** 6, "User1 didn't receive funds");
        assertEq(usdc.balanceOf(user2), user2InitialBalance + 3_000 * 10 ** 6, "User2 didn't receive funds");
        assertEq(usdc.balanceOf(user3), user3InitialBalance + 1_000 * 10 ** 6, "User3 didn't receive funds");

        // 3. Curator tops up
        escrow.topUpDataset(datasetId, 5_000 * 10 ** 6);

        // 4. More distributions
        escrow.distribute(datasetId, user1, 500 * 10 ** 6);

        // 5. Close dataset
        escrow.closeDataset(datasetId);

        vm.stopPrank();

        // Verify final state
        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, 0, "Should have no remaining budget");
    }

    function test_Integration_MultipleDatasets() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);

        // Create multiple datasets
        uint256 dataset1 = escrow.createDataset(5_000 * 10 ** 6, curator);
        uint256 dataset2 = escrow.createDataset(7_000 * 10 ** 6, curator);
        uint256 dataset3 = escrow.createDataset(3_000 * 10 ** 6, curator);

        uint256 user1InitialBalance = usdc.balanceOf(user1);
        uint256 user2InitialBalance = usdc.balanceOf(user2);

        // Distribute from different datasets
        escrow.distribute(dataset1, user1, 1_000 * 10 ** 6);
        escrow.distribute(dataset2, user1, 2_000 * 10 ** 6);
        escrow.distribute(dataset3, user2, 1_500 * 10 ** 6);

        // Close one dataset
        escrow.closeDataset(dataset2);

        vm.stopPrank();

        // Verify users received correct amounts
        assertEq(usdc.balanceOf(user1), user1InitialBalance + 3_000 * 10 ** 6, "User1 total incorrect");
        assertEq(usdc.balanceOf(user2), user2InitialBalance + 1_500 * 10 ** 6, "User2 total incorrect");

        // Verify datasets
        (,,, bool active1) = escrow.datasets(dataset1);
        (,,, bool active2) = escrow.datasets(dataset2);
        (,,, bool active3) = escrow.datasets(dataset3);

        assertTrue(active1, "Dataset1 should be active");
        assertFalse(active2, "Dataset2 should be inactive");
        assertTrue(active3, "Dataset3 should be active");
    }

    // ============================================================
    // Funder/Curator Separation Tests
    // ============================================================

    function test_CreateDataset_WithSeparateCurator() public {
        address backendWallet = makeAddr("backend");
        
        vm.startPrank(curator);
        usdc.approve(address(escrow), DATASET_BUDGET);

        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, backendWallet);

        vm.stopPrank();

        // Verify funder and curator are different
        (address funder, address dataCurator,, bool active) = escrow.datasets(datasetId);
        assertEq(funder, curator, "Funder should be curator");
        assertEq(dataCurator, backendWallet, "Curator should be backend wallet");
        assertTrue(active, "Dataset should be active");
    }

    function test_FunderCanTopUp_CuratorCanDistribute() public {
        address backendWallet = makeAddr("backend");
        
        // Funder creates dataset with backend as curator
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, backendWallet);
        vm.stopPrank();

        // Curator (backend) can distribute
        vm.prank(backendWallet);
        escrow.distribute(datasetId, user1, 1_000 * 10 ** 6);
        assertEq(usdc.balanceOf(user1), INITIAL_BALANCE + 1_000 * 10 ** 6, "User1 should receive funds");

        // Funder can top up
        vm.startPrank(curator);
        escrow.topUpDataset(datasetId, 5_000 * 10 ** 6);
        vm.stopPrank();

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, DATASET_BUDGET - 1_000 * 10 ** 6 + 5_000 * 10 ** 6, "Budget should be updated");
    }

    function test_CuratorCanAlsoTopUp() public {
        address backendWallet = makeAddr("backend");
        
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, backendWallet);
        vm.stopPrank();

        // Curator can also top up (needs their own funds)
        usdc.mint(backendWallet, 5_000 * 10 ** 6);
        
        vm.startPrank(backendWallet);
        usdc.approve(address(escrow), 5_000 * 10 ** 6);
        escrow.topUpDataset(datasetId, 5_000 * 10 ** 6);
        vm.stopPrank();

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, DATASET_BUDGET + 5_000 * 10 ** 6, "Budget should include topup");
    }

    function test_FunderCanCloseDataset() public {
        address backendWallet = makeAddr("backend");
        
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, backendWallet);
        vm.stopPrank();

        // Distribute some funds
        vm.prank(backendWallet);
        escrow.distribute(datasetId, user1, 3_000 * 10 ** 6);

        // Funder closes dataset
        uint256 funderBalanceBefore = usdc.balanceOf(curator);
        
        vm.prank(curator);
        escrow.closeDataset(datasetId);

        // Refund should go to funder
        uint256 expectedRefund = DATASET_BUDGET - 3_000 * 10 ** 6;
        assertEq(usdc.balanceOf(curator), funderBalanceBefore + expectedRefund, "Funder should receive refund");
    }

    function test_CuratorCanCloseDataset() public {
        address backendWallet = makeAddr("backend");
        
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, backendWallet);
        vm.stopPrank();

        // Curator closes dataset
        uint256 funderBalanceBefore = usdc.balanceOf(curator);
        
        vm.prank(backendWallet);
        escrow.closeDataset(datasetId);

        // Refund still goes to funder
        assertEq(usdc.balanceOf(curator), funderBalanceBefore + DATASET_BUDGET, "Funder should receive refund");
    }

    function test_RevertWhen_CreateDatasetWithZeroAddressCurator() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), DATASET_BUDGET);

        vm.expectRevert("Curator cannot be zero address");
        escrow.createDataset(DATASET_BUDGET, address(0));

        vm.stopPrank();
    }

    function test_RevertWhen_FunderDistributes() public {
        address backendWallet = makeAddr("backend");
        
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, backendWallet);

        // Funder tries to distribute (should fail)
        vm.expectRevert("Not dataset curator");
        escrow.distribute(datasetId, user1, 1_000 * 10 ** 6);

        vm.stopPrank();
    }

    // ============================================================
    // Edge Cases
    // ============================================================

    function test_EdgeCase_DistributeEntireBudgetAtOnce() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);
        uint256 datasetId = escrow.createDataset(DATASET_BUDGET, curator);

        uint256 userBalanceBefore = usdc.balanceOf(user1);

        escrow.distribute(datasetId, user1, DATASET_BUDGET);

        vm.stopPrank();

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, 0, "Budget should be fully depleted");
        assertEq(usdc.balanceOf(user1), userBalanceBefore + DATASET_BUDGET, "User should have full budget");
    }

    function test_EdgeCase_CreateDatasetWithMinimumBudget() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);

        uint256 datasetId = escrow.createDataset(1, curator);

        vm.stopPrank();

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, 1, "Minimum budget should work");
    }

    function test_EdgeCase_DistributeToSameUserMultipleDatasets() public {
        vm.startPrank(curator);
        usdc.approve(address(escrow), type(uint256).max);

        uint256 dataset1 = escrow.createDataset(5_000 * 10 ** 6, curator);
        uint256 dataset2 = escrow.createDataset(5_000 * 10 ** 6, curator);

        uint256 userBalanceBefore = usdc.balanceOf(user1);

        escrow.distribute(dataset1, user1, 1_000 * 10 ** 6);
        escrow.distribute(dataset2, user1, 2_000 * 10 ** 6);

        vm.stopPrank();

        assertEq(usdc.balanceOf(user1), userBalanceBefore + 3_000 * 10 ** 6, "User should receive from both datasets");
    }
}
