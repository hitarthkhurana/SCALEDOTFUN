# SCALE.FUN Smart Contracts

Smart contracts for the SCALE.FUN data annotation platform, built with Foundry.

## 🚀 Deployed Contracts

### Celo Mainnet (Chain ID: 42220) ✅

| Contract | Address | Status |
|----------|---------|--------|
| **Real cUSD** | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | Official Celo USD |
| **DataAnnotateEscrow** | [`0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0`](https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0) | ✅ **VERIFIED** |

**View on CeloScan:** https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0#code

**Verification Details:**
- Verified via Sourcify
- Compiler: Solidity 0.8.20
- Optimization: 200 runs
- [View Source Code](https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0#code)

## 📦 Contracts

### DataAnnotateEscrow

A trusted curator model escrow system for managing data annotation payments:
- **Funder**: Creates datasets and provides cUSD budget
- **Curator**: Controls fund distribution to annotators (typically backend service)
- **Direct Payments**: cUSD transfers directly to annotators on distribution

**Key Features:**
- Secure escrow for worker payments
- Curator-controlled fund distribution
- Budget tracking per dataset
- Support for top-ups and refunds

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy to Celo Mainnet

```shell
# Deploy DataAnnotateEscrow with real cUSD
forge script script/DeployDataAnnotateEscrow.s.sol:DeployDataAnnotateEscrow \
  --sig "run(address)" 0x765DE816845861e75A25fCA122bb6898B8B1282a \
  --rpc-url https://forno.celo.org \
  --broadcast \
  --legacy
```

### Verify Contract on CeloScan

```shell
# Verify using Sourcify (no API key required)
forge verify-contract \
  0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0 \
  src/DataAnnotateEscrow.sol:DataAnnotateEscrow \
  --chain-id 42220 \
  --verifier sourcify

# Or flatten and verify manually on CeloScan
forge flatten src/DataAnnotateEscrow.sol > DataAnnotateEscrow_flattened.sol
# Then upload at: https://celoscan.io/verifyContract
```

**✅ Current Contract Status:**
- Deployed: `0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0`
- Verified: ✅ Yes (via Sourcify)
- View: https://celoscan.io/address/0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0#code

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
