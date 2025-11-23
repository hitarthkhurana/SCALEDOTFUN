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

type Screen = "welcome" | "verification" | "dashboard" | "feed" | "claim" | "marketplace" | "launch-dataset" | "profile" | "upload-to-marketplace";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const { user, loading, refetch } = useUser();
  
  // Mock balance for Feed and Claim screens (not connected to real database yet)
  const [mockBalance, setMockBalance] = useState(124.50);

  // State for dataset being uploaded to marketplace
  const [datasetToUpload, setDatasetToUpload] = useState<any | null>(null);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleEarn = (amount: number) => {
    // Update mock balance for now
    // TODO: Implement actual earning logic with database update
    console.log("User earned:", amount);
    setMockBalance(prev => prev + amount);
  };

  const handleClaim = () => {
    // Reset mock balance for now
    // TODO: Implement actual claiming logic with database update
    console.log("User claimed:", mockBalance);
    setMockBalance(0);
  };

  const handleUploadToMarketplace = (dataset: any) => {
    setDatasetToUpload(dataset);
    navigateTo("upload-to-marketplace");
  };

  // Auto-refetch user data when screen changes to dashboard or profile
  useEffect(() => {
    if (currentScreen === "dashboard" || currentScreen === "profile") {
      refetch();
    }
  }, [currentScreen, refetch]);

  // Show BottomNav only on main tabs
  const showBottomNav = currentScreen === "dashboard" || currentScreen === "profile" || currentScreen === "marketplace";

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
          onStartTask={() => navigateTo("feed")} 
          onClaim={() => navigateTo("claim")}
        />
      )}

      {currentScreen === "feed" && (
        <FeedScreen 
          currentBalance={mockBalance}
          onEarn={handleEarn}
          onBack={() => navigateTo("dashboard")} 
        />
      )}

      {currentScreen === "claim" && (
        <ClaimScreen 
          balance={mockBalance}
          onBack={() => navigateTo("dashboard")}
          onClaim={handleClaim}
        />
      )}

      {currentScreen === "profile" && (
        <ProfileScreen 
          onUploadToMarketplace={handleUploadToMarketplace}
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
