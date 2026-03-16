import React from "react";
import { LayoutDashboard, MessageSquare, Image as ImageIcon, Settings, LogOut, Cpu, Shield, Music, Camera } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useFirebase } from "../context/FirebaseContext";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { role, logout } = useFirebase();
  
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

      <nav className="flex-1 px-4 py-6 space-y-2">
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
