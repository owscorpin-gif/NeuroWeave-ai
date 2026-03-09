import React, { useState } from "react";
import { 
  signInWithGoogle, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  auth
} from "../../firebase";
import { LogIn, Mail, Lock, UserPlus, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const LoginForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp && !validatePassword(password)) {
      setError("Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during Google sign in.");
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
        {isSignUp ? "Create Account" : "Welcome Back"}
      </h2>
      <p className="text-gray-400 mb-8 text-sm">
        {isSignUp ? "Join the NeuroWeave network" : "Continue your multimodal journey"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
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

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
            required
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20"
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-50 glow-accent"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>{isSignUp ? "Sign Up" : "Sign In"}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-500 text-xs font-mono">OR</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
      >
        <LogIn size={20} />
        <span>Continue with Google</span>
      </button>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-8 text-sm text-gray-400 hover:text-accent transition-colors flex items-center justify-center gap-2 mx-auto"
      >
        {isSignUp ? (
          <>
            <LogIn size={16} />
            <span>Already have an account? Sign In</span>
          </>
        ) : (
          <>
            <UserPlus size={16} />
            <span>New here? Create an account</span>
          </>
        )}
      </button>
      
      <p className="mt-8 text-[10px] text-gray-600 uppercase tracking-[0.3em]">Think. See. Create.</p>
    </div>
  );
};
