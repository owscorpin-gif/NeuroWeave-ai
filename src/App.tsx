import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { fetchCsrfToken } from "./utils/csrf";
import { Dashboard } from "./pages/Dashboard";
import { Chat } from "./pages/Chat";
import { MediaStudio } from "./pages/MediaStudio";
import { AudioLab } from "./pages/AudioLab";
import { GalleryGenerator } from "./components/GalleryGenerator";
import { Settings } from "./pages/Settings";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Agent } from "./types";
import { AnimatePresence, motion } from "motion/react";
import { useFirebase } from "./context/FirebaseContext";
import { LoginForm } from "./components/Auth/LoginForm";
import { Cpu } from "lucide-react";

export default function App() {
  const { user, loading } = useFirebase();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchCsrfToken();
  }, []);

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
      <div className="h-screen bg-bg flex flex-col items-center justify-center p-8 data-grid overflow-y-auto">
        <LoginForm />
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
              <Chat 
                agent={selectedAgent} 
                onBack={() => setActiveTab("dashboard")} 
                onAgentSelect={handleAgentSelect}
              />
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

          {activeTab === "audio" && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <AudioLab />
            </motion.div>
          )}

          {activeTab === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <GalleryGenerator />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <Settings />
            </motion.div>
          )}

          {activeTab === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <AdminDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
