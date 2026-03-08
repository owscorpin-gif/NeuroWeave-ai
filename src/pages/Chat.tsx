import React, { useState, useRef, useEffect } from "react";
import { Agent, Message, MessagePart } from "../types";
import { MultimodalInput } from "../components/MultimodalInput";
import { ResponseViewer } from "../components/ResponseViewer";
import { streamMultimodalResponse } from "../services/geminiService";
import { ChevronLeft, Info, MoreVertical, Trash2, Zap, PenTool, Compass, Mic } from "lucide-react";
import { useLiveSession } from "../hooks/useLiveSession";

const icons = {
  Zap,
  PenTool,
  Compass,
};

import { motion, AnimatePresence } from "motion/react";

interface ChatProps {
  agent: Agent | null;
  onBack: () => void;
}

export const Chat: React.FC<ChatProps> = ({ agent, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isConnected, isRecording, toggleSession, modelTranscript, isVideoActive, toggleVideo, videoStream, sendMedia } = useLiveSession(agent?.systemInstruction);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, modelTranscript]);

  // Sync live transcript to messages if needed, or just show it live
  useEffect(() => {
    if (modelTranscript && isConnected) {
      // Update the last message if it's from the model during a live session
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model' && last.id === 'live-session') {
          return [...prev.slice(0, -1), { ...last, parts: [{ text: modelTranscript }] }];
        }
        return [...prev, { id: 'live-session', role: 'model', parts: [{ text: modelTranscript }], timestamp: Date.now() }];
      });
    }
  }, [modelTranscript, isConnected]);

  if (!agent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
          <Info className="text-gray-500 w-10 h-10" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-white mb-2">No Agent Selected</h3>
        <p className="text-gray-400 mb-8 max-w-md">Please select an intelligence from the dashboard to start a conversation.</p>
        <button onClick={onBack} className="px-6 py-3 bg-accent text-white rounded-xl font-bold glow-accent">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleSend = async (text: string, files: File[]) => {
    const userParts: any[] = [];
    if (text) userParts.push({ text });

    // Process files to base64
    for (const file of files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });

      if (isConnected) {
        sendMedia(base64, file.type);
      }

      userParts.push({
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      });
    }

    if (isConnected && text) {
      // If live, we just send the text as a turn if possible, 
      // but Live API is mostly audio/video. 
      // For now, we'll just add it to messages so the user sees it.
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      parts: userParts,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    if (isConnected) {
      // If live session is active, we don't start a standard streaming response
      // unless the user explicitly wants to "send" a message to the history.
      // The Live API handles the "response" via audio/transcription.
      return;
    }

    setIsStreaming(true);

    try {
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        parts: [{ text: "" }],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMessage]);

      const stream = streamMultimodalResponse(
        "gemini-3-flash-preview",
        userParts,
        agent.systemInstruction
      );

      let fullText = "";
      for await (const chunk of stream) {
        fullText += chunk.text || "";
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          lastMessage.parts[0].text = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <header className="glass border-b border-white/5 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="text-accent font-bold">{agent.name[0]}</span>
            </div>
            <div>
              <h3 className="font-bold text-white leading-tight">{agent.name}</h3>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-accent font-mono uppercase tracking-wider">
                  {isConnected ? "Live Session Active" : `Active • ${agent.type}`}
                </p>
                {isConnected && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
            <Trash2 size={18} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 scroll-smooth">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-50">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                {React.createElement(icons[agent.icon as keyof typeof icons] || Info, { className: "text-gray-500 w-8 h-8" })}
              </div>
              <p className="text-gray-400 font-mono text-sm">Start a new session with {agent.name}</p>
            </div>
          )}
          {messages.map((msg) => (
            <ResponseViewer key={msg.id} message={msg} />
          ))}
        </div>
      </div>

      <MultimodalInput 
        onSend={handleSend} 
        isStreaming={isStreaming} 
        isLiveActive={isConnected}
        onToggleLive={toggleSession}
        isVideoActive={isVideoActive}
        onToggleVideo={toggleVideo}
        videoStream={videoStream}
      />
    </div>
  );
};
