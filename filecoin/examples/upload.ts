/**
 * EXAMPLE: Upload files to Filecoin using Synapse SDK
 * 
 * This shows how AI Labs will upload their dataset images
 * 
 * FREE on Calibration testnet!
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';

async function uploadFiles() {
  console.log('🚀 Starting Filecoin Upload Example\n');
  
  // 1. Validate configuration
  validateConfig();
  
  // 2. Initialize Synapse
  console.log('📡 Connecting to Filecoin Calibration (testnet)...');
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  console.log('✅ Connected to Filecoin!\n');
  
  // 3. Create sample data to upload
  const sampleData = new TextEncoder().encode(
    `🚀 scale.fun test upload - ${new Date().toISOString()}
    This is a test image file for the data labeling platform.
    Minimum 127 bytes required for upload.
    Adding more text to meet the requirement...`
  );
  
  try {
    console.log('📤 Uploading to Filecoin...');
    
    // Upload the data
    const { pieceCid, size } = await synapse.storage.upload(sampleData);
    
    console.log('✅ Upload successful!');
    console.log(`📦 PieceCID: ${pieceCid}`);
    console.log(`📏 Size: ${size} bytes`);
    console.log('\n💡 Save this PieceCID to retrieve the file later!');
    
    return pieceCid;
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

// Run the example
uploadFiles()
  .then((cid) => {
    console.log('\n✅ Upload example completed successfully!');
    console.log(`\nNext step: Run retrieve.ts with CID: ${cid}`);
  })
  .catch((error) => {
    console.error('\n❌ Example failed:', error.message);
    process.exit(1);
  });

