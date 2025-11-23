import { useState, useRef, ChangeEvent } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { parseUnits, maxUint256, formatUnits, decodeEventLog } from "viem";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { DATA_ANNOTATE_ESCROW_ABI } from "@/abi/DataAnnotateEscrow";
import { ERC20_ABI } from "@/abi/ERC20";

// Constants
// Mainnet DataAnnotateEscrow Address - To be deployed/verified on Celo Mainnet
const DATA_ANNOTATE_ESCROW_ADDRESS =
  "0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0";
// Mainnet cUSD Address
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
// Curator Address (Mainnet)
const CURATOR_ADDRESS = "0x0217389e5d0954b0c7243f12ef92b79fa564a928";

// Common countries list
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "India",
  "Japan",
  "South Korea",
  "Singapore",
  "China",
  "Brazil",
  "Mexico",
  "Argentina",
  "Colombia",
  "Chile",
  "Nigeria",
  "South Africa",
  "Kenya",
  "Egypt",
  "Morocco",
  "India",
  "Argentina",
  "Brazil",
  "Mexico",
  "Chile",
  "Colombia",
  "Peru",
  "Venezuela",
  "Ecuador",
  "Uruguay",
  "Paraguay",
  "Bolivia",
];

interface LaunchDatasetScreenProps {
  onBack: () => void;
}

