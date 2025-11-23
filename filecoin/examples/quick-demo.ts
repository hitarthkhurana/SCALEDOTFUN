/**
 * Quick Demo - Upload 1 image + 1 audio file
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

async function quickDemo() {
  console.log('🚀 Quick Demo Upload to Filecoin\n');
  
  // Use root mock_dataset (go up one level from filecoin dir)
  const datasetPath = path.join(process.cwd(), '..', 'mock_dataset');
  
  // Pick 1 image + 1 audio
  const files = [
    { name: '2020-04-04 11_31_39.839042322.jpg', type: '📷 Image' },
    { name: '1.1.happy-03.wav', type: '🎵 Audio' },
  ];
  
  console.log('📁 Uploading 2 files:\n');
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f.type} - ${f.name}`));
  console.log();
  
  // Initialize Synapse
  validateConfig();
  console.log('🔗 Connecting to Filecoin Calibration...\n');
  
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(datasetPath, file.name);
    
    console.log(`${file.type} - ${file.name}`);
    console.log('   ⏳ Uploading to Filecoin...');
    
    const fileData = fs.readFileSync(filePath);
    const uploadStart = Date.now();
    
    const { pieceCid, size } = await synapse.storage.upload(fileData);
    
    const uploadTime = Date.now() - uploadStart;
    
    results.push({ filename: file.name, type: file.type, cid: pieceCid, size, uploadTime });
    
    console.log(`   ✅ Uploaded in ${(uploadTime / 1000).toFixed(1)}s`);
    console.log(`   📦 CID: ${pieceCid}`);
    console.log(`   📏 Size: ${(size / 1024).toFixed(1)} KB\n`);
  }
  
  // Save CIDs
  const outputPath = path.join(process.cwd(), 'demo-cids.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log('═'.repeat(70));
  console.log('🎉 FILES UPLOADED TO FILECOIN!');
  console.log('═'.repeat(70));
  console.log('\n📋 FOR YOUR DEMO:\n');
  
  console.log('1️⃣  Show on Filecoin Block Explorer:');
  console.log('   🔗 https://beryx.zondax.ch/v1/search/fil/calibration');
  console.log('   📦 Paste CID to prove upload\n');
  
  console.log('2️⃣  Fast Retrieval Demo:');
  results.forEach((r, i) => {
    console.log(`   ${r.type} ${r.filename}`);
    console.log(`   npm run retrieve ${r.cid}\n`);
  });
  
  console.log('3️⃣  View in Browser:');
  results.forEach((r, i) => {
    console.log(`   ${r.type} npm run view ${r.cid}`);
  });
  
  console.log('\n💡 Tell Judges:');
  console.log('   "We pre-uploaded datasets (show CID on explorer),');
  console.log('    now watch how fast workers retrieve them!"');
  
  console.log('\n💾 CIDs saved to: filecoin/demo-cids.json\n');
}

quickDemo().catch((error) => {
  console.error('\n❌ Upload failed:', error.message);
  process.exit(1);
});

