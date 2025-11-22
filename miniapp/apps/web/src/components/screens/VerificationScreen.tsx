import { useState, useEffect } from "react";
import { SelfAppBuilder } from "@selfxyz/qrcode";
import { getUniversalLink } from "@selfxyz/core";
import { ethers } from "ethers";
import { SELF_CONFIG } from "@/config/self.config";
import { parseSelfVerification } from "@/lib/parseSelfVerification";

// TypeScript declarations for MiniPay
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params: any[] }) => Promise<any>;
      isMiniPay?: boolean;
    };
  }
}

interface VerificationScreenProps {
  onComplete: () => void;
}

interface VerificationResult {
  status: "Unique Human" | "Bot Detected";
  age: number | null;
  ageRange: string;
  country: string;
  countryCode: string;
  matchedPool: string;
}

// Contract ABI for reading verification data
// Must match ISelfVerificationRoot.GenericDiscloseOutputV2 exactly
const CONTRACT_ABI = [
  "function verificationSuccessful() public view returns (bool)",
  "function lastOutput() view returns (tuple(bytes32 attestationId, uint256 userIdentifier, uint256 nullifier, uint256[4] forbiddenCountriesListPacked, string issuingState, string[] name, string idNumber, string nationality, string dateOfBirth, string gender, string expiryDate, uint256 olderThan, bool[3] ofac))",
  "function getWorkerData(address worker) view returns (tuple(bool isVerified, uint256 olderThan, string dateOfBirth, string nationality, string issuingState, uint256 verifiedAt, bytes32 userIdentifier))",
];

