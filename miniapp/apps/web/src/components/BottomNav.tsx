import { cn } from "@/lib/utils";

interface BottomNavProps {
    currentTab: "dashboard" | "profile" | "marketplace";
    onSwitch: (tab: "dashboard" | "profile" | "marketplace") => void;
}

export function BottomNav({ currentTab, onSwitch }: BottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black py-1 px-2 z-50 flex justify-around pb-safe-area shadow-[0px_-4px_10px_rgba(0,0,0,0.1)]">
            <button 
                onClick={() => onSwitch("dashboard")}
                className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1 w-1/3 rounded-lg transition-colors",
                    currentTab === "dashboard" ? "bg-celo-purple/10 text-celo-purple" : "text-gray-400 hover:bg-gray-100"
                )}
            >
                <span className="text-xl">🏠</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
            </button>
            
            <button 
                onClick={() => onSwitch("profile")}
                className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1 w-1/3 rounded-lg transition-colors",
                    currentTab === "profile" ? "bg-celo-purple/10 text-celo-purple" : "text-gray-400 hover:bg-gray-100"
                )}
            >
                <span className="text-xl">📊</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
            </button>
            
            <button 
                onClick={() => onSwitch("marketplace")}
                className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1 w-1/3 rounded-lg transition-colors relative",
                    currentTab === "marketplace" ? "bg-celo-purple/10 text-celo-purple" : "text-gray-400 hover:bg-gray-100"
                )}
            >
                <span className="text-xl">🛒</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Market</span>
            </button>
        </div>
    );
}

