import React, { useState } from "react";
import { Volume2, AlertCircle, Download, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AudioPlayerProps {
  src: string;
  mimeType: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, mimeType }) => {
  const [error, setError] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `audio-response-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
        <AlertCircle size={18} />
        <span>Failed to load audio response. Please try again.</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 glass rounded-2xl border border-white/10 flex flex-col gap-3 max-w-xl shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <Volume2 size={16} className="text-accent" />
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">AI Vocal Response</span>
        </div>
        <button 
          onClick={handleDownload}
          className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
          title="Download Audio"
        >
          <Download size={14} />
        </button>
      </div>
      
      <div className="relative group">
        <audio 
          src={src} 
          controls 
          className="w-full h-10 custom-audio-player"
          onError={() => setError(true)}
        />
        <style>{`
          .custom-audio-player::-webkit-media-controls-panel {
            background-color: rgba(255, 255, 255, 0.05);
          }
          .custom-audio-player::-webkit-media-controls-current-time-display,
          .custom-audio-player::-webkit-media-controls-time-remaining-display {
            color: #9ca3af;
            font-family: monospace;
            font-size: 10px;
          }
        `}</style>
      </div>
    </motion.div>
  );
};
