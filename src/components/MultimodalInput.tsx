import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Image as ImageIcon, Monitor, X, Paperclip, Camera, AudioLines, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MultimodalInputProps {
  onSend: (text: string, files: File[]) => void;
  isStreaming: boolean;
  isLiveActive?: boolean;
  onToggleLive?: () => void;
  isVideoActive?: boolean;
  onToggleVideo?: () => void;
  videoStream?: MediaStream | null;
  isScreenActive?: boolean;
  onToggleScreen?: () => void;
  volume?: number;
  isLinguist?: boolean;
  isRecordingMessage?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({ 
  onSend, 
  isStreaming, 
  isLiveActive = false,
  onToggleLive,
  isVideoActive = false,
  onToggleVideo,
  videoStream,
  isScreenActive = false,
  onToggleScreen,
  volume = 0,
  isLinguist = false,
  isRecordingMessage = false,
  onStartRecording,
  onStopRecording
}) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string, type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Generate previews
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type
    }));
    setPreviews(newPreviews);

    // Cleanup
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const handleSend = () => {
    if ((text.trim() || files.length > 0) && !isStreaming) {
      onSend(text, files);
      setText("");
      setFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      // Reset input value so the same file can be selected again
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  return (
    <div className="relative max-w-4xl mx-auto w-full px-4 pb-8">
      <AnimatePresence>
        {(files.length > 0 || isVideoActive || isScreenActive) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide items-end"
          >
            {(isVideoActive || isScreenActive) && (
              <div className="relative group flex-shrink-0">
                <div className="w-48 aspect-video rounded-xl bg-black border border-accent/30 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn("w-full h-full object-cover", isVideoActive && "mirror")}
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-white font-mono uppercase tracking-wider">
                      {isScreenActive ? "Screen Stream" : "Live Vision"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {previews.map((preview, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group flex-shrink-0"
              >
                <div className="w-20 h-20 rounded-xl bg-surface border border-white/10 overflow-hidden shadow-lg">
                  {preview.type.startsWith("image/") ? (
                    <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                  ) : preview.type.startsWith("video/") ? (
                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                      <Monitor className="text-accent w-8 h-8 opacity-50" />
                      <div className="absolute bottom-1 right-1 px-1 bg-black/60 rounded text-[8px] text-white font-mono">VIDEO</div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <Paperclip className="text-gray-500 w-6 h-6" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform z-10"
                >
                  <X size={12} />
                </button>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-accent text-white text-[8px] flex items-center justify-center rounded-full font-bold shadow-md">
                  {i + 1}
                </div>
              </motion.div>
            ))}
            {files.length > 1 && (
              <button
                onClick={clearFiles}
                className="flex-shrink-0 mb-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-widest rounded-lg border border-red-500/20 transition-all"
              >
                Clear All
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "glass rounded-2xl p-2 flex items-end gap-2 shadow-2xl border-white/5 transition-all duration-500",
        isLiveActive && "border-accent/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
      )}>
        <div className="flex gap-1 p-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            title="Upload Media"
          >
            <ImageIcon size={20} />
          </button>
          <button
            onClick={onToggleVideo}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              isVideoActive ? "bg-accent/20 text-accent" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
            title={isVideoActive ? "Stop Camera" : "Start Camera"}
          >
            <Camera size={20} />
          </button>
          <button
            onClick={onToggleScreen}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              isScreenActive ? "bg-accent/20 text-accent" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
            title={isScreenActive ? "Stop Screen Share" : "Share Screen"}
          >
            <Monitor size={20} />
          </button>
          <button
            onClick={isRecordingMessage ? onStopRecording : onStartRecording}
            className={cn(
              "p-2.5 rounded-xl transition-all relative group",
              isRecordingMessage ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
            title={isRecordingMessage ? "Stop Recording" : "Record Voice Message"}
          >
            {isRecordingMessage ? (
              <StopCircle size={20} className="animate-pulse" />
            ) : (
              <Mic size={20} />
            )}
            {isRecordingMessage && (
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </button>
          <button
            onClick={onToggleLive}
            className={cn(
              "p-2.5 rounded-xl transition-all relative group",
              isLiveActive ? "bg-accent text-white glow-accent" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
            title={isLiveActive ? "Stop Voice Session" : "Start Voice Session"}
          >
            <AudioLines size={20} className={cn(isLiveActive && "animate-pulse")} />
            {isLiveActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
            )}
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*"
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isLiveActive ? (isLinguist ? "Translating..." : "Listening...") : (isRecordingMessage ? "Recording voice message..." : "Ask NeuroWeave anything...")}
          className="flex-1 bg-transparent border-none focus:ring-0 text-white py-3 px-2 resize-none max-h-40 min-h-[44px] placeholder:text-gray-500"
          rows={1}
          disabled={isRecordingMessage}
        />

        {(isLiveActive || isRecordingMessage) && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full pb-6 flex items-center gap-1.5 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 mb-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse mr-2",
              isRecordingMessage ? "bg-red-500" : "bg-accent"
            )} />
            <div className="flex items-center gap-1 h-6">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: (isLiveActive || isRecordingMessage) ? Math.max(4, (volume / 100) * 24 * (0.5 + Math.random() * 0.5)) : 4 
                  }}
                  className={cn(
                    "w-1 rounded-full transition-colors duration-300",
                    isRecordingMessage ? "bg-red-500/60" : "bg-accent/60"
                  )}
                />
              ))}
            </div>
            <span className="ml-2 text-[10px] font-mono text-white/60 uppercase tracking-widest">
              {isRecordingMessage ? "Recording" : "Live"}
            </span>
          </div>
        )}
        
        {isLiveActive && isLinguist && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+40px)] pb-4">
            <div className="px-3 py-1.5 bg-accent/20 backdrop-blur-md rounded-full border border-accent/30 text-[10px] text-accent font-mono uppercase tracking-widest">
              Live Translation Mode
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={(!text.trim() && files.length === 0) || isStreaming || (isLiveActive && !text.trim() && files.length === 0) || isRecordingMessage}
          className="p-3 rounded-xl bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-hover transition-all glow-accent"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
