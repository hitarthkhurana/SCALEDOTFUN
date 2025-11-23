import { useState } from "react";
import { cn } from "@/lib/utils";

interface MarketplaceScreenProps {
  onLaunch: () => void;
}

const MOCK_MY_DATASETS = [
    {
      id: 101,
      name: "My Invoice Dataset",
      ticker: "INV",
      description: "Scanning receipts for tax purposes",
      price: 0.00,
      marketCap: "-",
      completion: 42, // % completed
      creator: "You",
      color: "bg-celo-lime",
    }
];

const MOCK_DATASETS = [
  {
    id: 1,
    name: "Llama3 Fine-Tuning",
    ticker: "LLAMA",
    description: "High quality instruct pairs for Llama 3 70B",
    price: 0.045,
    marketCap: "45.2k",
    progress: 85,
    completed: 12,
    creator: "0x1234...5678",
    color: "bg-celo-blue",
  },
  {
    id: 2,
    name: "Medical Scans",
    ticker: "MEDIC",
    description: "Annotated X-Rays for pneumonia detection",
    price: 0.12,
    marketCap: "12.5k",
    progress: 32,
    completed: 65,
    creator: "0x8765...4321",
    color: "bg-celo-pink",
  },
  {
    id: 3,
    name: "Satellite Maps",
    ticker: "MAPS",
    description: "Urban density labeling for city planning",
    price: 0.08,
    marketCap: "28.9k",
    progress: 64,
    completed: 89,
    creator: "0xabcd...efgh",
    color: "bg-celo-orange",
  },
  {
    id: 4,
    name: "Legal Contracts",
    ticker: "LAW",
    description: "Clause extraction dataset for legal AI",
    price: 0.02,
    marketCap: "5.1k",
    progress: 12,
    completed: 4,
    creator: "0x2468...1357",
    color: "bg-celo-forest",
  },
];

export function MarketplaceScreen({ onLaunch }: MarketplaceScreenProps) {
  return (
    <div className="min-h-screen bg-celo-tan flex flex-col pb-24">
      {/* Header */}
      <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-headline text-3xl text-celo-yellow">Marketplace</h2>
            <p className="text-sm font-mono text-celo-sand">Trade dataset tokens 🚀</p>
          </div>
          <button
            onClick={onLaunch}
            className="bg-celo-yellow text-celo-purple font-bold px-4 py-2 rounded-full border-2 border-white shadow-[4px_4px_0px_0px_#ffffff] active:translate-y-1 active:shadow-none transition-all animate-pulse"
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

      {/* Content */}
      <div className="px-4 pt-6 flex flex-col gap-8">
        
        {/* My Datasets Section */}
        <div>
            <h3 className="text-headline text-xl text-celo-purple mb-4">My Datasets</h3>
            <div className="flex flex-col gap-4">
                {MOCK_MY_DATASETS.map((item) => (
                    <div key={item.id} className="bg-white border-4 border-celo-purple p-4 shadow-[4px_4px_0px_0px_#4E632A] relative overflow-hidden">
                        <div className="flex gap-4">
                            <div className={`w-12 h-12 ${item.color} border-2 border-black flex items-center justify-center text-xl font-bold shrink-0 rounded-lg`}>
                                {item.ticker[0]}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                                    <span className="bg-celo-tan text-xs font-bold px-2 py-1 border border-black rounded">OWNER</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                                
                                {/* Completion Progress */}
                                <div className="mt-2">
                                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1 text-gray-400">
                                        <span>Completion Progress</span>
                                        <span>{item.completion}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full border border-gray-300 overflow-hidden">
                                        <div 
                                            className="h-full bg-celo-forest"
                                            style={{ width: `${item.completion}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Trending List */}
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-headline text-xl text-celo-purple">Trending Now</h3>
                <span className="text-xs font-bold text-celo-forest uppercase animate-pulse">Live Updates</span>
            </div>

            <div className="flex flex-col gap-4">
                {MOCK_DATASETS.map((item) => (
                <div key={item.id} className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all cursor-pointer group relative overflow-hidden">
                    {/* Diagonal Badge for Ticker */}
                    <div className="absolute -right-8 top-4 bg-black text-white text-xs font-bold py-1 w-32 text-center rotate-45 font-mono">
                        ${item.ticker}
                    </div>

                    <div className="flex gap-4">
                        <div className={`w-16 h-16 ${item.color} border-2 border-black flex items-center justify-center text-2xl font-bold shrink-0`}>
                            {item.ticker[0]}
                        </div>
                        <div className="flex-1 pr-8">
                            <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                            <p className="text-xs text-gray-500 mb-2">by {item.creator}</p>
                            <p className="text-sm text-gray-800 line-clamp-2 mb-3">{item.description}</p>
                            
                            <div className="flex items-center justify-between text-xs font-mono font-bold">
                                <span className="text-green-600">MC: ${item.marketCap}</span>
                                <span>Price: {item.price} CUSD</span>
                            </div>
                        </div>
                    </div>

                    {/* Completion Progress */}
                    <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1 text-gray-400">
                            <span>Completion Progress</span>
                            <span>{item.completed}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full border border-black overflow-hidden">
                            <div 
                                className={`h-full ${item.completed > 80 ? 'bg-green-500' : item.completed > 40 ? 'bg-yellow-400' : 'bg-blue-400'} border-r-2 border-black`} 
                                style={{ width: `${item.completed}%` }}
                            />
                        </div>
                    </div>
                </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
