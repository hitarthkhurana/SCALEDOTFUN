# SCALE.FUN

Data annotation platform with blockchain-based escrow system.

## 🚀 Deployed Contracts

### Celo Sepolia Testnet

| Contract | Address | Description |
|----------|---------|-------------|
| **MockCUSD** | `0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0` | Mock cUSD ERC20 token for testing |
| **DataAnnotateEscrow** | `0xA39faDa84249f557a32338eA4b3604780fB9274c` | Escrow contract for data annotation payments |

**Network Details:**
- **Chain ID**: 11142220
- **RPC URL**: https://forno.celo-sepolia.celo-testnet.org
- **Currency**: CELO
- **Block Explorer**: https://celo-sepolia.blockscout.com/

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

# Deploy MockCUSD
forge script script/DeployMockCUSD.s.sol:DeployMockCUSD \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
  --broadcast \
  --private-key <YOUR_PRIVATE_KEY> \
  --legacy

# Deploy DataAnnotateEscrow
forge script script/DeployDataAnnotateEscrow.s.sol:DeployDataAnnotateEscrow \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
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

- **Escrow System**: Secure payment system for data annotation tasks
- **Mock Token**: Test-ready ERC20 token for development
- **Curator Model**: Trusted curator controls fund distribution
- **Dataset Management**: Create, fund, and manage annotation datasets

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

- [MockCUSD Documentation](contracts/MOCKCUSD_README.md)
- [Contracts README](contracts/README.md)
- [Farcaster Setup](miniapp/FARCASTER_SETUP.md)

## 🔐 Security

⚠️ **Warning**: This project is for development and testing purposes. The deployed contracts are on testnet only.

- Never share private keys
- Use environment variables for sensitive data
- Audit all smart contracts before mainnet deployment

## 📄 License

MIT