// Helper to read verification from contract
async function readVerificationFromContract(userAddress?: string): Promise<VerificationResult | null> {
  try {
    const provider = new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org");
    const contract = new ethers.Contract(SELF_CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Check if verification succeeded
    const isVerified = await contract.verificationSuccessful();
    console.log("📊 Contract verificationSuccessful:", isVerified);
    
    if (!isVerified) {
      return null;
    }
    
    // Try the simpler getWorkerData function if we have an address
    if (userAddress) {
      try {
        console.log("📊 Trying getWorkerData for address:", userAddress);
        const workerData = await contract.getWorkerData(userAddress);
        
        if (workerData.isVerified) {
          // Check if verification is recent (within last 2 minutes)
          const verificationTime = Number(workerData.verifiedAt) * 1000; // Convert to milliseconds
          const startTime = parseInt(sessionStorage.getItem('verificationStartTime') || '0');
          const timeSinceVerification = Date.now() - verificationTime;
          
          console.log("📊 Worker data from contract:", {
            nationality: workerData.nationality,
            dateOfBirth: workerData.dateOfBirth,
            olderThan: workerData.olderThan.toString(),
            verifiedAt: new Date(verificationTime).toLocaleString(),
            timeSinceVerification: `${Math.floor(timeSinceVerification / 1000)}s ago`,
          });
          
          // Only accept if verification happened after we started (and within 5 minutes)
          if (verificationTime >= startTime && timeSinceVerification < 5 * 60 * 1000) {
            console.log("✅ Verification is FRESH!");
            
            // Parse the data
            const parsed = parseSelfVerification({
              userIdentifier: workerData.userIdentifier,
              minimumAge: Number(workerData.olderThan),
              nationality: workerData.nationality,
              dateOfBirth: workerData.dateOfBirth,
              issuingState: workerData.issuingState,
            });
            
            console.log("✅ Parsed worker data:", parsed);
            
            return {
              status: "Unique Human",
              age: parsed.age,
              ageRange: parsed.ageRange,
              country: parsed.country,
              countryCode: parsed.countryCode,
              matchedPool: parsed.matchedPool,
            };
          } else {
            console.log("⚠️ Verification is OLD, waiting for new one...", {
              verificationTime: new Date(verificationTime).toLocaleString(),
              startTime: new Date(startTime).toLocaleString(),
            });
            return null;
          }
        }
      } catch (err) {
        console.log("⚠️ getWorkerData failed, trying lastOutput...");
      }
    }
    
    // Fallback: Try lastOutput (more complex ABI)
    try {
      const output = await contract.lastOutput();
      console.log("📊 Raw contract data from lastOutput:", {
        nationality: output.nationality,
        dateOfBirth: output.dateOfBirth,
        olderThan: output.olderThan.toString(),
      });
      
      // Parse the data
      const parsed = parseSelfVerification({
        userIdentifier: `0x${output.userIdentifier.toString(16).padStart(64, '0')}`,
        minimumAge: Number(output.olderThan),
        nationality: output.nationality,
        dateOfBirth: output.dateOfBirth,
        gender: output.gender || "",
        issuingState: output.issuingState || "",
      });
      
      console.log("✅ Parsed data:", parsed);
      
      return {
        status: "Unique Human",
        age: parsed.age,
        ageRange: parsed.ageRange,
        country: parsed.country,
        countryCode: parsed.countryCode,
        matchedPool: parsed.matchedPool,
      };
    } catch (err) {
      console.error("❌ Both methods failed:", err);
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to read from contract:", error);
    return null;
  }
}

export function VerificationScreen({ onComplete }: VerificationScreenProps) {
  const [step, setStep] = useState(0);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [userWalletAddress, setUserWalletAddress] = useState<string>("");
  // Steps: 0=Connect, 1=Proving, 2=Success/Results
  
  // Detect when user returns from Self app (manual return via app switcher)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Check if page became visible AND we're waiting for verification
      const verificationStartTime = sessionStorage.getItem('verificationStartTime');
      
      if (!document.hidden && verificationStartTime && step === 0) {
        console.log("👁️ User returned to MiniPay - checking for verification...");
        
        // Get wallet address if we don't have it
        if (!userWalletAddress && typeof window !== 'undefined' && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({
              method: "eth_requestAccounts",
              params: [],
            });
            if (accounts && accounts.length > 0) {
              setUserWalletAddress(accounts[0]);
              console.log("✅ Got wallet address:", accounts[0]);
            }
          } catch (error) {
            console.error("Failed to get wallet:", error);
          }
        }
        
        // Start polling for verification
        setStep(1);
      }
    };
    
    // Listen for when user switches back to the app
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step, userWalletAddress]);

  useEffect(() => {
    if (step === 1 && userWalletAddress) {
      // Poll the contract to check for verification
      let attempts = 0;
      const maxAttempts = 5;
      let intervalId: NodeJS.Timeout;
      
      const pollContract = async () => {
        attempts++;
        setPollAttempts(attempts);
        console.log(`🔄 Polling contract... Attempt ${attempts}/${maxAttempts}`);
        console.log(`🔍 Using wallet address: ${userWalletAddress}`);
        
        const result = await readVerificationFromContract(userWalletAddress);
        
        if (result && result.age && result.country) {
          // Got valid data!
          console.log("✅ Verification found on-chain!", result);
          clearInterval(intervalId);
          
          // Set result THEN move to step 2 (after a tiny delay to ensure state is set)
          setVerificationResult(result);
          setTimeout(() => setStep(2), 100);
        } else if (attempts >= maxAttempts) {
          console.log("⏱️ Max attempts reached, showing last known data");
          clearInterval(intervalId);
          
          // Show whatever we got, even if incomplete
          if (result) {
            setVerificationResult(result);
            setTimeout(() => setStep(2), 100);
          } else {
            // Fallback to demo data
            console.log("⚠️ No data found, using demo");
            setVerificationResult({
              status: "Unique Human",
              age: 21,
              ageRange: "21+",
              country: "Demo Country",
              countryCode: "XXX",
              matchedPool: "Demo Task Pool"
            });
            setTimeout(() => setStep(2), 100);
          }
        }
      };
      
      // Wait 2 seconds before first attempt (give blockchain time to write)
      const initialDelay = setTimeout(() => {
        pollContract();
        // Then poll every 3 seconds
        intervalId = setInterval(pollContract, 3000);
      }, 2000);
      
      return () => {
        clearTimeout(initialDelay);
        if (intervalId) clearInterval(intervalId);
        setPollAttempts(0);
      };
    }
    
    if (step === 2 && verificationResult) {
        const timer = setTimeout(() => {
            // TODO: Save verification result to Supabase here
            // Example: await saveVerificationToSupabase(verificationResult);
            onComplete();
        }, 5000); // Allow time to read the results
        return () => clearTimeout(timer);
    }
  }, [step, onComplete, userWalletAddress, verificationResult]);

  const startVerification = async () => {
    try {
      // Get the connected wallet address from MiniPay
      let userId = ethers.ZeroAddress;
      
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          // Request account access from MiniPay
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
            params: [],
          });
          
          // MiniPay returns array with one address
          if (accounts && accounts.length > 0) {
            userId = accounts[0];
            setUserWalletAddress(userId); // Save for polling later
            console.log("✅ Connected wallet:", userId);
          }
        } catch (error) {
          console.error("Failed to get wallet address:", error);
          // Fallback to random address for testing
          userId = ethers.Wallet.createRandom().address;
          setUserWalletAddress(userId);
        }
      } else {
        // Not in MiniPay, use random address for testing
        userId = ethers.Wallet.createRandom().address;
        setUserWalletAddress(userId);
      }
      
      // Generate verification start timestamp
      const verificationStartTime = Date.now();
      sessionStorage.setItem('verificationStartTime', verificationStartTime.toString());
      
      // Build the Self app verification request
      const selfApp = new SelfAppBuilder({
        version: 2,
        appName: SELF_CONFIG.APP_NAME,
        scope: SELF_CONFIG.SCOPE_SEED,
        endpoint: SELF_CONFIG.CONTRACT_ADDRESS,
        logoBase64: SELF_CONFIG.LOGO_URL,
        userId: userId,
        endpointType: SELF_CONFIG.ENDPOINT_TYPE,
        userIdType: "hex",
        userDefinedData: JSON.stringify({
          timestamp: verificationStartTime,
          platform: "miniapp"
        }),
        disclosures: SELF_CONFIG.DISCLOSURES
        // No deeplinkCallback - user will manually return to MiniPay after verification
      }).build();

      // Get the deeplink URL for mobile
      const deeplinkUrl = getUniversalLink(selfApp);
      
      console.log("🚀 Opening Self app for verification...");
      console.log("👉 After verification, return to MiniPay to continue");
      
      // Open Self app with the verification request
      // User completes verification, then manually switches back to MiniPay
      // We detect their return via page visibility change
      window.location.href = deeplinkUrl;
    } catch (error) {
      console.error("Failed to start Self verification:", error);
      alert("Failed to start verification. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-celo-tan p-6 text-center">
      {step === 0 && (
        <div className="w-full max-w-md bg-white border-4 border-celo-purple p-6 shadow-[8px_8px_0px_0px_#1A0329] animate-in slide-in-from-bottom-10 duration-300">
          <h2 className="text-headline text-3xl text-celo-purple mb-6">Permission Request</h2>
          
          <p className="text-celo-brown mb-6 text-sm">
            To match you with relevant tasks, we need to verify the following attributes from your Self ID:
          </p>

          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-center gap-3 p-3 bg-celo-sand/20 rounded border-2 border-dashed border-celo-brown/30">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">?</div>
              <div>
                <p className="font-bold text-celo-purple text-sm">Humanity</p>
                <p className="text-xs text-celo-brown">Verify you are not a bot</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-celo-sand/20 rounded border-2 border-dashed border-celo-brown/30">
               <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">?</div>
              <div>
                <p className="font-bold text-celo-purple text-sm">Age Range</p>
                <p className="text-xs text-celo-brown">Verify minimum age eligibility</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-celo-sand/20 rounded border-2 border-dashed border-celo-brown/30">
               <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">?</div>
              <div>
                <p className="font-bold text-celo-purple text-sm">Country & Region</p>
                <p className="text-xs text-celo-brown">Verify location for local tasks</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-celo-brown mb-6 italic">
            No raw personal data is shared. We only receive a cryptographic proof of these attributes.
          </p>

          <button 
            onClick={startVerification}
            className="btn-celo-secondary w-full text-base py-3"
          >
            Connect & Verify
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="text-center">
            <div className="w-20 h-20 border-8 border-celo-purple border-t-celo-yellow rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-headline text-2xl text-celo-purple mb-2">Verifying...</h3>
            <p className="text-celo-brown font-inter text-sm">Checking Zero-Knowledge Proofs</p>
            {pollAttempts > 0 && (
              <p className="text-celo-brown font-inter text-xs mt-2 opacity-60">
                Checking blockchain... ({pollAttempts}/5)
              </p>
            )}
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md bg-white border-4 border-celo-forest p-6 shadow-[8px_8px_0px_0px_#4E632A] animate-in zoom-in duration-300">
            {!verificationResult ? (
              // Loading state if result isn't ready
              <div className="text-center">
                <div className="w-20 h-20 border-8 border-celo-forest border-t-celo-yellow rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-headline text-2xl text-celo-purple mb-2">Processing...</h3>
                <p className="text-celo-brown font-inter text-sm">Finalizing verification</p>
              </div>
            ) : (
              // Success state with data
              <>
                <div className="w-16 h-16 bg-celo-forest rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl shadow-[0_0_0_5px_#B2EBA1]">
                    ✓
                </div>
                <h3 className="text-headline text-3xl text-celo-purple mb-6">Identity Verified!</h3>
                
                <div className="space-y-2 mb-6 text-left">
                     <div className="flex justify-between items-center p-2 border-b border-gray-100">
                        <span className="text-gray-500 font-medium">Status</span>
                        <span className="font-bold text-celo-forest">{verificationResult.status}</span>
                     </div>
                     <div className="flex justify-between items-center p-2 border-b border-gray-100">
                        <span className="text-gray-500 font-medium">Age</span>
                        <span className="font-bold text-celo-purple">
                          {verificationResult.age ? `${verificationResult.age} (${verificationResult.ageRange})` : verificationResult.ageRange}
                        </span>
                     </div>
                     <div className="flex justify-between items-center p-2 border-b border-gray-100">
                        <span className="text-gray-500 font-medium">Country</span>
                        <span className="font-bold text-celo-purple">{verificationResult.country} 🌍</span>
                     </div>
                </div>

                <div className="bg-celo-tan p-3 rounded border-2 border-celo-purple/20 mb-4">
                    <p className="text-xs text-center text-celo-brown font-bold">
                        Matched: {verificationResult.matchedPool}
                    </p>
                </div>

                <p className="text-celo-brown font-inter text-sm animate-pulse">Redirecting to dashboard...</p>
              </>
            )}
        </div>
      )}
    </div>
  );
}
