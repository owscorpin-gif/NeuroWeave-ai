import React, { useState } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { updatePassword, auth } from "../firebase";
import { Shield, Lock, Smartphone, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Settings: React.FC = () => {
  const { user, role } = useFirebase();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(newPassword)) {
      setStatus({ type: "error", message: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await updatePassword(user, newPassword);
      setStatus({ type: "success", message: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "Failed to update password. You may need to re-authenticate." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-accent font-mono text-sm mb-4">
          <Shield size={16} />
          <span>SECURITY & AUTHENTICATION</span>
        </div>
        <h2 className="text-5xl font-serif font-bold text-white mb-4">
          Protect your <span className="italic text-accent">identity</span>.
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl">
          Manage your security settings, update your password, and enable multi-factor authentication.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Password Update */}
        <section className="glass rounded-3xl p-8 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Lock className="text-accent w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Update Password</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                    status.type === "success" 
                      ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" 
                      : "bg-red-400/10 text-red-400 border-red-400/20"
                  }`}
                >
                  {status.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{status.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !newPassword}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        {/* MFA Section */}
        <section className="glass rounded-3xl p-8 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Smartphone className="text-accent w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Multi-Factor Authentication</h3>
          </div>

          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Add an extra layer of security to your account by requiring a second verification step when you sign in.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">SMS Verification</p>
                <p className="text-gray-500 text-xs mt-1">Receive a code via text message</p>
              </div>
              <button className="px-4 py-2 bg-accent/10 text-accent text-xs font-bold rounded-lg border border-accent/20 hover:bg-accent/20 transition-colors">
                Enable
              </button>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between opacity-50">
              <div>
                <p className="text-white font-bold text-sm">Authenticator App</p>
                <p className="text-gray-500 text-xs mt-1">Use apps like Google Authenticator</p>
              </div>
              <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-1 rounded uppercase font-mono">Coming Soon</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded-2xl">
            <div className="flex gap-3">
              <Shield className="text-accent shrink-0" size={18} />
              <p className="text-xs text-gray-400 leading-relaxed">
                MFA is currently in preview. Enabling this will require a verified phone number on your next sign-in.
              </p>
            </div>
          </div>
        </section>

        {/* Session Info */}
        <section className="glass rounded-3xl p-8 border-white/5 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <Shield className="text-accent w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Active Session</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-400/10 text-emerald-400 rounded-full text-[10px] font-mono uppercase">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Secure
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Last Sign In</p>
              <p className="text-white text-sm font-bold">{user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : "Unknown"}</p>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Token Expiry</p>
              <p className="text-white text-sm font-bold">Auto-refresh enabled</p>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Account Role</p>
              <p className="text-white text-sm font-bold capitalize">{role || "User"}</p>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Auth Provider</p>
              <p className="text-white text-sm font-bold capitalize">{user?.providerData[0]?.providerId || "Email"}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
