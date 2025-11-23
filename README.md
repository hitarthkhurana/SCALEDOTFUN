# Scale.fun 🏷️

**Decentralized AI Data Labeling Marketplace**

Connect AI Labs needing labeled training data with a global, crypto-incentivized workforce on mobile. Workers complete micro-labeling tasks and earn instant cUSD. Completed datasets are permanently stored on Filecoin and sold on a decentralized marketplace.

**🎯 Prize Tracks:**
- 🟣 **Celo**: Mobile-first payments with real cUSD on Mainnet
- 🔐 **Self Protocol**: ZK-verified identity for region and age-specific labeling
- 💾 **Filecoin**: Decentralized dataset storage on Calibration Testnet with fast retrieval

## 🚀 Deployed Contracts

### Celo MAINNET (Production) ✅

| Contract | Address | Description |
|----------|---------|-------------|
| **Real cUSD** | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | Official Celo USD stablecoin |
| **DataAnnotateEscrow** | [`0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0`](https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0) | ✅ **VERIFIED** - Escrow contract for worker payouts |
| **DatasetMarketplace** | `0x2cC8C36C09726519b676b0a19BB911873dAdF387` | Marketplace for buying/selling labeled datasets |

**Network Details:**
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Currency**: CELO (for gas)
- **Block Explorer**: https://celoscan.io

