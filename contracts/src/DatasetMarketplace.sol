// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DatasetMarketplace
 * @notice Marketplace for buying/selling completed labeled datasets stored on Filecoin
 * @dev 15% platform fee, 85% to curator
 */
contract DatasetMarketplace is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------
    IERC20 public immutable CUSD;
    address public immutable owner;
    uint256 public constant PLATFORM_FEE_BPS = 1500; // 15% in basis points
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ------------------------------------------------------------
    // State
    // ------------------------------------------------------------
    struct Listing {
        uint256 datasetId;      // Off-chain dataset ID (from Supabase)
        address curator;        // Address that created the dataset
        uint256 price;          // Price in cUSD (wei)
        bool active;            // Is listing active?
        string filecoinCIDs;    // JSON string of Filecoin CIDs (array of {filename, cid, annotations_cid})
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => mapping(address => bool)) public hasPurchased; // listingId => buyer => purchased
    uint256 public totalPlatformFees; // Accumulated fees for owner to withdraw

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    event DatasetListed(
        uint256 indexed listingId,
        uint256 indexed datasetId,
        address indexed curator,
        uint256 price,
        string filecoinCIDs
    );
    event DatasetPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price,
        uint256 platformFee,
        uint256 curatorPayout
    );
    event ListingDeactivated(uint256 indexed listingId);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);

    // ------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------
    constructor(IERC20 cusdToken) {
        CUSD = cusdToken;
        owner = msg.sender;
    }

    // ------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier listingExists(uint256 listingId) {
        require(listingId < nextListingId, "Listing does not exist");
        _;
    }

    modifier listingActive(uint256 listingId) {
        require(listings[listingId].active, "Listing not active");
        _;
    }

    // ------------------------------------------------------------
    // List Dataset for Sale
    // ------------------------------------------------------------
    /**
     * @notice List a completed dataset for sale on the marketplace
     * @param datasetId The off-chain dataset ID (from Supabase)
     * @param price Price in cUSD (wei)
     * @param filecoinCIDs JSON string containing array of Filecoin CIDs
     * @return listingId The ID of the created listing
     */
    function listDataset(
        uint256 datasetId,
        uint256 price,
        string calldata filecoinCIDs
    ) external returns (uint256 listingId) {
        require(price > 0, "Price must be > 0");
        require(bytes(filecoinCIDs).length > 0, "Must provide Filecoin CIDs");

        listingId = nextListingId++;

        listings[listingId] = Listing({
            datasetId: datasetId,
            curator: msg.sender,
            price: price,
            active: true,
            filecoinCIDs: filecoinCIDs
        });

        emit DatasetListed(listingId, datasetId, msg.sender, price, filecoinCIDs);
    }

    // ------------------------------------------------------------
    // Buy Dataset
    // ------------------------------------------------------------
    /**
     * @notice Purchase a listed dataset
     * @dev Transfers cUSD: 15% to platform, 85% to curator
     * @param listingId The ID of the listing to purchase
     */
    function buyDataset(uint256 listingId)
        external
        nonReentrant
        listingExists(listingId)
        listingActive(listingId)
    {
        require(!hasPurchased[listingId][msg.sender], "Already purchased");

        Listing storage listing = listings[listingId];
        uint256 price = listing.price;

        // Calculate fees
        uint256 platformFee = (price * PLATFORM_FEE_BPS) / BPS_DENOMINATOR; // 15%
        uint256 curatorPayout = price - platformFee; // 85%

        // Mark as purchased
        hasPurchased[listingId][msg.sender] = true;

        // Accumulate platform fees
        totalPlatformFees += platformFee;

        // Transfer cUSD from buyer
        CUSD.safeTransferFrom(msg.sender, address(this), price);

        // Pay curator immediately
        CUSD.safeTransfer(listing.curator, curatorPayout);

        emit DatasetPurchased(listingId, msg.sender, price, platformFee, curatorPayout);
    }

    // ------------------------------------------------------------
    // View Functions
    // ------------------------------------------------------------
    /**
     * @notice Get Filecoin CIDs for a purchased dataset
     * @param listingId The listing ID
     * @return filecoinCIDs JSON string of Filecoin CIDs
     */
    function getDatasetFiles(uint256 listingId)
        external
        view
        listingExists(listingId)
        returns (string memory filecoinCIDs)
    {
        require(
            hasPurchased[listingId][msg.sender] || msg.sender == listings[listingId].curator,
            "Not authorized - must purchase dataset"
        );

        return listings[listingId].filecoinCIDs;
    }

    /**
     * @notice Check if an address has purchased a dataset
     * @param listingId The listing ID
     * @param buyer The buyer address
     * @return purchased True if purchased
     */
    function hasUserPurchased(uint256 listingId, address buyer)
        external
        view
        listingExists(listingId)
        returns (bool purchased)
    {
        return hasPurchased[listingId][buyer];
    }

    /**
     * @notice Get listing details
     * @param listingId The listing ID
     */
    function getListing(uint256 listingId)
        external
        view
        listingExists(listingId)
        returns (
            uint256 datasetId,
            address curator,
            uint256 price,
            bool active
        )
    {
        Listing memory listing = listings[listingId];
        return (listing.datasetId, listing.curator, listing.price, listing.active);
    }

    // ------------------------------------------------------------
    // Curator Management
    // ------------------------------------------------------------
    /**
     * @notice Deactivate a listing (curator only)
     * @param listingId The listing ID to deactivate
     */
    function deactivateListing(uint256 listingId)
        external
        listingExists(listingId)
        listingActive(listingId)
    {
        require(msg.sender == listings[listingId].curator, "Not curator");
        listings[listingId].active = false;
        emit ListingDeactivated(listingId);
    }

    // ------------------------------------------------------------
    // Owner Functions (Platform Fee Withdrawal)
    // ------------------------------------------------------------
    /**
     * @notice Withdraw accumulated platform fees (owner only)
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = totalPlatformFees;
        require(amount > 0, "No fees to withdraw");

        totalPlatformFees = 0;
        CUSD.safeTransfer(owner, amount);

        emit PlatformFeesWithdrawn(owner, amount);
    }

    /**
     * @notice View accumulated platform fees
     */
    function getPlatformFees() external view returns (uint256) {
        return totalPlatformFees;
    }
}

