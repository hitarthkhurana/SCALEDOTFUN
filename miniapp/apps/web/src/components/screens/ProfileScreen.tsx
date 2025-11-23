"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { createClient } from "@/utils/supabase/client";
import { ERC20_ABI } from "@/abi/ERC20";

// Celo Mainnet cUSD Address
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

interface Dataset {
  dataset_id: number;
  funder_address: string;
  curator_address: string;
  task: string;
  file_count: number;
  completed_count: number;
  completion_percentage: number;
  filecoin_cid: string | null;
  listed_on_marketplace: boolean;
  marketplace_listing_id: number | null;
  price: number | null;
  created_at: string;
}

interface ProfileScreenProps {
  onUploadToMarketplace: (dataset: Dataset) => void;
}

interface Purchase {
  purchase_id: number;
  listing_id: number;
  buyer_address: string;
  price_paid: number;
  purchased_at: string;
  dataset_name: string;
}

export function ProfileScreen({ onUploadToMarketplace }: ProfileScreenProps) {
  const { address } = useAccount();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch cUSD Balance from blockchain
  const { data: cusdBalance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const formattedBalance = cusdBalance
    ? formatUnits(cusdBalance as bigint, 18)
    : "0.00";

  // Fetch user's datasets from Supabase
  useEffect(() => {
    async function fetchDatasets() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const normalizedAddress = address.toLowerCase();

        // Fetch datasets where user is the funder
        const { data, error } = await supabase
          .from('datasets')
          .select('*')
          .eq('funder_address', normalizedAddress)
          .order('dataset_id', { ascending: false });

        if (error) {
          console.error('Error fetching datasets:', error);
          setLoading(false);
          return;
        }

        // Fetch marketplace listings for this user
        const { data: listings } = await supabase
          .from('marketplace_listings')
          .select('*')
          .or(`curator_address.eq.${normalizedAddress},funder_address.eq.${normalizedAddress}`)
          .eq('active', true);

        // Create a Set of dataset IDs that are listed
        const listedDatasetIds = new Set(listings?.map(l => l.dataset_id) || []);

        // Group by on_chain_dataset_id and calculate stats
        const datasetMap = new Map<number, Dataset>();
        
        data?.forEach((row) => {
          // Group by on_chain_dataset_id (multiple files per dataset)
          const onChainId = row.on_chain_dataset_id || row.dataset_id;
          
          if (!datasetMap.has(onChainId)) {
            const listing = listings?.find(l => l.dataset_id === onChainId);
            datasetMap.set(onChainId, {
              dataset_id: onChainId,
              funder_address: row.funder_address,
              curator_address: row.curator_address,
              task: row.task || "No description",
              file_count: 0,
              completed_count: 0,
              completion_percentage: 0,
              filecoin_cid: row.filecoin_cid,
              listed_on_marketplace: listedDatasetIds.has(onChainId),
              marketplace_listing_id: listing?.listing_id || null,
              price: listing?.price || null,
              created_at: row.created_at,
            });
          }

          const dataset = datasetMap.get(onChainId)!;
          dataset.file_count++;
          
          // Check if this file is completed
          if (row.annotations >= row.minimum_annotations) {
            dataset.completed_count++;
          }
        });

        // Calculate completion percentages
        const datasetsArray = Array.from(datasetMap.values()).map(dataset => ({
          ...dataset,
          completion_percentage: dataset.file_count > 0 
            ? Math.round((dataset.completed_count / dataset.file_count) * 100)
            : 0,
        }));

        setDatasets(datasetsArray);

        // Fetch purchases of user's datasets
        if (listings && listings.length > 0) {
          const listingIds = listings.map(l => l.listing_id);
          const { data: purchasesData } = await supabase
            .from('marketplace_purchases')
            .select(`
              purchase_id,
              listing_id,
              buyer_address,
              price_paid,
              purchased_at
            `)
            .in('listing_id', listingIds)
            .order('purchased_at', { ascending: false });

          if (purchasesData) {
            // Join with marketplace_listings to get dataset names
            const enrichedPurchases = purchasesData.map(purchase => {
              const listing = listings.find(l => l.listing_id === purchase.listing_id);
              return {
                ...purchase,
                dataset_name: listing?.dataset_name || `Dataset #${listing?.dataset_id}`,
              };
            });
            setPurchases(enrichedPurchases);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching datasets:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDatasets();
  }, [address]);

  return (
    <div className="min-h-screen bg-celo-tan flex flex-col pb-24">
      {/* Header */}
      <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-celo-yellow rounded-full border-4 border-white overflow-hidden">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${address || 'default'}`} 
              alt="avatar" 
            />
          </div>
          <div>
            <p className="text-xs text-celo-sand uppercase font-bold tracking-widest">Dataset Creator</p>
            <p className="text-lg font-bold font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm">
            <p className="text-celo-sand text-xs uppercase font-bold mb-1">Active Datasets</p>
            <p className="text-2xl font-bold text-celo-yellow">
              {datasets.filter(d => !d.listed_on_marketplace).length}
            </p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm">
            <p className="text-celo-sand text-xs uppercase font-bold mb-1">Listed for Sale</p>
            <p className="text-2xl font-bold text-celo-yellow">
              {datasets.filter(d => d.listed_on_marketplace).length}
            </p>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="mt-3">
          <div className="bg-celo-yellow/20 p-3 rounded-xl border border-celo-yellow/40 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-celo-sand text-xs uppercase font-bold">💰 cUSD Balance</p>
              <p className="text-lg font-bold text-celo-yellow font-mono">
                {Number(formattedBalance).toFixed(2)} cUSD
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-celo-purple border-t-transparent"></div>
            <p className="text-gray-500 mt-4 font-bold">Loading datasets...</p>
          </div>
        ) : !address ? (
          <div className="bg-yellow-100 border-4 border-yellow-500 p-6 text-center">
            <p className="font-bold text-yellow-900">⚠️ Please connect your wallet</p>
            <p className="text-sm text-yellow-700 mt-2">Connect to view your datasets</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="bg-white border-4 border-black p-8 text-center shadow-[4px_4px_0px_0px_#000]">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="font-bold text-xl mb-2">No Datasets Yet</h3>
            <p className="text-gray-500">Launch a dataset from the Marketplace tab to get started!</p>
          </div>
        ) : (
          <>
            {/* Active Datasets */}
            {datasets.filter(d => !d.listed_on_marketplace).length > 0 && (
              <div>
                <h3 className="text-headline text-xl text-celo-purple mb-4 flex items-center gap-2">
                  Active Datasets
                  <span className="text-sm bg-celo-purple text-white px-2 py-0.5 rounded-full font-mono">
                    {datasets.filter(d => !d.listed_on_marketplace).length}
                  </span>
                </h3>

                <div className="flex flex-col gap-4">
                  {datasets
                    .filter(d => !d.listed_on_marketplace)
                    .map((dataset) => (
                      <DatasetCard 
                        key={dataset.dataset_id} 
                        dataset={dataset} 
                        onUploadToMarketplace={onUploadToMarketplace}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Listed Datasets */}
            {datasets.filter(d => d.listed_on_marketplace).length > 0 && (
              <div>
                <h3 className="text-headline text-xl text-celo-purple mb-4 flex items-center gap-2">
                  Listed on Marketplace
                  <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded-full font-mono">
                    {datasets.filter(d => d.listed_on_marketplace).length}
                  </span>
                </h3>

                <div className="flex flex-col gap-4">
                  {datasets
                    .filter(d => d.listed_on_marketplace)
                    .map((dataset) => (
                      <ListedDatasetCard key={dataset.dataset_id} dataset={dataset} />
                    ))}
                </div>
              </div>
            )}

            {/* Purchase History */}
            {purchases.length > 0 && (
              <div className="mt-8">
                <h3 className="text-headline text-xl text-celo-purple mb-4 flex items-center gap-2">
                  💰 Sales History
                  <span className="text-sm bg-celo-purple text-white px-2 py-0.5 rounded-full font-mono">
                    {purchases.length}
                  </span>
                </h3>

                <div className="flex flex-col gap-3">
                  {purchases.map((purchase) => (
                    <div 
                      key={purchase.purchase_id}
                      className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-800">{purchase.dataset_name}</p>
                        <p className="text-green-600 font-bold font-mono">
                          +{purchase.price_paid.toFixed(2)} cUSD
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <p className="font-mono">
                          Buyer: {purchase.buyer_address.slice(0, 6)}...{purchase.buyer_address.slice(-4)}
                        </p>
                        <p>
                          {new Date(purchase.purchased_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Active Dataset Card (with upload to marketplace button)
function DatasetCard({ dataset, onUploadToMarketplace }: { 
  dataset: Dataset; 
  onUploadToMarketplace: (dataset: Dataset) => void;
}) {
  const isComplete = dataset.completion_percentage === 100;
  const hasFilecoinCid = dataset.filecoin_cid !== null;

  const getStatusColor = () => {
    if (dataset.completion_percentage >= 100) return 'bg-green-500';
    if (dataset.completion_percentage >= 50) return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  return (
    <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-lg leading-tight mb-1">Dataset #{dataset.dataset_id}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{dataset.task}</p>
        </div>
        <span className="bg-celo-tan text-xs font-bold px-2 py-1 border border-black rounded shrink-0 ml-2">
          OWNER
        </span>
      </div>

      {/* Files Info */}
      <div className="flex gap-4 mb-3 text-xs">
        <div>
          <span className="text-gray-400 uppercase font-bold">Files: </span>
          <span className="font-mono font-bold">{dataset.file_count}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase font-bold">Completed: </span>
          <span className="font-mono font-bold">{dataset.completed_count}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-bold uppercase mb-1 text-gray-400">
          <span>Completion Progress</span>
          <span>{dataset.completion_percentage}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full border-2 border-black overflow-hidden">
          <div 
            className={cn("h-full transition-all", getStatusColor())}
            style={{ width: `${dataset.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Upload to Marketplace Button */}
      {isComplete && !hasFilecoinCid && (
        <button
          onClick={() => onUploadToMarketplace(dataset)}
          className="w-full bg-celo-yellow text-black font-bold py-2 px-4 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all animate-pulse"
        >
          📦 Upload to Marketplace
        </button>
      )}

      {isComplete && hasFilecoinCid && !dataset.listed_on_marketplace && (
        <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-3 text-center">
          <p className="text-xs font-bold text-blue-900">✅ Uploaded to Filecoin</p>
          <p className="text-[10px] text-blue-700 mt-1">Ready to list on marketplace!</p>
        </div>
      )}

      {!isComplete && (
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 text-center">
          <p className="text-xs font-bold text-gray-600">⏳ In Progress</p>
          <p className="text-[10px] text-gray-500 mt-1">
            {dataset.file_count - dataset.completed_count} files remaining
          </p>
        </div>
      )}
    </div>
  );
}

// Listed Dataset Card (read-only, shows marketplace info)
function ListedDatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <div className="bg-white border-4 border-green-600 p-4 shadow-[4px_4px_0px_0px_#22C55E] relative overflow-hidden">
      {/* Listed Badge */}
      <div className="absolute -right-6 top-4 bg-green-600 text-white text-xs font-bold py-1 w-28 text-center rotate-45">
        FOR SALE
      </div>

      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-8">
          <h4 className="font-bold text-lg leading-tight mb-1">Dataset #{dataset.dataset_id}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{dataset.task}</p>
        </div>
      </div>

      {/* Marketplace Info */}
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 mb-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500">Listed Price</p>
            <p className="text-lg font-mono font-bold text-green-700">
              {dataset.price ? `${dataset.price} cUSD` : 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-500">Files</p>
            <p className="text-lg font-mono font-bold">{dataset.file_count}</p>
          </div>
        </div>
      </div>

      {dataset.marketplace_listing_id && (
        <p className="text-xs text-gray-400 text-center font-mono">
          Listing ID: #{dataset.marketplace_listing_id}
        </p>
      )}
    </div>
  );
}

