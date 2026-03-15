import React, { useState, useEffect, useRef } from "react";
import { Mic, Play, Download, Loader2, Music, Volume2, Trash2, AlertCircle, Sparkles, Clock, Upload, FileAudio, Search, FileText } from "lucide-react";
import { generateSpeech, analyzeAudio } from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { sanitizeText, validateFile } from "../utils/security";
import Markdown from "react-markdown";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VOICES = [
  { id: 'Kore', name: 'Kore', description: 'Clear & Professional', gender: 'Female' },
  { id: 'Puck', name: 'Puck', description: 'Energetic & Bright', gender: 'Male' },
  { id: 'Charon', name: 'Charon', description: 'Deep & Authoritative', gender: 'Male' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Warm & Narrative', gender: 'Male' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Soft & Ethereal', gender: 'Female' },
];

export const AudioLab: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'synthesis' | 'analysis'>('synthesis');
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSpeakingAnalysis, setIsSpeakingAnalysis] = useState(false);
  const [analysisAudioUrl, setAnalysisAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);
  const analysisAudioRef = useRef<HTMLAudioElement>(null);

  const [generatedAudio, setGeneratedAudio] = useState<{ text: string, voice: string, url: string, id: string, timestamp: number }[]>(() => {
    const saved = localStorage.getItem("neuroweave_audio_history");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("neuroweave_audio_history", JSON.stringify(generatedAudio));
  }, [generatedAudio]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setError(null);
    setIsGenerating(true);

    try {
      const sanitizedText = sanitizeText(text);
      const base64Audio = await generateSpeech(sanitizedText, selectedVoice);
      
      if (base64Audio) {
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        setGeneratedAudio(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          text: sanitizedText,
          voice: selectedVoice,
          url: audioUrl,
          timestamp: Date.now()
        }, ...prev]);
        setText("");
      }
    } catch (err: any) {
      console.error("Audio generation error:", err);
      setError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, 10, ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"]);
      if (!validation.valid) {
        setError(validation.error || "Invalid file type");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setError(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(selectedFile);
      });

      const result = await analyzeAudio(base64, selectedFile.type);
      setAnalysisResult(result || "No analysis result returned.");
    } catch (err: any) {
      console.error("Audio analysis error:", err);
      setError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHistory = () => {
    setGeneratedAudio([]);
    setShowClearConfirm(false);
  };

  const handleSpeakAnalysis = async () => {
    if (!analysisResult) return;
    setError(null);
    setIsSpeakingAnalysis(true);

    try {
      // Strip markdown for better TTS
      const plainText = analysisResult.replace(/[#*`_~]/g, '').slice(0, 5000);
      const base64Audio = await generateSpeech(plainText, selectedVoice);
      
      if (base64Audio) {
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        setAnalysisAudioUrl(audioUrl);
        // Play it automatically after state update
        setTimeout(() => {
          if (analysisAudioRef.current) {
            analysisAudioRef.current.play();
          }
        }, 100);
      }
    } catch (err: any) {
      console.error("Speak analysis error:", err);
      setError(err);
    } finally {
      setIsSpeakingAnalysis(false);
    }
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
      };
      reader.readAsText(file);
    }
  };

  const downloadAudio = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.slice(0, 20)}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-accent font-mono text-sm mb-4">
          <Music size={16} />
          <span>AUDIO LAB</span>
        </div>
        <h2 className="text-5xl font-serif font-bold text-white mb-4">
          Vocal <span className="italic text-accent">Synthesis</span> & <span className="italic text-accent">Analysis</span>.
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl">
          Synthesize high-fidelity speech or analyze existing audio files with neural intelligence.
        </p>

        <div className="flex items-center gap-4 mt-8 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
          <button
            onClick={() => setActiveMode('synthesis')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-sm font-bold",
              activeMode === 'synthesis' ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"
            )}
          >
            <Mic size={16} />
            SYNTHESIS
          </button>
          <button
            onClick={() => setActiveMode('analysis')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-sm font-bold",
              activeMode === 'analysis' ? "bg-accent text-white shadow-xl shadow-accent/20" : "text-gray-500 hover:text-white"
            )}
          >
            <Search size={16} />
            ANALYSIS
          </button>
        </div>
      </header>

      <div className="max-w-4xl">
        <AnimatePresence mode="wait">
          {activeMode === 'synthesis' ? (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8 mb-12 border-accent/20"
            >
              {error && (
                <div className="mb-6">
                  <ErrorDisplay error={error} onRetry={handleGenerate} />
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-gray-500 font-mono text-[10px] uppercase tracking-widest">
                    Select Voice Persona
                  </label>
                  <button 
                    onClick={() => textFileInputRef.current?.click()}
                    className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
                  >
                    <Upload size={10} />
                    Upload Text File
                  </button>
                  <input 
                    type="file" 
                    ref={textFileInputRef} 
                    onChange={handleTextFileUpload} 
                    accept=".txt,.md" 
                    className="hidden" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all text-left group",
                        selectedVoice === voice.id
                          ? "bg-accent/10 border-accent text-white shadow-lg shadow-accent/5"
                          : "bg-white/5 border-white/5 text-gray-400 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Volume2 size={16} className={selectedVoice === voice.id ? "text-accent" : "text-gray-600"} />
                        <span className="text-[8px] font-mono uppercase opacity-50">{voice.gender}</span>
                      </div>
                      <div className="font-bold text-sm mb-1">{voice.name}</div>
                      <div className="text-[10px] leading-tight opacity-60">{voice.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to synthesize..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-all resize-none"
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-gray-600">
                  {text.length} characters
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Sparkles size={14} className="text-accent" />
                  <span>Neural TTS Engine Active</span>
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className="flex items-center gap-3 px-8 py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={20} />
                      <span>Generate Speech</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8 mb-12 border-accent/20"
            >
              {error && (
                <div className="mb-6">
                  <ErrorDisplay error={error} onRetry={handleAnalyze} />
                </div>
              )}

              <div className="mb-8">
                <label className="block text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-4">
                  Upload Audio for Analysis
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all",
                    selectedFile ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/20 bg-white/5"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="audio/*" 
                    className="hidden" 
                  />
                  {selectedFile ? (
                    <>
                      <FileAudio size={48} className="text-accent mb-4" />
                      <span className="text-white font-bold">{selectedFile.name}</span>
                      <span className="text-gray-500 text-xs mt-2">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </>
                  ) : (
                    <>
                      <Upload size={48} className="text-gray-600 mb-4" />
                      <span className="text-gray-400 font-medium">Click or drag to upload audio</span>
                      <span className="text-gray-600 text-xs mt-2">Supports MP3, WAV, OGG (Max 10MB)</span>
                    </>
                  )}
                </div>
              </div>

              {analysisResult && (
                <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-accent font-mono text-[10px] uppercase tracking-widest">
                      <FileText size={14} />
                      <span>Analysis Result</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {analysisAudioUrl && (
                        <audio ref={analysisAudioRef} src={analysisAudioUrl} className="hidden" />
                      )}
                      <button
                        onClick={handleSpeakAnalysis}
                        disabled={isSpeakingAnalysis}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                      >
                        {isSpeakingAnalysis ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Volume2 size={12} />
                        )}
                        {isSpeakingAnalysis ? "SYNTHESIZING..." : "SPEAK RESULT"}
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                    <Markdown>{analysisResult}</Markdown>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedFile}
                  className="flex items-center gap-3 px-8 py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Analyzing Audio...</span>
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      <span>Analyze Audio</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-serif font-bold text-white">Vocal Archives</h3>
          {generatedAudio.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear Archives
              </button>

              <AnimatePresence>
                {showClearConfirm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 bottom-full mb-4 w-64 glass p-4 rounded-2xl border-red-500/30 z-50 shadow-2xl"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertCircle size={16} className="text-red-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white mb-1">Clear all archives?</div>
                        <div className="text-[10px] text-gray-400 leading-relaxed">
                          This will permanently delete all synthesized clips from your local history.
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearHistory}
                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-xl transition-colors"
                      >
                        YES, CLEAR ALL
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-bold rounded-xl transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {generatedAudio.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-6 border-white/5 flex flex-col md:flex-row items-center gap-6"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Play className="text-accent fill-accent" size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-accent uppercase tracking-widest">
                      {item.voice}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono opacity-40">ID: {item.id}</span>
                  </div>
                  <p className="text-white text-sm truncate italic">"{item.text}"</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <audio controls src={item.url} className="h-8 w-full md:w-48 opacity-60 hover:opacity-100 transition-opacity" />
                  <button
                    onClick={() => downloadAudio(item.url, item.text)}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                    title="Download MP3"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {generatedAudio.length === 0 && !isGenerating && (
            <div className="text-center py-20 glass rounded-3xl border-dashed border-white/5">
              <Volume2 size={48} className="text-gray-800 mx-auto mb-4" />
              <p className="text-gray-600 font-serif italic">No vocalizations in the archive yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
