"use client";

import { useState, useEffect } from "react";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { VerificationScreen } from "@/components/screens/VerificationScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { FeedScreen } from "@/components/screens/FeedScreen";
import { ClaimScreen } from "@/components/screens/ClaimScreen";
import { MarketplaceScreen } from "@/components/screens/MarketplaceScreen";
import { LaunchDatasetScreen } from "@/components/screens/LaunchDatasetScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { UploadToMarketplaceScreen } from "@/components/screens/UploadToMarketplaceScreen";
import { BottomNav } from "@/components/BottomNav";
import { useUser } from "@/hooks/useUser";
import { useAvailableDatasets } from "@/hooks/useAvailableDatasets";

type Screen = "welcome" | "verification" | "dashboard" | "feed" | "claim" | "marketplace" | "launch-dataset" | "profile" | "upload-to-marketplace";
type TaskType = "audio" | "text" | "image" | null;

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const { user, loading, refetch } = useUser();
  const { datasets, refetch: refetchDatasets } = useAvailableDatasets(user?.country, user?.address);
  
  console.log("[Home] 🏠 Current state:", { 
    currentScreen, 
    userAddress: user?.address,
    userCountry: user?.country,
    userBalance: user?.cusdc_balance,
    loading,
    datasetsCount: datasets.length
  });
  
  // Track which task type is being worked on
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>(null);
  
  // Track optimistic balance updates (starts with real balance from user)
  const [optimisticBalance, setOptimisticBalance] = useState<number | null>(null);

  // State for dataset being uploaded to marketplace
  const [datasetToUpload, setDatasetToUpload] = useState<any | null>(null);

  // Sync optimistic balance with real user balance when user data changes
  useEffect(() => {
    if (user?.cusdc_balance !== undefined) {
      console.log("[Home] 💰 Syncing optimistic balance with user balance:", {
        oldOptimisticBalance: optimisticBalance,
        newUserBalance: user.cusdc_balance
      });
      setOptimisticBalance(user.cusdc_balance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.cusdc_balance]);

  const navigateTo = (screen: Screen) => {
    console.log("[Home] 🧭 Navigating:", { from: currentScreen, to: screen });
    setCurrentScreen(screen);
  };

  const handleEarn = (amount: number) => {
    // Optimistically update balance
    const oldBalance = optimisticBalance ?? 0;
    const newBalance = oldBalance + amount;
    
    console.log("[Home] 💰 Handling earn (optimistic update):", {
      amount,
      oldBalance,
      newBalance
    });
    
    setOptimisticBalance(newBalance);
  };

  const handleClaim = () => {
    console.log("[Home] 🎁 Handling claim:", { 
      optimisticBalance,
      userBalance: user?.cusdc_balance 
    });
    // TODO: Implement actual claiming logic with database update
    // For now, just navigate - claiming logic will be implemented later
  };

  const handleUploadToMarketplace = (dataset: any) => {
    console.log("[Home] 📤 Uploading to marketplace:", { 
      datasetId: dataset?.dataset_id 
    });
    setDatasetToUpload(dataset);
    navigateTo("upload-to-marketplace");
  };

  const handleStartTask = (taskType: "audio" | "text" | "image") => {
    console.log("[Home] 🎯 Starting task type:", { 
      taskType,
      availableDatasets: datasets.filter(d => d.file_type === taskType).length
    });
    setSelectedTaskType(taskType);
    navigateTo("feed");
  };

  // Auto-refetch user data when screen changes to dashboard or profile
  useEffect(() => {
    if (currentScreen === "dashboard" || currentScreen === "profile") {
      console.log("[Home] 🔄 Auto-refetching user data for screen:", currentScreen);
      refetch();
    }
  }, [currentScreen, refetch]);

  // Show BottomNav only on main tabs
  const showBottomNav = currentScreen === "dashboard" || currentScreen === "profile" || currentScreen === "marketplace";

  // Filter datasets by selected task type
  const filteredDatasets = selectedTaskType 
    ? datasets.filter(dataset => dataset.file_type === selectedTaskType)
    : [];

  console.log("[Home] 📊 Filtered datasets:", { 
    selectedTaskType, 
    totalDatasets: datasets.length,
    filteredCount: filteredDatasets.length,
    filteredDatasets: filteredDatasets.map(d => ({ 
      id: d.dataset_id, 
      type: d.file_type 
    }))
  });

  console.log("[Home] 💰 Current balance state:", {
    optimisticBalance,
    userBalance: user?.cusdc_balance,
    displayBalance: optimisticBalance ?? user?.cusdc_balance ?? 0
  });

  return (
    <main className="min-h-screen bg-background pb-safe-area">
      {currentScreen === "welcome" && (
        <WelcomeScreen onStart={() => navigateTo("verification")} />
      )}
      
      {currentScreen === "verification" && (
        <VerificationScreen onComplete={() => navigateTo("dashboard")} />
      )}

      {currentScreen === "dashboard" && (
        <DashboardScreen 
          user={user}
          loading={loading}
          onStartTask={handleStartTask} 
          onClaim={() => navigateTo("claim")}
        />
      )}

      {currentScreen === "feed" && (
        <FeedScreen 
          currentBalance={optimisticBalance ?? user?.cusdc_balance ?? 0}
          onEarn={handleEarn}
          onBack={() => navigateTo("dashboard")}
          datasets={filteredDatasets}
          userAddress={user?.address}
          onRefetchUser={refetch}
          onRefetchDatasets={refetchDatasets}
        />
      )}

      {currentScreen === "claim" && (
        <ClaimScreen 
          balance={optimisticBalance ?? user?.cusdc_balance ?? 0}
          onBack={() => navigateTo("dashboard")}
          onClaim={handleClaim}
        />
      )}

      {currentScreen === "profile" && (
        <ProfileScreen 
          onUploadToMarketplace={handleUploadToMarketplace}
          user={user}
        />
      )}

      {currentScreen === "marketplace" && (
        <MarketplaceScreen 
            onLaunch={() => navigateTo("launch-dataset")}
        />
      )}

      {currentScreen === "launch-dataset" && (
        <LaunchDatasetScreen 
            onBack={() => navigateTo("marketplace")}
        />
      )}

      {currentScreen === "upload-to-marketplace" && datasetToUpload && (
        <UploadToMarketplaceScreen 
          dataset={datasetToUpload}
          onBack={() => navigateTo("profile")}
          onSuccess={() => {
            setDatasetToUpload(null);
            navigateTo("profile");
          }}
        />
      )}

      {showBottomNav && (
        <BottomNav 
            currentTab={currentScreen as "dashboard" | "profile" | "marketplace"} 
            onSwitch={(tab) => navigateTo(tab)} 
        />
      )}
    </main>
  );
}
