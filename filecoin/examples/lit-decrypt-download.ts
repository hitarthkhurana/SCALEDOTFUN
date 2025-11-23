/**
 * EXAMPLE: Download from Filecoin, then decrypt with Lit Protocol
 * 
 * Flow:
 * 1. Worker downloads ENCRYPTED file from Filecoin (direct, no backend!)
 * 2. Worker requests decryption from Lit Protocol
 * 3. Lit checks access control conditions
 * 4. If authorized → Lit provides decryption key
 * 5. Worker decrypts file locally
 * 
 * This is FULLY DECENTRALIZED - no backend bottleneck!
 */

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';
import { getAccessControlConditions, LIT_NETWORK } from '../lit-config.js';
import * as ethers from 'ethers';

async function downloadAndDecrypt() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npm run lit:decrypt <CID> <dataToEncryptHash>');
    console.error('Example: npm run lit:decrypt bafkzcib... 0x1234...');
    process.exit(1);
  }
  
  const [pieceCid, dataToEncryptHash] = args;
  
  console.log('🔓 Lit Protocol: Download → Decrypt\n');
  console.log(`📦 CID: ${pieceCid}`);
  console.log(`🔑 Hash: ${dataToEncryptHash}\n`);
  
  // Step 1: Download ENCRYPTED file from Filecoin
  console.log('📥 Downloading encrypted file from Filecoin...');
  
  validateConfig();
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  const downloadStart = Date.now();
  const encryptedBytes = await synapse.storage.download(pieceCid);
  const downloadTime = Date.now() - downloadStart;
  
  console.log(`✅ Downloaded in ${downloadTime}ms`);
  console.log(`📏 Size: ${encryptedBytes.length} bytes (still encrypted!)\n`);
  
  // Step 2: Initialize Lit Protocol
  console.log('🔥 Connecting to Lit Protocol...');
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK,
    debug: false,
  });
  await litNodeClient.connect();
  console.log('✅ Connected to Lit Network!\n');
  
  // Step 3: Set up access control conditions (same as encryption)
  const accessControlConditions = getAccessControlConditions({
    minAge: 18,
  });
  
  // Step 4: Generate session signatures
  console.log('🔐 Generating session signatures...');
  const wallet = new ethers.Wallet(SYNAPSE_CONFIG.privateKey);
  
  const sessionSigs = await litNodeClient.getSessionSigs({
    chain: 'ethereum',
    expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
    resourceAbilityRequests: [
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.LitActionExecution,
      },
    ],
    authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
      const toSign = await litNodeClient.generateAuthSig({
        uri,
        expiration,
        resources: resourceAbilityRequests,
        walletAddress: wallet.address,
      });
      
      const authSig = await wallet.signMessage(ethers.utils.arrayify(toSign));
      return {
        sig: authSig,
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: toSign,
        address: wallet.address,
      };
    },
  });
  
  console.log('✅ Session signatures generated!\n');
  
  try {
    // Step 5: Decrypt with Lit Protocol
    console.log('🔓 Attempting decryption...');
    console.log('   Lit Network is checking access control conditions...\n');
    
    const decryptedData = await litNodeClient.decrypt({
      accessControlConditions,
      ciphertext: new Blob([encryptedBytes]).stream(),
      dataToEncryptHash,
      sessionSigs,
      chain: 'ethereum',
    });
    
    const decryptedText = new TextDecoder().decode(decryptedData);
    
    console.log('✅ DECRYPTION SUCCESSFUL!\n');
    console.log('═'.repeat(60));
    console.log('📄 DECRYPTED CONTENT:');
    console.log('═'.repeat(60));
    console.log(decryptedText);
    console.log('═'.repeat(60));
    
    console.log('\n🎉 SUCCESS! Worker was authorized and could decrypt!');
    console.log('\n💡 What happened:');
    console.log('   1. Downloaded encrypted file from Filecoin (direct)');
    console.log('   2. Generated session signatures with Lit Network');
    console.log('   3. Lit Network checked access control conditions');
    console.log('   4. Access granted → Decryption key provided');
    console.log('   5. File decrypted locally!');
    
  } catch (error: any) {
    console.error('\n❌ DECRYPTION FAILED!');
    console.error(`Reason: ${error.message}`);
    console.error('Stack:', error.stack);
    console.log('\n🚫 Possible reasons:');
    console.log('   - Access control conditions not met');
    console.log('   - Invalid CID or hash');
    console.log('   - Session signature generation failed');
  } finally {
    await litNodeClient.disconnect();
  }
}

// Run the example
downloadAndDecrypt().catch((error) => {
  console.error('\n❌ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

