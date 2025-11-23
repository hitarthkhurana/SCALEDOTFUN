# SCALE.FUN 🚀

**Decentralized AI Data Labeling Platform**

Connect AI Labs needing labeled data with a ZK-verified workforce earning crypto on mobile. Workers complete micro-tasks, earn instant cUSD payouts, and AI Labs can sell completed datasets on a decentralized marketplace powered by Filecoin.

**Built for:**
- 🟣 **Celo**: Mobile-first payments with cUSD
- 🔐 **Self Protocol**: ZK-verified identity (age, country) for task gating
- 💾 **Filecoin**: Decentralized storage for datasets with fast retrieval

## 🚀 Deployed Contracts

### Celo MAINNET (Production)

| Contract | Address | Description |
|----------|---------|-------------|
| **Real cUSD** | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | Official Celo USD stablecoin |
| **DataAnnotateEscrow** | `TODO: Deploy to mainnet` | Escrow contract for data annotation payments |
| **DatasetMarketplace** | `0x2cC8C36C09726519b676b0a19BB911873dAdF387` | ✅ Marketplace for buying/selling labeled datasets |

**Network Details:**
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Currency**: CELO (for gas)
- **Block Explorer**: https://celoscan.io

### Testnet (Deprecated - Moving to Mainnet)

| Contract | Address | Description |
|----------|---------|-------------|
| **MockCUSD** | `0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0` | Mock cUSD (testnet only) |
| **DataAnnotateEscrow** | `0xA39faDa84249f557a32338eA4b3604780fB9274c` | Escrow (testnet only) |

## 📦 Project Structure

```
.
├── backend/          # Backend services
├── contracts/        # Smart contracts (Foundry)
├── filecoin/        # Filecoin integration
├── miniapp/         # Frontend application
└── mock_dataset/    # Sample datasets for testing
```

## 🔧 Quick Start

### 1. Environment Setup

Create `.env` files in each directory (see `.env.example` files).

**Required:**
- Celo Sepolia private key (for deployments)
- Supabase URL and API key
- Filecoin private key (for storage)

### 2. Smart Contracts

```bash
cd contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Deploy Marketplace (after setting PRIVATE_KEY in .env)
forge script script/DeployDatasetMarketplace.s.sol \
  --rpc-url https://alfajores-forno.celo-testnet.org \
  --broadcast --legacy
```

### 3. MiniApp (Frontend)

```bash
cd miniapp

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev
```

### 4. Filecoin Integration

```bash
cd filecoin

# Install dependencies
npm install

# Upload dataset to Filecoin
npm run upload-dataset

# Retrieve from Filecoin (fast!)
npm run retrieve
```

### 5. Supabase Setup

1. Run the database migration:
   ```bash
   cd miniapp/apps/web
   npx tsx scripts/migrate-marketplace.ts
   ```
2. Copy the SQL output and run it in your Supabase dashboard

## 💡 Features

### For Workers (Celo MiniApp)
- 📱 **Mobile-First**: Optimized for MiniPay wallet
- 🔐 **ZK Verification**: Self Protocol for age/country gating
- 💰 **Instant Payouts**: Earn cUSD for micro-tasks
- 🎯 **Multiple Task Types**: Bounding boxes, audio transcription, text labeling
- 🔥 **Gamification**: Daily streaks, leaderboards

### For AI Labs (Launchpad)
- 📊 **Launch Datasets**: Upload data, set bounties, deploy to blockchain
- 👥 **Worker Marketplace**: Access verified global workforce
- 📦 **Dataset Marketplace**: Sell completed labeled datasets
- 💾 **Filecoin Storage**: Decentralized, immutable dataset storage
- 📈 **Real-Time Analytics**: Track completion progress

### Technical Features
- **Escrow System**: Secure on-chain payments via `DataAnnotateEscrow`
- **Marketplace Contract**: Buy/sell datasets with 15% platform fee
- **Filecoin Integration**: Synapse SDK for fast upload/retrieval
- **Supabase Backend**: Real-time database for annotations
- **Smart Contract Payments**: Automated distribution to workers

## 📝 Contract Interaction

### Create a Dataset

```bash
# Approve tokens
cast send 0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  "approve(address,uint256)" \
  0xA39faDa84249f557a32338eA4b3604780fB9274c \
  1000000000000000000000 \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org

# Create dataset
cast send 0xA39faDa84249f557a32338eA4b3604780fB9274c \
  "createDataset(uint256,address)" \
  1000000000000000000000 \
  <CURATOR_ADDRESS> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

### Distribute Funds (Curator Only)

```bash
cast send 0xA39faDa84249f557a32338eA4b3604780fB9274c \
  "distribute(uint256,address,uint256)" \
  0 \
  <USER_ADDRESS> \
  100000000000000000000 \
  --private-key <CURATOR_PRIVATE_KEY> \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

### Check Balance

```bash
cast call 0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  "balanceOf(address)(uint256)" \
  <ADDRESS> \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts

# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test
forge test --match-contract MockCUSDTest

# Run with gas reports
forge test --gas-report
```

## 📚 Documentation

### Smart Contracts
- [MockCUSD Documentation](contracts/MOCKCUSD_README.md)
- [Contracts README](contracts/README.md)
- [DatasetMarketplace Contract](contracts/src/DatasetMarketplace.sol)

