/**
 * View uploaded file in browser via IPFS gateway
 */
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { validateConfig, SYNAPSE_CONFIG } from '../config.js';

async function viewFile() {
  const pieceCid = process.argv[2];
  
  if (!pieceCid) {
    console.error('Usage: npm run view <CID>');
    process.exit(1);
  }
  
  console.log(`📦 CID: ${pieceCid}\n`);
  console.log('🌐 View in browser:');
  console.log(`   https://ipfs.io/ipfs/${pieceCid}`);
  console.log(`   https://gateway.pinata.cloud/ipfs/${pieceCid}`);
  console.log(`   https://cloudflare-ipfs.com/ipfs/${pieceCid}`);
  
  // Download and show content
  validateConfig();
  const synapse = await Synapse.create({
    privateKey: SYNAPSE_CONFIG.privateKey,
    rpcURL: RPC_URLS.calibration.http,
  });
  
  console.log('\n📥 Downloading to show content...');
  const bytes = await synapse.storage.download(pieceCid);
  const text = new TextDecoder().decode(bytes);
  console.log('\n📄 Content:');
  console.log(text);
}

viewFile().catch(console.error);
