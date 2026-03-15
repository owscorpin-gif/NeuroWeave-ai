import React, { useState, useRef, useEffect } from "react";
import { Agent, Message, MessagePart } from "../types";
import { AGENTS } from "../constants";
import { MultimodalInput } from "../components/MultimodalInput";
import { ResponseViewer } from "../components/ResponseViewer";
import { streamMultimodalResponse } from "../services/geminiService";
import { ChevronLeft, Info, MoreVertical, Trash2, Zap, PenTool, Compass, Mic, Monitor, AlertCircle, MessageSquare } from "lucide-react";
import { useLiveSession } from "../hooks/useLiveSession";
import { sanitizeText, validateFile, scanFileForMalware } from "../utils/security";
import { uploadFileSecurely } from "../services/storageService";
import { ErrorDisplay } from "../components/ErrorDisplay";

const icons = {
  Zap,
  PenTool,
  Compass,
  Monitor,
};

import { motion, AnimatePresence } from "motion/react";

interface ChatProps {
  agent: Agent | null;
  onBack: () => void;
  onAgentSelect: (agent: Agent) => void;
}

export const Chat: React.FC<ChatProps> = ({ agent, onBack, onAgentSelect }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { 
    isConnected, 
    isRecording, 
    toggleSession, 
    transcript, 
    modelTranscript, 
    isVideoActive, 
    toggleVideo, 
    videoStream, 
    isScreenActive, 
    toggleScreen, 
    screenStream, 
    sendMedia,
    volume,
    error: liveError,
    isRecordingMessage,
    startVoiceMessage,
    stopVoiceMessage,
    clearError: clearLiveError
  } = useLiveSession(agent?.systemInstruction);

  const isLinguist = agent?.id === 'global-translator';
  const isNexus = agent?.id === 'nexus-orchestrator';
  const isHighReasoning = agent?.id === 'live-agent' || agent?.id === 'ui-navigator' || isNexus;

  useEffect(() => {
    if (liveError) {
      setError(liveError);
      // Clear it from the hook so it doesn't keep triggering
      clearLiveError();
    }
  }, [liveError, clearLiveError]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, modelTranscript, transcript]);

  // Sync live user transcript to messages
  useEffect(() => {
    if (transcript && isConnected) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'user' && last.id === 'live-user-session') {
          return [...prev.slice(0, -1), { ...last, parts: [{ text: sanitizeText(transcript) }] }];
        }
        return [...prev, { id: 'live-user-session', role: 'user', parts: [{ text: sanitizeText(transcript) }], timestamp: Date.now() }];
      });
    }
  }, [transcript, isConnected]);

  // Sync live model transcript to messages
  useEffect(() => {
    if (modelTranscript && isConnected) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model' && last.id === 'live-model-session') {
          return [...prev.slice(0, -1), { ...last, parts: [{ text: modelTranscript }] }];
        }
        return [...prev, { id: 'live-model-session', role: 'model', parts: [{ text: modelTranscript }], timestamp: Date.now() }];
      });
    }
  }, [modelTranscript, isConnected]);

  if (!agent) {
    return (
      <div className="h-full overflow-y-auto p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <MessageSquare className="text-accent w-10 h-10" />
            </div>
            <h3 className="text-4xl font-serif font-bold text-white mb-4">Neural Chat</h3>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Select an intelligence to begin a multimodal conversation.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => onAgentSelect(a)}
                className="glass p-6 rounded-2xl border-white/5 hover:border-accent/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {React.createElement(icons[a.icon as keyof typeof icons] || Info, { className: "text-accent w-6 h-6" })}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{a.name}</h4>
                    <p className="text-[10px] text-accent font-mono uppercase tracking-widest">{a.type}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{a.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (text: string, files: File[]) => {
    setError(null);
    
    // 1. Sanitize text input
    const sanitizedText = sanitizeText(text);
    
    const userParts: any[] = [];
    if (sanitizedText) userParts.push({ text: sanitizedText });

    // 2. Validate and process files
    for (const file of files) {
      const uploadResult = await uploadFileSecurely(file, "chat_attachments");
      
      if (uploadResult.error) {
        setError(uploadResult.error);
        return;
      }

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

    if (isConnected && sanitizedText) {
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
      return;
    }

    setIsStreaming(true);

    const hasImages = userParts.some(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
    const effectiveModel = (isHighReasoning || hasImages) ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

    try {
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        parts: [{ text: "" }],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMessage]);

      const stream = streamMultimodalResponse(
        effectiveModel,
        userParts,
        agent.systemInstruction
      );

      let fullText = "";
      for await (const chunk of stream) {
        if (!chunk.text && chunk.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error("RESPONSE_BLOCKED_SAFETY");
        }
        fullText += chunk.text || "";
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          lastMessage.parts[0].text = fullText;
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Streaming error:", error);
      setError(error);
      
      // Remove the empty model message if it failed immediately
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model' && last.parts[0].text === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStopRecording = () => {
    const file = stopVoiceMessage();
    if (file) {
      handleSend("", [file]);
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
              <h3 className="font-bold text-white leading-tight flex items-center gap-2">
                {agent.name}
                {(isHighReasoning || messages.some(m => m.role === 'user' && m.parts.some(p => p.inlineData && p.inlineData.mimeType.startsWith('image/')))) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-[10px] text-accent font-mono uppercase tracking-wider animate-pulse">
                    <Zap size={10} />
                    Deep Reasoning Active
                  </span>
                )}
              </h3>
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

      {error && (
        <div className="p-4 md:px-8 bg-bg">
          <ErrorDisplay 
            error={error} 
            onRetry={() => {
              const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
              if (lastUserMsg) {
                const text = lastUserMsg.parts.find(p => p.text)?.text || "";
                handleSend(text, []);
              }
            }} 
          />
        </div>
      )}

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
          {isStreaming && isNexus && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 bg-accent/5 rounded-2xl border border-accent/10"
            >
              <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
              <span className="text-xs font-mono text-accent uppercase tracking-widest">Nexus is orchestrating sub-agents...</span>
            </motion.div>
          )}
        </div>
      </div>

      <MultimodalInput 
        onSend={handleSend} 
        isStreaming={isStreaming} 
        isLiveActive={isConnected}
        onToggleLive={toggleSession}
        isVideoActive={isVideoActive}
        onToggleVideo={toggleVideo}
        videoStream={isScreenActive ? screenStream : videoStream}
        isScreenActive={isScreenActive}
        onToggleScreen={toggleScreen}
        volume={volume}
        isLinguist={isLinguist}
        isRecordingMessage={isRecordingMessage}
        onStartRecording={startVoiceMessage}
        onStopRecording={handleStopRecording}
      />
    </div>
  );
};
