import React from "react";
import { AGENTS } from "../constants";
import { AgentCard } from "../components/AgentCard";
import { Agent } from "../types";
import { motion } from "motion/react";
import { Sparkles, Zap, Compass, PenTool } from "lucide-react";

interface DashboardProps {
  onAgentSelect: (agent: Agent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onAgentSelect }) => {
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
          <div className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group">
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
          </div>

          <div className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group">
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
          </div>

          <div className="glass p-8 rounded-3xl border-white/5 hover:border-accent/30 transition-colors group md:col-span-2">
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
          </div>
        </div>
      </section>

      <section className="mt-20 mb-20">
        <div className="glass rounded-[2rem] p-12 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
          
          <div className="flex-1 relative z-10">
            <h3 className="text-3xl font-serif font-bold text-white mb-4">Multi-Agent Collaboration</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Enable multiple agents to work together on complex tasks. Muse can write the story while Aura narrates and Navigator builds the interface.
            </p>
            <button className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors">
              Explore Workflows
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 relative z-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-accent/20 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
