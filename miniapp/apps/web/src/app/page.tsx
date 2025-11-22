"use client";

import { useState } from "react";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { VerificationScreen } from "@/components/screens/VerificationScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { FeedScreen } from "@/components/screens/FeedScreen";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "verification" | "dashboard" | "feed">("welcome");

  const navigateTo = (screen: "welcome" | "verification" | "dashboard" | "feed") => {
    setCurrentScreen(screen);
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
        <DashboardScreen onStartTask={() => navigateTo("feed")} />
      )}

      {currentScreen === "feed" && (
        <FeedScreen onBack={() => navigateTo("dashboard")} />
      )}
    </main>
  );
}
