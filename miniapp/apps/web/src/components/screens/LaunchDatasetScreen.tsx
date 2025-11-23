import { useState, useRef, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface LaunchDatasetScreenProps {
  onBack: () => void;
}

export function LaunchDatasetScreen({ onBack }: LaunchDatasetScreenProps) {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [bounty, setBounty] = useState<string>("");
  const [minAnnotations, setMinAnnotations] = useState<string>("1");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          statusMessage = "High likelihood of rapid completion! 🚀";
      } else if (payPerTask >= 0.05) {
          statusColor = "bg-yellow-400";
          statusText = "Fair";
          statusMessage = "May take some time to complete. 🐢";
      } else {
          statusColor = "bg-red-500";
          statusText = "Low";
          statusMessage = "Bounty too low. Tasks might stall. 🛑";
      }
  }

  const handleFolderSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        // Just counting files for now, not uploading
        setFileCount(e.target.files.length);
        // Try to get folder name from first file webkitRelativePath
        const path = e.target.files[0].webkitRelativePath;
        const folder = path.split('/')[0];
        setFolderName(folder || "Uploaded Folder");
    }
  };

  return (
    <div className="min-h-screen bg-celo-tan flex flex-col">
       {/* Header */}
       <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <button 
            onClick={onBack}
            className="mb-4 text-sm font-bold opacity-80 hover:opacity-100 flex items-center gap-1"
        >
            ← Back to Marketplace
        </button>
        <h2 className="text-headline text-3xl text-celo-yellow">Launch Dataset</h2>
        <p className="text-sm font-mono text-celo-sand">Create a new tokenized dataset.</p>
      </div>

      <div className="p-6 flex flex-col gap-6 pb-24">
        
        {/* Step 1: Upload */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Upload Data
            </h3>
            <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
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
                />
            </div>
        </div>

        {/* Step 2: Bounty Details */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Set Bounty
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Total Bounty (cUSD)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={bounty}
                            onChange={(e) => setBounty(e.target.value)}
                            placeholder="0.00"
                            className="w-full border-2 border-black rounded p-2 font-mono font-bold text-lg"
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
        <button className="w-full bg-celo-yellow text-black font-black text-xl py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={!folderName || !bounty}>
            LAUNCH DATASET 🚀
        </button>

      </div>
    </div>
  );
}

