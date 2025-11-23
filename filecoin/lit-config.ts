/**
 * Lit Protocol Configuration
 * 
 * Access control: Only workers verified via Self Protocol can decrypt files
 */

// Self Protocol contract details (on Celo Sepolia)
export const SELF_CONTRACT_ADDRESS = "0xd3c99d0d78f325361132d1051b759dbfeebe86a4";
export const CELO_SEPOLIA_CHAIN_ID = 44787; // Celo Alfajores testnet

/**
 * Access Control Conditions for Lit Protocol
 * 
 * These conditions check the Self Protocol contract to see if a worker is verified
 * 
 * For now, using a simpler wallet-based condition for testing.
 * In production, we'll use custom contract conditions to check Self Protocol.
 */
export function getAccessControlConditions(taskRequirements?: {
  minAge?: number;
  allowedCountries?: string[];
}) {
  // Simple wallet ownership condition for testing
  // In production, replace with Self Protocol contract check
  const conditions = [
    {
      conditionType: "evmBasic",
      contractAddress: "",
      standardContractType: "",
      chain: "sepolia", // Using Sepolia for testing
      method: "eth_getBalance",
      parameters: [":userAddress", "latest"],
      returnValueTest: {
        comparator: ">=",
        value: "0", // User must have any balance (even 0)
      },
    },
  ];

  return conditions;
}

// Lit Protocol network (testnet)
export const LIT_NETWORK = "datil-dev"; // Free testnet for development

