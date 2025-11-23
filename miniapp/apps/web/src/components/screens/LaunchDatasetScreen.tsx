import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSendTransaction } from "wagmi";
import { parseUnits, formatUnits, decodeEventLog } from "viem";
import { createClient } from "@/utils/supabase/client";
import { ERC20_ABI } from "@/abi/ERC20";
import { DATA_ANNOTATE_ESCROW_ABI } from "@/abi/DataAnnotateEscrow";

interface LaunchDatasetScreenProps {
  onBack: () => void;
}

// Contract addresses on Celo Sepolia Testnet
const CUSD_ADDRESS = "0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0" as const;
const ESCROW_ADDRESS = "0xA39faDa84249f557a32338eA4b3604780fB9274c" as const;
const CURATOR_ADDRESS = "0x0217389e5d0954b0c7243f12ef92b79fa564a928" as const;
const CELO_SEPOLIA_CHAIN_ID = 11142220;

type LaunchStep = "idle" | "approving" | "creating" | "uploading" | "success" | "error";

export function LaunchDatasetScreen({ onBack }: LaunchDatasetScreenProps) {
  const { address, isConnected, chain, connector } = useAccount();
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [files, setFiles] = useState<File[]>([]);
  const [bounty, setBounty] = useState<string>("");
  const [minAnnotations, setMinAnnotations] = useState<string>("1");
  const [launchStep, setLaunchStep] = useState<LaunchStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send transaction for testing
  const { sendTransaction, data: testTxHash, isPending: isTestPending, error: testError } = useSendTransaction();

  // Debug: Log wallet state changes
  useEffect(() => {
    console.log("🔄 Wallet state changed:", {
      address,
      isConnected,
      chainId: chain?.id,
      chainName: chain?.name,
      connectorId: connector?.id,
      connectorName: connector?.name,
    });
  }, [address, isConnected, chain, connector]);

  // Approval transaction
  const { 
    data: approvalHash, 
    writeContract: approveTokens,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const { 
    isSuccess: isApprovalSuccess,
    isLoading: isApprovalLoading,
  } = useWaitForTransactionReceipt({ hash: approvalHash });

  // CreateDataset transaction
  const { 
    data: createDatasetHash, 
    writeContract: createDataset,
    isPending: isCreatePending,
    error: createError,
  } = useWriteContract();

  const { 
    isSuccess: isCreateSuccess,
    isLoading: isCreateLoading,
    data: createReceipt,
  } = useWaitForTransactionReceipt({ hash: createDatasetHash });

  // Check current allowance
  const { data: currentAllowance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ESCROW_ADDRESS] : undefined,
    chainId: CELO_SEPOLIA_CHAIN_ID,
  });

  // Check cUSD balance
  const { data: cusdBalance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CELO_SEPOLIA_CHAIN_ID,
  });

  // Debug: Log balance and allowance changes
  useEffect(() => {
    console.log("💰 Balance/Allowance updated:", {
      cusdBalance: cusdBalance?.toString(),
      cusdBalanceFormatted: cusdBalance ? formatUnits(cusdBalance as bigint, 18) : 'N/A',
      currentAllowance: currentAllowance?.toString(),
      currentAllowanceFormatted: currentAllowance ? formatUnits(currentAllowance as bigint, 18) : 'N/A',
    });
  }, [cusdBalance, currentAllowance]);

  // Pay per task calculation
  // Formula: cUSD amount / (# files * min annotations)
  const bountyNum = parseFloat(bounty) || 0;
  const minAnnotationsNum = parseInt(minAnnotations) || 1;
  const totalTasks = fileCount * minAnnotationsNum;
  const payPerTask = totalTasks > 0 ? bountyNum / totalTasks : 0;

  // Status Logic
  let statusColor = "bg-gray-400";
  let statusText = "Enter details";
  let statusMessage = "Upload data and set bounty to see prediction";

  if (totalTasks > 0 && bountyNum > 0) {
      if (payPerTask >= 0.10) {
          statusColor = "bg-green-500";
          statusText = "Excellent";
          statusMessage = "High likelihood of rapid completion";
      } else if (payPerTask >= 0.05) {
          statusColor = "bg-yellow-400";
          statusText = "Fair";
          statusMessage = "May take some time to complete";
      } else {
          statusColor = "bg-red-500";
          statusText = "Low";
          statusMessage = "Bounty too low. Tasks might stall";
      }
  }

  // Handle approval success
  useEffect(() => {
    console.log("🔄 Approval status check:", { isApprovalSuccess, launchStep, approvalHash });
    if (isApprovalSuccess && launchStep === "approving") {
      console.log("✅ Approval confirmed! Moving to creating...");
      setLaunchStep("creating");
      handleCreateDataset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprovalSuccess, launchStep]);

  // Handle create dataset success
  useEffect(() => {
    console.log("🔄 Create dataset status check:", { isCreateSuccess, launchStep, createDatasetHash, hasReceipt: !!createReceipt });
    if (isCreateSuccess && launchStep === "creating" && createReceipt) {
      console.log("✅ Dataset created! Moving to uploading...");
      setLaunchStep("uploading");
      handleUploadAndInsert(createReceipt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateSuccess, launchStep, createReceipt]);

  // Handle errors
  useEffect(() => {
    if (approveError && launchStep === "approving") {
      console.error("❌ Approval error:", approveError);
      console.error("Error name:", approveError.name);
      console.error("Error message:", approveError.message);
      setLaunchStep("error");
      setErrorMessage(approveError.message);
    }
  }, [approveError, launchStep]);

  useEffect(() => {
    if (createError && launchStep === "creating") {
      console.error("❌ Create dataset error:", createError);
      console.error("Error name:", createError.name);
      console.error("Error message:", createError.message);
      setLaunchStep("error");
      setErrorMessage(createError.message);
    }
  }, [createError, launchStep]);

  const handleFolderSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const fileList = Array.from(e.target.files);
        setFiles(fileList);
        setFileCount(fileList.length);
        // Try to get folder name from first file webkitRelativePath
        const path = e.target.files[0].webkitRelativePath;
        const folder = path.split('/')[0];
        setFolderName(folder || "Uploaded Folder");
    }
  };

  const handleLaunchDataset = async () => {
    console.log("🚀 === LAUNCH DATASET STARTED ===");
    console.log("Connected:", isConnected);
    console.log("Address:", address);
    console.log("Chain ID:", chain?.id);
    console.log("Chain Name:", chain?.name);
    
    if (!isConnected || !address) {
      console.error("❌ Wallet not connected");
      setErrorMessage("Please connect your wallet");
      setLaunchStep("error");
      return;
    }

    console.log("✅ Wallet connected:", address);

    if (chain?.id !== CELO_SEPOLIA_CHAIN_ID) {
      console.error("❌ Wrong network:", chain?.id, "Expected:", CELO_SEPOLIA_CHAIN_ID);
      setErrorMessage("Please switch to Celo Sepolia Testnet");
      setLaunchStep("error");
      return;
    }

    console.log("✅ Correct network: Celo Sepolia");

    if (!folderName || fileCount === 0) {
      console.error("❌ No files uploaded");
      setErrorMessage("Please upload files");
      setLaunchStep("error");
      return;
    }

    console.log("✅ Files uploaded:", fileCount);

    if (!bounty || parseFloat(bounty) <= 0) {
      console.error("❌ Invalid bounty amount");
      setErrorMessage("Please enter a valid bounty amount");
      setLaunchStep("error");
      return;
    }

    console.log("✅ Bounty amount:", bounty);

    if (!taskDescription.trim()) {
      console.error("❌ No task description");
      setErrorMessage("Please enter a task description");
      setLaunchStep("error");
      return;
    }

    console.log("✅ Task description provided");

    try {
      setErrorMessage("");
      
      // Convert bounty to wei (cUSD has 18 decimals)
      const bountyWei = parseUnits(bounty, 18);
      console.log("💰 Bounty in wei:", bountyWei.toString());

      // Check balance
      console.log("💰 Current cUSD balance:", cusdBalance?.toString());
      console.log("💰 Current allowance:", currentAllowance?.toString());

      // Check if user has enough balance
      if (cusdBalance && (cusdBalance as bigint) < bountyWei) {
        const balanceFormatted = formatUnits(cusdBalance as bigint, 18);
        console.error("❌ Insufficient balance:", balanceFormatted, "cUSD, need:", bounty, "cUSD");
        setErrorMessage(`Insufficient balance. You have ${balanceFormatted} cUSD but need ${bounty} cUSD`);
        setLaunchStep("error");
        return;
      }

      console.log("✅ Sufficient balance confirmed");

      setLaunchStep("approving");

      // Check if we need to approve
      const needsApproval = !currentAllowance || (currentAllowance as bigint) < bountyWei;
      console.log("🔐 Needs approval:", needsApproval);

      if (needsApproval) {
        console.log("📝 Preparing approval transaction...");
        
        // Use max uint256 for unlimited approval to avoid future approvals
        const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        
        console.log("  - Token:", CUSD_ADDRESS);
        console.log("  - Spender:", ESCROW_ADDRESS);
        console.log("  - Amount: MAX (unlimited)");
        console.log("  - From:", address);
        
        try {
          // Approve cUSD tokens for escrow contract with max approval
          approveTokens({
            address: CUSD_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [ESCROW_ADDRESS, maxApproval],
            chainId: CELO_SEPOLIA_CHAIN_ID,
          });
          
          console.log("✅ Approval transaction sent to wallet");
        } catch (approveErr) {
          console.error("💥 Failed to send approval transaction:", approveErr);
          throw approveErr;
        }
      } else {
        console.log("⏭️  Already approved, proceeding to create dataset");
        // Already approved, proceed to create
        setLaunchStep("creating");
        handleCreateDataset();
      }
    } catch (error) {
      console.error("💥 Launch error:", error);
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      setLaunchStep("error");
    }
  };

  const handleCreateDataset = useCallback(() => {
    console.log("📝 === CREATE DATASET STARTED ===");
    
    if (!bounty) {
      console.error("❌ No bounty set");
      return;
    }

    try {
      const bountyWei = parseUnits(bounty, 18);
      console.log("💰 Creating dataset with bounty:", bountyWei.toString());
      console.log("  - Escrow:", ESCROW_ADDRESS);
      console.log("  - Curator:", CURATOR_ADDRESS);
      console.log("  - Chain ID:", CELO_SEPOLIA_CHAIN_ID);

      // Call createDataset on the escrow contract
      createDataset({
        address: ESCROW_ADDRESS,
        abi: DATA_ANNOTATE_ESCROW_ABI,
        functionName: "createDataset",
        args: [bountyWei, CURATOR_ADDRESS],
        chainId: CELO_SEPOLIA_CHAIN_ID,
      });
      
      console.log("✅ Create dataset transaction sent to wallet");
    } catch (error) {
      console.error("💥 Create dataset error:", error);
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      setLaunchStep("error");
    }
  }, [bounty, createDataset]);

  const handleUploadAndInsert = useCallback(async (receipt: any) => {
    try {
      // Parse the datasetId from the event logs
      let datasetId: bigint | undefined;
      
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: DATA_ANNOTATE_ESCROW_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          if (decoded.eventName === "DatasetCreated" && decoded.args) {
            datasetId = (decoded.args as any).datasetId as bigint;
            break;
          }
        } catch {
          // Not a DatasetCreated event, continue
          continue;
        }
      }

      if (!datasetId) {
        throw new Error("Could not find DatasetCreated event in transaction receipt");
      }

      console.log("📦 Dataset created with ID:", datasetId.toString());

      const supabase = createClient();
      const normalizedAddress = address!.toLowerCase();
      const bountyNum = parseFloat(bounty);
      const minAnnotationsNum = parseInt(minAnnotations) || 1;
      const payoutPerAnnotation = bountyNum / (fileCount * minAnnotationsNum);

      // Upload each file to Supabase Storage and create database entries
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Determine file type
        let fileType: 'text' | 'audio' | 'image' = 'text';
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('audio/')) {
          fileType = 'audio';
        }

        // Upload to Supabase Storage
        const fileName = `${datasetId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('datasetfiles')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`Failed to upload file ${file.name}:`, uploadError);
          continue; // Skip this file but continue with others
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('datasetfiles')
          .getPublicUrl(fileName);

        // Insert into datasets table
        const { error: insertError } = await supabase
          .from('datasets')
          .insert({
            dataset_id: Number(datasetId),
            funder_address: normalizedAddress,
            curator_address: CURATOR_ADDRESS.toLowerCase(),
            file_url: publicUrl,
            file_type: fileType,
            task: taskDescription,
            annotations: 0,
            minimum_annotations: minAnnotationsNum,
            cusdc_payout_per_annotation: payoutPerAnnotation,
            allowed_countries: null, // Can be extended later
            active: true,
          });

        if (insertError) {
          console.error(`Failed to insert dataset entry for ${file.name}:`, insertError);
          // Continue with other files
        }
      }

      console.log("✅ All files uploaded and dataset entries created!");
      setLaunchStep("success");

    } catch (error) {
      console.error("Upload and insert error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload files");
      setLaunchStep("error");
    }
  }, [address, bounty, minAnnotations, fileCount, files, taskDescription]);

  // Get loading/status text
  const getStatusText = () => {
    switch (launchStep) {
      case "approving":
        return isApprovalLoading ? "⏳ Approving tokens..." : "📝 Please approve in wallet";
      case "creating":
        return isCreateLoading ? "⏳ Creating dataset..." : "📝 Please confirm in wallet";
      case "uploading":
        return "⬆️ Uploading files and creating entries...";
      case "success":
        return "✅ Dataset launched successfully!";
      case "error":
        return `❌ Error: ${errorMessage}`;
      default:
        return "";
    }
  };

  const isLaunching = ["approving", "creating", "uploading"].includes(launchStep);
  const isDisabled = !folderName || !bounty || !taskDescription.trim() || isLaunching;

  // Test wallet connection
  const testWalletConnection = async () => {
    console.log("🧪 === TESTING WALLET CONNECTION ===");
    console.log("isConnected:", isConnected);
    console.log("address:", address);
    console.log("chain:", chain);
    console.log("chainId:", chain?.id);
    console.log("cusdBalance:", cusdBalance?.toString());
    console.log("currentAllowance:", currentAllowance?.toString());
    
    if (!address) {
      console.error("❌ No address available");
      alert("No wallet address found!");
      return;
    }

    try {
      console.log("Testing simple CELO transfer...");
      console.log("  - To:", CURATOR_ADDRESS);
      console.log("  - Amount: 0.1 CELO");
      
      // Send 0.1 CELO to curator address
      sendTransaction({
        to: CURATOR_ADDRESS as `0x${string}`,
        value: parseUnits("0.1", 18), // 0.1 CELO
        chainId: CELO_SEPOLIA_CHAIN_ID,
      });
      
      console.log("✅ Transaction sent to wallet for approval");
    } catch (error) {
      console.error("❌ Connection test failed:", error);
      alert(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Monitor test transaction
  useEffect(() => {
    if (testTxHash) {
      console.log("✅ Test transaction hash:", testTxHash);
      alert(`Test transaction sent!\n\nTx Hash: ${testTxHash}\n\nCheck the block explorer to confirm.`);
    }
  }, [testTxHash]);

  useEffect(() => {
    if (testError) {
      console.error("❌ Test transaction error:", testError);
      alert(`Test failed: ${testError.message}`);
    }
  }, [testError]);

  return (
    <div className="min-h-screen bg-celo-tan flex flex-col">
       {/* Header */}
       <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <button 
            onClick={onBack}
            className="mb-4 text-sm font-bold opacity-80 hover:opacity-100 flex items-center gap-1"
            disabled={isLaunching}
        >
            ← Back to Marketplace
        </button>
        <h2 className="text-headline text-3xl text-celo-yellow">Launch Dataset</h2>
        <p className="text-sm font-mono text-celo-sand">Create a new tokenized dataset.</p>
      </div>

      <div className="p-6 flex flex-col gap-6 pb-24">
        
        {/* Transaction Status Banner */}
        {launchStep !== "idle" && (
          <div className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${
            launchStep === "success" ? "bg-green-500" : 
            launchStep === "error" ? "bg-red-500" : 
            "bg-blue-500"
          }`}>
            <p className="font-bold text-white text-center">{getStatusText()}</p>
            {launchStep === "success" && (
              <button 
                onClick={() => {
                  setLaunchStep("idle");
                  setFolderName(null);
                  setFiles([]);
                  setFileCount(0);
                  setBounty("");
                  setTaskDescription("");
                  setMinAnnotations("1");
                  onBack();
                }}
                className="w-full mt-4 bg-white text-black font-bold py-2 rounded-lg"
              >
                Back to Marketplace
              </button>
            )}
            {launchStep === "error" && (
              <button 
                onClick={() => setLaunchStep("idle")}
                className="w-full mt-4 bg-white text-black font-bold py-2 rounded-lg"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Wallet Connection Warning */}
        {!isConnected && (
          <div className="bg-yellow-400 border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <p className="font-bold text-black">⚠️ Please connect your wallet to launch a dataset</p>
          </div>
        )}

        {/* Network Warning */}
        {isConnected && chain?.id !== CELO_SEPOLIA_CHAIN_ID && (
          <div className="bg-orange-500 border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <p className="font-bold text-white">⚠️ Please switch to Celo Sepolia Testnet</p>
            <p className="text-sm text-white/80 mt-1">Chain ID: {CELO_SEPOLIA_CHAIN_ID}</p>
          </div>
        )}

        {/* Debug: Test Wallet Connection */}
        {isConnected && chain?.id === CELO_SEPOLIA_CHAIN_ID && (
          <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-bold text-blue-900">🔌 Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                <p className="text-xs text-blue-700">Chain: {chain.name}</p>
              </div>
              <button
                onClick={testWalletConnection}
                className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-600"
                disabled={isTestPending}
              >
                {isTestPending ? "Sending..." : "Test: Send 0.1 CELO"}
              </button>
            </div>
          </div>
        )}
        
        {/* Step 1: Upload */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Upload Data
            </h3>
            <div 
                className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors ${
                  isLaunching ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                }`}
                onClick={() => !isLaunching && fileInputRef.current?.click()}
            >
                {folderName ? (
                    <div>
                        <div className="text-4xl mb-2">📁</div>
                        <p className="font-bold text-lg">{folderName}</p>
                        <p className="text-sm text-gray-500">{fileCount} files found</p>
                    </div>
                ) : (
                    <div>
                        <div className="text-4xl mb-2">☁️</div>
                        <p className="font-bold text-gray-600">Click to upload folder</p>
                        <p className="text-xs text-gray-400 mt-1">Supports images, audio, text</p>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden"
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    multiple 
                    onChange={handleFolderSelect}
                    disabled={isLaunching}
                />
            </div>
        </div>

        {/* Step 2: Task Details */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Task Details
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Task Description</label>
                    <textarea 
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="e.g., Label sentiment as positive/negative/neutral"
                        className="w-full border-2 border-black rounded p-2 font-mono text-sm h-20 resize-none"
                        disabled={isLaunching}
                    />
                </div>
            </div>
        </div>

        {/* Step 3: Bounty Details */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                Set Bounty
            </h3>
            
            <div className="space-y-4">
                {/* Balance Display */}
                {cusdBalance !== undefined && (
                  <div className="bg-celo-yellow/20 border-2 border-celo-yellow rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-gray-600">Available Balance</span>
                      <span className="font-mono font-bold text-lg">
                        {parseFloat(formatUnits(cusdBalance as bigint, 18)).toFixed(2)} cUSD
                      </span>
                    </div>
                  </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Total Bounty (cUSD)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={bounty}
                            onChange={(e) => setBounty(e.target.value)}
                            placeholder="0.00"
                            className="w-full border-2 border-black rounded p-2 font-mono font-bold text-lg"
                            disabled={isLaunching}
                        />
                        <span className="absolute right-3 top-2.5 font-bold text-gray-400">$</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Min. Annotations per File</label>
                    <input 
                        type="number" 
                        value={minAnnotations}
                        onChange={(e) => setMinAnnotations(e.target.value)}
                        className="w-full border-2 border-black rounded p-2 font-mono font-bold text-lg"
                        disabled={isLaunching}
                    />
                </div>
            </div>
        </div>

        {/* Analysis Banner */}
        <div className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] transition-colors ${statusColor}`}>
            <h3 className="font-black text-xl text-white uppercase drop-shadow-md mb-1">
                {statusText}
            </h3>
            <p className="font-bold text-white/90 text-sm mb-3 border-b-2 border-white/20 pb-2">
                {statusMessage}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-white text-sm font-mono">
                <div>
                    <span className="opacity-75 block text-xs">Pay Per Task</span>
                    <span className="font-bold text-lg">${payPerTask.toFixed(4)}</span>
                </div>
                <div>
                    <span className="opacity-75 block text-xs">Total Tasks</span>
                    <span className="font-bold text-lg">{totalTasks}</span>
                </div>
            </div>
        </div>

        {/* Launch Button */}
        <button 
          className="w-full bg-celo-yellow text-black font-black text-xl py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={isDisabled}
          onClick={handleLaunchDataset}
        >
          {isLaunching ? "LAUNCHING..." : "LAUNCH DATASET 🚀"}
        </button>

      </div>
    </div>
  );
}