export function LaunchDatasetScreen({ onBack }: LaunchDatasetScreenProps) {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [bounty, setBounty] = useState<string>("");
  const [minAnnotations, setMinAnnotations] = useState<string>("1");
  const [task, setTask] = useState<string>("");
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Fetch cUSD Balance
  const { data: cusdBalance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const formattedBalance = cusdBalance
    ? formatUnits(cusdBalance as bigint, 18)
    : "0.00";

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
    if (payPerTask >= 0.1) {
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

  const handleFolderSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(
        (f) => !f.name.startsWith(".")
      );
      setFiles(selectedFiles);
      setFileCount(selectedFiles.length);
      // Try to get folder name from first file webkitRelativePath
      const path = e.target.files[0].webkitRelativePath;
      const folder = path.split("/")[0];
      setFolderName(folder || "Uploaded Folder");
    }
  };

  const getFileType = (file: File): "text" | "audio" | "image" => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".json")
    )
      return "text";
    return "text"; // default
  };

  const toggleCountry = (country: string) => {
    setAllowedCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country]
    );
  };

  const handleLaunch = async () => {
    if (!address || !publicClient || files.length === 0) return;

    setIsLaunching(true);
    setLaunchStatus("Initializing...");

    try {
      const supabase = createClient();
      const normalizedAddress = address.toLowerCase();

      // 0. Ensure User Exists
      // If user is launching, they might be new. Check & Insert if needed.
      const { data: existingUser } = await supabase
        .from("users")
        .select("address")
        .eq("address", normalizedAddress)
        .single();

      if (!existingUser) {
        setLaunchStatus("Creating user profile...");
        const { error: createUserError } = await supabase.from("users").insert({
          address: normalizedAddress,
          cusdc_balance: 0,
          streak: 0,
          total_earnings: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (createUserError)
          throw new Error(`Failed to create user: ${createUserError.message}`);
      }

      // 0.1 Ensure Curator Exists
      const normalizedCurator = CURATOR_ADDRESS.toLowerCase();
      const { data: existingCurator } = await supabase
        .from("users")
        .select("address")
        .eq("address", normalizedCurator)
        .single();

      if (!existingCurator) {
        setLaunchStatus("Ensuring curator profile exists...");
        const { error: createCuratorError } = await supabase
          .from("users")
          .insert({
            address: normalizedCurator,
            cusdc_balance: 0,
            streak: 0,
            total_earnings: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (createCuratorError)
          throw new Error(
            `Failed to create curator: ${createCuratorError.message}`
          );
      }

      // 1. Upload Files
      setLaunchStatus("Uploading files to Storage...");
      const uploadedFiles: { url: string; type: "text" | "audio" | "image" }[] =
        [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLaunchStatus(`Uploading file ${i + 1}/${files.length}...`);

        // Create unique path: address/timestamp/filename
        const filePath = `${address}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("datasetfiles")
          .upload(filePath, file);

        if (uploadError)
          throw new Error(
            `Upload failed for ${file.name}: ${uploadError.message}`
          );

        const {
          data: { publicUrl },
        } = supabase.storage.from("datasetfiles").getPublicUrl(filePath);
        uploadedFiles.push({
          url: publicUrl,
          type: getFileType(file),
        });
      }

      // 2. Approve CUSD
      setLaunchStatus("Please approve cUSD spending...");
      const totalBountyWei = parseUnits(bounty, 18);

      const approveTx = await writeContractAsync({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [DATA_ANNOTATE_ESCROW_ADDRESS, maxUint256],
        feeCurrency: CUSD_ADDRESS,
      } as any);

      setLaunchStatus("Waiting for approval confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // 3. Create ONE Dataset On-Chain with Total Bounty
      setLaunchStatus("Creating dataset on-chain...");

      const hash = await writeContractAsync({
        address: DATA_ANNOTATE_ESCROW_ADDRESS,
        abi: DATA_ANNOTATE_ESCROW_ABI,
        functionName: "createDataset",
        args: [totalBountyWei, CURATOR_ADDRESS],
        feeCurrency: CUSD_ADDRESS,
      } as any);

      setLaunchStatus("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Find DatasetCreated Event
      const eventLog = receipt.logs.find((log) => {
        try {
          const event = decodeEventLog({
            abi: DATA_ANNOTATE_ESCROW_ABI,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === "DatasetCreated";
        } catch {
          return false;
        }
      });

      if (!eventLog) throw new Error("Failed to find DatasetCreated event");

      const decoded = decodeEventLog({
        abi: DATA_ANNOTATE_ESCROW_ABI,
        data: eventLog.data,
        topics: eventLog.topics,
      });

      const datasetId = (decoded.args as any).datasetId;

      // 4. Insert All Files to DB with Same Dataset ID
      const payoutPerAnnotation = parseFloat(
        formatUnits(totalBountyWei / BigInt(totalTasks), 18)
      );

      for (let i = 0; i < uploadedFiles.length; i++) {
        setLaunchStatus(`Saving file ${i + 1}/${files.length} to database...`);
        const fileData = uploadedFiles[i];

        // DB Insert - Each file gets same dataset_id
        const { error: dbError } = await supabase.from("datasets").insert({
          dataset_id: Number(datasetId),
          funder_address: normalizedAddress,
          curator_address: CURATOR_ADDRESS.toLowerCase(),
          file_url: fileData.url,
          file_type: fileData.type,
          task: task,
          annotations: 0,
          minimum_annotations: minAnnotationsNum,
          cusdc_payout_per_annotation: payoutPerAnnotation,
          allowed_countries: [],
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (dbError) throw new Error(`DB Insert failed: ${dbError.message}`);
      }

      setLaunchStatus("Success!");
      setTimeout(onBack, 1000);
    } catch (error: any) {
      console.error(error);
      setLaunchStatus("Error: " + error.message);
      setTimeout(() => setIsLaunching(false), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-celo-tan flex flex-col relative">
      {isLaunching && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-celo-yellow" />
          <h3 className="text-2xl font-black text-celo-yellow mb-2">
            LAUNCHING DATASET
          </h3>
          <p className="font-mono text-lg">{launchStatus}</p>
          <p className="text-sm text-gray-400 mt-4 max-w-md">
            Please keep this window open and sign the transactions in your
            wallet.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <button
          onClick={onBack}
          disabled={isLaunching}
          className="mb-4 text-sm font-bold opacity-80 hover:opacity-100 flex items-center gap-1 disabled:opacity-50"
        >
          ← Back to Marketplace
        </button>
        <h2 className="text-headline text-3xl text-celo-yellow">
          Launch Dataset
        </h2>
        <p className="text-sm font-mono text-celo-sand">
          Create a new tokenized dataset.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-6 pb-24">
        {/* Step 1: Upload */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
              1
            </span>
            Upload Data
          </h3>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
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
                <p className="font-bold text-gray-600">
                  Click to upload folder
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports images, audio, text
                </p>
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

        {/* Step 2: Bounty Details */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
              2
            </span>
            Set Bounty
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Total Bounty (cUSD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={bounty}
                  onChange={(e) => setBounty(e.target.value)}
                  placeholder="0.00"
                  disabled={isLaunching}
                  className="w-full border-2 border-black rounded p-2 font-mono font-bold text-lg"
                />
                <span className="absolute right-3 top-2.5 font-bold text-gray-400">
                  $
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                Balance:{" "}
                <span className="font-bold font-mono">
                  {Number(formattedBalance).toFixed(2)} cUSD
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Min. Annotations per File
              </label>
              <input
                type="number"
                value={minAnnotations}
                onChange={(e) => setMinAnnotations(e.target.value)}
                disabled={isLaunching}
                className="w-full border-2 border-black rounded p-2 font-mono font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Task Description
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g., Label emotions in audio, Identify objects in images, Classify sentiment..."
                disabled={isLaunching}
                rows={3}
                className="w-full border-2 border-black rounded p-2 font-mono text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe what you want annotators to do with your data
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                Allowed Countries
                <span className="text-gray-400 font-normal ml-1">
                  (leave empty for all countries)
                </span>
              </label>
              <div className="border-2 border-black rounded p-3 max-h-48 overflow-y-auto bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  {COUNTRIES.map((country) => (
                    <label
                      key={country}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
                        allowedCountries.includes(country)
                          ? "bg-celo-yellow/20 font-bold"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedCountries.includes(country)}
                        onChange={() => toggleCountry(country)}
                        disabled={isLaunching}
                        className="w-4 h-4 accent-celo-yellow"
                      />
                      <span className="text-sm">{country}</span>
                    </label>
                  ))}
                </div>
              </div>
              {allowedCountries.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  <span className="font-bold">{allowedCountries.length}</span>{" "}
                  {allowedCountries.length === 1 ? "country" : "countries"}{" "}
                  selected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Banner */}
        <div
          className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] transition-colors ${statusColor}`}
        >
          <h3 className="font-black text-xl text-white uppercase drop-shadow-md mb-1">
            {statusText}
          </h3>
          <p className="font-bold text-white/90 text-sm mb-3 border-b-2 border-white/20 pb-2">
            {statusMessage}
          </p>

          <div className="grid grid-cols-2 gap-4 text-white text-sm font-mono">
            <div>
              <span className="opacity-75 block text-xs">Pay Per Task</span>
              <span className="font-bold text-lg">
                ${payPerTask.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="opacity-75 block text-xs">Total Tasks</span>
              <span className="font-bold text-lg">{totalTasks}</span>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full bg-celo-yellow text-black font-black text-xl py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_#000]"
          disabled={!folderName || !bounty || !task || isLaunching || !address}
        >
          {isLaunching ? "LAUNCHING..." : "LAUNCH DATASET 🚀"}
        </button>
      </div>
    </div>
  );
}
