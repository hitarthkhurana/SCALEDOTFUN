import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface FeedScreenProps {
  onBack: () => void;
}

// Mock Data
const TASKS = [
  {
    id: 1,
    type: "audio",
    question: "Is the speaker angry?",
    content: "audio_clip_1.mp3", // Placeholder
    reward: 0.15,
    options: ["Yes", "No", "Unsure"],
    context: "Customer Service Call • ES-MX"
  },
  {
    id: 4,
    type: "bounding-box",
    question: "Draw boxes around all motorcycles",
    content: "/argentinastreet.png",
    reward: 0.50,
    options: [], // Custom UI handled by type check
    context: "Object Detection • Buenos Aires"
  },
  {
    id: 2,
    type: "text",
    question: "Is this slang for 'Cool'?",
    content: "\"Está chido este lugar\"",
    reward: 0.05,
    options: ["Yes", "No"],
    context: "Social Media Comment • ES-MX"
  },
  {
    id: 3,
    type: "image",
    question: "Is the shelf fully stocked?",
    content: "https://placehold.co/400x300/orange/white?text=Shelf",
    reward: 0.25,
    options: ["Yes", "Partially", "Empty"],
    context: "Retail Auditing • Mexico City"
  },
];

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function BoundingBoxTask({ content, onComplete }: { content: string, onComplete: (e: React.MouseEvent) => void }) {
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [currentBox, setCurrentBox] = useState<Box | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0 });

    const getRelativePos = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getRelativePos(e);
        startPos.current = pos;
        setIsDrawing(true);
        setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const pos = getRelativePos(e);
        const width = pos.x - startPos.current.x;
        const height = pos.y - startPos.current.y;
        
        setCurrentBox({
            x: width > 0 ? startPos.current.x : pos.x,
            y: height > 0 ? startPos.current.y : pos.y,
            width: Math.abs(width),
            height: Math.abs(height)
        });
    };

    const handleEnd = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentBox && currentBox.width > 10 && currentBox.height > 10) {
            setBoxes([...boxes, currentBox]);
        }
        setCurrentBox(null);
    };

    const undoLast = () => {
        setBoxes(boxes.slice(0, -1));
    };

    return (
        <div className="w-full flex flex-col items-center">
             <div 
                ref={containerRef}
                className="relative w-full aspect-[4/3] bg-gray-800 rounded-lg overflow-hidden touch-none cursor-crosshair mb-4 select-none"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
             >
                <img src={content} alt="Annotate" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                
                {/* Existing Boxes */}
                {boxes.map((box, i) => (
                    <div
                        key={i}
                        className="absolute border-2 border-celo-yellow bg-celo-yellow/20"
                        style={{
                            left: box.x,
                            top: box.y,
                            width: box.width,
                            height: box.height
                        }}
                    />
                ))}

                {/* Current Drawing Box */}
                {currentBox && (
                    <div
                        className="absolute border-2 border-white bg-white/10"
                        style={{
                            left: currentBox.x,
                            top: currentBox.y,
                            width: currentBox.width,
                            height: currentBox.height
                        }}
                    />
                )}
             </div>

             <div className="flex gap-4 w-full">
                <button 
                    onClick={undoLast}
                    disabled={boxes.length === 0}
                    className="px-4 py-3 bg-gray-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                    Undo
                </button>
                <button 
                    onClick={onComplete}
                    disabled={boxes.length === 0}
                    className="flex-1 px-4 py-3 bg-celo-yellow text-black border-b-4 border-celo-brown rounded-lg font-bold disabled:opacity-50 active:scale-95 transition-all"
                >
                    Submit ({boxes.length})
                </button>
             </div>
        </div>
    );
}

