import { useState, useEffect } from "react";

interface VerificationScreenProps {
  onComplete: () => void;
}

export function VerificationScreen({ onComplete }: VerificationScreenProps) {
  const [step, setStep] = useState(0);
  // Steps: 0=Connect, 1=Proving, 2=Success/Results

  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => {
        setStep(2);
      }, 2500); // Simulate ZK proof time
      return () => clearTimeout(timer);
    }
    if (step === 2) {
        const timer = setTimeout(() => {
            onComplete();
        }, 5000); // Allow time to read the results
        return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  const startVerification = () => setStep(1);

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
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md bg-white border-4 border-celo-forest p-6 shadow-[8px_8px_0px_0px_#4E632A] animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-celo-forest rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl shadow-[0_0_0_5px_#B2EBA1]">
                ✓
            </div>
            <h3 className="text-headline text-3xl text-celo-purple mb-6">Identity Verified!</h3>
            
            <div className="space-y-2 mb-6 text-left">
                 <div className="flex justify-between items-center p-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Status</span>
                    <span className="font-bold text-celo-forest">Unique Human</span>
                 </div>
                 <div className="flex justify-between items-center p-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Age</span>
                    <span className="font-bold text-celo-purple">21+</span>
                 </div>
                 <div className="flex justify-between items-center p-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Country</span>
                    <span className="font-bold text-celo-purple">Argentina 🇦🇷</span>
                 </div>
            </div>

            <div className="bg-celo-tan p-3 rounded border-2 border-celo-purple/20 mb-4">
                <p className="text-xs text-center text-celo-brown font-bold">
                    Matched: LATAM Task Pool
                </p>
            </div>

            <p className="text-celo-brown font-inter text-sm animate-pulse">Redirecting to dashboard...</p>
        </div>
      )}
    </div>
  );
}
