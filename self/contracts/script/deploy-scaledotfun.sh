#!/bin/bash

# Deploy scale.fun Verification Contract
# This script deploys the custom scale.fun contract with proper configuration

set -e  # Exit on error

echo "🚀 Deploying scale.fun Verification Contract..."
echo ""

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env from workshop or create one with:"
    echo "  PRIVATE_KEY=0xyour_private_key"
    echo "  NETWORK=celo-sepolia"
    echo "  IDENTITY_VERIFICATION_HUB_ADDRESS=0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74"
    echo "  SCOPE_SEED=scaledotfun-labeling"
    echo "  CELOSCAN_API_KEY=optional"
    exit 1
fi

source .env

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$NETWORK" ]; then
    echo "❌ NETWORK not set in .env"
    exit 1
fi

if [ -z "$IDENTITY_VERIFICATION_HUB_ADDRESS" ]; then
    echo "❌ IDENTITY_VERIFICATION_HUB_ADDRESS not set in .env"
    exit 1
fi

if [ -z "$SCOPE_SEED" ]; then
    echo "❌ SCOPE_SEED not set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Build contracts
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy contract
echo "📡 Deploying to $NETWORK..."
echo ""

forge script script/DeployScaleDotFun.s.sol:DeployScaleDotFun \
    --rpc-url $NETWORK \
    --broadcast \
    --verify \
    -vvvv

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Common issues:"
    echo "  1. Insufficient funds - Get test CELO from: https://faucet.celo.org/alfajores"
    echo "  2. Wrong RPC URL - Check .env NETWORK setting"
    echo "  3. Invalid private key - Check .env PRIVATE_KEY"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Copy the contract address from above"
echo "  2. Update miniapp/apps/web/src/config/self.config.ts"
echo "  3. Set CONTRACT_ADDRESS to the deployed address"
echo ""

