"use client";

import { useState } from "react";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { VerificationScreen } from "@/components/screens/VerificationScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { FeedScreen } from "@/components/screens/FeedScreen";
import { ClaimScreen } from "@/components/screens/ClaimScreen";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "verification" | "dashboard" | "feed" | "claim">("welcome");
  const [credits, setCredits] = useState(124.50); // Centralized balance state

  const navigateTo = (screen: "welcome" | "verification" | "dashboard" | "feed" | "claim") => {
    setCurrentScreen(screen);
  };

  const handleEarn = (amount: number) => {
    setCredits(prev => prev + amount);
  };

  const handleClaim = () => {
    setCredits(0);
  };

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
          balance={credits}
          onStartTask={() => navigateTo("feed")} 
          onClaim={() => navigateTo("claim")}
        />
      )}

      {currentScreen === "feed" && (
        <FeedScreen 
          currentBalance={credits}
          onEarn={handleEarn}
          onBack={() => navigateTo("dashboard")} 
        />
      )}

      {currentScreen === "claim" && (
        <ClaimScreen 
          balance={credits}
          onBack={() => navigateTo("dashboard")}
          onClaim={handleClaim}
        />
      )}
    </main>
  );
}
