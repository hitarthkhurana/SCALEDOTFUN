import { useState } from "react";
import { cn } from "@/lib/utils";
import type { User } from "@/hooks/useUser";

interface DashboardScreenProps {
  user: User | null;
  loading?: boolean;
  onStartTask: () => void;
  onClaim: () => void;
}

/**
 * Truncate an Ethereum address to format: 0x1234...5678
 */
function truncateAddress(address: string): string {
  if (!address) return "...";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function DashboardScreen({ user, loading, onStartTask, onClaim }: DashboardScreenProps) {
  // Extract values from user object with fallbacks
  const balance = user?.cusdc_balance ?? 0;
  const streak = user?.streak ?? 0;
  const userAddress = user?.address;
  const displayName = userAddress ? truncateAddress(userAddress) : "...";

  
  return (
    <div className="min-h-screen bg-celo-tan flex flex-col">
      {/* Header / Stats */}
      <div className="bg-celo-purple text-white p-6 rounded-b-[2rem] shadow-lg z-10 pb-12">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                 <div className="w-10 h-10 bg-celo-yellow rounded-full border-2 border-white overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress || 'default'}`} alt="avatar" />
                 </div>
                 <div>
                    <p className="text-xs text-celo-sand uppercase font-bold tracking-widest">Annotator</p>
                    <p className="text-sm font-bold font-mono">{displayName}</p>
                 </div>
            </div>
            <button 
                onClick={onClaim}
                className="bg-celo-forest px-3 py-1 rounded-full border border-celo-lime flex items-center gap-2 active:scale-95 transition-transform hover:bg-celo-forest/80"
            >
                <span className="text-celo-yellow text-lg">🪙</span>
                <span className="font-mono font-bold text-white">
                  {loading ? "..." : balance.toFixed(2)}
                </span>
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                <p className="text-celo-sand text-xs uppercase font-bold mb-1">Tasks Available</p>
                <p className="text-3xl font-bold text-celo-yellow">42</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col justify-between">
                <p className="text-celo-sand text-xs uppercase font-bold mb-1">Daily Streak</p>
                <div className="flex items-center gap-2">
                     <span className="text-3xl">🔥</span>
                     <span className="text-3xl font-black text-celo-yellow italic">
                       {loading ? "..." : streak}
                     </span>
                </div>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 flex-1 flex flex-col gap-6 pb-24 pt-6">
        
        <h3 className="text-headline text-2xl text-celo-purple">Select a Category</h3>
        
        <div className="grid grid-cols-1 gap-4">
            <CategoryCard 
                title="LATAM Audio" 
                reward="+0.15" 
                icon="🎙️" 
                color="bg-celo-blue" 
                count={15} 
                onClick={onStartTask}
            />
             <CategoryCard 
                title="Slang Detect" 
                reward="+0.05" 
                icon="💬" 
                color="bg-celo-orange" 
                count={27} 
                onClick={onStartTask}
            />
             <CategoryCard 
                title="Shelf Scan" 
                reward="+0.25" 
                icon="📸" 
                color="bg-celo-pink" 
                count={0} 
                disabled
                onClick={() => {}}
            />
        </div>

        {/* Top Earners Leaderboard */}
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-headline text-2xl text-celo-purple">Top Earners <span className="text-base align-middle">🇦🇷</span></h3>
                <span className="text-xs font-bold text-celo-forest uppercase tracking-widest border-2 border-celo-forest px-2 py-0.5 rounded-full">Live</span>
            </div>
            
            <div className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                {/* Top 3 Header */}
                <div className="grid grid-cols-3 gap-2 p-4 bg-celo-purple border-b-4 border-black text-center">
                    <div className="pt-6 relative">
                        <div className="w-12 h-12 mx-auto bg-gray-300 rounded-full border-2 border-white overflow-hidden mb-2">
                             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mateo" alt="avatar" />
                        </div>
                        <div className="absolute top-0 right-2 text-2xl">🥈</div>
                        <p className="text-celo-yellow text-xs font-bold truncate">@mateo_88</p>
                        <p className="text-white text-xs font-mono">$342</p>
                    </div>
                     <div className="relative -top-4">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl">👑</div>
                        <div className="w-16 h-16 mx-auto bg-celo-yellow rounded-full border-4 border-white overflow-hidden mb-2 shadow-[0_0_15px_rgba(252,255,82,0.5)]">
                             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sofi" alt="avatar" />
                        </div>
                        <p className="text-celo-yellow text-sm font-bold truncate">@sofi_pro</p>
                        <p className="text-white text-sm font-mono font-bold">$489</p>
                    </div>
                    <div className="pt-6 relative">
                        <div className="w-12 h-12 mx-auto bg-orange-700 rounded-full border-2 border-white overflow-hidden mb-2">
                             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Juan" alt="avatar" />
                        </div>
                        <div className="absolute top-0 left-2 text-2xl">🥉</div>
                        <p className="text-celo-yellow text-xs font-bold truncate">@juan_b</p>
                        <p className="text-white text-xs font-mono">$298</p>
                    </div>
                </div>

                {/* List */}
                <div className="divide-y-2 divide-gray-100">
                    {[
                        { rank: 4, name: "@ana_maria", amount: "$156.50" },
                        { rank: 5, name: "@carlos_dev", amount: "$142.00" },
                        { rank: 6, name: "@you", amount: `$${balance.toFixed(2)}`, isMe: true },
                    ].map((user) => (
                        <div key={user.rank} className={cn("flex items-center justify-between p-3", user.isMe && "bg-celo-yellow/20")}>
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-gray-400 w-6">#{user.rank}</span>
                                <span className={cn("font-bold text-sm", user.isMe ? "text-celo-forest" : "text-gray-700")}>
                                    {user.name} {user.isMe && "(You)"}
                                </span>
                            </div>
                            <span className="font-mono font-bold text-sm text-black">{user.amount}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-gray-50 p-2 text-center text-xs text-gray-400 uppercase tracking-widest font-bold border-t-2 border-gray-100">
                    Updated 2m ago
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

function CategoryCard({ title, reward, icon, color, count, disabled, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`relative text-left w-full p-4 border-4 border-black transition-transform active:scale-95 flex items-center gap-4 group
                ${disabled ? 'opacity-50 bg-gray-200 cursor-not-allowed' : 'bg-white hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000]'}
            `}
        >
            <div className={`w-16 h-16 ${color} flex items-center justify-center text-3xl border-2 border-black`}>
                {icon}
            </div>
            <div className="flex-1">
                <h4 className="text-headline text-xl">{title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-black text-white text-xs px-2 py-0.5 font-mono font-bold rounded">{reward} pts</span>
                    {count > 0 ? (
                        <span className="text-xs font-bold text-gray-500">{count} tasks left</span>
                    ) : (
                         <span className="text-xs font-bold text-red-500">Out of tasks</span>
                    )}
                </div>
            </div>
            {count > 0 && (
                 <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-celo-yellow border-2 border-transparent group-hover:border-black transition-colors">
                    →
                </div>
            )}
        </button>
    )
}
