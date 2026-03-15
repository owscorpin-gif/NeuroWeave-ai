import React from "react";
import { useFirebase } from "../context/FirebaseContext";
import { Shield, User, Mail, LogOut, Info } from "lucide-react";

export const Settings: React.FC = () => {
  const { user, role, logout } = useFirebase();

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-accent font-mono text-sm mb-4">
          <Shield size={16} />
          <span>IDENTITY & SESSION</span>
        </div>
        <h2 className="text-5xl font-serif font-bold text-white mb-4">
          Manage your <span className="italic text-accent">presence</span>.
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl">
          View your current session details and manage your identity within the NeuroWeave network.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Info */}
        <section className="glass rounded-3xl p-8 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <User className="text-accent w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Current Identity</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <img 
                src={user?.photoURL} 
                alt={user?.displayName} 
                className="w-16 h-16 rounded-xl border-2 border-accent/20"
              />
              <div>
                <p className="text-white font-bold text-lg">{user?.displayName}</p>
                <p className="text-gray-500 text-sm">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Role</p>
                <p className="text-white font-bold capitalize">{role || "User"}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Status</p>
                <p className="text-emerald-400 font-bold">Active</p>
              </div>
            </div>
          </div>
        </section>

        {/* Session Management */}
        <section className="glass rounded-3xl p-8 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Info className="text-accent w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Session Control</h3>
          </div>

          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Your session is stored locally. Signing out will clear your identity from this device.
          </p>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-red-500/10 text-red-400 font-bold rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
          >
            <LogOut size={20} />
            <span>Terminate Session</span>
          </button>
        </section>

        {/* Network Info */}
        <section className="glass rounded-3xl p-8 border-white/5 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <Shield className="text-accent w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Network Status</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Connection</p>
              <p className="text-white text-sm font-bold">Encrypted (Local)</p>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Encryption</p>
              <p className="text-white text-sm font-bold">AES-256 (Simulated)</p>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Identity ID</p>
              <p className="text-white text-sm font-bold truncate">{user?.uid}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
