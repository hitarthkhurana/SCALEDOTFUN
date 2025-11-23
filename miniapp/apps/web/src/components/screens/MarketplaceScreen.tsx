import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, maxUint256, formatUnits } from "viem";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { DATASET_MARKETPLACE_ABI } from "@/abi/DatasetMarketplace";
import { ERC20_ABI } from "@/abi/ERC20";
import { DownloadDatasetButton } from "@/components/DownloadDatasetButton";
import { cn } from "@/lib/utils";

interface MarketplaceScreenProps {
  onLaunch: () => void;
}

// Constants
const DATASET_MARKETPLACE_ADDRESS = "0x2cc8c36c09726519b676b0a19bb911873dadf387"; // Mainnet
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // Mainnet

interface Listing {
  listing_id: number;
  curator_address: string;
  funder_address: string;
  price: number;
  filecoin_cid: string;
  active: boolean;
  dataset_id: number;
  dataset_name: string;
  task_description: string;
  file_count: number;
}

export function MarketplaceScreen({ onLaunch }: MarketplaceScreenProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [buyStatus, setBuyStatus] = useState<string>("");
  const [purchasedListingIds, setPurchasedListingIds] = useState<Set<number>>(new Set());

  // Fetch marketplace listings and purchases from Supabase
  useEffect(() => {
    async function fetchListings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('marketplace_listings')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setListings(data || []);

        // Fetch user's purchases if logged in
        if (address) {
          const { data: purchases } = await supabase
            .from('marketplace_purchases')
            .select('listing_id')
            .eq('buyer_address', address.toLowerCase());
          
          console.log('📦 Fetched purchases:', purchases);
          
          if (purchases && purchases.length > 0) {
            const purchasedSet = new Set(purchases.map(p => p.listing_id));
            console.log('✅ Purchased listing IDs:', Array.from(purchasedSet));
            setPurchasedListingIds(purchasedSet);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching listings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [address]);

  // Handle buy dataset
  const handleBuy = async (listing: Listing) => {
    if (!address || !publicClient) {
      alert('Please connect your wallet');
      return;
    }

    setBuyingId(listing.listing_id);
    setBuyStatus("Initializing...");

    try {
      const supabase = createClient();
      const priceWei = parseUnits(listing.price.toString(), 18);

      // 2. Approve CUSD
      setBuyStatus("Please approve cUSD spending...");
      const approveTx = await writeContractAsync({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [DATASET_MARKETPLACE_ADDRESS, maxUint256],
        feeCurrency: CUSD_ADDRESS,
      } as any);

      setBuyStatus("Waiting for approval confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // 3. Buy dataset
      setBuyStatus("Buying dataset...");
      const buyTx = await writeContractAsync({
        address: DATASET_MARKETPLACE_ADDRESS,
        abi: DATASET_MARKETPLACE_ABI,
        functionName: 'buyDataset',
        args: [BigInt(listing.listing_id)],
        feeCurrency: CUSD_ADDRESS,
      } as any);

      setBuyStatus("Waiting for purchase confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: buyTx });

      // 4. Record purchase in Supabase
      const { error: purchaseError } = await supabase
        .from('marketplace_purchases')
        .insert({
          listing_id: listing.listing_id,
          buyer_address: address.toLowerCase(),
          price_paid: listing.price,
          tx_hash: buyTx,
          purchased_at: new Date().toISOString(),
        });

      if (purchaseError) {
        console.error('Failed to record purchase:', purchaseError);
        throw new Error('Failed to record purchase in database');
      }

      console.log('✅ Purchase recorded in database');

      // 5. Update total_purchases count
      const { data: currentListing } = await supabase
        .from('marketplace_listings')
        .select('total_purchases')
        .eq('listing_id', listing.listing_id)
        .single();
      
      if (currentListing) {
        await supabase
          .from('marketplace_listings')
          .update({ 
            total_purchases: (currentListing.total_purchases || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('listing_id', listing.listing_id);
      }

      setBuyStatus("");
      setBuyingId(null);
      
      // Add to purchased set immediately
      setPurchasedListingIds(prev => new Set([...prev, listing.listing_id]));
      
      // Show download UI (don't reload - let user download files)
      alert(`Purchase successful! 🎉\n\nYour dataset is ready to download. Look for the green download button on this listing!`);

    } catch (error: any) {
      console.error('Buy error:', error);
      setBuyStatus("");
      setBuyingId(null);
      alert(`Failed to buy: ${error.message || 'Unknown error'}`);
    }
  };

  // Check if user already purchased a listing
  const checkIfPurchased = async (listingId: number): Promise<boolean> => {
    if (!address) return false;
    
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('marketplace_purchases')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_address', address)
        .single();
      
      return !!data;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-celo-tan flex flex-col pb-24">
      {/* Header */}
      <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-headline text-3xl text-celo-yellow">Marketplace</h2>
            <p className="text-sm font-mono text-celo-sand">Buy & Sell Labeled Datasets 🚀</p>
          </div>
          {/* Launch Button */}
          <button
            onClick={onLaunch}
            className="bg-celo-yellow text-celo-purple font-bold px-4 py-2 rounded-full border-2 border-white shadow-[4px_4px_0px_0px_#ffffff] active:translate-y-1 active:shadow-none transition-all"
          >
            + Launch
          </button>
        </div>
        
        {/* Search / Filter Mock */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search datasets..." 
            className="w-full bg-white/10 border-2 border-white/30 rounded-xl px-4 py-2 text-white placeholder:text-white/50 font-mono focus:outline-none focus:border-celo-yellow"
          />
          <span className="absolute right-3 top-2.5 text-white/50">🔍</span>
        </div>
      </div>

      {/* Buy Status Banner */}
      {buyStatus && (
        <div className="mx-4 mt-4 bg-blue-500 border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
          <p className="font-bold text-white text-center flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {buyStatus}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-6 flex flex-col gap-8">
        {/* Available Datasets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline text-xl text-celo-purple">Available Datasets</h3>
            {!loading && (
              <span className="text-xs font-bold text-celo-forest uppercase animate-pulse">
                {listings.length} Live
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-celo-purple" />
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white border-4 border-black p-8 text-center shadow-[6px_6px_0px_0px_#000]">
              <p className="text-gray-500 font-bold">No datasets available yet</p>
              <p className="text-sm text-gray-400 mt-2">Be the first to launch one!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {listings.map((listing, idx) => {
                const isBuying = buyingId === listing.listing_id;
                const colors = [
                  "bg-celo-blue",
                  "bg-celo-pink", 
                  "bg-celo-orange",
                  "bg-celo-forest",
                  "bg-celo-lime"
                ];
                const color = colors[idx % colors.length];

                return (
                  <div 
                    key={listing.listing_id} 
                    className={cn(
                      "bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all relative overflow-hidden",
                      isBuying && "opacity-50"
                    )}
                  >
                    {/* Diagonal Badge */}
                    <div className={cn(
                      "absolute -right-8 top-4 text-white text-xs font-bold py-1 w-32 text-center rotate-45 font-mono",
                      color
                    )}>
                      #{listing.listing_id}
                    </div>

                    <div className="flex gap-4">
                      <div className={cn(
                        "w-16 h-16 border-2 border-black flex items-center justify-center text-2xl font-bold shrink-0 rounded-lg",
                        color
                      )}>
                        📊
                      </div>
                      <div className="flex-1 pr-8">
                        <h4 className="font-bold text-lg leading-tight">
                          {listing.dataset_name || `Dataset #${listing.dataset_id}`}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          by {listing.curator_address.slice(0, 6)}...{listing.curator_address.slice(-4)}
                        </p>
                        <p className="text-sm text-gray-800 line-clamp-2 mb-3">
                          {listing.task_description || "High-quality labeled dataset"}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-mono font-bold">
                            <span className="text-green-600">Price: {listing.price} cUSD</span>
                          </div>
                          {purchasedListingIds.has(listing.listing_id) ? (
                            <DownloadDatasetButton 
                              listingId={listing.listing_id}
                              datasetName={listing.dataset_name}
                            />
                          ) : (
                            <button
                              onClick={() => handleBuy(listing)}
                              disabled={isBuying || !address}
                              className="bg-celo-yellow text-black font-bold px-4 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isBuying ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Buying...
                                </span>
                              ) : (
                                "Buy Now"
                              )}
                            </button>
                          )}
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          <span>📦 {listing.file_count || 0} files included</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
