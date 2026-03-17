import React, { useState, useEffect } from "react";
import { AGENTS } from "../constants";
import { AgentCard } from "../components/AgentCard";
import { Agent } from "../types";
import { motion } from "motion/react";
import { Sparkles, Zap, Compass, PenTool, Monitor, Code, Terminal } from "lucide-react";
import { useFirebase } from "../context/FirebaseContext";

interface DashboardProps {
  onAgentSelect: (agent: Agent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onAgentSelect }) => {
  const { user, role } = useFirebase();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (role === 'developer' || role === 'admin') {
        try {
          const response = await fetch("/api/dev/logs");
          if (response.ok) {
            const data = await response.json();
            setLogs(data.logs);
          }
        } catch (err) {
          console.error("Failed to fetch dev logs");
        }
      }
    };
    fetchLogs();
  }, [role, user]);

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
      <header className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-accent font-mono text-sm mb-4"
        >
          <Sparkles size={16} />
          <span>WELCOME TO THE FUTURE OF INTERACTION</span>
          {role && (
            <span className="ml-2 px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-mono uppercase border border-accent/20">
              {role}
            </span>
          )}
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl lg:text-6xl font-serif font-bold text-white mb-4"
        >
          Choose your <span className="italic text-accent">intelligence</span>.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-lg max-w-2xl"
        >
          Select a specialized AI agent to assist you with real-time voice, creative storytelling, or visual interface navigation.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {AGENTS.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <AgentCard agent={agent} onSelect={onAgentSelect} />
          </motion.div>
        ))}
      </div>

      <section className="mt-20">
        <h3 className="text-2xl font-serif font-bold text-white mb-8">Sample Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => {
              const agent = AGENTS.find(a => a.id === 'live-agent');
              if (agent) onAgentSelect(agent);
            }}
            className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group text-left w-full"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="text-accent w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Homework Analysis</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Show a math problem to the camera. NeuroWeave identifies the equation and explains the solution step-by-step.
            </p>
            <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-accent/80">
              {"[ ax^2 + bx + c = 0 ] → [ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} ]"}
            </div>
          </button>

          <button 
            onClick={() => {
              const agent = AGENTS.find(a => a.id === 'global-translator');
              if (agent) onAgentSelect(agent);
            }}
            className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group text-left w-full"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Compass className="text-accent w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Real-Time Translation</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Speak in any language. Linguist detects the source and provides instant voice-to-voice translation.
            </p>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-gray-500">Hindi</span>
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-accent">English</span>
            </div>
          </button>

          <button 
            onClick={() => {
              const agent = AGENTS.find(a => a.id === 'ui-navigator');
              if (agent) onAgentSelect(agent);
            }}
            className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group text-left w-full"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Monitor className="text-accent w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Visual UI Navigation</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Share your screen and let Voyager guide you. It identifies UI elements and suggests the best path to complete your task.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-white/5 rounded border border-white/10" />
              <div className="w-8 h-8 bg-accent/20 rounded border border-accent/40 animate-pulse" />
            </div>
          </button>

          <button 
            onClick={() => {
              const agent = AGENTS.find(a => a.id === 'creative-storyteller');
              if (agent) onAgentSelect(agent);
            }}
            className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group md:col-span-2 text-left w-full"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <PenTool className="text-accent w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Creative Storytelling</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Generate interleaved multimodal content. Muse creates stories with text, generated illustrations, and voice narration in one fluid stream.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] text-gray-500 font-mono">TEXT</div>
              <div className="h-20 bg-accent/10 rounded-lg border border-accent/20 flex items-center justify-center text-[10px] text-accent font-mono">IMAGE</div>
              <div className="h-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] text-gray-500 font-mono">AUDIO</div>
            </div>
          </button>
        </div>
      </section>

      <section className="mt-20 mb-20">
        <div className="glass rounded-[2rem] p-12 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
          
          <div className="flex-1 relative z-10">
            <h3 className="text-3xl font-serif font-bold text-white mb-4">Multi-Agent Collaboration</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Enable multiple agents to work together on complex tasks. Nexus can orchestrate Muse for visuals, Voyager for UI analysis, and Linguist for global reach.
            </p>
            <button 
              onClick={() => {
                const agent = AGENTS.find(a => a.id === 'nexus-orchestrator');
                if (agent) onAgentSelect(agent);
              }}
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Launch Nexus Orchestrator
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 relative z-10">
            {[
              { id: 'live-agent', icon: Zap },
              { id: 'creative-storyteller', icon: PenTool },
              { id: 'ui-navigator', icon: Monitor },
              { id: 'global-translator', icon: Compass }
            ].map((item, i) => (
              <button 
                key={i} 
                onClick={() => {
                  const agent = AGENTS.find(a => a.id === item.id);
                  if (agent) onAgentSelect(agent);
                }}
                className="aspect-square bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center group hover:border-accent/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <item.icon className="text-accent w-6 h-6" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
      
      {(role === 'developer' || role === 'admin') && (
        <section className="mt-20 mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Code className="text-accent w-5 h-5" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white">Developer Terminal</h3>
          </div>
          
          <div className="glass rounded-3xl p-8 border-white/5 bg-black/40 font-mono text-sm">
            <div className="flex items-center gap-2 mb-4 text-gray-500 border-b border-white/5 pb-4">
              <Terminal size={14} />
              <span className="text-[10px] uppercase tracking-widest">System Logs</span>
            </div>
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-accent/40">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-gray-300">{log}</span>
                </div>
              ))}
              <div className="flex gap-4 animate-pulse">
                <span className="text-accent/40">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-accent">_</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
