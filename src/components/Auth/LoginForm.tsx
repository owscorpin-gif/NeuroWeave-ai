import React, { useState } from "react";
import { ShieldCheck, LogIn } from "lucide-react";
import { useFirebase } from "../../context/FirebaseContext";

export const LoginForm: React.FC = () => {
  const { login } = useFirebase();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
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
        NeuroWeave Identity
      </h2>
      <p className="text-gray-400 mb-8 text-sm">
        Connect your account to access the multimodal network
      </p>

      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50 shadow-xl"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </>
          )}
        </button>
        
        <div className="flex items-center gap-4 py-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Secure Access</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>
      
      <p className="mt-12 text-[10px] text-gray-600 uppercase tracking-[0.3em]">Think. See. Create.</p>
    </div>
  );
};
