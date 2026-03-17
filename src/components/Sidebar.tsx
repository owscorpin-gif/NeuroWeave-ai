import React, { useEffect, useState } from "react";
import { LayoutDashboard, MessageSquare, Image as ImageIcon, Settings, LogOut, Cpu, Shield, Music, Camera, History, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useFirebase } from "../context/FirebaseContext";
import { getUserConversations, deleteConversation, Conversation } from "../services/chatService";
import { AGENTS } from "../constants";
import { Agent } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onConversationSelect?: (convId: string, agent: Agent) => void;
  activeConversationId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onConversationSelect, activeConversationId }) => {
  const { user, role, logout } = useFirebase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  useEffect(() => {
    if (user) {
      try {
        const unsubscribe = getUserConversations(user.uid, (convs) => {
          setConversations(convs);
        });
        return () => unsubscribe();
      } catch (err) {
        console.error("Failed to attach conversation listener:", err);
      }
    }
  }, [user]);

  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "chat", icon: MessageSquare, label: "Neural Chat" },
    { id: "studio", icon: ImageIcon, label: "Media Studio" },
    { id: "audio", icon: Music, label: "Audio Lab" },
    { id: "gallery", icon: Camera, label: "Gallery" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  if (role === 'admin') {
    menuItems.push({ id: "admin", icon: Shield, label: "Admin" });
  }

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation?")) {
      await deleteConversation(id);
    }
  };

  return (
    <div className="w-64 h-screen glass border-r border-white/5 flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center glow-accent">
          <Cpu className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-serif font-bold tracking-tight">NeuroWeave</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold">Think. See. Create.</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Navigation</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id
                  ? "bg-accent/10 text-accent"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-accent" : "text-gray-400 group-hover:text-white")} />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              )}
            </button>
          ))}
        </div>

        {conversations.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 px-4 mb-2">
              <History size={12} className="text-gray-500" />
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Recent History</p>
            </div>
            <div className="space-y-1">
              {conversations.map((conv) => {
                const agent = AGENTS.find(a => a.id === conv.agentId);
                return (
                  <button
                    key={conv.id}
                    onClick={() => onConversationSelect && agent && onConversationSelect(conv.id, agent)}
                    className={cn(
                      "w-full flex flex-col items-start gap-1 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                      activeConversationId === conv.id
                        ? "bg-accent/5 text-white border border-accent/20"
                        : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold truncate pr-6">{conv.title}</span>
                      <button 
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity absolute right-2"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <span className="text-[10px] opacity-50 truncate w-full">{conv.lastMessage || "Empty conversation"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};
