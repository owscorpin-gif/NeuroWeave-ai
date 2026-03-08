import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Chat } from "./pages/Chat";
import { MediaStudio } from "./pages/MediaStudio";
import { Agent } from "./types";
import { AnimatePresence, motion } from "motion/react";
import { useFirebase } from "./context/FirebaseContext";
import { signIn } from "./firebase";
import { LogIn, Cpu } from "lucide-react";

export default function App() {
  const { user, loading } = useFirebase();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setActiveTab("chat");
  };

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-accent rounded-xl animate-pulse glow-accent" />
          <p className="text-accent font-mono text-sm animate-pulse">INITIALIZING NEUROWEAVE...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center p-8 data-grid">
        <div className="max-w-md w-full glass rounded-[2.5rem] p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
          
          <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-8 glow-accent">
            <Cpu className="text-white w-10 h-10" />
          </div>

          <h1 className="text-4xl font-serif font-bold text-white mb-4">NeuroWeave AI</h1>
          <p className="text-gray-400 mb-12 leading-relaxed">
            Welcome to the next generation of multimodal intelligence. Sign in to start weaving your reality.
          </p>

          <button
            onClick={() => signIn()}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
          >
            <LogIn size={20} />
            <span>Sign in with Google</span>
          </button>
          
          <p className="mt-8 text-[10px] text-gray-600 uppercase tracking-[0.3em]">Think. See. Create.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden data-grid">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <Dashboard onAgentSelect={handleAgentSelect} />
            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <Chat agent={selectedAgent} onBack={() => setActiveTab("dashboard")} />
            </motion.div>
          )}

          {activeTab === "studio" && (
            <motion.div
              key="studio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <MediaStudio />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
