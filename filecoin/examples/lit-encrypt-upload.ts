/**
 * EXAMPLE: Encrypt with Lit Protocol, then upload to Filecoin
 * 
 * Flow:
 * 1. AI Lab encrypts file with Lit Protocol
 * 2. Sets access condition: "Only verified workers can decrypt"
 * 3. Uploads ENCRYPTED file to Filecoin
 * 4. CID is now public, but file is encrypted!
 * 
 * Workers can download CID directly from Filecoin, but only verified workers can decrypt!
 */

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_RPC } from '@lit-protocol/constants';
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';
import { getAccessControlConditions, LIT_NETWORK } from '../lit-config.js';

async function encryptAndUpload() {
  console.log('🔐 Lit Protocol: Encrypt → Upload to Filecoin\n');
  
  // Step 1: Initialize Lit Protocol
  console.log('🔥 Connecting to Lit Protocol...');
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK,
    debug: false,
  });
  await litNodeClient.connect();
  console.log('✅ Connected to Lit Network!\n');
  
  // Step 2: Prepare file to encrypt
  const fileContent = `🔒 ENCRYPTED FILE - scale.fun
Task: Label street signs in Buenos Aires
Image: street_sign_001.jpg
Uploaded: ${new Date().toISOString()}

This file is encrypted with Lit Protocol.
Only workers verified via Self Protocol can decrypt it!

Minimum 127 bytes for Filecoin...`;
  
  // Step 3: Set access control conditions
  console.log('🔐 Setting access control conditions:');
  console.log('   ✓ Worker must be verified via Self Protocol');
  console.log('   ✓ Worker must be 18+ years old\n');
  
  const accessControlConditions = getAccessControlConditions({
    minAge: 18,
  });
  
  // Step 4: Encrypt with Lit Protocol (using encryptString method)
  console.log('🔒 Encrypting file...');
  const encryptResult = await litNodeClient.encrypt({
    accessControlConditions,
    dataToEncrypt: new TextEncoder().encode(fileContent),
  });
  
  // Convert base64 ciphertext to Uint8Array
  const ciphertextBytes = Buffer.from(encryptResult.ciphertext as string, 'base64');
  
  console.log(`✅ Encrypted! Hash: ${encryptResult.dataToEncryptHash}`);
  console.log(`📏 Encrypted size: ${ciphertextBytes.length} bytes\n`);
  
  // Step 5: Upload ENCRYPTED data to Filecoin
  console.log('📤 Uploading encrypted file to Filecoin...');
  
  validateConfig();
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  const uploadStart = Date.now();
  const { pieceCid, size } = await synapse.storage.upload(ciphertextBytes);
  const uploadTime = Date.now() - uploadStart;
  
  console.log(`✅ Uploaded in ${uploadTime}ms`);
  console.log(`📦 CID: ${pieceCid}`);
  console.log(`📏 Size: ${size} bytes\n`);
  
  // Step 6: Summary
  console.log('═'.repeat(60));
  console.log('🎉 SUCCESS! File is now encrypted on Filecoin!');
  console.log('═'.repeat(60));
  console.log('\n📝 What you need to save:');
  console.log(`   CID: ${pieceCid}`);
  console.log(`   DataHash: ${encryptResult.dataToEncryptHash}`);
  console.log(`   AccessConditions: ${JSON.stringify(accessControlConditions, null, 2)}`);
  
  console.log('\n🔑 Decryption:');
  console.log('   1. Anyone can download the CID from Filecoin');
  console.log('   2. But ONLY verified workers can decrypt it!');
  console.log('   3. Lit Network checks access control conditions');
  console.log('   4. If authorized → Lit provides decryption key');
  
  console.log('\n💡 Try decrypting with:');
  console.log(`   npm run lit:decrypt ${pieceCid} ${encryptResult.dataToEncryptHash}`);
  
  await litNodeClient.disconnect();
  
  return { pieceCid, dataToEncryptHash: encryptResult.dataToEncryptHash, accessControlConditions };
}

// Run the example
encryptAndUpload()
  .then((result) => {
    console.log('\n✅ Complete! Encrypted file on Filecoin with Lit Protocol access control!');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });

