import React from "react";
import { Zap, PenTool, Compass, ArrowRight, Monitor, Cpu } from "lucide-react";
import { Agent, AgentType } from "../types";
import { motion } from "motion/react";

const icons = {
  Zap,
  PenTool,
  Compass,
  Monitor,
  Cpu,
};

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect }) => {
  const Icon = icons[agent.icon as keyof typeof icons] || Zap;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative glass rounded-3xl p-8 cursor-pointer overflow-hidden transition-all duration-500 hover:border-accent/50 hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)]"
      onClick={() => onSelect(agent)}
    >
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
        <Icon size={120} />
      </div>

      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-500">
          <Icon className="text-accent w-7 h-7" />
        </div>

        <div className="mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-1 block">
            {agent.tagline}
          </span>
          <h3 className="text-2xl font-serif font-bold text-white group-hover:text-accent transition-colors duration-300">{agent.name}</h3>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-[240px]">
          {agent.description}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/0 group-hover:bg-accent/10 text-accent font-semibold text-sm transition-all duration-300 border border-transparent group-hover:border-accent/20">
          <span>Launch Agent</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};
