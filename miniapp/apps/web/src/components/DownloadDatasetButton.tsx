
import { useState } from "react";
import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";
import { createClient } from "@/utils/supabase/client";

interface DownloadDatasetButtonProps {
  listingId: number;
  datasetName: string;
}

interface FileCID {
  filename: string;
  file_cid: string;
  annotations_cid: string;
  file_type: string;
}

export function DownloadDatasetButton({ listingId, datasetName }: DownloadDatasetButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleDownload = async () => {
    setDownloading(true);
    setProgress("Fetching dataset info...");
    setError("");

    try {
      // 1. Get Filecoin CIDs from Supabase
      const supabase = createClient();
      const { data: listing, error: dbError } = await supabase
        .from('marketplace_listings')
        .select('filecoin_cid, file_count')
        .eq('listing_id', listingId)
        .single();

      if (dbError || !listing) {
        throw new Error('Failed to fetch dataset info');
      }

      // Parse CIDs (stored as JSON string)
      const fileCIDs: FileCID[] = JSON.parse(listing.filecoin_cid);
      console.log(`📦 Found ${fileCIDs.length} files to download`);

      setProgress(`Found ${fileCIDs.length} files. Starting download...`);

      // 2. Initialize Synapse SDK (same as retrieve.ts)
      const synapse = await Synapse.create({
        rpcURL: RPC_URLS.calibration.http,
      });

      // 3. Download each file
      let downloadedCount = 0;
      for (const fileInfo of fileCIDs) {
        try {
          setProgress(`Downloading ${fileInfo.filename} (${downloadedCount + 1}/${fileCIDs.length})...`);

          // Download the main file
          console.log(`📥 Retrieving file: ${fileInfo.file_cid}`);
          const fileData = await synapse.storage.retrieve(fileInfo.file_cid);

          // Download the annotations
          console.log(`📥 Retrieving annotations: ${fileInfo.annotations_cid}`);
          const annotationsData = await synapse.storage.retrieve(fileInfo.annotations_cid);

          // Convert to blobs and trigger download
          const fileBlob = new Blob([fileData], { type: getFileType(fileInfo.file_type) });
          const annotationsBlob = new Blob([annotationsData], { type: 'application/json' });

          // Download main file
          downloadBlob(fileBlob, fileInfo.filename);
          
          // Download annotations
          const annotationsFilename = fileInfo.filename.replace(/\.[^/.]+$/, '_annotations.json');
          downloadBlob(annotationsBlob, annotationsFilename);

          downloadedCount++;
          console.log(`✅ Downloaded: ${fileInfo.filename}`);

        } catch (err) {
          console.error(`❌ Failed to download ${fileInfo.filename}:`, err);
          // Continue with other files
        }
      }

      setProgress(`✅ Downloaded ${downloadedCount}/${fileCIDs.length} files!`);
      setTimeout(() => {
        setDownloading(false);
        setProgress("");
      }, 3000);

    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Download failed");
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full bg-celo-forest text-white font-bold py-3 px-4 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? "⏳ Downloading..." : "📥 Download All Files"}
      </button>

      {progress && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 text-sm">
          <p className="font-bold text-blue-900">{progress}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 text-sm">
          <p className="font-bold text-red-900">❌ {error}</p>
        </div>
      )}

      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 text-xs text-yellow-900">
        <p className="font-bold mb-1">💡 Download Info:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Files will download to your browser's download folder</li>
          <li>Each file comes with its annotations JSON</li>
          <li>Large datasets may take a few minutes</li>
        </ul>
      </div>
    </div>
  );
}

// Helper: Get MIME type from file type
function getFileType(fileType: string): string {
  switch (fileType) {
    case 'image':
      return 'image/jpeg';
    case 'audio':
      return 'audio/wav';
    case 'text':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

// Helper: Trigger browser download
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

