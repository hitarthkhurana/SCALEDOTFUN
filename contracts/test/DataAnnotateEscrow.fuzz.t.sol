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
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/**
 * @title DataAnnotateEscrowFuzzTest
 * @notice Fuzz tests for DataAnnotateEscrow
 */
contract DataAnnotateEscrowFuzzTest is Test {
    DataAnnotateEscrow public escrow;
    MockERC20 public usdc;

    address public curator;
    address[] public users;

    uint256 constant MAX_BUDGET = type(uint96).max; // Reasonable max to avoid overflow

    function setUp() public {
        usdc = new MockERC20();
        escrow = new DataAnnotateEscrow(IERC20(address(usdc)));

        curator = makeAddr("curator");

        // Create some test users
        for (uint256 i = 0; i < 10; i++) {
            users.push(makeAddr(string(abi.encodePacked("user", i))));
        }
    }

    // ============================================================
    // Fuzz: Dataset Creation
    // ============================================================

    function testFuzz_CreateDataset(uint96 budget) public {
        vm.assume(budget > 0);

        // Setup
        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        // Create dataset
        uint256 datasetId = escrow.createDataset(budget, curator);

        vm.stopPrank();

        // Verify
        (, address dataCurator, uint256 remaining, bool active) = escrow.datasets(datasetId);
        assertEq(dataCurator, curator, "Curator mismatch");
        assertEq(remaining, budget, "Budget mismatch");
        assertTrue(active, "Dataset should be active");
        assertEq(usdc.balanceOf(address(escrow)), budget, "Escrow balance incorrect");
    }

    function testFuzz_CreateMultipleDatasets(uint96 budget1, uint96 budget2, uint96 budget3) public {
        vm.assume(budget1 > 0 && budget2 > 0 && budget3 > 0);
        vm.assume(uint256(budget1) + uint256(budget2) + uint256(budget3) <= MAX_BUDGET);

        uint256 totalBudget = uint256(budget1) + uint256(budget2) + uint256(budget3);
        usdc.mint(curator, totalBudget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), totalBudget);

        uint256 id1 = escrow.createDataset(budget1, curator);
        uint256 id2 = escrow.createDataset(budget2, curator);
        uint256 id3 = escrow.createDataset(budget3, curator);

        vm.stopPrank();

        assertEq(id1, 0, "First ID should be 0");
        assertEq(id2, 1, "Second ID should be 1");
        assertEq(id3, 2, "Third ID should be 2");
        assertEq(usdc.balanceOf(address(escrow)), totalBudget, "Escrow balance incorrect");
    }

    // ============================================================
    // Fuzz: Top Up
    // ============================================================

    function testFuzz_TopUpDataset(uint96 initialBudget, uint96 topUpAmount) public {
        vm.assume(initialBudget > 0 && topUpAmount > 0);
        vm.assume(uint256(initialBudget) + uint256(topUpAmount) <= MAX_BUDGET);

        uint256 totalAmount = uint256(initialBudget) + uint256(topUpAmount);
        usdc.mint(curator, totalAmount);

        vm.startPrank(curator);
        usdc.approve(address(escrow), totalAmount);

        uint256 datasetId = escrow.createDataset(initialBudget, curator);
        escrow.topUpDataset(datasetId, topUpAmount);

        vm.stopPrank();

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, totalAmount, "Budget should equal initial + topup");
    }

    // ============================================================
    // Fuzz: Distribute
    // ============================================================

    function testFuzz_Distribute(uint96 budget, uint96 amount, uint256 userSeed) public {
        vm.assume(budget > 0);
        vm.assume(amount > 0 && amount <= budget);

        address user = users[bound(userSeed, 0, users.length - 1)];
        vm.assume(user != address(0));

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);
        
        uint256 userBalanceBefore = usdc.balanceOf(user);
        escrow.distribute(datasetId, user, amount);

        vm.stopPrank();

        // Verify user received USDC directly
        assertEq(usdc.balanceOf(user), userBalanceBefore + amount, "User didn't receive USDC");
        
        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, budget - amount, "Dataset budget not reduced correctly");
    }

    function testFuzz_DistributeMultipleTimes(
        uint96 budget,
        uint96 amount1,
        uint96 amount2,
        uint96 amount3,
        uint256 userSeed
    ) public {
        vm.assume(budget > 0);
        vm.assume(amount1 > 0 && amount2 > 0 && amount3 > 0);

        uint256 totalAmount = uint256(amount1) + uint256(amount2) + uint256(amount3);
        vm.assume(totalAmount <= budget);

        address user = users[bound(userSeed, 0, users.length - 1)];
        vm.assume(user != address(0));

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);
        
        uint256 userBalanceBefore = usdc.balanceOf(user);
        
        escrow.distribute(datasetId, user, amount1);
        escrow.distribute(datasetId, user, amount2);
        escrow.distribute(datasetId, user, amount3);

        vm.stopPrank();

        assertEq(usdc.balanceOf(user), userBalanceBefore + totalAmount, "User balance incorrect");
        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, budget - totalAmount, "Dataset budget incorrect");
    }

    function testFuzz_DistributeToMultipleUsers(
        uint96 budget,
        uint96 amount1,
        uint96 amount2,
        uint256 userSeed1,
        uint256 userSeed2
    ) public {
        vm.assume(budget > 0);
        vm.assume(amount1 > 0 && amount2 > 0);

        uint256 totalAmount = uint256(amount1) + uint256(amount2);
        vm.assume(totalAmount <= budget);

        address user1 = users[bound(userSeed1, 0, users.length - 1)];
        address user2 = users[bound(userSeed2, 0, users.length - 1)];
        vm.assume(user1 != address(0) && user2 != address(0));

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);
        
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        escrow.distribute(datasetId, user1, amount1);
        escrow.distribute(datasetId, user2, amount2);

        vm.stopPrank();

        // Verify users received USDC
        if (user1 == user2) {
            assertEq(usdc.balanceOf(user1), user1BalanceBefore + totalAmount, "Same user balance incorrect");
        } else {
            assertEq(usdc.balanceOf(user1), user1BalanceBefore + amount1, "User1 balance incorrect");
            assertEq(usdc.balanceOf(user2), user2BalanceBefore + amount2, "User2 balance incorrect");
        }

        // Verify dataset budget reduced correctly
        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, budget - totalAmount, "Dataset budget incorrect");
    }

    // ============================================================
    // Fuzz: Close Dataset
    // ============================================================

    function testFuzz_CloseDataset(uint96 budget, uint96 spentAmount) public {
        vm.assume(budget > 0);
        vm.assume(spentAmount <= budget);

        address user = users[0];

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);

        if (spentAmount > 0) {
            escrow.distribute(datasetId, user, spentAmount);
        }

        uint256 expectedRefund = budget - spentAmount;
        uint256 balanceBefore = usdc.balanceOf(curator);

        escrow.closeDataset(datasetId);

        vm.stopPrank();

        // Verify
        (,,, bool active) = escrow.datasets(datasetId);
        assertFalse(active, "Dataset should be inactive");

        assertEq(usdc.balanceOf(curator), balanceBefore + expectedRefund, "Refund incorrect");
    }

    // ============================================================
    // Fuzz: Property Tests
    // ============================================================

    /// @notice Property: Total distributed should never exceed dataset budget
    function testFuzz_Property_DistributionNeverExceedsBudget(
        uint96 budget,
        uint96[5] memory amounts
    ) public {
        vm.assume(budget > 0);

        uint256 totalDistributions = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                totalDistributions += amounts[i];
            }
        }

        vm.assume(totalDistributions <= budget);

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);

        uint256 actualDistributed = 0;
        for (uint256 i = 0; i < amounts.length && amounts[i] > 0; i++) {
            if (amounts[i] <= budget - actualDistributed) {
                escrow.distribute(datasetId, users[i], amounts[i]);
                actualDistributed += amounts[i];
            }
        }

        vm.stopPrank();

        (,, uint256 remaining,) = escrow.datasets(datasetId);
        assertEq(remaining, budget - actualDistributed, "Remaining budget incorrect");
        assertLe(actualDistributed, budget, "Distributed amount exceeds budget");
    }

    /// @notice Property: Escrow balance equals sum of dataset budgets
    function testFuzz_Property_EscrowBalanceEqualsDatasetBudgets(
        uint96 budget1,
        uint96 budget2,
        uint96 dist1,
        uint96 dist2
    ) public {
        vm.assume(budget1 > 0 && budget2 > 0);
        vm.assume(dist1 <= budget1 && dist2 <= budget2);

        uint256 totalBudget = uint256(budget1) + uint256(budget2);
        usdc.mint(curator, totalBudget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), totalBudget);

        uint256 dataset1 = escrow.createDataset(budget1, curator);
        uint256 dataset2 = escrow.createDataset(budget2, curator);

        if (dist1 > 0) {
            escrow.distribute(dataset1, users[0], dist1);
        }
        if (dist2 > 0) {
            escrow.distribute(dataset2, users[1], dist2);
        }

        vm.stopPrank();

        // Calculate total remaining budgets
        (,, uint256 remaining1,) = escrow.datasets(dataset1);
        (,, uint256 remaining2,) = escrow.datasets(dataset2);
        uint256 totalRemaining = remaining1 + remaining2;

        // Property: totalRemaining should equal escrow USDC balance
        uint256 escrowBalance = usdc.balanceOf(address(escrow));
        assertEq(
            totalRemaining,
            escrowBalance,
            "Remaining budgets != escrow balance"
        );
    }

    /// @notice Property: Users receive exact distribution amounts
    function testFuzz_Property_UsersReceiveExactAmounts(
        uint96 budget,
        uint96[3] memory distributions
    ) public {
        vm.assume(budget > 0);

        uint256 totalDist = 0;
        for (uint256 i = 0; i < distributions.length; i++) {
            totalDist += distributions[i];
        }
        vm.assume(totalDist <= budget);

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);

        uint256 totalUserBalanceIncrease = 0;
        for (uint256 i = 0; i < distributions.length; i++) {
            if (distributions[i] > 0) {
                uint256 userBalanceBefore = usdc.balanceOf(users[i]);
                escrow.distribute(datasetId, users[i], distributions[i]);
                uint256 userBalanceAfter = usdc.balanceOf(users[i]);
                
                uint256 increase = userBalanceAfter - userBalanceBefore;
                assertEq(increase, distributions[i], "User didn't receive exact amount");
                totalUserBalanceIncrease += increase;
            }
        }

        vm.stopPrank();

        // Property: total distributed equals sum of user balance increases
        assertEq(totalUserBalanceIncrease, totalDist, "Total distributed mismatch");
    }

    /// @notice Property: Dataset budget accounting is accurate
    function testFuzz_Property_DatasetBudgetAccounting(
        uint96 budget,
        uint96 dist1,
        uint96 dist2,
        uint96 dist3
    ) public {
        vm.assume(budget > 0);
        vm.assume(dist1 > 0 && dist2 > 0 && dist3 > 0);

        uint256 totalDist = uint256(dist1) + uint256(dist2) + uint256(dist3);
        vm.assume(totalDist <= budget);

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);

        (,, uint256 remainingStart,) = escrow.datasets(datasetId);
        assertEq(remainingStart, budget, "Initial budget incorrect");

        escrow.distribute(datasetId, users[0], dist1);
        (,, uint256 remaining1,) = escrow.datasets(datasetId);
        assertEq(remaining1, budget - dist1, "Budget after dist1 incorrect");

        escrow.distribute(datasetId, users[1], dist2);
        (,, uint256 remaining2,) = escrow.datasets(datasetId);
        assertEq(remaining2, budget - dist1 - dist2, "Budget after dist2 incorrect");

        escrow.distribute(datasetId, users[2], dist3);
        (,, uint256 remaining3,) = escrow.datasets(datasetId);
        assertEq(remaining3, budget - totalDist, "Budget after dist3 incorrect");

        vm.stopPrank();
    }

    /// @notice Property: Closing dataset returns correct refund
    function testFuzz_Property_CloseDatasetRefund(
        uint96 budget,
        uint96 spent
    ) public {
        vm.assume(budget > 0);
        vm.assume(spent <= budget);

        usdc.mint(curator, budget);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        uint256 datasetId = escrow.createDataset(budget, curator);

        if (spent > 0) {
            escrow.distribute(datasetId, users[0], spent);
        }

        uint256 curatorBalanceBefore = usdc.balanceOf(curator);
        uint256 expectedRefund = budget - spent;

        escrow.closeDataset(datasetId);

        vm.stopPrank();

        uint256 curatorBalanceAfter = usdc.balanceOf(curator);
        uint256 actualRefund = curatorBalanceAfter - curatorBalanceBefore;

        assertEq(actualRefund, expectedRefund, "Refund amount incorrect");
    }
}
