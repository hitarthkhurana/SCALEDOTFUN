// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DataAnnotateEscrow
 * @notice Trusted curator model, single-token (USDC) escrow with direct distributions
 * @dev User balances are tracked off-chain. Distribute function sends USDC directly to users.
 */
contract DataAnnotateEscrow {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------
    IERC20 public immutable USDC;

    // ------------------------------------------------------------
    // Dataset Storage
    // ------------------------------------------------------------
    struct Dataset {
        address funder;         // Address that provided the funds (can top up)
        address curator;        // Address that controls distributions (usually backend)
        uint256 remainingBudget;
        bool active;
    }

    uint256 public nextDatasetId;
    mapping(uint256 => Dataset) public datasets;

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    event DatasetCreated(uint256 indexed datasetId, address curator, uint256 budget);
    event DatasetClosed(uint256 indexed datasetId, uint256 refunded);
    event Distributed(uint256 indexed datasetId, address indexed user, uint256 amount);

    // ------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------
    constructor(IERC20 usdcToken) {
        USDC = usdcToken;
    }

    // ------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------
    modifier onlyCurator(uint256 datasetId) {
        require(msg.sender == datasets[datasetId].curator, "Not dataset curator");
        _;
    }

    modifier onlyFunderOrCurator(uint256 datasetId) {
        require(
            msg.sender == datasets[datasetId].funder || msg.sender == datasets[datasetId].curator,
            "Not dataset funder or curator"
        );
        _;
    }

    modifier datasetActive(uint256 datasetId) {
        require(datasets[datasetId].active, "Dataset inactive");
        _;
    }

    // ------------------------------------------------------------
    // Dataset Creation & Funding
    // ------------------------------------------------------------

    /**
     * @notice Create a new dataset with designated curator
     * @dev Funder provides funds, curator controls distributions (typically backend wallet)
     * @param budget The initial budget for the dataset
     * @param curator The address that will control distributions
     * @return datasetId The ID of the newly created dataset
     */
    function createDataset(uint256 budget, address curator)
        external
        returns (uint256 datasetId)
    {
        require(budget > 0, "Budget must be > 0");
        require(curator != address(0), "Curator cannot be zero address");

        datasetId = nextDatasetId++;

        datasets[datasetId] = Dataset({
            funder: msg.sender,
            curator: curator,
            remainingBudget: budget,
            active: true
        });

        // Pull USDC from funder
        USDC.safeTransferFrom(msg.sender, address(this), budget);

        emit DatasetCreated(datasetId, curator, budget);
    }

    /**
     * @notice Top up an existing dataset
     * @dev Can be called by either the funder or curator
     * @param datasetId The ID of the dataset to top up
     * @param amount The amount to add to the budget
     */
    function topUpDataset(uint256 datasetId, uint256 amount)
        external
        onlyFunderOrCurator(datasetId)
        datasetActive(datasetId)
    {
        require(amount > 0, "Amount must be > 0");

        datasets[datasetId].remainingBudget += amount;

        USDC.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ------------------------------------------------------------
    // Curator Distribution (Direct Transfer)
    // ------------------------------------------------------------

    /**
     * @notice Distribute funds directly to a user from a dataset budget
     * @dev Transfers USDC directly to user. Balances are tracked off-chain.
     * @param datasetId The ID of the dataset to distribute from
     * @param user The address to receive the funds
     * @param amount The amount of USDC to distribute
     */
    function distribute(
        uint256 datasetId,
        address user,
        uint256 amount
    )
        external
        onlyCurator(datasetId)
        datasetActive(datasetId)
    {
        require(user != address(0), "Cannot distribute to zero address");
        require(amount > 0, "Amount must be > 0");

        Dataset storage d = datasets[datasetId];
        require(amount <= d.remainingBudget, "Dataset budget exceeded");

        // Deduct from dataset budget
        d.remainingBudget -= amount;

        // Transfer USDC directly to user
        USDC.safeTransfer(user, amount);

        emit Distributed(datasetId, user, amount);
    }

    // ------------------------------------------------------------
    // Close Dataset (Curator Refund)
    // ------------------------------------------------------------

    /**
     * @notice Close a dataset and refund remaining budget
     * @dev Can be called by either funder or curator. Refunds go to the funder.
     * @param datasetId The ID of the dataset to close
     */
    function closeDataset(uint256 datasetId)
        external
        onlyFunderOrCurator(datasetId)
    {
        Dataset storage d = datasets[datasetId];
        require(d.active, "Already closed");

        d.active = false;

        uint256 leftover = d.remainingBudget;
        d.remainingBudget = 0;

        if (leftover > 0) {
            USDC.safeTransfer(d.funder, leftover);
        }

        emit DatasetClosed(datasetId, leftover);
    }
}
