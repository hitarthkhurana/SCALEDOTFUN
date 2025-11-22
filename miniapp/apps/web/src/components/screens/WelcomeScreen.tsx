import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-celo-purple p-6 text-center animate-in fade-in duration-500">
      <div className="mb-8 relative">
        <div className="w-24 h-24 bg-celo-yellow rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_20px_rgba(252,255,82,0.5)]">
            <span className="text-4xl">🧩</span>
        </div>
        <div className="absolute -top-2 -right-2 bg-celo-pink text-celo-purple text-xs font-bold px-2 py-1 rounded-full border-2 border-white transform rotate-12">
            BETA
        </div>
      </div>
      
      <h1 className="text-headline text-5xl md:text-6xl text-celo-yellow mb-4">
        Self <span className="text-headline-italic">Verify</span>
      </h1>
      
      <p className="text-celo-tan text-lg mb-12 max-w-xs font-inter leading-relaxed">
        Earn crypto by helping train AI. <br/>
        <span className="text-celo-blue font-bold">Fun. Fast. Addictive.</span>
      </p>

      <button 
        onClick={onStart}
        className="btn-celo-primary w-full max-w-xs text-lg shadow-[4px_4px_0px_0px_#ffffff]"
      >
        Verify with Self →
      </button>
      
      <p className="mt-6 text-xs text-celo-sand/60 font-inter">
        Powered by Self Protocol & World ID
      </p>
    </div>
  );
}

