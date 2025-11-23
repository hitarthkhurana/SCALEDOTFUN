import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Dataset } from "@/hooks/useAvailableDatasets";
import { useAccount } from "wagmi";
import { createClient } from "@/utils/supabase/client";

interface FeedScreenProps {
  onBack: () => void;
  currentBalance: number;
  onEarn: (amount: number) => void;
  datasets: Dataset[];
  userAddress?: string;
  onRefetchUser?: () => Promise<void>;
  onRefetchDatasets?: () => Promise<void>;
}

interface Task {
  id: number;
  datasetId: number;
  type: "audio" | "text" | "image";
  question: string;
  content: string;
  reward: number;
  options: string[];
  context: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function BoundingBoxTask({ content, onComplete, boxes: externalBoxes, setBoxes: setExternalBoxes }: { 
  content: string;
  onComplete: (e: React.MouseEvent, boxes: Box[]) => void;
  boxes: Box[];
  setBoxes: (boxes: Box[]) => void;
}) {
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
            setExternalBoxes([...externalBoxes, currentBox]);
        }
        setCurrentBox(null);
    };

    const undoLast = () => {
        setExternalBoxes(externalBoxes.slice(0, -1));
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
                {externalBoxes.map((box, i) => (
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
                    disabled={externalBoxes.length === 0}
                    className="px-4 py-3 bg-gray-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                    Undo
                </button>
                <button 
                    onClick={(e) => onComplete(e, externalBoxes)}
                    disabled={externalBoxes.length === 0}
                    className="flex-1 px-4 py-3 bg-celo-yellow text-black border-b-4 border-celo-brown rounded-lg font-bold disabled:opacity-50 active:scale-95 transition-all"
                >
                    Submit ({externalBoxes.length})
                </button>
             </div>
        </div>
    );
}

export function FeedScreen({ onBack, currentBalance, onEarn, datasets, userAddress, onRefetchUser, onRefetchDatasets }: FeedScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const lastScrollTop = useRef(0);
  const currentTaskIndex = useRef(0);
  const [streak, setStreak] = useState(3);
  const [showReward, setShowReward] = useState<{amount: number, x: number, y: number} | null>(null);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState<Record<number, Box[]>>({});
  const [audioPlaying, setAudioPlaying] = useState<Record<number, boolean>>({});
  const [textContent, setTextContent] = useState<Record<number, string>>({});
  const [textLoading, setTextLoading] = useState<Record<number, boolean>>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  console.log("[FeedScreen] 🎬 Rendering with:", { 
    datasetsCount: datasets.length, 
    currentBalance, 
    userAddress,
    hasRefetchCallback: !!onRefetchUser,
    datasets: datasets.map(d => ({ id: d.dataset_id, type: d.file_type, url: d.file_url }))
  });

  // Convert datasets to tasks format
  const tasks: Task[] = datasets.map((dataset, index) => {
    // For images, we'll use bounding-box type
    const taskType = dataset.file_type === "image" ? "image" : dataset.file_type;
    
    console.log("[FeedScreen] 🔄 Mapping dataset to task:", {
      datasetId: dataset.dataset_id,
      fileType: dataset.file_type,
      taskType,
      hasFileUrl: !!dataset.file_url
    });
    
    return {
      id: index,
      datasetId: dataset.dataset_id,
      type: taskType,
      question: dataset.task,
      content: dataset.file_url || "",
      reward: Number(dataset.cusdc_payout_per_annotation),
      options: taskType === "image" ? [] : taskType === "audio" ? ["Yes", "No", "Unsure"] : ["Yes", "No"],
      context: `Dataset #${dataset.dataset_id} • ${dataset.file_type.toUpperCase()}`
    };
  });

  console.log("[FeedScreen] 📋 Mapped tasks:", tasks.map(t => ({ 
    id: t.id, 
    datasetId: t.datasetId, 
    type: t.type, 
    reward: t.reward,
    hasContent: !!t.content
  })));

  if (tasks.length === 0) {
    console.warn("[FeedScreen] ⚠️ No tasks available! Debug info:", {
      datasetsReceived: datasets.length,
      datasets: datasets,
      userAddress,
    });
  }

  // Fetch text content for text tasks
  useEffect(() => {
    const fetchTextContent = async () => {
      for (const task of tasks) {
        if (task.type === 'text' && task.content && !textContent[task.id] && !textLoading[task.id]) {
          console.log("[FeedScreen] 📄 Fetching text content for task:", task.id, "from URL:", task.content);
          setTextLoading(prev => ({ ...prev, [task.id]: true }));
          
          try {
            const response = await fetch(task.content);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            console.log("[FeedScreen] ✅ Text content fetched for task:", task.id, "length:", text.length);
            setTextContent(prev => ({ ...prev, [task.id]: text }));
          } catch (error) {
            console.error("[FeedScreen] ❌ Failed to fetch text content for task:", task.id, error);
            setTextContent(prev => ({ ...prev, [task.id]: "Error loading text content" }));
          } finally {
            setTextLoading(prev => ({ ...prev, [task.id]: false }));
          }
        }
      }
    };

    fetchTextContent();
  }, [tasks, textContent, textLoading]);

  // Prevent scrolling back up to completed tasks
  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (!scrollRef.current) return;
      
      const scrollTop = scrollRef.current.scrollTop;
      const height = scrollRef.current.clientHeight;
      const newTaskIndex = Math.round(scrollTop / height);
      
      // Allow scrolling to the "All Caught Up" screen (which is at tasks.length index)
      const maxAllowedIndex = tasks.length; // Allow one more than last task for end screen
      
      // Check if user is trying to scroll up
      if (scrollTop < lastScrollTop.current) {
        console.log("[FeedScreen] 🚫 Preventing upward scroll:", { 
          from: lastScrollTop.current, 
          to: scrollTop,
          currentTask: currentTaskIndex.current 
        });
        
        // Snap back to current task
        scrollRef.current.scrollTo({
          top: currentTaskIndex.current * height,
          behavior: 'smooth'
        });
        return;
      }
      
      // Update last scroll position
      lastScrollTop.current = scrollTop;
      
      // Update current task index if moving forward (allow moving to end screen)
      if (newTaskIndex > currentTaskIndex.current && newTaskIndex <= maxAllowedIndex) {
        console.log("[FeedScreen] ⬇️ Moving to next:", { 
          from: currentTaskIndex.current, 
          to: newTaskIndex,
          isEndScreen: newTaskIndex === tasks.length
        });
        currentTaskIndex.current = newTaskIndex;
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [tasks.length]);

  // Auto-play audio when scrolling to a new task
  useEffect(() => {
    const handleScrollEnd = () => {
      if (!scrollRef.current) return;
      
      const scrollTop = scrollRef.current.scrollTop;
      const height = scrollRef.current.clientHeight;
      const newTaskIndex = Math.round(scrollTop / height);
      
      const currentTask = tasks[newTaskIndex];
      if (currentTask?.type === 'audio') {
        console.log("[FeedScreen] 🎵 Auto-playing audio for task:", currentTask.id);
        const audio = audioRefs.current[currentTask.id];
        if (audio) {
          // Reset and play
          audio.currentTime = 0;
          audio.play().catch(err => {
            console.error("[FeedScreen] ❌ Failed to play audio:", err);
          });
        }
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scrollend', handleScrollEnd);
      // Also play the first audio on mount if it's an audio task
      if (tasks[0]?.type === 'audio') {
        setTimeout(() => {
          const audio = audioRefs.current[tasks[0].id];
          if (audio) {
            console.log("[FeedScreen] 🎵 Auto-playing first audio task");
            audio.play().catch(err => {
              console.error("[FeedScreen] ❌ Failed to play first audio:", err);
            });
          }
        }, 500);
      }
      return () => scrollElement.removeEventListener('scrollend', handleScrollEnd);
    }
  }, [tasks]);

  const toggleAudio = (taskId: number) => {
    const audio = audioRefs.current[taskId];
    if (audio) {
      if (audio.paused) {
        console.log("[FeedScreen] ▶️ Playing audio for task:", taskId);
        audio.play().catch(err => {
          console.error("[FeedScreen] ❌ Failed to play audio:", err);
        });
      } else {
        console.log("[FeedScreen] ⏸️ Pausing audio for task:", taskId);
        audio.pause();
      }
    }
  };

  const handleAnswer = async (task: Task, answer: string | Box[], e: React.MouseEvent) => {
    console.log("[FeedScreen] ✅ Task completed:", { 
      taskId: task.id, 
      datasetId: task.datasetId, 
      taskType: task.type,
      answer: task.type === "image" ? `${(answer as Box[]).length} boxes` : answer,
      reward: task.reward
    });

    // Mark task as completed in UI state
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      newSet.add(task.id);
      console.log("[FeedScreen] 📝 Marked task as completed:", task.id, "Total completed:", newSet.size);
      return newSet;
    });

    // Save annotation to database - triggers handle balance & count updates!
    if (userAddress) {
      console.log("[FeedScreen] 💾 Saving annotation to database...");
      
      try {
        const supabase = createClient();
        
        const payload = task.type === "image" 
          ? { boxes: answer } // Bounding boxes for images
          : { answer }; // Text answer for audio/text tasks

        console.log("[FeedScreen] 📝 Annotation payload:", { 
          dataset_id: task.datasetId, 
          user_address: userAddress.toLowerCase(),
          payload 
        });

        const { error: insertError } = await supabase.from("annotations").insert({
          dataset_id: task.datasetId,
          user_address: userAddress.toLowerCase(),
          payload
        });

        if (insertError) {
          console.error("[FeedScreen] ❌ Failed to insert annotation:", insertError);
          throw insertError;
        }
        
        console.log("[FeedScreen] ✅ Annotation saved - DB triggers will update balance & annotation count");

      } catch (error) {
        console.error("[FeedScreen] ❌ Failed to save annotation:", error);
      }
    } else {
      console.warn("[FeedScreen] ⚠️ No user address - skipping database save");
    }

    // 1. Optimistically update Balance (via parent prop)
    console.log("[FeedScreen] 🚀 Optimistically updating balance:", {
      oldBalance: currentBalance,
      newBalance: currentBalance + task.reward,
      reward: task.reward
    });
    onEarn(task.reward);
    setStreak(prev => {
      console.log("[FeedScreen] 🔥 Updating streak:", { old: prev, new: prev + 1 });
      return prev + 1;
    });

    // 2. Trigger Jackpot Animation
    console.log("[FeedScreen] 🎰 Triggering jackpot animation");
    setIsBalanceAnimating(true);
    setTimeout(() => setIsBalanceAnimating(false), 600);

    // 3. Show Reward Animation
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setShowReward({
        amount: task.reward,
        x: rect.left + rect.width / 2,
        y: rect.top
    });
    console.log("[FeedScreen] ✨ Showing reward animation:", { amount: task.reward });

    // 4. Clear bounding boxes for this task
    if (task.type === "image") {
      console.log("[FeedScreen] 🗑️ Clearing bounding boxes for task:", task.id);
      setBoundingBoxes(prev => ({ ...prev, [task.id]: [] }));
    }

    // 5. Scroll to next (after delay)
    setTimeout(() => {
        setShowReward(null);
        if (scrollRef.current) {
             const height = scrollRef.current.clientHeight;
             const currentScroll = scrollRef.current.scrollTop;
             const nextScroll = Math.ceil((currentScroll + 10) / height) * height;
             console.log("[FeedScreen] 📜 Scrolling to next task:", { 
               currentScroll, 
               nextScroll, 
               height 
             });
             scrollRef.current.scrollTo({ top: nextScroll, behavior: 'smooth' });
        }
    }, 800);
  };

  const handleBackToDashboard = async () => {
    console.log("[FeedScreen] 🔙 Navigating back to dashboard...");
    
    // Refetch user data to sync balance before going back
    if (onRefetchUser) {
      console.log("[FeedScreen] 🔄 Refetching user data to sync balance...");
      await onRefetchUser();
      console.log("[FeedScreen] ✅ User data refetched");
    } else {
      console.warn("[FeedScreen] ⚠️ No user refetch callback provided");
    }

    // Refetch datasets to sync counts before going back
    if (onRefetchDatasets) {
      console.log("[FeedScreen] 🔄 Refetching datasets to sync counts...");
      await onRefetchDatasets();
      console.log("[FeedScreen] ✅ Datasets refetched");
    } else {
      console.warn("[FeedScreen] ⚠️ No datasets refetch callback provided");
    }
    
    console.log("[FeedScreen] ✅ Calling onBack()");
    onBack();
  };

  if (tasks.length === 0) {
    console.log("[FeedScreen] ⚠️ No tasks available, showing empty state");
    return (
      <div className="fixed inset-0 z-50 w-full bg-black text-white flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-headline text-3xl text-celo-yellow mb-4">No Tasks Available</h2>
          <p className="text-white mb-8">There are currently no tasks available for your region.</p>
          <button onClick={handleBackToDashboard} className="btn-celo-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  console.log("[FeedScreen] 🎬 Rendering feed with", tasks.length, "tasks");

  return (
    <div className="fixed inset-0 z-50 w-full bg-black text-white overflow-hidden">
      
      {/* Top Overlay UI */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
         {/* Streak */}
         <div className="flex flex-col items-center pointer-events-auto" onClick={handleBackToDashboard}>
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
            <span className="font-mono font-bold text-lg">{currentBalance.toFixed(4)}</span>
         </div>
      </div>

      {/* Reward Pop-up Overlay */}
      {showReward && (
        <div 
            className="absolute z-[100] pointer-events-none animate-bounce-custom text-4xl font-black text-celo-yellow text-stroke-black"
            style={{ left: showReward.x, top: showReward.y }}
        >
            +{showReward.amount.toFixed(4)}
        </div>
      )}

      {/* Vertical Scroll Snap Feed */}
      <div 
        ref={scrollRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar
      >
        {tasks.map((task) => (
            <section 
                key={task.id} 
                className="h-full w-full snap-start snap-always flex flex-col relative"
            >
                {/* Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 p-6 pb-32 relative">
                    
                    {/* Context Badge - Now relative with spacing */}
                    <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-xs uppercase tracking-widest font-bold mb-8 mt-20 z-10">
                        {task.context}
                    </div>

                    <div className="w-full max-w-md">
                        <h2 className="text-2xl font-bold text-center mb-8 leading-tight px-4">
                            {task.question}
                        </h2>

                        {/* Visualization based on type */}
                        <div className={cn(
                            "bg-black/50 rounded-2xl border border-white/10 mb-8 flex items-center justify-center overflow-hidden",
                             task.type === 'image' ? "p-0 border-none bg-transparent" : "p-6 min-h-[200px]"
                        )}>
                            {task.type === 'audio' && (
                                <div className="flex flex-col items-center gap-4 w-full">
                                    {/* Hidden audio element */}
                                    <audio
                                        ref={el => { audioRefs.current[task.id] = el; }}
                                        src={task.content}
                                        onPlay={() => {
                                            console.log("[FeedScreen] 🎵 Audio started playing:", task.id);
                                            setAudioPlaying(prev => ({ ...prev, [task.id]: true }));
                                        }}
                                        onPause={() => {
                                            console.log("[FeedScreen] ⏸️ Audio paused:", task.id);
                                            setAudioPlaying(prev => ({ ...prev, [task.id]: false }));
                                        }}
                                        onEnded={() => {
                                            console.log("[FeedScreen] 🎵 Audio ended:", task.id);
                                            setAudioPlaying(prev => ({ ...prev, [task.id]: false }));
                                        }}
                                        onError={(e) => {
                                            console.error("[FeedScreen] ❌ Audio error:", { taskId: task.id, error: e });
                                        }}
                                    />
                                    
                                    {/* Visual waveform */}
                                    <div className="flex items-center gap-2 w-full justify-center">
                                        <div className={cn("w-1 h-4 bg-celo-yellow transition-all", audioPlaying[task.id] && "animate-pulse delay-75")}></div>
                                        <div className={cn("w-1 h-8 bg-celo-yellow transition-all", audioPlaying[task.id] && "animate-pulse delay-100")}></div>
                                        <div className={cn("w-1 h-12 bg-celo-yellow transition-all", audioPlaying[task.id] && "animate-pulse delay-150")}></div>
                                        <div className={cn("w-1 h-6 bg-celo-yellow transition-all", audioPlaying[task.id] && "animate-pulse delay-200")}></div>
                                        <div className={cn("w-1 h-10 bg-celo-yellow transition-all", audioPlaying[task.id] && "animate-pulse delay-300")}></div>
                                        <span className="ml-4 text-xs font-mono text-celo-yellow">
                                            {audioPlaying[task.id] ? "PLAYING..." : "PAUSED"}
                                        </span>
                                    </div>

                                    {/* Play/Pause button */}
                                    <button
                                        onClick={() => toggleAudio(task.id)}
                                        className="mt-2 px-6 py-2 bg-celo-yellow text-black rounded-full font-bold border-2 border-black hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        {audioPlaying[task.id] ? "⏸️ Pause" : "▶️ Play"}
                                    </button>
                                </div>
                            )}
                            {task.type === 'text' && (
                                <div className="flex flex-col items-center justify-center w-full">
                                    {textLoading[task.id] ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-celo-yellow"></div>
                                            <span className="text-xs text-gray-400">Loading text...</span>
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-serif italic text-center whitespace-pre-wrap break-words px-4">
                                            {textContent[task.id] || task.content}
                                        </p>
                                    )}
                                </div>
                            )}
                            {task.type === 'image' && (
                                <BoundingBoxTask 
                                    content={task.content} 
                                    onComplete={(e, boxes) => handleAnswer(task, boxes, e)}
                                    boxes={boundingBoxes[task.id] || []}
                                    setBoxes={(boxes) => setBoundingBoxes(prev => ({ ...prev, [task.id]: boxes }))}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Interaction Area (Bottom Sheet) - Hide for image since it has its own controls */}
                {task.type !== 'image' && (
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent pt-12">
                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                            {task.options.map((option, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => handleAnswer(task, option, e)}
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
                
                {/* Special Skip for Image */}
                 {task.type === 'image' && (
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
                <button onClick={handleBackToDashboard} className="btn-celo-primary">
                    Back to Dashboard
                </button>
            </div>
        </section>

      </div>
    </div>
  );
}
