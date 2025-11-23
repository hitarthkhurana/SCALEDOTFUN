

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, decodeEventLog } from "viem";
import { createClient } from "@/utils/supabase/client";
import { ERC20_ABI } from "@/abi/ERC20";
import { DATASET_MARKETPLACE_ABI } from "@/abi/DatasetMarketplace";

// Contract addresses on Celo MAINNET
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const; // REAL cUSD
const MARKETPLACE_ADDRESS = "0x2cC8C36C09726519b676b0a19BB911873dAdF387" as const; // ✅ DEPLOYED!
const CELO_MAINNET_CHAIN_ID = 42220;

interface Dataset {
  dataset_id: number;
  funder_address: string;
  curator_address: string;
  task: string;
  file_count: number;
  completed_count: number;
  completion_percentage: number;
  filecoin_cid: string | null;
}

interface UploadToMarketplaceScreenProps {
  dataset: Dataset;
  onBack: () => void;
  onSuccess: () => void;
}

type UploadStep = "idle" | "uploading-filecoin" | "listing" | "success" | "error";

export function UploadToMarketplaceScreen({ dataset, onBack, onSuccess }: UploadToMarketplaceScreenProps) {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const [price, setPrice] = useState<string>("");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [filecoinCid, setFilecoinCid] = useState<string | null>(dataset.filecoin_cid);
  const [uploadingToFilecoin, setUploadingToFilecoin] = useState(false);

  // List dataset transaction
  const { 
    data: listHash, 
    writeContract: listDataset,
    isPending: isListPending,
    error: listError,
  } = useWriteContract();

  const { 
    isSuccess: isListSuccess,
    isLoading: isListLoading,
  } = useWaitForTransactionReceipt({ hash: listHash });

  // Handle listing success
  useEffect(() => {
    if (isListSuccess && uploadStep === "listing") {
      console.log("✅ Dataset listed successfully!");
      handleUpdateDatabase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListSuccess, uploadStep]);

  // Handle errors
  useEffect(() => {
    if (listError && uploadStep === "listing") {
      console.error("❌ Listing error:", listError);
      setUploadStep("error");
      setErrorMessage(listError.message);
    }
  }, [listError, uploadStep]);

  // Upload to Filecoin in background
  const handleUploadToFilecoin = async () => {
    if (filecoinCid) {
      // Already uploaded
      return filecoinCid;
    }

    setUploadingToFilecoin(true);
    setUploadStep("uploading-filecoin");

    try {
      // Call background API to upload to Filecoin
      const response = await fetch('/api/datasets/upload-to-filecoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: dataset.dataset_id }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload to Filecoin');
      }

      const data = await response.json();
      const cids = data.filecoinCIDs; // Array of {filename, file_cid, annotations_cid}

      if (!cids || cids.length === 0) {
        throw new Error('No CIDs returned from upload');
      }

      // Store CIDs as JSON string
      const cidJson = JSON.stringify(cids);
      setFilecoinCid(cidJson);

      // Database already updated by API, but we set local state
      console.log("✅ CIDs received from upload:", cids);

      console.log("✅ Uploaded to Filecoin:", cidJson);
      return cidJson;

    } catch (error) {
      console.error("Failed to upload to Filecoin:", error);
      setErrorMessage(error instanceof Error ? error.message : "Filecoin upload failed");
      setUploadStep("error");
      throw error;
    } finally {
      setUploadingToFilecoin(false);
    }
  };

  // List on marketplace
  const handleListOnMarketplace = async () => {
    if (!isConnected || !address) {
      setErrorMessage("Please connect your wallet");
      setUploadStep("error");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setErrorMessage("Please enter a valid price");
      setUploadStep("error");
      return;
    }

    try {
      setErrorMessage("");

      // Step 1: Upload to Filecoin if not already done
      let cid = filecoinCid;
      if (!cid) {
        cid = await handleUploadToFilecoin();
      }

      if (!cid) {
        throw new Error("Failed to get Filecoin CID");
      }

      // Step 2: List on smart contract
      setUploadStep("listing");
      const priceWei = parseUnits(price, 18);

      console.log("📝 Listing dataset on marketplace...");
      console.log("  - Dataset ID:", dataset.dataset_id);
      console.log("  - Price:", priceWei.toString());
      console.log("  - Filecoin CID:", cid);

      listDataset({
        address: MARKETPLACE_ADDRESS,
        abi: DATASET_MARKETPLACE_ABI,
        functionName: "listDataset",
        args: [BigInt(dataset.dataset_id), priceWei, cid],
        chainId: CELO_MAINNET_CHAIN_ID,
      });

      console.log("✅ Listing transaction sent to wallet");

    } catch (error) {
      console.error("💥 List error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      setUploadStep("error");
    }
  };

  // Update database after successful listing
  const handleUpdateDatabase = async () => {
    try {
      if (!listHash || !publicClient) {
        throw new Error("Missing transaction hash or public client");
      }

      const supabase = createClient();

      // Get the transaction receipt to extract the real listing ID from the event
      console.log("📥 Fetching transaction receipt...");
      const receipt = await publicClient.getTransactionReceipt({ hash: listHash });

      // Find the DatasetListed event
      const datasetListedLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: DATASET_MARKETPLACE_ABI,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "DatasetListed";
        } catch {
          return false;
        }
      });

      if (!datasetListedLog) {
        throw new Error("DatasetListed event not found in transaction");
      }

      // Decode the event to get the listing ID
      const decoded = decodeEventLog({
        abi: DATASET_MARKETPLACE_ABI,
        data: datasetListedLog.data,
        topics: datasetListedLog.topics,
      });

      const listingId = Number((decoded.args as any).listingId);
      console.log("✅ Got on-chain listing ID:", listingId);

      // 1. Create marketplace listing entry
      const { error: listingError } = await supabase
        .from('marketplace_listings')
        .insert({
          listing_id: listingId,
          dataset_id: dataset.dataset_id,
          curator_address: address!,
          funder_address: dataset.funder_address,
          dataset_name: `Dataset #${dataset.dataset_id}`,
          task_description: dataset.task || "High-quality labeled dataset",
          file_count: dataset.file_count,
          filecoin_cid: filecoinCid || '',
          price: parseFloat(price),
          active: true,
          total_purchases: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (listingError) {
        console.error("Failed to create marketplace listing:", listingError);
        throw listingError;
      }

      console.log("✅ Marketplace listing created successfully!");
      setUploadStep("success");
      
      // Delay and trigger success callback
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error("Database update error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to update database");
      setUploadStep("error");
    }
  };

  const getStatusText = () => {
    switch (uploadStep) {
      case "uploading-filecoin":
        return "⬆️ Uploading to Filecoin (background)...";
      case "listing":
        return isListLoading ? "⏳ Listing on marketplace..." : "📝 Please confirm in wallet";
      case "success":
        return "✅ Dataset listed successfully!";
      case "error":
        return `❌ Error: ${errorMessage}`;
      default:
        return "";
    }
  };

  const isProcessing = ["uploading-filecoin", "listing"].includes(uploadStep);
  const isDisabled = !price || isProcessing;

  // Platform fee calculation (15%)
  const priceNum = parseFloat(price) || 0;
  const platformFee = priceNum * 0.15;
  const youReceive = priceNum - platformFee;

  return (
    <div className="min-h-screen bg-celo-tan flex flex-col">
      {/* Header */}
      <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <button 
          onClick={onBack}
          className="mb-4 text-sm font-bold opacity-80 hover:opacity-100 flex items-center gap-1"
          disabled={isProcessing}
        >
          ← Back to Profile
        </button>
        <h2 className="text-headline text-3xl text-celo-yellow">List on Marketplace</h2>
        <p className="text-sm font-mono text-celo-sand">Sell your labeled dataset.</p>
      </div>

      <div className="p-6 flex flex-col gap-6 pb-24">
        
        {/* Status Banner */}
        {uploadStep !== "idle" && (
          <div className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${
            uploadStep === "success" ? "bg-green-500" : 
            uploadStep === "error" ? "bg-red-500" : 
            "bg-blue-500"
          }`}>
            <p className="font-bold text-white text-center">{getStatusText()}</p>
            {uploadStep === "success" && (
              <p className="text-sm text-white/90 text-center mt-2">
                Redirecting to profile...
              </p>
            )}
            {uploadStep === "error" && (
              <button 
                onClick={() => setUploadStep("idle")}
                className="w-full mt-4 bg-white text-black font-bold py-2 rounded-lg"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Dataset Info */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
          <h3 className="font-bold text-lg mb-3">Dataset Information</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Dataset ID:</span>
              <span className="font-mono font-bold">#{dataset.dataset_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Task:</span>
              <span className="font-bold text-right max-w-[60%] truncate">{dataset.task}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Total Files:</span>
              <span className="font-mono font-bold">{dataset.file_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Completion:</span>
              <span className="font-mono font-bold text-green-600">100%</span>
            </div>
            {filecoinCid && (
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Filecoin:</span>
                <span className="font-mono text-xs text-blue-600">✅ Uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Set Price */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">$</span>
            Set Price
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Price (cUSD)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border-2 border-black rounded p-2 font-mono font-bold text-lg"
                  disabled={isProcessing}
                  step="0.01"
                  min="0"
                />
                <span className="absolute right-3 top-2.5 font-bold text-gray-400">cUSD</span>
              </div>
            </div>

            {priceNum > 0 && (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-mono font-bold">{priceNum.toFixed(2)} cUSD</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Platform Fee (15%):</span>
                  <span className="font-mono font-bold">-{platformFee.toFixed(2)} cUSD</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-lg">
                  <span className="font-bold text-green-700">You Receive:</span>
                  <span className="font-mono font-bold text-green-700">{youReceive.toFixed(2)} cUSD</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filecoin Upload Status */}
        {!filecoinCid && (
          <div className="bg-blue-100 border-4 border-blue-500 p-4">
            <p className="font-bold text-blue-900 text-center">
              📦 Files will be uploaded to Filecoin automatically
            </p>
            <p className="text-xs text-blue-700 text-center mt-1">
              This happens in the background after you click "List on Marketplace"
            </p>
          </div>
        )}

        {/* List Button */}
        <button 
          className="w-full bg-celo-yellow text-black font-black text-xl py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={isDisabled}
          onClick={handleListOnMarketplace}
        >
          {isProcessing ? "PROCESSING..." : "LIST ON MARKETPLACE 🚀"}
        </button>

        {/* Info */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 text-xs text-yellow-900">
          <p className="font-bold mb-2">ℹ️ What happens next:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Your files will be uploaded to Filecoin (decentralized storage)</li>
            <li>Dataset will be listed on the marketplace smart contract</li>
            <li>Buyers can purchase and download the labeled data</li>
            <li>You receive 85% of the sale price (15% platform fee)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

