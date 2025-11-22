/**
 * EXAMPLE: Retrieve files from Filecoin using Synapse SDK
 * 
 * This shows how Workers will fetch images to label
 * 
 * FREE on Calibration testnet!
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';

async function retrieveFile(pieceCid: string) {
  console.log('🚀 Starting Filecoin Retrieval Example\n');
  
  // 1. Validate configuration
  validateConfig();
  
  // 2. Initialize Synapse
  console.log('📡 Connecting to Filecoin Calibration (testnet)...');
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  console.log('✅ Connected to Filecoin!\n');
  console.log(`📥 Downloading file with PieceCID: ${pieceCid}`);
  
  try {
    // Download the data
    const bytes = await synapse.storage.download(pieceCid);
    const decodedText = new TextDecoder().decode(bytes);
    
    console.log('✅ Download successful!');
    console.log(`📄 Content:\n${decodedText}`);
    console.log(`📏 Size: ${bytes.length} bytes`);
    
    return bytes;
    
  } catch (error) {
    console.error('❌ Download failed:', error);
    throw error;
  }
}

// Get PieceCID from command line argument
const pieceCid = process.argv[2];

if (!pieceCid) {
  console.error('❌ Please provide a PieceCID as argument');
  console.log('Usage: npm run retrieve <PIECECID>');
  console.log('Example: npm run retrieve bafkzcibca...');
  process.exit(1);
}

// Run the example
retrieveFile(pieceCid)
  .then(() => {
    console.log('\n✅ Retrieval example completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Example failed:', error.message);
    process.exit(1);
  });

