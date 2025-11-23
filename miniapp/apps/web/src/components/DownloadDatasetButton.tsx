
import { useState } from "react";
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

interface DownloadedFile {
  filename: string;
  dataUrl: string;
  type: string;
  annotations?: any;
}

export function DownloadDatasetButton({ listingId, datasetName }: DownloadDatasetButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [showGallery, setShowGallery] = useState(false);

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

      setProgress(`Downloading ${fileCIDs.length} files...`);

      // 2. Download all files
      const files: DownloadedFile[] = [];

      for (const fileInfo of fileCIDs) {
        try {
          const decodedFilename = decodeURIComponent(fileInfo.filename);
          console.log(`📥 Downloading: ${decodedFilename}`);

          // Download the file
          const fileUrl = `/api/datasets/download-from-filecoin?cid=${fileInfo.file_cid}&filename=${encodeURIComponent(decodedFilename)}`;
          const fileResponse = await fetch(fileUrl);

          if (fileResponse.ok) {
            const fileBlob = await fileResponse.blob();
            const dataUrl = URL.createObjectURL(fileBlob);

            let annotations = null;

            // Download annotations if available
            if (fileInfo.annotations_cid && fileInfo.annotations_cid !== 'no-annotations') {
              const annotationsUrl = `/api/datasets/download-from-filecoin?cid=${fileInfo.annotations_cid}&filename=${encodeURIComponent(decodedFilename + '_annotations.json')}`;
              const annotationsResponse = await fetch(annotationsUrl);

              if (annotationsResponse.ok) {
                const annotationsBlob = await annotationsResponse.blob();
                const annotationsText = await annotationsBlob.text();
                annotations = JSON.parse(annotationsText);
              }
            }

            files.push({
              filename: decodedFilename,
              dataUrl,
              type: fileInfo.file_type,
              annotations,
            });

            console.log(`✅ Downloaded: ${decodedFilename}`);
          }
        } catch (err) {
          console.error(`❌ Failed to download ${fileInfo.filename}:`, err);
        }
      }

      setDownloadedFiles(files);
      setProgress(`✅ Downloaded ${files.length} files!`);
      setShowGallery(true); // Automatically open gallery
      setDownloading(false);

    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Download failed");
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={downloadedFiles.length > 0 ? () => setShowGallery(true) : handleDownload}
        disabled={downloading}
        className="w-full bg-celo-forest text-white font-bold py-3 px-4 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? "⏳ Downloading..." : downloadedFiles.length > 0 ? "📂 View Dataset" : "📥 Download Dataset"}
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

      {/* Gallery Modal - scrollable view of all files */}
      {showGallery && downloadedFiles.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setShowGallery(false)}
        >
          <div 
            className="bg-white rounded-lg w-full h-full max-w-md max-h-[85vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-celo-purple text-white p-3 rounded-t-lg flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-sm">{datasetName}</p>
                <p className="text-xs opacity-80">{downloadedFiles.length} files</p>
              </div>
              <button
                onClick={() => setShowGallery(false)}
                className="bg-red-500 text-white px-3 py-1 rounded font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content - ALL files in sequence */}
            <div className="flex-1 overflow-y-auto p-3 space-y-6">
              {downloadedFiles.map((file, idx) => (
                <div key={idx} className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  {/* File Header */}
                  <div className="mb-2">
                    <p className="font-bold text-xs text-gray-700">
                      {file.type === 'image' ? '🖼️' : file.type === 'audio' ? '🎵' : '📄'} File {idx + 1}/{downloadedFiles.length}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{file.filename}</p>
                  </div>

                  {/* Image */}
                  {file.type === 'image' && (
                    <div className="mb-2">
                      <img 
                        src={file.dataUrl} 
                        alt={file.filename}
                        className="w-full rounded border border-gray-300"
                      />
                      <a
                        href={file.dataUrl}
                        download={file.filename}
                        className="mt-2 block w-full bg-celo-yellow text-black font-bold py-2 px-3 rounded-lg border-2 border-black text-center text-xs"
                      >
                        💾 Save Image
                      </a>
                    </div>
                  )}

                  {/* Audio */}
                  {file.type === 'audio' && (
                    <div className="mb-2">
                      <audio 
                        src={file.dataUrl} 
                        controls 
                        className="w-full rounded"
                      />
                      <a
                        href={file.dataUrl}
                        download={file.filename}
                        className="mt-2 block w-full bg-celo-yellow text-black font-bold py-2 px-3 rounded-lg border-2 border-black text-center text-xs"
                      >
                        💾 Save Audio
                      </a>
                    </div>
                  )}

                  {/* Annotations */}
                  {file.annotations && (
                    <div className="bg-white border border-gray-300 rounded p-2">
                      <p className="font-bold text-xs text-gray-700 mb-1">📝 Annotations:</p>
                      <pre className="text-[10px] text-gray-600 overflow-auto max-h-32">
                        {JSON.stringify(file.annotations, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
