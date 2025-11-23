"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { ERC20_ABI } from "@/abi/ERC20";

// Real cUSD address on Celo Mainnet (from Celo docs)
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;
const CELO_MAINNET_CHAIN_ID = 42220;

interface RealBalanceDisplayProps {
  loading?: boolean;
}

export function RealBalanceDisplay({ loading }: RealBalanceDisplayProps) {
  const { address } = useAccount();
  
  // Read REAL cUSD balance from blockchain
  const { data: cusdBalance, isLoading: balanceLoading } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CELO_MAINNET_CHAIN_ID,
  });

  // Format balance
  const balance = cusdBalance 
    ? parseFloat(formatUnits(cusdBalance as bigint, 18))
    : 0;

  return (
    <span className="font-mono font-bold text-white">
      {loading || balanceLoading ? "..." : balance.toFixed(2)}
    </span>
  );
}

