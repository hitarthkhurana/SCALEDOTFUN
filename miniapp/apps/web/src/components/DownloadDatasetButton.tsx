
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
  const [viewingFile, setViewingFile] = useState<DownloadedFile | null>(null);

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
      setProgress(`✅ Downloaded ${files.length} files! Click to view.`);
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
        onClick={handleDownload}
        disabled={downloading || downloadedFiles.length > 0}
        className="w-full bg-celo-forest text-white font-bold py-3 px-4 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? "⏳ Downloading..." : downloadedFiles.length > 0 ? "✅ Downloaded" : "📥 Download All Files"}
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

      {/* Downloaded files list */}
      {downloadedFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          {downloadedFiles.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setViewingFile(file)}
              className="bg-white border-2 border-gray-300 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <p className="font-bold text-sm text-gray-800 truncate">{file.filename}</p>
              <p className="text-xs text-gray-500 mt-1">
                {file.type === 'image' ? '🖼️' : file.type === 'audio' ? '🎵' : '📄'} {file.type}
                {file.annotations && ' • Has annotations'}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Preview Modal (not fullscreen) */}
      {viewingFile && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingFile(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex items-center justify-between">
              <p className="font-bold text-gray-800 truncate flex-1">{viewingFile.filename}</p>
              <button
                onClick={() => setViewingFile(null)}
                className="bg-red-500 text-white px-3 py-1 rounded-lg font-bold ml-2"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Image */}
              {viewingFile.type === 'image' && (
                <div className="mb-4">
                  <img 
                    src={viewingFile.dataUrl} 
                    alt={viewingFile.filename}
                    className="w-full rounded-lg border-2 border-gray-200"
                  />
                  <a
                    href={viewingFile.dataUrl}
                    download={viewingFile.filename}
                    className="mt-2 block w-full bg-celo-yellow text-black font-bold py-2 px-4 rounded-lg border-2 border-black text-center"
                  >
                    💾 Save Image
                  </a>
                </div>
              )}

              {/* Audio */}
              {viewingFile.type === 'audio' && (
                <div className="mb-4">
                  <audio 
                    src={viewingFile.dataUrl} 
                    controls 
                    className="w-full rounded-lg border-2 border-gray-200"
                  />
                  <a
                    href={viewingFile.dataUrl}
                    download={viewingFile.filename}
                    className="mt-2 block w-full bg-celo-yellow text-black font-bold py-2 px-4 rounded-lg border-2 border-black text-center"
                  >
                    💾 Save Audio
                  </a>
                </div>
              )}

              {/* Annotations */}
              {viewingFile.annotations && (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
                  <p className="font-bold text-sm text-gray-700 mb-2">📝 Annotations:</p>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-60">
                    {JSON.stringify(viewingFile.annotations, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
