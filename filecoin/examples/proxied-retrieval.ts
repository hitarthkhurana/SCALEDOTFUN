/**
 * EXAMPLE: Proxied Retrieval (BEST PRACTICE)
 * 
 * ✅ Worker NEVER sees the PieceCID
 * ✅ Backend acts as proxy
 * ✅ Self Protocol verification enforced
 * ✅ No way to leak CID
 * 
 * This is how you SHOULD do gated access!
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';

// Self Protocol contract ABI
// NOTE: Self Protocol contract is on CELO SEPOLIA (not Filecoin!)
// Your backend connects to BOTH networks:
// - Celo Sepolia: Check worker verification
// - Filecoin: Download/upload files
const SELF_CONTRACT_ABI = [
  "function getWorkerData(address worker) view returns (bool isVerified, uint256 olderThan, string dateOfBirth, string nationality, string issuingState, uint256 verifiedAt, bytes32 userIdentifier)"
];

const SELF_CONTRACT_ADDRESS = "0xd3c99d0d78f325361132d1051b759dbfeebe86a4"; // On Celo Sepolia
const CELO_SEPOLIA_RPC = "https://forno.celo-sepolia.celo-testnet.org"; // Celo RPC (not Filecoin!)

/**
 * Backend Function: Check worker access
 * (Same as before)
 */
async function checkWorkerAccess(
  workerAddress: string,
  taskRequirements: { minAge: number; allowedCountries?: string[] }
): Promise<{ allowed: boolean; reason: string }> {
  
  try {
    const provider = new ethers.JsonRpcProvider(CELO_SEPOLIA_RPC);
    const contract = new ethers.Contract(
      SELF_CONTRACT_ADDRESS,
      SELF_CONTRACT_ABI,
      provider
    );
    
    const workerData = await contract.getWorkerData(workerAddress);
    
    if (!workerData.isVerified) {
      return { allowed: false, reason: "Not verified" };
    }
    
    if (Number(workerData.olderThan) < taskRequirements.minAge) {
      return { allowed: false, reason: "Age requirement not met" };
    }
    
    if (taskRequirements.allowedCountries && taskRequirements.allowedCountries.length > 0) {
      if (!taskRequirements.allowedCountries.includes(workerData.nationality)) {
        return { allowed: false, reason: "Country not allowed" };
      }
    }
    
    return { allowed: true, reason: "Authorized" };
    
  } catch (error: any) {
    return { allowed: false, reason: `Error: ${error.message}` };
  }
}

/**
 * 🚫 BAD APPROACH: Giving PieceCID to worker
 * Problem: Worker can share CID with unauthorized people!
 */
async function badApproach_GiveCID(workerAddress: string, taskId: string) {
  console.log('\n❌ BAD APPROACH: Exposing PieceCID to worker\n');
  
  // Check access
  const accessCheck = await checkWorkerAccess(workerAddress, {
    minAge: 18,
    allowedCountries: ["IND", "ARG"]
  });
  
  if (!accessCheck.allowed) {
    return { error: accessCheck.reason };
  }
  
  // 🚨 PROBLEM: Returning the CID!
  const taskData = {
    taskId: taskId,
    pieceCid: "bafkzcibca3...", // From database
  };
  
  console.log('❌ Returning PieceCID to worker:', taskData.pieceCid);
  console.log('🚨 PROBLEM: Worker can now:');
  console.log('   1. Download the file themselves');
  console.log('   2. Share the CID with anyone');
  console.log('   3. Bypass all future access checks!');
  console.log('\n💀 This defeats the purpose of gating!\n');
  
  return taskData;
}

/**
 * ✅ GOOD APPROACH: Proxied download
 * Backend downloads and streams to worker
 * Worker NEVER sees the CID!
 */
