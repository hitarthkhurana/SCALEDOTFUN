/**
 * EXAMPLE: Retrieve files from Filecoin using Synapse SDK
 * 
 * This shows how Workers will fetch images to label
 * 
 * FREE on Calibration testnet!
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

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
    // Download the data with timing
    const downloadStart = Date.now();
    const bytes = await synapse.storage.download(pieceCid);
    const downloadTime = Date.now() - downloadStart;
    
    console.log('✅ Download successful!');
    console.log(`⚡ Speed: ${(downloadTime / 1000).toFixed(2)} seconds`);
    console.log(`📏 Size: ${(bytes.length / 1024).toFixed(1)} KB`);
    
    // Detect file type from magic bytes
    let fileExt = 'bin';
    let fileType = 'Unknown';
    
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      fileExt = 'jpg';
      fileType = '📷 Image (JPEG)';
    } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      fileExt = 'png';
      fileType = '📷 Image (PNG)';
    } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      fileExt = 'wav';
      fileType = '🎵 Audio (WAV)';
    } else if (bytes.slice(0, 4).toString().includes('ID3')) {
      fileExt = 'mp3';
      fileType = '🎵 Audio (MP3)';
    } else {
      // Try to decode as text
      try {
        const text = new TextDecoder().decode(bytes);
        if (text.length > 0 && !/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 100))) {
          fileExt = 'txt';
          fileType = '📝 Text';
        }
      } catch {}
    }
    
    console.log(`📦 File Type: ${fileType}`);
    
    // Save to downloads folder
    const downloadsDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    const filename = `${pieceCid.slice(-12)}.${fileExt}`;
    const filepath = path.join(downloadsDir, filename);
    
    fs.writeFileSync(filepath, bytes);
    console.log(`\n💾 Saved to: downloads/${filename}`);
    console.log(`📂 Full path: ${filepath}`);
    
    // Show preview
    if (fileType.includes('Text')) {
      const text = new TextDecoder().decode(bytes);
      console.log(`\n📄 Content:\n${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`);
    } else {
      console.log(`\n✅ Binary file saved - open it to view!`);
    }
    
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

