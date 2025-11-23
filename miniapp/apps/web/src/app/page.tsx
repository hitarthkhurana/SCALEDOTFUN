"use client";

import { useState, useEffect } from "react";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { VerificationScreen } from "@/components/screens/VerificationScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { FeedScreen } from "@/components/screens/FeedScreen";
import { ClaimScreen } from "@/components/screens/ClaimScreen";
import { useUser } from "@/hooks/useUser";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "verification" | "dashboard" | "feed" | "claim">("welcome");
  const { user, loading, refetch } = useUser();
  
  // Mock balance for Feed and Claim screens (not connected to real database yet)
  const [mockBalance, setMockBalance] = useState(124.50);

  const navigateTo = (screen: "welcome" | "verification" | "dashboard" | "feed" | "claim") => {
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

  // Auto-refetch user data when screen changes to dashboard
  useEffect(() => {
    if (currentScreen === "dashboard") {
      refetch();
    }
  }, [currentScreen, refetch]);

  return (
    <main className="min-h-screen bg-background">
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
    </main>
  );
}
