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
 * @title DataAnnotateEscrowHandler
 * @notice Handler contract for invariant testing
 */
contract DataAnnotateEscrowHandler is Test {
    DataAnnotateEscrow public escrow;
    MockERC20 public usdc;

    // Actors
    address[] public curators;
    address[] public users;

    // Ghost variables for tracking
    uint256 public ghost_totalDeposited;
    uint256 public ghost_totalDistributed;
    uint256 public ghost_totalRefunded;

    // Track created datasets
    uint256[] public createdDatasets;
    mapping(uint256 => bool) public datasetExists;

    // Bounds
    uint256 constant MAX_AMOUNT = 1_000_000 * 10 ** 6; // 1M USDC
    uint256 constant MIN_AMOUNT = 1;

    constructor(DataAnnotateEscrow _escrow, MockERC20 _usdc) {
        escrow = _escrow;
        usdc = _usdc;

        // Initialize curators
        for (uint256 i = 0; i < 3; i++) {
            address curator = makeAddr(string(abi.encodePacked("curator", i)));
            curators.push(curator);
            // Give each curator a large balance
            usdc.mint(curator, 10_000_000 * 10 ** 6);
        }

        // Initialize users
        for (uint256 i = 0; i < 10; i++) {
            users.push(makeAddr(string(abi.encodePacked("user", i))));
        }
    }

    // ============================================================
    // Handler Actions
    // ============================================================

    function createDataset(uint256 curatorSeed, uint256 budget) external {
        address curator = curators[bound(curatorSeed, 0, curators.length - 1)];
        budget = bound(budget, MIN_AMOUNT, MAX_AMOUNT);

        vm.startPrank(curator);
        usdc.approve(address(escrow), budget);

        try escrow.createDataset(budget, curator) returns (uint256 datasetId) {
            createdDatasets.push(datasetId);
            datasetExists[datasetId] = true;
            ghost_totalDeposited += budget;
        } catch {
            // Failed, skip
        }

        vm.stopPrank();
    }

    function topUpDataset(uint256 datasetSeed, uint256 amount) external {
        if (createdDatasets.length == 0) return;

        uint256 datasetId = createdDatasets[bound(datasetSeed, 0, createdDatasets.length - 1)];
        if (!datasetExists[datasetId]) return;

        (, address curator,, bool active) = escrow.datasets(datasetId);
        if (!active) return;

        amount = bound(amount, MIN_AMOUNT, MAX_AMOUNT);

        vm.startPrank(curator);
        usdc.approve(address(escrow), amount);

        try escrow.topUpDataset(datasetId, amount) {
            ghost_totalDeposited += amount;
        } catch {
            // Failed, skip
        }

        vm.stopPrank();
    }

    function distribute(uint256 datasetSeed, uint256 userSeed, uint256 amount) external {
        if (createdDatasets.length == 0) return;

        uint256 datasetId = createdDatasets[bound(datasetSeed, 0, createdDatasets.length - 1)];
        if (!datasetExists[datasetId]) return;

        (, address curator, uint256 remainingBudget, bool active) = escrow.datasets(datasetId);
        if (!active || remainingBudget == 0) return;

        address user = users[bound(userSeed, 0, users.length - 1)];
        amount = bound(amount, MIN_AMOUNT, remainingBudget);

        vm.startPrank(curator);

        try escrow.distribute(datasetId, user, amount) {
            ghost_totalDistributed += amount;
        } catch {
            // Failed, skip
        }

        vm.stopPrank();
    }

    function closeDataset(uint256 datasetSeed) external {
        if (createdDatasets.length == 0) return;

        uint256 datasetId = createdDatasets[bound(datasetSeed, 0, createdDatasets.length - 1)];
        if (!datasetExists[datasetId]) return;

        (, address curator, uint256 remainingBudget, bool active) = escrow.datasets(datasetId);
        if (!active) return;

        vm.startPrank(curator);

        try escrow.closeDataset(datasetId) {
            ghost_totalRefunded += remainingBudget;
            datasetExists[datasetId] = false;
        } catch {
            // Failed, skip
        }

        vm.stopPrank();
    }

    // ============================================================
    // View Functions for Invariants
    // ============================================================

    function getCreatedDatasetsLength() public view returns (uint256) {
        return createdDatasets.length;
    }

    function getTotalDatasetBudgets() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < createdDatasets.length; i++) {
            uint256 datasetId = createdDatasets[i];
            (,, uint256 remaining,) = escrow.datasets(datasetId);
            total += remaining;
        }
        return total;
    }

    function getEscrowBalance() public view returns (uint256) {
        return usdc.balanceOf(address(escrow));
    }

    function getTotalUserUsdcBalances() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < users.length; i++) {
            total += usdc.balanceOf(users[i]);
        }
        return total;
    }
}

/**
 * @title DataAnnotateEscrowInvariantTest
 * @notice Invariant tests for DataAnnotateEscrow
 */
