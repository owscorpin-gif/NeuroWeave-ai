import React, { useEffect, useState } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { Shield, Users, MessageSquare, Activity, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface Stats {
  users: number;
  conversations: number;
  systemStatus: string;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useFirebase();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch admin stats");
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-accent font-mono text-sm mb-4">
          <Shield size={16} />
          <span>ADMIN COMMAND CENTER</span>
        </div>
        <h2 className="text-5xl font-serif font-bold text-white mb-4">
          System <span className="italic text-accent">Overview</span>.
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl">
          Monitor platform metrics, manage user roles, and oversee multimodal agent activity.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="glass rounded-3xl p-8 border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Users className="text-blue-400 w-6 h-6" />
            </div>
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Total Users</h3>
          </div>
          <p className="text-4xl font-bold text-white">{stats?.users || 0}</p>
        </div>

        <div className="glass rounded-3xl p-8 border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <MessageSquare className="text-purple-400 w-6 h-6" />
            </div>
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Conversations</h3>
          </div>
          <p className="text-4xl font-bold text-white">{stats?.conversations || 0}</p>
        </div>

        <div className="glass rounded-3xl p-8 border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Activity className="text-emerald-400 w-6 h-6" />
            </div>
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">System Health</h3>
          </div>
          <p className="text-4xl font-bold text-white capitalize">{stats?.systemStatus || "Unknown"}</p>
        </div>
      </div>

      <section className="glass rounded-3xl p-8 border-white/5">
        <h3 className="text-xl font-bold text-white mb-8">Role Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs font-mono uppercase tracking-widest">
                <th className="pb-4 font-medium">User</th>
                <th className="pb-4 font-medium">Current Role</th>
                <th className="pb-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5">
                <td className="py-6 text-white font-medium">Platform Administrator</td>
                <td className="py-6">
                  <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-mono uppercase">Admin</span>
                </td>
                <td className="py-6">
                  <button className="text-gray-500 hover:text-white transition-colors">Edit Permissions</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
