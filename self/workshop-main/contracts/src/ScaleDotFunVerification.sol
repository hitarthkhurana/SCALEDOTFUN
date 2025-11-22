// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { SelfStructs } from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

/**
 * @title ScaleDotFunVerification
 * @notice Custom Self Protocol verification contract for scale.fun
 * @dev Stores worker verification data including age, country, and eligibility
 */
contract ScaleDotFunVerification is SelfVerificationRoot {
    
    // ═══════════════════════════ STRUCTS ═══════════════════════════
    
    /**
     * @notice Worker verification data
     * @dev This is what gets stored for each verified worker
     */
    struct WorkerVerification {
        bool isVerified;        // Has this worker completed verification?
        uint256 olderThan;      // Minimum age requirement met (e.g., 18)
        string dateOfBirth;     // Actual date of birth (YYYY-MM-DD)
        string nationality;     // Country code (e.g., "ARG", "BRA")
        string issuingState;    // Passport issuing country
        uint256 verifiedAt;     // Timestamp of verification
        bytes32 userIdentifier; // Unique ZK identifier for this user
    }
    
    // ═══════════════════════════ STORAGE ═══════════════════════════
    
    // Mapping: wallet address => verification data
    mapping(address => WorkerVerification) public workers;
    
    // For backward compatibility with workshop
    ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
    bool public verificationSuccessful;
    bytes public lastUserData;
    address public lastUserAddress;
    
    // Verification config
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;
    
    // List of all verified workers (for enumeration)
    address[] public verifiedWorkers;
    mapping(address => uint256) private workerIndex; // address => index in verifiedWorkers array
    
    // ═══════════════════════════ EVENTS ═══════════════════════════
    
    event WorkerVerified(
        address indexed worker,
        bytes32 userIdentifier,
        string nationality,
        string dateOfBirth,
        uint256 timestamp
    );
    
    event VerificationCompleted(
        ISelfVerificationRoot.GenericDiscloseOutputV2 output,
        bytes userData
    );
    
    // ═══════════════════════════ CONSTRUCTOR ═══════════════════════════
    
    /**
     * @notice Initialize scale.fun verification contract
     * @param identityVerificationHubV2Address Self Protocol verification hub
     * @param scopeSeed Unique scope for scale.fun (e.g., "scaledotfun-labeling")
     * @param _verificationConfig Verification requirements (age, countries, etc.)
     */
    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed, 
        SelfUtils.UnformattedVerificationConfigV2 memory _verificationConfig
    )
        SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed)
    {
        verificationConfig = SelfUtils.formatVerificationConfigV2(_verificationConfig);
        verificationConfigId =
            IIdentityVerificationHubV2(identityVerificationHubV2Address).setVerificationConfigV2(verificationConfig);
    }
    
    // ═══════════════════════════ VERIFICATION LOGIC ═══════════════════════════
    
    /**
     * @notice Called when verification succeeds
     * @dev This is where we capture and store worker data
     * @param output Verification output containing age, country, etc.
     * @param userData Custom data passed from frontend
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    )
        internal
        override
    {
        // Store for backward compatibility
        verificationSuccessful = true;
        lastOutput = output;
        lastUserData = userData;
        lastUserAddress = address(uint160(output.userIdentifier));
        
        // Store worker-specific data
        address workerAddress = address(uint160(output.userIdentifier));
        
        // If this is a new worker, add to list
        if (!workers[workerAddress].isVerified) {
            verifiedWorkers.push(workerAddress);
            workerIndex[workerAddress] = verifiedWorkers.length; // 1-indexed (0 = not in list)
        }
        
        // Store verification data
        workers[workerAddress] = WorkerVerification({
            isVerified: true,
            olderThan: output.olderThan,
            dateOfBirth: output.dateOfBirth,
            nationality: output.nationality,
            issuingState: output.issuingState,
            verifiedAt: block.timestamp,
            userIdentifier: bytes32(output.userIdentifier)
        });
        
        emit WorkerVerified(
            workerAddress,
            bytes32(output.userIdentifier),
            output.nationality,
            output.dateOfBirth,
            block.timestamp
        );
        
        emit VerificationCompleted(output, userData);
    }
    
    /**
     * @notice Get verification config ID
     * @return Verification configuration ID
     */
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    )
        public
        view
        override
        returns (bytes32)
    {
        return verificationConfigId;
    }
    
    // ═══════════════════════════ PUBLIC GETTERS ═══════════════════════════
    
    /**
     * @notice Check if a worker is verified
     * @param worker Worker's wallet address
     * @return True if worker has completed verification
     */
    function isWorkerVerified(address worker) external view returns (bool) {
        return workers[worker].isVerified;
    }
    
    /**
     * @notice Get worker's verification data
     * @param worker Worker's wallet address
     * @return Worker verification struct
     */
    function getWorkerData(address worker) external view returns (WorkerVerification memory) {
        return workers[worker];
    }
    
    /**
     * @notice Get worker's country
     * @param worker Worker's wallet address
     * @return Country code (e.g., "ARG")
     */
    function getWorkerCountry(address worker) external view returns (string memory) {
        require(workers[worker].isVerified, "Worker not verified");
        return workers[worker].nationality;
    }
    
    /**
     * @notice Get worker's date of birth
     * @param worker Worker's wallet address
     * @return Date of birth string (YYYY-MM-DD)
     */
    function getWorkerDateOfBirth(address worker) external view returns (string memory) {
        require(workers[worker].isVerified, "Worker not verified");
        return workers[worker].dateOfBirth;
    }
    
    /**
     * @notice Get worker's minimum age
     * @param worker Worker's wallet address
     * @return Minimum age requirement met (e.g., 18)
     */
    function getWorkerMinimumAge(address worker) external view returns (uint256) {
        require(workers[worker].isVerified, "Worker not verified");
        return workers[worker].olderThan;
    }
    
    /**
     * @notice Get total number of verified workers
     * @return Count of verified workers
     */
    function getVerifiedWorkerCount() external view returns (uint256) {
        return verifiedWorkers.length;
    }
    
    /**
     * @notice Get verified worker by index
     * @param index Index in verifiedWorkers array
     * @return Worker address
     */
    function getVerifiedWorkerAt(uint256 index) external view returns (address) {
        require(index < verifiedWorkers.length, "Index out of bounds");
        return verifiedWorkers[index];
    }
    
    /**
     * @notice Get all verified workers (use with caution - gas intensive)
     * @return Array of verified worker addresses
     */
    function getAllVerifiedWorkers() external view returns (address[] memory) {
        return verifiedWorkers;
    }
    
    /**
     * @notice Check if worker is eligible for a task based on country
     * @param worker Worker's wallet address
     * @param allowedCountries Array of allowed country codes
     * @return True if worker's country is in the allowed list
     */
    function isWorkerEligibleByCountry(
        address worker,
        string[] memory allowedCountries
    ) external view returns (bool) {
        if (!workers[worker].isVerified) return false;
        
        string memory workerCountry = workers[worker].nationality;
        
        for (uint256 i = 0; i < allowedCountries.length; i++) {
            if (keccak256(bytes(workerCountry)) == keccak256(bytes(allowedCountries[i]))) {
                return true;
            }
        }
        
        return false;
    }
}

