import { useState } from "react";
import { useAccount } from "wagmi";

interface ClaimScreenProps {
  balance: number;
  onBack: () => void;
  onClaim: () => void;
}

export function ClaimScreen({ balance, onBack, onClaim }: ClaimScreenProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClaim = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      onClaim();
    }, 2000);
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "0x... (Connecting)";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-celo-purple flex flex-col text-white">
      {/* Header */}
      <div className="p-4 flex items-center">
        <button onClick={onBack} className="text-white p-2">
          ← Back
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {!isSuccess ? (
          <>
            <h1 className="text-headline text-4xl mb-2">Your Balance</h1>
            <p className="text-celo-tan/60 mb-8">Earnings available to claim</p>

            <div className="mb-12 relative">
              <div className="absolute inset-0 bg-celo-yellow blur-2xl opacity-20 animate-pulse-slow"></div>
              <span className="relative text-7xl font-mono font-bold text-celo-yellow text-stroke-black">
                ${balance.toFixed(4)}
              </span>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="bg-white/10 rounded-lg p-4 flex items-center justify-between border border-white/20">
                <div className="text-left">
                  <p className="text-xs text-gray-400 uppercase font-bold">Withdraw to</p>
                  <p className="font-bold font-mono">{formatAddress(address)}</p>
                </div>
                <div className="w-8 h-8 bg-celo-forest rounded-full flex items-center justify-center text-xs">
                  💳
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={balance <= 0 || isProcessing}
                className="btn-celo-primary w-full text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  "Claim Earnings"
                )}
              </button>
              
              <p className="text-xs text-gray-500 mt-4">
                Minimum withdrawal: $5.00 • Fee: $0.10
              </p>
            </div>
          </>
        ) : (
          <div className="animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-celo-lime rounded-full flex items-center justify-center mx-auto mb-6 text-celo-forest text-5xl border-4 border-celo-forest shadow-[0_0_0_10px_rgba(178,235,161,0.3)]">
              ✓
            </div>
            <h2 className="text-headline text-4xl text-celo-yellow mb-4">Claimed!</h2>
            <p className="text-white/80 mb-8 max-w-xs mx-auto">
              Funds have been sent to your wallet ({formatAddress(address)}). It may take a few minutes to appear.
            </p>
            <button 
              onClick={onBack}
              className="btn-celo-secondary w-full max-w-xs"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