### Integrations
- [Filecoin README](filecoin/README.md) - Storage and retrieval guide
- [Supabase Migration](miniapp/apps/web/supabase-migration-marketplace.sql)

### Frontend
- [MiniApp Structure](miniapp/apps/web/src/components/screens/)
- Profile Screen: View your active datasets
- Marketplace Screen: Buy/sell labeled datasets
- Launch Dataset Screen: Create new annotation tasks

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SCALE.FUN Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │  Workers (Mobile)│         │  AI Labs (Web)  │            │
│  │   - MiniPay      │         │  - Launch Data  │            │
│  │   - Self Protocol│         │  - Set Bounties │            │
│  │   - Earn cUSD    │         │  - Track Progress│           │
│  └────────┬─────────┘         └────────┬────────┘            │
│           │                            │                      │
│           ▼                            ▼                      │
│  ┌──────────────────────────────────────────────┐            │
│  │         Supabase (Database)                  │            │
│  │  - User profiles  - Datasets  - Annotations  │            │
│  └──────────────────┬───────────────────────────┘            │
│                     │                                         │
│                     ▼                                         │
│  ┌──────────────────────────────────────────────┐            │
│  │      Celo Blockchain (Alfajores)             │            │
│  │  - MockCUSD Token                            │            │
│  │  - DataAnnotateEscrow (Worker Payouts)       │            │
│  │  - DatasetMarketplace (Buy/Sell Datasets)    │            │
│  └──────────────────┬───────────────────────────┘            │
│                     │                                         │
│                     ▼                                         │
│  ┌──────────────────────────────────────────────┐            │
│  │       Filecoin (Decentralized Storage)       │            │
│  │  - Raw datasets  - Labeled datasets          │            │
│  │  - Fast retrieval via Synapse SDK            │            │
│  └──────────────────────────────────────────────┘            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 🛤️ User Flows

### Worker Flow
1. Connect MiniPay wallet
2. Verify identity via Self Protocol (ZK proof)
3. Browse available tasks (filtered by verification)
4. Complete micro-tasks (label images, transcribe audio)
5. Earn instant cUSD payouts per task

### AI Lab Flow
1. Launch dataset (upload files, set bounty)
2. Smart contract locks funds in escrow
3. Workers complete annotations
4. Track progress in real-time
5. When 100% complete → Upload to Filecoin
6. List on marketplace for sale

### Buyer Flow
1. Browse marketplace for labeled datasets
2. Purchase with cUSD (85% to creator, 15% platform fee)
3. Receive Filecoin CIDs
4. Download datasets directly from Filecoin


### Environment Variables

Create `.env` files with your own keys:

```bash
# contracts/.env
PRIVATE_KEY=your_private_key_here

# miniapp/apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
FILECOIN_PRIVATE_KEY=your_filecoin_key

# filecoin/.env
PRIVATE_KEY=your_filecoin_key
```

## 🚀 Deployment to Celo MAINNET

### Prerequisites
- ✅ CELO tokens for gas (buy from exchange or get from faucet)
- ✅ Private key with CELO balance set in `contracts/.env`
- ✅ Real cUSD for testing (address: `0x765DE816845861e75A25fCA122bb6898B8B1282a`)

### Step 1: Deploy DataAnnotateEscrow (Worker Payout Contract)

```bash
cd contracts

# Create .env file with:
# PRIVATE_KEY=your_mainnet_private_key

# Deploy to Celo Mainnet with REAL cUSD
forge script script/DeployDataAnnotateEscrow.s.sol \
  --sig "run(address)" 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  --rpc-url https://forno.celo.org \
  --broadcast --legacy

# ⚠️ SAVE THE DEPLOYED ADDRESS!
# Update ESCROW_ADDRESS in:
# - miniapp/apps/web/src/components/screens/LaunchDatasetScreen.tsx
```

### Step 2: Deploy DatasetMarketplace (Buy/Sell Contract)

```bash
cd contracts

# Add to .env:
# CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a

forge script script/DeployDatasetMarketplace.s.sol \
  --rpc-url https://forno.celo.org \
  --broadcast --legacy

# ⚠️ SAVE THE DEPLOYED ADDRESS!
# Update MARKETPLACE_ADDRESS in:
# - miniapp/apps/web/src/components/screens/UploadToMarketplaceScreen.tsx (line 11)
# - miniapp/apps/web/src/components/screens/MarketplaceScreen.tsx (line 11)
```

### Step 3: Get Real cUSD

You can get real cUSD by:
1. **Buy on Exchange**: Coinbase, Binance, etc.
2. **Swap on Celo**: Use Uniswap/Mento
3. **Ask Friend**: Have them send to your address

Real cUSD address: `0x765DE816845861e75A25fCA122bb6898B8B1282a`

## 🎯 Prize Tracks

This project is built for:

1. **🟣 Celo Track**
   - Mobile-first payments with cUSD
   - MiniPay wallet integration
   - Instant worker payouts on Celo Sepolia

2. **🔐 Self Protocol Track**
   - ZK-verified identity for task gating
   - Age and country verification
   - Privacy-preserving worker credentials

3. **💾 Filecoin Track**
   - Decentralized dataset storage
   - Fast retrieval via Synapse SDK
   - Marketplace delivery via Filecoin CIDs
   - Immutable labeled datasets

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

## 📄 License

MIT

---

**Built with ❤️ for Celo, Self Protocol, and Filecoin**

