/**
 * EXAMPLE: Upload Multiple Files to Filecoin
 * 
 * Shows how AI Labs would upload a batch of files for labeling
 * Files can be: images, audio (mp3), text, video, etc.
 * 
 * In production, you'd:
 * 1. Read actual files from disk (any type)
 * 2. Upload each to Filecoin
 * 3. Store CIDs in database with task metadata
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';

interface UploadResult {
  fileId: string;
  pieceCid: string;
  size: number;
  uploadedAt: string;
}

async function uploadFileBatch() {
  console.log('🚀 Uploading File Batch to Filecoin\n');
  
  validateConfig();
  
  // Initialize Synapse
  console.log('📡 Connecting to Filecoin...');
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  console.log('✅ Connected!\n');
  
  // Simulate 5 different file types
  // In production: Read actual files from disk (images, audio, text, etc.)
  const files = [
    { id: 'file-001', name: 'street_sign.jpg', type: 'image' },
    { id: 'file-002', name: 'audio_clip.mp3', type: 'audio' },
    { id: 'file-003', name: 'document.txt', type: 'text' },
    { id: 'file-004', name: 'video_clip.mp4', type: 'video' },
    { id: 'file-005', name: 'data.json', type: 'data' },
  ];
  
  const uploadResults: UploadResult[] = [];
  
  console.log(`📦 Uploading ${files.length} files...\n`);
  
  for (const file of files) {
    try {
      // Simulate file data (in production: read actual file bytes)
      const fileData = new TextEncoder().encode(
        `[${file.type.toUpperCase()} Data for ${file.name}]
        Timestamp: ${new Date().toISOString()}
        Type: ${file.type}
        This would be actual file bytes in production.
        Works with images, audio, video, text, any file type!
        Minimum 127 bytes required for Filecoin upload...`
      );
      
      console.log(`📤 Uploading ${file.name} (${file.type})...`);
      
      // Upload to Filecoin
      const { pieceCid, size } = await synapse.storage.upload(fileData);
      
      const result: UploadResult = {
        fileId: file.id,
        pieceCid,
        size,
        uploadedAt: new Date().toISOString()
      };
      
      uploadResults.push(result);
      
      console.log(`   ✅ ${file.name} → ${pieceCid}`);
      console.log(`   📏 Size: ${size} bytes\n`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error(`   ❌ Failed to upload ${file.name}:`, error.message);
    }
  }
  
  // Display summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 UPLOAD SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Successfully uploaded: ${uploadResults.length}/${files.length} files\n`);
  
  console.log('📦 CIDs (save these to database):');
  console.log('─'.repeat(60));
  uploadResults.forEach(result => {
    console.log(`${result.fileId}: ${result.pieceCid}`);
  });
  
  console.log('\n💾 In production, you would save this data to your database:');
  console.log('─'.repeat(60));
  console.log(`
INSERT INTO task_files (task_id, file_id, cid, size, uploaded_at) VALUES
  ('task-001', '${uploadResults[0]?.fileId}', '${uploadResults[0]?.pieceCid}', ${uploadResults[0]?.size}, '${uploadResults[0]?.uploadedAt}'),
  ...
  `);
  
  return uploadResults;
}

// Run the upload
uploadFileBatch()
  .then((results) => {
    console.log('\n🎉 Batch upload complete!');
    console.log(`\n💡 Works with ANY file type:`);
    console.log('   ✅ Images (jpg, png, etc.)');
    console.log('   ✅ Audio (mp3, wav, etc.)');
    console.log('   ✅ Video (mp4, avi, etc.)');
    console.log('   ✅ Text (txt, json, csv, etc.)');
    console.log('\n💡 Next steps:');
    console.log('   1. Save CIDs to database');
    console.log('   2. Associate with task requirements');
    console.log('   3. Backend proxies downloads to verified workers');
  })
  .catch((error) => {
    console.error('\n❌ Batch upload failed:', error.message);
    process.exit(1);
  });

