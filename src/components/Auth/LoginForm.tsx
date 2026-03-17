import React, { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useFirebase } from "../../context/FirebaseContext";

export const LoginForm: React.FC = () => {
  const { login } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to initialize session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full glass rounded-[2.5rem] p-10 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
      
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center glow-accent">
          <ShieldCheck className="text-accent w-8 h-8" />
        </div>
      </div>

      <h2 className="text-3xl font-serif font-bold text-white mb-2">
        NeuroWeave Access
      </h2>
      <p className="text-gray-400 mb-8 text-sm">
        Sign in with your Google account to access the multimodal network
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-left">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 shadow-xl mt-6 group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-5 h-5"
                referrerPolicy="no-referrer"
              />
              <span>Sign in with Google</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
      
      <p className="mt-12 text-[10px] text-gray-600 uppercase tracking-[0.3em]">Think. See. Create.</p>
    </div>
  );
};