**Contract Verification:**
- ✅ DataAnnotateEscrow is **verified on CeloScan** via Sourcify
- 📄 [View Source Code](https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0#code)
- 🔍 [Sourcify Repository](https://repo.sourcify.dev/contracts/full_match/42220/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0/)

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

### 4. Filecoin Integration (Calibration Testnet)

```bash
cd filecoin

# Install dependencies
npm install

# Set up .env with PRIVATE_KEY

# Quick demo upload (2 files)
npm run quick

# Retrieve from Filecoin (fast!)
npm run retrieve

# View uploaded CIDs
cat demo-cids.json
```

**Calibration Testnet Details:**
- **Network**: Filecoin Calibration Testnet (314159)
- **RPC**: `RPC_URLS.calibration.http` via Synapse SDK
- **Explorer**: https://calibration.filfox.info/en
- **Upload Speed**: 60-90 seconds per file
- **Retrieval Speed**: 3-5 seconds per file

### 5. Supabase Setup

1. Run the database migration:
   ```bash
   cd miniapp/apps/web
   npx tsx scripts/migrate-marketplace.ts
   ```
2. Copy the SQL output and run it in your Supabase dashboard

## 💡 Features

### For Workers (MiniApp - Annotate Tab)
- 📱 **Mobile-First**: Optimized for MiniPay wallet on Celo
- 🔐 **ZK Verification**: Self Protocol for age/country gating (enables region-specific tasks)
- 💰 **Instant Payouts**: Earn cUSD for each completed annotation
- 🎯 **Multiple Task Types**: Image labeling, audio transcription, text classification
- 📊 **Leaderboard**: Track your ranking and earnings

### For Curators (MiniApp - Curate Tab)
- 📊 **Launch Datasets**: Upload raw data, set bounties per annotation
- 👁️ **Track Progress**: Real-time completion status for each dataset
- 🚀 **Upload to Filecoin**: One-click background upload when dataset is 100% labeled
- 🛒 **List on Marketplace**: Set price and sell completed labeled datasets
- 💵 **Sales History**: View all buyers and earnings from sold datasets

### For Buyers (MiniApp - Market Tab)
- 🛒 **Browse Datasets**: Discover labeled training data for AI models
- 💳 **Buy with cUSD**: Pay with cUSD (85% to curator, 15% platform fee)
- 📥 **Instant Download**: Retrieve files directly from Filecoin in seconds
- 📂 **Gallery View**: Scroll through all images and annotations in one view
- 💾 **Save to Device**: Download individual files to your phone

### Technical Features
- **Escrow System**: Secure on-chain worker payments via `DataAnnotateEscrow`
- **Marketplace Contract**: Decentralized buy/sell with 15% platform fee
- **Hybrid Storage**: Supabase for active datasets → Filecoin for completed datasets
- **Filecoin Integration**: Synapse SDK for upload to Calibration Testnet + fast retrieval
- **Background Uploads**: Filecoin uploads run in background (60-90s per file)
- **Smart Contract Verification**: DataAnnotateEscrow verified on CeloScan

### Contract Interaction Examples (Mainnet)

**Using the deployed DataAnnotateEscrow contract:**

### Create a Dataset

```bash
# Approve cUSD tokens for escrow contract
cast send 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  "approve(address,uint256)" \
  0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  1000000 \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://forno.celo.org

# Create dataset (amount in cUSD decimals: 18)
cast send 0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  "createDataset(uint256,address)" \
  1000000000000000000 \
  <CURATOR_ADDRESS> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://forno.celo.org
```

### Distribute Funds (Curator Only)

```bash
cast send 0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  "distribute(uint256,address,uint256)" \
  0 \
  <USER_ADDRESS> \
  100000000000000000 \
  --private-key <CURATOR_PRIVATE_KEY> \
  --rpc-url https://forno.celo.org
```

### Check cUSD Balance

```bash
cast call 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  "balanceOf(address)(uint256)" \
  <ADDRESS> \
  --rpc-url https://forno.celo.org
```

**💡 Tip:** View the verified contract source code on [CeloScan](https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0#code) to see all available functions.

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
┌──────────────────────────────────────────────────────────────────┐
│                     ScaleDotFun Platform                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Workers   │  │  Curators   │  │   Buyers    │               │
│  │  (Annotate) │  │   (Curate)  │  │  (Market)   │               │
│  │  - MiniPay  │  │ - Launch    │  │ - Browse    │               │
│  │  - Self ZK  │  │ - Track     │  │ - Purchase  │               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          ▼                                         │
│         ┌────────────────────────────────────┐                    │
│         │  Supabase (Centralized Storage)    │                    │
│         │  - User profiles & verification    │                    │
│         │  - Active datasets & annotations   │                    │
│         │  - Marketplace listings & purchases│                    │
│         │  - Raw files (work-in-progress)    │                    │
│         └────────────┬───────────────────────┘                    │
│                      │                                             │
│         ┌────────────┼────────────┐                               │
│         ▼            ▼            ▼                               │
│  ┌───────────┐ ┌──────────┐ ┌─────────────────────┐              │
│  │   Celo    │ │   Self   │ │     Filecoin        │              │
│  │  Mainnet  │ │ Protocol │ │ Calibration Testnet │              │
│  │           │ │          │ │                     │              │
│  │ • cUSD    │ │ • ZK Age │ │ • Completed datasets│              │
│  │ • Escrow  │ │ • Country│ │ • Synapse SDK       │              │
│  │ • Market  │ │          │ │ • Fast retrieval    │              │
│  └───────────┘ └──────────┘ └─────────────────────┘              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Data Flow:
1. Curator uploads → Supabase Storage (fast, cheap, editable)
2. Workers annotate → Supabase DB (real-time updates)
3. 100% complete → Background upload to Filecoin (permanent, immutable)
4. Listed on marketplace → Buyers download from Filecoin (decentralized)
```

## 🔄 Hybrid Storage Strategy

**Why Supabase + Filecoin?**

| Phase | Storage | Reason |
|-------|---------|--------|
| **Raw Upload** | Supabase | Fast access for workers, cheap, can delete if bad quality |
| **Annotation** | Supabase DB | Real-time updates, easy querying, mutable |
| **Completion** | Filecoin | Permanent record, decentralized, immutable, provenance |
| **Marketplace** | Filecoin CIDs | Buyers trust decentralized storage, always accessible |

Think of it like **draft documents** (Supabase) vs **published books** (Filecoin).

## 🛤️ User Flows

### 👷 Worker Flow (Annotate Tab)
1. Connect MiniPay wallet
2. **Verify identity** via Self Protocol ZK proof (nationality + age)
3. Browse **active datasets** filtered by your verification
4. Complete micro-tasks: label images, classify text, transcribe audio
5. Earn instant **cUSD payouts** per annotation (tracked in leaderboard)

### 📊 Curator Flow (Curate Tab)
1. **Upload dataset**: Upload raw files to Supabase, set bounty per annotation
2. **Smart contract** locks cUSD funds in `DataAnnotateEscrow`
3. Workers complete annotations (stored in Supabase)
4. Track **real-time progress** (% complete)
5. When **100% complete** → Click "Upload to Filecoin"
   - Background API uploads all files + annotations to **Filecoin Calibration Testnet**
   - Each file gets a unique **CID** (Content Identifier)
6. Click "List on Marketplace" → Set price, deploy to `DatasetMarketplace` contract
7. View **sales history** and earnings from buyers

### 🛒 Buyer Flow (Market Tab)
1. Browse **marketplace listings** for labeled datasets
2. Click "Buy Now" → Approve cUSD, call `buyDataset()` on contract
   - 85% to curator, 15% to platform
3. Click "Download Dataset" → Fetches all files from Filecoin
4. **Gallery view**: Scroll through all images + annotations
5. **Save to device**: Download individual files to phone


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

### Step 1: Deploy DataAnnotateEscrow (Worker Payout Contract) ✅ COMPLETED

```bash
cd contracts

# Create .env file with:
# PRIVATE_KEY=your_mainnet_private_key

# Deploy to Celo Mainnet with REAL cUSD
forge script script/DeployDataAnnotateEscrow.s.sol \
  --sig "run(address)" 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  --rpc-url https://forno.celo.org \
  --broadcast --legacy

# Verify the contract on CeloScan
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  src/DataAnnotateEscrow.sol:DataAnnotateEscrow \
  --chain-id 42220 \
  --verifier sourcify
```

**✅ Deployed & Verified:**
- **Address:** `0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0`
- **CeloScan:** https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0
- **Status:** Verified via Sourcify

**Next Steps:**
Update the escrow address in your frontend:
- `miniapp/apps/web/src/components/screens/LaunchDatasetScreen.tsx`
- `miniapp/apps/web/src/config/self.config.ts`

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

### 🟣 Celo Track
**What we built:**
- ✅ **Deployed on Celo Mainnet** with real cUSD (`0x765DE816845861e75A25fCA122bb6898B8B1282a`)
- ✅ **Verified Contract** on CeloScan: [DataAnnotateEscrow](https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0)
- ✅ **Mobile-first MiniApp** optimized for MiniPay wallet
- ✅ **Two smart contracts**: Worker escrow + Dataset marketplace
- ✅ **Real transactions**: Workers earn real cUSD, datasets sold for real cUSD

**Impact:**
Mobile workers in emerging markets can earn stable crypto by labeling AI training data.

### 🔐 Self Protocol Track
**What we built:**
- ✅ **ZK-verified identity** for nationality and date of birth
- ✅ **Task gating** based on verification (e.g., "US residents 18+" for content moderation)
- ✅ **Privacy-preserving**: Worker credentials verified on-chain without exposing PII
- ✅ **Integrated with dashboard**: Verification status shown in UI

**Impact:**
Enables region and age-specific data labeling requirements while preserving worker privacy.

### 💾 Filecoin Track - Best Storage Innovation
**What we built:**
- ✅ **Synapse SDK integration** for upload and retrieval
- ✅ **Calibration Testnet deployment**: All completed datasets stored on Filecoin
- ✅ **Working demo**: Full MiniApp with background uploads and instant downloads
- ✅ **Open-source**: Public GitHub repository

**Storage Innovation:**
- **Dataset Marketplace**: Buy/sell labeled AI training data stored on Filecoin
- **Hybrid approach**: Centralized storage for work-in-progress → Filecoin for final products
- **Background uploads**: 60-90s per file, runs async so users can continue working
- **Fast retrieval**: 3-5 seconds per file download using Synapse SDK
- **Gallery UI**: Mobile-friendly scrollable view of downloaded datasets
- **Provenance**: Immutable CIDs prove dataset authenticity

**Qualification Requirements:**
1. ✅ Uses Synapse SDK meaningfully (storage + retrieval)
2. ✅ Deploys to Filecoin Calibration Testnet (`RPC_URLS.calibration.http`)
3. ✅ Working demo (full MiniApp frontend)
4. ✅ Open-source GitHub repository

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

## 📄 License

MIT

---

**Built with ❤️ for Celo, Self Protocol, and Filecoin**

