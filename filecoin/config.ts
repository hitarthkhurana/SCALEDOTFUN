import { config } from 'dotenv';

// Load environment variables
config();

export const SYNAPSE_CONFIG = {
  privateKey: process.env.PRIVATE_KEY || '',
  network: process.env.FILECOIN_NETWORK || 'calibration',
};

// Validate configuration
export function validateConfig() {
  if (!SYNAPSE_CONFIG.privateKey) {
    throw new Error(
      'PRIVATE_KEY is required. Please set it in .env file.\n' +
      'This is your Celo wallet private key (same one you used for Self deployment)'
    );
  }
  
  if (!SYNAPSE_CONFIG.privateKey.startsWith('0x')) {
    throw new Error('PRIVATE_KEY must start with 0x');
  }
  
  console.log('✅ Configuration loaded successfully');
  console.log(`📡 Network: ${SYNAPSE_CONFIG.network}`);
}

