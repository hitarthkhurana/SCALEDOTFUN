/**
 * EXAMPLE: Complete upload + retrieve test
 * 
 * Tests the full Filecoin workflow on FREE testnet:
 * 1. Fund account (one-time)
 * 2. Upload a file
 * 3. Retrieve it back
 * 4. Verify content matches
 */

import { Synapse, RPC_URLS, TOKENS, TIME_CONSTANTS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';

async function testFilecoin() {
  console.log('🧪 Testing Filecoin Upload + Retrieval on Calibration Testnet\n');
  
  validateConfig();
  
  // Initialize Synapse
  console.log('📡 Connecting to Filecoin...');
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  console.log('✅ Connected!\n');
  
  try {
    // Step 0: Check and fund account (first time only)
    console.log('💰 Step 0: Checking account funding...');
    const depositAmount = ethers.parseUnits("2.5", 18); // 2.5 USDFC
    
    try {
      const tx = await synapse.payments.depositWithPermitAndApproveOperator(
        depositAmount,
        synapse.getWarmStorageAddress(),
        ethers.MaxUint256,
        ethers.MaxUint256,
        TIME_CONSTANTS.EPOCHS_PER_MONTH,
      );
      await tx.wait();
      console.log('✅ Account funded!\n');
    } catch (error: any) {
      if (error.message.includes('insufficient')) {
        console.log('⚠️  Need test tokens! Get them from:');
        console.log('   tFIL: https://faucet.calibnet.chainsafe-fil.io/');
        console.log('   USDFC: https://faucet.calibnet.chainsafe-fil.io/\n');
        throw error;
      }
      console.log('✅ Account already funded!\n');
    }
    
    // Step 1: Upload
    const testData = new TextEncoder().encode(
      `🚀 scale.fun test - ${new Date().toISOString()}
      Testing Filecoin storage for data labeling platform.
      This data will be retrieved and verified.
      Adding text to meet 127 byte minimum...`
    );
    
    console.log('📤 Step 1: Uploading test file...');
    const { pieceCid, size } = await synapse.storage.upload(testData);
    console.log(`✅ Uploaded! PieceCID: ${pieceCid}`);
    console.log(`📏 Size: ${size} bytes\n`);
    
    // Step 2: Wait for propagation
    console.log('⏳ Waiting 3 seconds for network propagation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');
    
    // Step 3: Download
    console.log('📥 Step 2: Downloading file...');
    const downloadedBytes = await synapse.storage.download(pieceCid);
    const downloadedText = new TextDecoder().decode(downloadedBytes);
    console.log('✅ Downloaded!\n');
    
    // Step 4: Verify
    console.log('🔍 Step 3: Verifying content...');
    const originalText = new TextDecoder().decode(testData);
    
    if (downloadedText === originalText) {
      console.log('✅ Content matches perfectly!');
      console.log(`\n📦 Size: ${downloadedBytes.length} bytes`);
      console.log(`📦 PieceCID: ${pieceCid}`);
      return true;
    } else {
      console.log('❌ Content mismatch!');
      return false;
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testFilecoin()
  .then((success) => {
    if (success) {
      console.log('\n🎉 All tests passed! Filecoin integration is working!');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test crashed:', error.message);
    process.exit(1);
  });

