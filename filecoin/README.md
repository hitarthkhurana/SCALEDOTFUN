# Filecoin for scale.fun

**FREE testnet storage using Synapse SDK**

## What We're Doing

1. **Upload**: AI Labs upload files (images/audio/video/text) → Get CID
2. **Store**: Save CID in database (keep secret!)
3. **Proxy**: Backend downloads from Filecoin → Streams to worker
4. **Worker**: Gets file (NEVER sees CID = cannot leak!)

## Simple Truth

- **ONE CID** returned from upload - use it for everything
- **Works with ANY file type** - images, mp3, txt, video, etc.
- **CID stays on backend** - never give to worker
- **Backend proxies downloads** - full control

## Setup

```bash
cd filecoin
npm install

# Add to .env
PRIVATE_KEY=0xyour_celo_private_key
FILECOIN_NETWORK=calibration

# Get free test tokens
# https://faucet.calibnet.chainsafe-fil.io/

# Test it works
npm run test
```

## Scripts

```bash
npm run test          # Upload + download + verify
npm run upload        # Upload single file
npm run upload-batch  # Upload multiple files (any type!)
npm run retrieve CID  # Download file
npm run demo          # See proxied download pattern
```

## Code

### Upload (AI Lab Backend)
```typescript
// Works with ANY file type: images, audio, video, text, etc.
const fileData = fs.readFileSync('audio.mp3'); // or image.jpg, video.mp4, etc.
const { pieceCid, size } = await synapse.storage.upload(fileData);
await db.saveFile({ taskId, cid: pieceCid }); // Save to DB
```

### Download (Backend Proxy for Worker)
```typescript
// Backend API: GET /api/tasks/:id/file?worker=0x...

// 1. Check Self Protocol (worker verified?)
const workerData = await selfContract.getWorkerData(workerAddress);
if (!workerData.isVerified) return 403;

// 2. Get CID from DB (stays secret!)
const { cid } = await db.getFile(taskId);

// 3. Download from Filecoin
const bytes = await synapse.storage.download(cid);

// 4. Stream to worker (no CID!)
res.send(Buffer.from(bytes));
```

## Why Self Contract in Filecoin Code?

**It's NOT on Filecoin!** Self Protocol contracts are on **Celo Sepolia**.

The backend just needs to:
1. Check Celo Sepolia (where Self contract lives) → Is worker verified?
2. If yes → Download from Filecoin (where data lives)
3. Stream to worker

Two different networks, one backend connects to both! ✅
