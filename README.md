# SCALE.FUN

Data annotation platform with blockchain-based escrow system.

## 🚀 Deployed Contracts

### Celo Mainnet

| Contract | Address | Description |
|----------|---------|-------------|
| **USDC** | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | Circle USDC stablecoin on Celo |
| **DataAnnotateEscrow** | `0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0` | Escrow contract for data annotation payments |

**Network Details:**
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Currency**: CELO
- **Block Explorer**: https://explorer.celo.org/mainnet/

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

### Contracts

```bash
cd contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Deploy DataAnnotateEscrow with USDC address
forge script script/DeployDataAnnotateEscrow.s.sol:DeployDataAnnotateEscrow \
  --sig "run(address)" 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  --rpc-url https://forno.celo.org \
  --broadcast \
  --private-key <YOUR_PRIVATE_KEY> \
  --legacy
```

### Miniapp

```bash
cd miniapp

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## 💡 Features

- **Escrow System**: Secure payment system for data annotation tasks using USDC
- **Mainnet Deployment**: Production-ready contracts deployed on Celo Mainnet
- **Curator Model**: Trusted curator controls fund distribution
- **Dataset Management**: Create, fund, and manage annotation datasets

## 📝 Contract Interaction

### Create a Dataset

```bash
# Approve USDC tokens for escrow contract
cast send 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  "approve(address,uint256)" \
  0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  1000000 \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://forno.celo.org

# Create dataset (amount in USDC decimals: 6)
cast send 0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  "createDataset(uint256,address)" \
  1000000 \
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
  100000 \
  --private-key <CURATOR_PRIVATE_KEY> \
  --rpc-url https://forno.celo.org
```

### Check USDC Balance

```bash
cast call 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  "balanceOf(address)(uint256)" \
  <ADDRESS> \
  --rpc-url https://forno.celo.org
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

- [Contracts README](contracts/README.md)
- [Farcaster Setup](miniapp/FARCASTER_SETUP.md)
- [USDC on Celo](https://docs.celo.org/protocol/tokens/usdc)

## 🔐 Security

⚠️ **Warning**: This project is deployed on Celo Mainnet with real USDC. Exercise caution when interacting with the contracts.

- Never share private keys
- Use environment variables for sensitive data
- The contracts handle real funds - ensure proper testing before use
- Always verify transaction details before signing

## 📄 License

MIT

