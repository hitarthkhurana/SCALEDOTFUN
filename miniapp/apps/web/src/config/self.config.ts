/**
 * Self Protocol Configuration for scale.fun
 * 
 * INSTRUCTIONS:
 * 1. Get your contract address from: self/workshop-main/contracts/.env
 * 2. Replace the placeholder CONTRACT_ADDRESS below
 * 3. This is the on-chain verification contract for gating workers
 */

export const SELF_CONFIG = {
  // ✅ scale.fun Custom Verification Contract (MUST BE LOWERCASE!)
  CONTRACT_ADDRESS: "0xd3c99d0d78f325361132d1051b759dbfeebe86a4",
  
  // App metadata
  APP_NAME: "scale.fun",
  SCOPE_SEED: "scaledotfun-labeling",
  
  // Logo (optional - can use base64 or URL)
  LOGO_URL: "https://i.postimg.cc/mrmVf9hm/self.png",
  
  ENDPOINT_TYPE: "staging_celo" as const,
  
  // Verification requirements (must match your contract!)
  DISCLOSURES: {
    minimumAge: 18,        // ZK proof: User is at least 18 (matches contract)
    // Disclosures (what user reveals - these work even if not in contract verification)
    nationality: true,     // Returns exact country code
    date_of_birth: true,   // Returns actual birthdate
    // Optional:
    // gender: true,
    // issuing_state: true,
  }
} as const;

