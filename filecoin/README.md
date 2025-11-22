# Filecoin Integration for scale.fun

Simple Filecoin storage using Synapse SDK - **100% FREE on testnet!**

## 🎯 What This Does

- **Upload**: AI Labs upload datasets to Filecoin
- **Download**: Workers fetch images to label
- **Store**: Labeled datasets stored on Filecoin

## ✅ **IT'S FREE!** (On Calibration Testnet)

**No credit card. No API key. Just free test tokens!**

1. Get free test tokens from faucets (takes 2 minutes)
2. Upload/download unlimited
3. Perfect for hackathon demos!

## 🚀 Super Quick Setup

### Step 1: Get FREE Test Tokens

Go to this faucet and get BOTH tokens:
👉 **https://faucet.calibnet.chainsafe-fil.io/**

You need:
- **tFIL** (for gas fees)
- **USDFC** (for storage payments)

Enter your wallet address → Click get tokens → Done!

### Step 2: Add Your Private Key

```bash
cd filecoin
cp .env.example .env
nano .env
```

Add your private key (same one from Self deployment):
```bash
PRIVATE_KEY=0xyour_private_key_here
FILECOIN_NETWORK=calibration
```

### Step 3: Install & Test

```bash
npm install
npm run test
```

**Expected output:**
```
✅ Account funded!
✅ Uploaded! PieceCID: bafkzcib...
✅ Downloaded!
✅ Content matches perfectly!
🎉 All tests passed!
```

## 📖 Simple Examples

### Upload a File

```bash
npm run upload
```

Returns a **PieceCID** (like `bafkzcib...`) - save this to download later!

### Download a File

```bash
npm run retrieve bafkzcib...
```

Uses the PieceCID to download the file.

## 💻 Code Examples

### Upload in Your Backend

```typescript
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';

const synapse = await Synapse.create({
  privateKey: process.env.PRIVATE_KEY,
  rpcURL: RPC_URLS.calibration.http,
});

// Upload image
const imageData = new TextEncoder().encode(imageContent);
const { pieceCid } = await synapse.storage.upload(imageData);

// Save pieceCid to database!
await db.saveImage({ taskId, pieceCid });
```

### Download for Worker

```typescript
// Worker needs to label image

// 1. Get PieceCID from database
const { pieceCid } = await db.getNextImage(taskId);

// 2. Download from Filecoin
const imageBytes = await synapse.storage.download(pieceCid);

// 3. Show to worker (convert to URL or display directly)
// Worker draws bounding box and submits
```

## 🏗️ How It Fits in scale.fun

### AI Lab Flow:
```
1. AI Lab uploads 1000 street images
2. Each upload returns a PieceCID
3. Store PieceCIDs in database:
   { imageId: 1, pieceCid: "bafkzcib..." }
```

### Worker Flow:
```
1. Worker starts task
2. Backend gives PieceCID
3. Download image from Filecoin
4. Display to worker
5. Worker labels it
```

### Marketplace Flow:
```
1. All images labeled
2. Compile labels + images
3. Upload to Filecoin
4. Get PieceCID for labeled dataset
5. Mint NFT with PieceCID
6. Buyers download using PieceCID
```

## 🤔 Common Questions

### What's a PieceCID?
**Like a permanent link to your file.**

- Upload → Get PieceCID
- Download → Use PieceCID
- Same file = same PieceCID
- Starts with `bafkzcib...`

### Is it really free?
**YES on testnet!**

- Get free tokens from faucet
- Upload/download unlimited
- Perfect for demos

### What about mainnet (production)?
**Super cheap:**

- ~$0.50 per GB per year
- 1000 images (500 MB) = ~$0.25/year
- Way cheaper than AWS!

### Do I need an API key?
**NO!** Just your wallet private key (same as Self deployment).

### What was Lighthouse you mentioned?
**My mistake!** Lighthouse is a different service. We're using **Synapse SDK** (official Filecoin SDK). No API key needed.

## 🐛 Troubleshooting

### "Insufficient balance"
**Go get test tokens:**
- Visit: https://faucet.calibnet.chainsafe-fil.io/
- Get both tFIL and USDFC
- Wait 30 seconds, try again

### "Private key not found"
- Check `.env` file exists
- Make sure PRIVATE_KEY starts with `0x`

### "Account already funded" error
- This is actually fine! Means you already have funds
- Test will continue working

## 📚 Resources

- **Get Test Tokens**: https://faucet.calibnet.chainsafe-fil.io/
- **Synapse Docs**: https://docs.filecoin.cloud/
- **Synapse GitHub**: https://github.com/FilOzone/synapse-sdk

## ✨ For Other Developers

Just copy code from `examples/` folder into your backend:

```typescript
// Same pattern for AI Lab uploads
const { pieceCid } = await synapse.storage.upload(imageData);

// Same pattern for Worker downloads
const imageBytes = await synapse.storage.download(pieceCid);
```

That's it! Simple, free, and works! 🎉

## 🎬 Next Steps

1. ✅ Get test tokens (2 minutes)
2. ✅ Add private key to `.env`
3. ✅ Run `npm run test`
4. ✅ See it work!
5. ✅ Use in your app

**Ready for your hackathon demo!** 🚀
