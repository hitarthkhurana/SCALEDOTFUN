import { useState } from "react";
import { useAccount } from "wagmi";

interface ClaimScreenProps {
  balance: number;
  onBack: () => void;
  onClaim: () => void;
}

interface DistributionResult {
  onChainDatasetId: number;
  amount: string;
  txHash: string;
}

interface DatasetBreakdown {
  onChainDatasetId: number;
  task: string;
  annotationCount: number;
  totalAmount: string;
}

interface BalanceCheckResult {
  currentDbBalance: string;
  calculatedEarnings: string;
  totalAnnotations: number;
  datasetBreakdown: DatasetBreakdown[];
  balanceMatch: boolean;
}

export function ClaimScreen({ balance, onBack, onClaim }: ClaimScreenProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distributionResults, setDistributionResults] = useState<DistributionResult[]>([]);
  const [totalDistributed, setTotalDistributed] = useState<string>("0");
  
  // Debug state
  const [isChecking, setIsChecking] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<BalanceCheckResult | null>(null);

  const handleClaim = async () => {
    if (!address) {
      setError("No wallet connected");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call the curator distribution API
      const response = await fetch("/api/curator/distribute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to distribute funds");
      }

      // Success!
      setDistributionResults(data.distributions || []);
      setTotalDistributed(data.totalDistributed || "0");
      setIsSuccess(true);
      
      // Call the onClaim callback to refresh parent component
      onClaim();
    } catch (err: any) {
      console.error("Claim error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDebugCheck = async () => {
    if (!address) {
      setError("No wallet connected");
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Call the check-balance API
      const response = await fetch(
        `/api/curator/check-balance?userAddress=${encodeURIComponent(address)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to check balance");
      }

      // Store debug data
      setDebugData({
        currentDbBalance: data.currentDbBalance,
        calculatedEarnings: data.calculatedEarnings,
        totalAnnotations: data.totalAnnotations,
        datasetBreakdown: data.datasetBreakdown || [],
        balanceMatch: data.balanceMatch,
      });
      setShowDebug(true);
    } catch (err: any) {
      console.error("Debug check error:", err);
      setError(err.message || "Failed to check balance");
    } finally {
      setIsChecking(false);
    }
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

              {error && (
                <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 text-left">
                  <p className="text-xs text-red-200 uppercase font-bold mb-1">Error</p>
                  <p className="text-sm text-white">{error}</p>
                </div>
              )}

              {/* Debug Info */}
              {showDebug && debugData && (
                <div className="bg-celo-yellow/10 border-2 border-celo-yellow rounded-lg p-4 text-left space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-celo-yellow uppercase font-bold">
                      🔍 Debug Balance Check
                    </p>
                    <button
                      onClick={() => setShowDebug(false)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">DB Balance</p>
                      <p className="font-mono font-bold text-white">
                        ${parseFloat(debugData.currentDbBalance).toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Calculated</p>
                      <p className="font-mono font-bold text-white">
                        ${parseFloat(debugData.calculatedEarnings).toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Annotations</p>
                      <p className="font-mono font-bold text-white">
                        {debugData.totalAnnotations}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Match Status</p>
                      <p className="font-mono font-bold text-white">
                        {debugData.balanceMatch ? "✓ Match" : "✗ Mismatch"}
                      </p>
                    </div>
                  </div>

                  {debugData.datasetBreakdown.length > 0 && (
                    <div className="border-t border-celo-yellow/20 pt-3">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-2">
                        Breakdown by Dataset
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {debugData.datasetBreakdown.map((dataset, idx) => (
                          <div
                            key={idx}
                            className="bg-black/20 rounded p-2 text-xs"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 mr-2">
                                <p className="font-bold text-white">
                                  Dataset #{dataset.onChainDatasetId}
                                </p>
                                <p className="text-gray-400 text-[10px] truncate">
                                  {dataset.task}
                                </p>
                              </div>
                              <p className="font-mono font-bold text-celo-yellow">
                                ${parseFloat(dataset.totalAmount).toFixed(4)}
                              </p>
                            </div>
                            <p className="text-gray-400 text-[10px]">
                              {dataset.annotationCount} annotation
                              {dataset.annotationCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Debug Button */}
              <button
                onClick={handleDebugCheck}
                disabled={balance <= 0 || isChecking || isProcessing || !address}
                className="w-full bg-white/10 text-white border-2 border-white/20 font-bold text-sm py-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isChecking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    🔍 Debug: Check Balance Breakdown
                  </>
                )}
              </button>

              {/* Main Claim Button */}
              <button
                onClick={handleClaim}
                disabled={balance <= 0 || isProcessing || isChecking || !address}
                className="btn-celo-primary w-full text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Processing on-chain...
                  </>
                ) : (
                  "Claim Earnings"
                )}
              </button>
              
              <p className="text-xs text-gray-400 mt-4">
                Funds will be sent directly to your wallet via the curator smart contract.
              </p>
            </div>
          </>
        ) : (
          <div className="animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-celo-lime rounded-full flex items-center justify-center mx-auto mb-6 text-celo-forest text-5xl border-4 border-celo-forest shadow-[0_0_0_10px_rgba(178,235,161,0.3)]">
              ✓
            </div>
            <h2 className="text-headline text-4xl text-celo-yellow mb-4">Claimed!</h2>
            <p className="text-white/80 mb-6 max-w-xs mx-auto">
              Successfully distributed <span className="font-bold text-celo-yellow">${totalDistributed}</span> cUSD to your wallet.
            </p>
            
            {distributionResults.length > 0 && (
              <div className="w-full max-w-md mb-8 space-y-2">
                <p className="text-xs text-gray-400 uppercase font-bold mb-3">
                  Transaction Details
                </p>
                {distributionResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 rounded-lg p-3 border border-white/20 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        Dataset #{result.onChainDatasetId}
                      </span>
                      <span className="font-mono font-bold text-celo-yellow">
                        ${parseFloat(result.amount).toFixed(4)}
                      </span>
                    </div>
                    <a
                      href={`https://celoscan.io/tx/${result.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-celo-sand hover:text-celo-yellow transition-colors break-all"
                    >
                      {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                    </a>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
              Funds have been sent to {formatAddress(address)}. Check your wallet or view on Celoscan.
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
