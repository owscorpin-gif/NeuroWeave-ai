import React, { useState } from "react";
import { ShieldCheck, User, Mail, ArrowRight } from "lucide-react";
import { useFirebase } from "../../context/FirebaseContext";

export const LoginForm: React.FC = () => {
  const { loginSimple } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSimpleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    
    setLoading(true);
    setError(null);
    try {
      await loginSimple(name, email);
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
        NeuroWeave Identity
      </h2>
      <p className="text-gray-400 mb-8 text-sm">
        Enter your details to access the multimodal network
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-left">
          {error}
        </div>
      )}

      <form onSubmit={handleSimpleLogin} className="space-y-4 text-left">
        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Weaver"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !name || !email}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:bg-accent/80 transition-all active:scale-95 disabled:opacity-50 shadow-xl mt-6 group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Initialize Session</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>
      
      <p className="mt-12 text-[10px] text-gray-600 uppercase tracking-[0.3em]">Think. See. Create.</p>
    </div>
  );
};
