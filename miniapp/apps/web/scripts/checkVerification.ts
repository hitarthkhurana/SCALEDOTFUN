/**
 * CLI Script: Read Self Protocol Verification Data from Contract
 * 
 * This demonstrates how to query your deployed contract and extract
 * age, country, and other verification data.
 * 
 * Usage:
 *   tsx scripts/checkVerification.ts
 */

import { ethers } from "ethers";
import { SELF_CONFIG } from "../src/config/self.config";
import { parseSelfVerification } from "../src/lib/parseSelfVerification";

// ABI to read public variables from ScaleDotFunVerification contract
const CONTRACT_ABI = [
  "function verificationSuccessful() public view returns (bool)",
  "function lastUserAddress() public view returns (address)",
  "function lastOutput() public view returns (tuple(bytes32 attestationId, uint256 userIdentifier, uint256 nullifier, uint256[4] forbiddenCountriesListPacked, string issuingState, string[] name, string idNumber, string nationality, string dateOfBirth, string gender, string expiryDate, uint256 olderThan, bool[3] ofac))",
];

async function main() {
  console.log("🔍 Checking Self Protocol Verification Data...\n");
  
  // Connect to Celo Sepolia
  const provider = new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org");
  
  // Create contract instance
  const contract = new ethers.Contract(
    SELF_CONFIG.CONTRACT_ADDRESS,
    CONTRACT_ABI,
    provider
  );
  
  console.log(`📡 Contract: ${SELF_CONFIG.CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Celo Sepolia Testnet\n`);
  
  try {
    // 1. Check if anyone has verified
    console.log("1️⃣ Checking verification status...");
    const isVerified = await contract.verificationSuccessful();
    console.log(`   verificationSuccessful: ${isVerified}\n`);
    
    if (!isVerified) {
      console.log("⚠️  No one has verified yet!");
      console.log("\nTo test:");
      console.log("1. Run your miniapp: cd miniapp/apps/web && pnpm dev");
      console.log("2. Open in browser: http://localhost:3000");
      console.log("3. Click 'Connect & Verify'");
      console.log("4. Complete verification with Self app");
      console.log("5. Run this script again\n");
      return;
    }
    
    // 2. Get the last verified user's address
    console.log("2️⃣ Getting last verified user...");
    const lastUser = await contract.lastUserAddress();
    console.log(`   lastUserAddress: ${lastUser}\n`);
    
    // 3. Get verification data (this is the important part!)
    console.log("3️⃣ Reading verification data from contract...");
    const lastOutput = await contract.lastOutput();
    
    console.log("   Raw contract data:");
    console.log(`   - userIdentifier: ${lastOutput.userIdentifier}`);
    console.log(`   - olderThan: ${lastOutput.olderThan}`);
    console.log(`   - nationality: ${lastOutput.nationality}`);
    console.log(`   - dateOfBirth: ${lastOutput.dateOfBirth}`);
    console.log(`   - gender: ${lastOutput.gender || "Not disclosed"}`);
    console.log(`   - issuingState: ${lastOutput.issuingState || "Not disclosed"}\n`);
    
    // 4. Parse the data (this is what you'd save to Supabase)
    console.log("4️⃣ Parsing verification data...");
    const parsed = parseSelfVerification({
      userIdentifier: `0x${lastOutput.userIdentifier.toString(16).padStart(64, '0')}`,
      minimumAge: Number(lastOutput.olderThan),
      nationality: lastOutput.nationality,
      dateOfBirth: lastOutput.dateOfBirth,
      gender: lastOutput.gender,
      issuingState: lastOutput.issuingState,
    });
    
    console.log("\n✅ Parsed Verification Result:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Status:        ${parsed.status}`);
    console.log(`Age:           ${parsed.age} years old`);
    console.log(`Age Range:     ${parsed.ageRange}`);
    console.log(`Country:       ${parsed.country} (${parsed.countryCode})`);
    console.log(`Task Pool:     ${parsed.matchedPool}`);
    console.log(`User Hash:     ${parsed.userHash.substring(0, 20)}...`);
    if (parsed.dateOfBirth) {
      console.log(`Date of Birth: ${parsed.dateOfBirth}`);
    }
    if (parsed.gender) {
      console.log(`Gender:        ${parsed.gender}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // 5. Show what you'd save to Supabase
    console.log("5️⃣ What you'd save to Supabase:");
    console.log(JSON.stringify({
      user_hash: parsed.userHash,
      wallet_address: lastUser,
      is_verified: true,
      age: parsed.age,
      age_range: parsed.ageRange,
      country: parsed.country,
      country_code: parsed.countryCode,
      task_pool: parsed.matchedPool,
      date_of_birth: parsed.dateOfBirth,
      verified_at: new Date().toISOString(),
    }, null, 2));
    
    console.log("\n✅ Done! This is the REAL data from the blockchain.");
    
  } catch (error) {
    console.error("\n❌ Error reading contract:", error);
    console.error("\nPossible issues:");
    console.error("1. Contract might not be deployed at this address");
    console.error("2. RPC connection failed");
    console.error("3. Contract ABI doesn't match\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

