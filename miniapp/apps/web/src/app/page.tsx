"use client";

import { useMiniApp } from "@/contexts/miniapp-context";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { celo } from "viem/chains";

// cUSD Contract on Celo Mainnet
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// ERC-20 ABI for transfer function
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export default function Home() {
  const { isMiniAppReady } = useMiniApp();

  // Wallet connection hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();

  // Tipping state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [tipAmount, setTipAmount] = useState(1);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wagmi write contract hook
  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-connect wallet when miniapp is ready
  useEffect(() => {
    if (isMiniAppReady && !isConnected && !isConnecting && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'farcaster');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
    }
  }, [isMiniAppReady, isConnected, isConnecting, connectors, connect]);

  // Handle transaction status updates
  useEffect(() => {
    if (isWritePending || isConfirming) {
      setTxStatus("pending");
      setErrorMessage(null);
    } else if (isConfirmed) {
      setTxStatus("success");
      setErrorMessage(null);
    } else if (writeError || confirmError) {
      setTxStatus("error");
      setErrorMessage(writeError?.message || confirmError?.message || "Transaction failed");
    }
  }, [isWritePending, isConfirming, isConfirmed, writeError, confirmError]);

  // Format wallet address
  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Increment/decrement tip amount
  const incrementTip = () => setTipAmount(prev => prev + 1);
  const decrementTip = () => setTipAmount(prev => Math.max(1, prev - 1));

  // Validate and send tip
  const handleSendTip = async () => {
    // Reset state
    resetWrite();
    setTxStatus("idle");
    setErrorMessage(null);

    // Validate recipient address
    if (!recipientAddress) {
      setTxStatus("error");
      setErrorMessage("Please enter a wallet address");
      return;
    }

    if (!isAddress(recipientAddress)) {
      setTxStatus("error");
      setErrorMessage("Invalid wallet address");
      return;
    }

    if (!isConnected) {
      setTxStatus("error");
      setErrorMessage("Please connect your wallet");
      return;
    }

    try {
      // Convert tipAmount to 18 decimals (cUSD has 18 decimals)
      const amountInWei = parseUnits(tipAmount.toString(), 18);

      writeContract({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipientAddress as `0x${string}`, amountInWei],
        chainId: celo.id,
      });
    } catch (err: unknown) {
      setTxStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to send transaction");
    }
  };

  // Reset form after success
  const handleReset = () => {
    setRecipientAddress("");
    setTipAmount(1);
    setTxStatus("idle");
    setErrorMessage(null);
    resetWrite();
  };

  if (!isMiniAppReady) {
    return (
      <main className="min-h-screen bg-celo-purple flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-celo-yellow border-t-transparent animate-spin mx-auto mb-6"></div>
          <p className="text-celo-yellow text-industrial text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-celo-purple">
      {/* Header Block */}
      <header className="bg-celo-yellow border-b-4 border-black p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-headline text-5xl md:text-6xl text-celo-purple">
            <span className="text-headline-italic">tip</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 ${isConnected ? 'bg-celo-forest' : 'bg-celo-brown'}`}></div>
            <span className="font-inter font-bold text-xs text-celo-purple uppercase tracking-wider">
              {isConnected ? formatAddress(address || "") : "Not Connected"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        {/* Recipient Address Block */}
        <section className="mb-6">
          <label className="label-celo text-celo-sand mb-2 block">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            className="input-celo w-full text-sm md:text-base"
            disabled={txStatus === "pending"}
          />
        </section>

        {/* Amount Counter Block */}
        <section className="mb-8">
          <label className="label-celo text-celo-sand mb-2 block">
            Amount (cUSD)
          </label>
          <div className="bg-celo-tan border-4 border-celo-purple p-4">
            <div className="flex items-center justify-between">
              {/* Decrement Button */}
              <button
                onClick={decrementTip}
                disabled={tipAmount <= 1 || txStatus === "pending"}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease amount"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M19 12H5" />
                </svg>
              </button>

              {/* Amount Display */}
              <div className="flex-1 text-center">
                <span className="text-headline text-7xl md:text-8xl text-celo-purple">
                  {tipAmount}
                </span>
                <p className="text-industrial text-celo-forest text-xs mt-2">
                  cUSD
                </p>
              </div>

              {/* Increment Button */}
              <button
                onClick={incrementTip}
                disabled={txStatus === "pending"}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase amount"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Tip Button */}
        <section className="mb-6">
          {txStatus === "success" ? (
            <button
              onClick={handleReset}
              className="btn-celo-forest w-full text-lg"
            >
              Send Another Tip
            </button>
          ) : (
            <button
              onClick={handleSendTip}
              disabled={txStatus === "pending" || !isConnected}
              className="btn-celo-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {txStatus === "pending" ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-black border-t-transparent animate-spin"></span>
                  Processing...
                </span>
              ) : (
                `Send ${tipAmount} cUSD`
              )}
            </button>
          )}
        </section>

        {/* Status Messages */}
        {txStatus === "success" && (
          <section className="bg-celo-lime border-4 border-celo-forest p-4 mb-6">
            <p className="text-industrial text-celo-forest text-sm mb-2">
              Tip Sent Successfully
            </p>
            <p className="font-inter text-celo-purple text-xs break-all">
              TX: {hash}
            </p>
          </section>
        )}

        {txStatus === "error" && errorMessage && (
          <section className="bg-celo-orange border-4 border-celo-brown p-4 mb-6">
            <p className="text-industrial text-celo-brown text-sm mb-1">
              Error
            </p>
            <p className="font-inter text-celo-purple text-xs">
              {errorMessage.length > 100 ? `${errorMessage.slice(0, 100)}...` : errorMessage}
            </p>
          </section>
        )}

        {/* Info Block */}
        <section className="bg-celo-forest border-4 border-celo-yellow p-6 mt-8">
          <h2 className="text-headline text-3xl text-celo-yellow mb-4">
            How it <span className="text-headline-italic">works</span>
          </h2>
          <ul className="space-y-3 font-inter text-celo-tan text-sm">
            <li className="flex items-start gap-3">
              <span className="bg-celo-yellow text-celo-forest w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
              <span>Enter the recipient&apos;s wallet address</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-celo-yellow text-celo-forest w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
              <span>Select the amount of cUSD to tip</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-celo-yellow text-celo-forest w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
              <span>Confirm the transaction in your wallet</span>
            </li>
          </ul>
          <p className="font-inter text-celo-sand/70 text-xs mt-4 uppercase tracking-wider">
            Powered by Celo
          </p>
        </section>
      </div>
    </main>
  );
}