contract DataAnnotateEscrowInvariantTest is Test {
    DataAnnotateEscrow public escrow;
    MockERC20 public usdc;
    DataAnnotateEscrowHandler public handler;

    function setUp() public {
        usdc = new MockERC20();
        escrow = new DataAnnotateEscrow(IERC20(address(usdc)));
        handler = new DataAnnotateEscrowHandler(escrow, usdc);

        // Target handler for invariant testing
        targetContract(address(handler));

        // Configure selectors to call
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = DataAnnotateEscrowHandler.createDataset.selector;
        selectors[1] = DataAnnotateEscrowHandler.topUpDataset.selector;
        selectors[2] = DataAnnotateEscrowHandler.distribute.selector;
        selectors[3] = DataAnnotateEscrowHandler.closeDataset.selector;

        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    // ============================================================
    // Core Invariants
    // ============================================================

    /// @notice Invariant: Escrow balance equals sum of dataset budgets
    function invariant_EscrowBalanceEqualsDatasetBudgets() public view {
        uint256 totalDatasetBudgets = handler.getTotalDatasetBudgets();
        uint256 escrowBalance = handler.getEscrowBalance();

        assertEq(
            totalDatasetBudgets,
            escrowBalance,
            "Escrow balance != dataset budgets"
        );
    }

    /// @notice Invariant: Ghost accounting - deposited = distributed + refunded + remaining
    function invariant_GhostAccounting() public view {
        uint256 totalDeposited = handler.ghost_totalDeposited();
        uint256 totalDistributed = handler.ghost_totalDistributed();
        uint256 totalRefunded = handler.ghost_totalRefunded();
        uint256 totalDatasetBudgets = handler.getTotalDatasetBudgets();

        // Total deposited = total distributed + total refunded + remaining in datasets
        assertEq(
            totalDeposited,
            totalDistributed + totalRefunded + totalDatasetBudgets,
            "Total accounting mismatch"
        );
    }

    /// @notice Invariant: Distributed amount never exceeds deposited amount
    function invariant_DistributedNeverExceedsDeposited() public view {
        uint256 totalDistributed = handler.ghost_totalDistributed();
        uint256 totalDeposited = handler.ghost_totalDeposited();

        assertLe(
            totalDistributed,
            totalDeposited,
            "Distributed exceeds deposited"
        );
    }

    /// @notice Invariant: Refunded amount never exceeds deposited amount
    function invariant_RefundedNeverExceedsDeposited() public view {
        uint256 totalRefunded = handler.ghost_totalRefunded();
        uint256 totalDeposited = handler.ghost_totalDeposited();

        assertLe(
            totalRefunded,
            totalDeposited,
            "Refunded exceeds deposited"
        );
    }

    /// @notice Invariant: Dataset budgets are always non-negative
    function invariant_DatasetBudgetsNonNegative() public view {
        uint256 length = handler.getCreatedDatasetsLength();
        for (uint256 i = 0; i < length; i++) {
            try handler.createdDatasets(i) returns (uint256 datasetId) {
                (,, uint256 remaining,) = escrow.datasets(datasetId);
                assertGe(remaining, 0, "Dataset budget is negative");
            } catch {
                break;
            }
        }
    }

    /// @notice Invariant: Escrow balance equals deposited - distributed - refunded
    function invariant_EscrowBalanceAccounting() public view {
        uint256 escrowBalance = handler.getEscrowBalance();
        uint256 totalDeposited = handler.ghost_totalDeposited();
        uint256 totalDistributed = handler.ghost_totalDistributed();
        uint256 totalRefunded = handler.ghost_totalRefunded();

        assertEq(
            escrowBalance,
            totalDeposited - totalDistributed - totalRefunded,
            "Escrow balance accounting error"
        );
    }

    /// @notice Invariant: Users received exactly what was distributed
    function invariant_UsersReceivedDistributedAmount() public view {
        uint256 totalDistributed = handler.ghost_totalDistributed();
        uint256 totalUserBalances = handler.getTotalUserUsdcBalances();

        // Users should have received the distributed amount
        assertEq(
            totalUserBalances,
            totalDistributed,
            "User balances != distributed amount"
        );
    }

    /// @notice Invariant: Sum of distributed + refunded + remaining = deposited
    function invariant_CompleteAccountingBalance() public view {
        uint256 totalDistributed = handler.ghost_totalDistributed();
        uint256 totalDatasetBudgets = handler.getTotalDatasetBudgets();
        uint256 totalRefunded = handler.ghost_totalRefunded();
        uint256 totalDeposited = handler.ghost_totalDeposited();

        assertEq(
            totalDistributed + totalDatasetBudgets + totalRefunded,
            totalDeposited,
            "Complete accounting balance mismatch"
        );
    }

    /// @notice Invariant: No individual dataset budget exceeds escrow balance
    function invariant_IndividualBudgetNeverExceedsEscrow() public view {
        uint256 escrowBalance = handler.getEscrowBalance();
        uint256 length = handler.getCreatedDatasetsLength();

        for (uint256 i = 0; i < length; i++) {
            try handler.createdDatasets(i) returns (uint256 datasetId) {
                (,, uint256 remaining,) = escrow.datasets(datasetId);
                assertLe(remaining, escrowBalance, "Dataset budget exceeds escrow");
            } catch {
                break;
            }
        }
    }

    /// @notice Invariant: Distributed + remaining budgets + refunded = total deposited
    function invariant_TotalFundsAccountedFor() public view {
        uint256 totalDistributed = handler.ghost_totalDistributed();
        uint256 totalRemaining = handler.getTotalDatasetBudgets();
        uint256 totalRefunded = handler.ghost_totalRefunded();
        uint256 totalDeposited = handler.ghost_totalDeposited();

        uint256 totalAccountedFor = totalDistributed + totalRemaining + totalRefunded;

        assertEq(
            totalAccountedFor,
            totalDeposited,
            "Not all funds are accounted for"
        );
    }

    // ============================================================
    // Invariant Test Logging
    // ============================================================

    function invariant_callSummary() public view {
        console.log("=== Invariant Test Summary ===");
        console.log("Total Deposited:", handler.ghost_totalDeposited());
        console.log("Total Distributed:", handler.ghost_totalDistributed());
        console.log("Total Refunded:", handler.ghost_totalRefunded());
        console.log("Total Dataset Budgets:", handler.getTotalDatasetBudgets());
        console.log("Total User USDC Balances:", handler.getTotalUserUsdcBalances());
        console.log("Escrow Balance:", handler.getEscrowBalance());
        console.log("============================");
    }
}
