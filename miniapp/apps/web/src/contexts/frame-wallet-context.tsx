"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { defineChain } from "viem";

// Define Celo Sepolia Testnet
const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "CELO",
    symbol: "CELO",
  },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Celo Sepolia Explorer",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
});

const config = createConfig({
  chains: [celo, celoAlfajores, celoSepolia],
  connectors: [farcasterMiniApp()],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
    [celoSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function FrameWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
