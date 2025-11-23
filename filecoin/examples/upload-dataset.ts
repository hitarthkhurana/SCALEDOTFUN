/**
 * Upload mock dataset files to Filecoin
 * This demonstrates uploading various file types for the demo
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UploadedFile {
  filename: string;
  type: string;
  cid: string;
  size: number;
  uploadTime: number;
}

async function uploadDataset() {
  console.log('📦 Uploading Mock Dataset to Filecoin\n');
  
  const datasetPath = path.join(__dirname, '../../mock_dataset');
  
  // Check if dataset exists
  if (!fs.existsSync(datasetPath)) {
    console.error('❌ mock_dataset directory not found!');
    console.error(`Expected at: ${datasetPath}`);
    process.exit(1);
  }
  
  // Get all files
  const files = fs.readdirSync(datasetPath);
  console.log(`📁 Found ${files.length} files in dataset\n`);
  
  // Initialize Synapse
  validateConfig();
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  const uploadedFiles: UploadedFile[] = [];
  const totalStart = Date.now();
  
  // Upload each file
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(datasetPath, filename);
    
    // Skip if directory
    if (fs.statSync(filePath).isDirectory()) {
      continue;
    }
    
    // Determine file type
    const ext = path.extname(filename).toLowerCase();
    let fileType = 'unknown';
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) fileType = 'image';
    else if (['.wav', '.mp3', '.ogg'].includes(ext)) fileType = 'audio';
    else if (['.txt', '.md'].includes(ext)) fileType = 'text';
    else if (['.mp4', '.avi', '.mov'].includes(ext)) fileType = 'video';
    
    console.log(`[${i + 1}/${files.length}] Uploading: ${filename} (${fileType})`);
    
    try {
      // Read file
      const fileData = fs.readFileSync(filePath);
      
      // Upload to Filecoin
      const uploadStart = Date.now();
      const { pieceCid, size } = await synapse.storage.upload(fileData);
      const uploadTime = Date.now() - uploadStart;
      
      uploadedFiles.push({
        filename,
        type: fileType,
        cid: pieceCid,
        size,
        uploadTime,
      });
      
      console.log(`   ✅ CID: ${pieceCid}`);
      console.log(`   📏 Size: ${size} bytes`);
      console.log(`   ⏱️  Time: ${uploadTime}ms\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}\n`);
    }
  }
  
  const totalTime = Date.now() - totalStart;
  
  // Summary
  console.log('═'.repeat(70));
  console.log('📊 UPLOAD SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total files: ${uploadedFiles.length}/${files.length}`);
  console.log(`Total time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`Average time per file: ${(totalTime / uploadedFiles.length).toFixed(0)}ms`);
  
  // Group by type
  const byType: Record<string, UploadedFile[]> = {};
  uploadedFiles.forEach(f => {
    if (!byType[f.type]) byType[f.type] = [];
    byType[f.type].push(f);
  });
  
  console.log('\n📁 By File Type:');
  Object.entries(byType).forEach(([type, files]) => {
    console.log(`   ${type}: ${files.length} files`);
  });
  
  // Save CIDs to a file for easy retrieval testing
  const cidList = uploadedFiles.map(f => ({
    filename: f.filename,
    type: f.type,
    cid: f.cid,
    size: f.size,
  }));
  
  const outputPath = path.join(__dirname, '../uploaded-cids.json');
  fs.writeFileSync(outputPath, JSON.stringify(cidList, null, 2));
  
  console.log(`\n💾 CIDs saved to: uploaded-cids.json`);
  console.log('\n🎯 For demo, use these CIDs to show fast retrieval!');
  console.log('\nExample retrieval commands:');
  console.log(`   npm run retrieve ${uploadedFiles[0].cid}`);
  console.log(`   npm run view ${uploadedFiles[0].cid}`);
  
  return cidList;
}

// Run the upload
uploadDataset()
  .then((cids) => {
    console.log('\n✅ Dataset uploaded successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  });

