import React, { useState } from "react";
import { User, Mail, ShieldCheck, ArrowRight } from "lucide-react";
import { useFirebase } from "../../context/FirebaseContext";

export const LoginForm: React.FC = () => {
  const { login } = useFirebase();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    
    setLoading(true);
    // Simulate a small delay for effect
    setTimeout(() => {
      login(name, email);
      setLoading(false);
    }, 800);
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

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-50 glow-accent"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Initialize Session</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
      
      <p className="mt-12 text-[10px] text-gray-600 uppercase tracking-[0.3em]">Think. See. Create.</p>
    </div>
  );
};