async function goodApproach_ProxiedDownload(
  workerAddress: string,
  taskId: string
): Promise<{ success: boolean; imageData?: Uint8Array; error?: string }> {
  
  console.log('\n✅ GOOD APPROACH: Proxied Download\n');
  
  // Step 1: Check access
  console.log('🔐 Step 1: Checking worker access...');
  const accessCheck = await checkWorkerAccess(workerAddress, {
    minAge: 18,
    allowedCountries: ["IND", "ARG"]
  });
  
  if (!accessCheck.allowed) {
    console.log(`❌ Access denied: ${accessCheck.reason}`);
    return { success: false, error: accessCheck.reason };
  }
  
  console.log('✅ Worker authorized!');
  
  // Step 2: Get PieceCID from database (worker doesn't see this!)
  console.log('\n📦 Step 2: Getting PieceCID from database...');
  const taskData = {
    taskId: taskId,
    pieceCid: "bafkzcibca3...", // This stays SECRET on backend
  };
  console.log('🔒 PieceCID stays on backend: [HIDDEN]');
  
  // Step 3: Backend downloads from Filecoin
  console.log('\n📥 Step 3: Backend downloading from Filecoin...');
  
  validateConfig();
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  try {
    const imageBytes = await synapse.storage.download(taskData.pieceCid);
    console.log(`✅ Downloaded ${imageBytes.length} bytes`);
    
    // Step 4: Stream to worker (worker gets bytes, not CID!)
    console.log('\n📤 Step 4: Streaming to worker...');
    console.log('✅ Worker receives image data (NOT the CID!)');
    console.log('\n🛡️ Security Benefits:');
    console.log('   ✅ Worker cannot share CID (they never see it)');
    console.log('   ✅ Backend controls every download');
    console.log('   ✅ Can track downloads, rate limit, etc.');
    console.log('   ✅ Can revoke access anytime');
    
    return {
      success: true,
      imageData: imageBytes
    };
    
  } catch (error: any) {
    console.error(`❌ Download failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📝 Backend API Endpoint Example (Express.js)
 * 
 * This is what you'd implement in your backend:
 */
function backendAPIExample() {
  console.log('\n\n📝 Backend API Implementation Example:');
  console.log('═'.repeat(60));
  console.log(`
// Express.js backend

app.get('/api/tasks/:taskId/image', async (req, res) => {
  const { taskId } = req.params;
  const { workerAddress } = req.query;
  
  // 1. Check Self Protocol verification
  const accessCheck = await checkWorkerAccess(workerAddress, task.requirements);
  
  if (!accessCheck.allowed) {
    return res.status(403).json({ error: accessCheck.reason });
  }
  
  // 2. Get PieceCID from database (stays secret!)
  const image = await db.getNextImage(taskId);
  
  // 3. Download from Filecoin
  const imageBytes = await synapse.storage.download(image.pieceCid);
  
  // 4. Stream to worker (no CID exposed!)
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from(imageBytes));
});

// ✅ Worker gets image, never sees CID!
// ✅ Backend has full control!
  `);
}

/**
 * 📱 Frontend Implementation (Worker Side)
 */
function frontendExample() {
  console.log('\n📱 Worker Frontend Implementation:');
  console.log('═'.repeat(60));
  console.log(`
// Worker's miniapp

async function getTaskImage(taskId: string, workerAddress: string) {
  // Request image from backend (NOT the CID!)
  const response = await fetch(
    \`/api/tasks/\${taskId}/image?workerAddress=\${workerAddress}\`
  );
  
  if (!response.ok) {
    throw new Error('Access denied');
  }
  
  // Get image bytes
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);
  
  // Display to worker
  return imageUrl;
}

// ✅ Worker sees image
// ✅ Worker NEVER sees CID
// ✅ Cannot leak or share!
  `);
}

// ==================== DEMO ====================

async function demo() {
  console.log('🧪 DEMO: Proxied Retrieval (Best Practice)\n');
  console.log('═'.repeat(60));
  
  const workerAddress = "0xYOUR_VERIFIED_ADDRESS";
  const taskId = "task-001";
  
  // Show bad approach
  await badApproach_GiveCID(workerAddress, taskId);
  
  console.log('\n' + '═'.repeat(60));
  
  // Show good approach
  await goodApproach_ProxiedDownload(workerAddress, taskId);
  
  // Show implementation examples
  backendAPIExample();
  frontendExample();
  
  console.log('\n\n🎯 KEY TAKEAWAY:');
  console.log('═'.repeat(60));
  console.log('❌ BAD:  Backend gives CID → Worker downloads');
  console.log('✅ GOOD: Backend downloads → Backend streams to worker');
  console.log('\n💡 Worker NEVER sees the CID = Cannot leak! 🛡️\n');
}

// Run demo
demo().catch(console.error);