export function FeedScreen({ onBack }: FeedScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [balance, setBalance] = useState(124.50);
  const [streak, setStreak] = useState(3);
  const [showReward, setShowReward] = useState<{amount: number, x: number, y: number} | null>(null);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);

  const handleAnswer = (reward: number, e: React.MouseEvent) => {
    // 1. Update Balance
    setBalance(prev => prev + reward);
    setStreak(prev => prev + 1);

    // 2. Trigger Jackpot Animation
    setIsBalanceAnimating(true);
    setTimeout(() => setIsBalanceAnimating(false), 600);

    // 3. Show Reward Animation
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setShowReward({
        amount: reward,
        x: rect.left + rect.width / 2,
        y: rect.top
    });

    // 4. Scroll to next (after delay)
    setTimeout(() => {
        setShowReward(null);
        if (scrollRef.current) {
             const height = scrollRef.current.clientHeight;
             const currentScroll = scrollRef.current.scrollTop;
             const nextScroll = Math.ceil((currentScroll + 10) / height) * height;
             scrollRef.current.scrollTo({ top: nextScroll, behavior: 'smooth' });
        }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 w-full bg-black text-white overflow-hidden">
      
      {/* Top Overlay UI */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
         {/* Streak */}
         <div className="flex flex-col items-center pointer-events-auto" onClick={onBack}>
             <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="text-2xl">🔥</span>
                <span className="text-xl font-bold text-orange-500">{streak}</span>
             </div>
             <span className="text-[10px] opacity-70 mt-1">Tap to exit</span>
         </div>

         {/* Balance */}
         <div className={cn(
            "flex items-center gap-2 bg-celo-forest/90 backdrop-blur-md px-4 py-2 rounded-full border-2 border-celo-lime shadow-[0_0_15px_rgba(78,99,42,0.5)] transition-all",
            isBalanceAnimating ? "animate-jackpot z-[60]" : "animate-pulse-slow"
         )}>
            <span className="text-xl">🪙</span>
            <span className="font-mono font-bold text-lg">{balance.toFixed(2)}</span>
         </div>
      </div>

      {/* Reward Pop-up Overlay */}
      {showReward && (
        <div 
            className="absolute z-[100] pointer-events-none animate-bounce-custom text-4xl font-black text-celo-yellow text-stroke-black"
            style={{ left: showReward.x, top: showReward.y }}
        >
            +{showReward.amount.toFixed(2)}
        </div>
      )}

      {/* Vertical Scroll Snap Feed */}
      <div 
        ref={scrollRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar
      >
        {TASKS.map((task, index) => (
            <section 
                key={task.id} 
                className="h-full w-full snap-start snap-always flex flex-col relative"
            >
                {/* Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 p-6 pb-32 relative">
                    
                    {/* Context Badge */}
                    <div className="absolute top-24 bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-xs uppercase tracking-widest font-bold mb-4 z-10">
                        {task.context}
                    </div>

                    <div className="w-full max-w-md">
                        <h2 className="text-2xl font-bold text-center mb-8 leading-tight px-4">
                            {task.question}
                        </h2>

                        {/* Visualization based on type */}
                        <div className={cn(
                            "bg-black/50 rounded-2xl border border-white/10 mb-8 flex items-center justify-center overflow-hidden",
                             task.type === 'bounding-box' ? "p-0 border-none bg-transparent" : "p-6 min-h-[200px]"
                        )}>
                            {task.type === 'audio' && (
                                <div className="flex items-center gap-2 w-full justify-center">
                                    <div className="w-1 h-4 bg-celo-yellow animate-pulse delay-75"></div>
                                    <div className="w-1 h-8 bg-celo-yellow animate-pulse delay-100"></div>
                                    <div className="w-1 h-12 bg-celo-yellow animate-pulse delay-150"></div>
                                    <div className="w-1 h-6 bg-celo-yellow animate-pulse delay-200"></div>
                                    <div className="w-1 h-10 bg-celo-yellow animate-pulse delay-300"></div>
                                    <span className="ml-4 text-xs font-mono text-celo-yellow">PLAYING...</span>
                                </div>
                            )}
                            {task.type === 'text' && (
                                <p className="text-2xl font-serif italic text-center">
                                    {task.content}
                                </p>
                            )}
                             {task.type === 'image' && (
                                <img src={task.content} alt="Task" className="rounded-lg object-cover max-h-[300px]" />
                            )}
                            {task.type === 'bounding-box' && (
                                <BoundingBoxTask 
                                    content={task.content} 
                                    onComplete={(e) => handleAnswer(task.reward, e)} 
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Interaction Area (Bottom Sheet) - Hide for bounding box since it has its own controls */}
                {task.type !== 'bounding-box' && (
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent pt-12">
                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                            {task.options.map((option, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => handleAnswer(task.reward, e)}
                                    className={cn(
                                        "py-4 px-6 rounded-xl font-bold text-lg border-b-4 active:scale-95 transition-all",
                                        i === 0 ? "bg-celo-yellow text-black border-celo-brown" : 
                                        i === 1 ? "bg-white text-black border-gray-400" :
                                        "bg-gray-800 text-white border-black col-span-2"
                                    )}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <button className="w-full text-center mt-4 text-xs text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                            Skip Task (-1 Streak)
                        </button>
                    </div>
                )}
                
                {/* Special Skip for Bounding Box */}
                 {task.type === 'bounding-box' && (
                    <div className="absolute bottom-0 left-0 w-full pb-8 pt-4 text-center bg-gradient-to-t from-black to-transparent">
                         <button className="text-xs text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                            Skip Task (-1 Streak)
                        </button>
                    </div>
                 )}

            </section>
        ))}
        
        {/* End of Feed */}
        <section className="h-full w-full snap-start flex items-center justify-center bg-celo-purple">
            <div className="text-center">
                <h2 className="text-headline text-4xl text-celo-yellow mb-4">All Caught Up!</h2>
                <p className="text-white mb-8">Come back tomorrow for more tasks.</p>
                <button onClick={onBack} className="btn-celo-primary">
                    Back to Dashboard
                </button>
            </div>
        </section>

      </div>
    </div>
  );
}
