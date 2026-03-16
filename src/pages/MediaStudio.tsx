import React, { useState, useRef, useEffect } from "react";
import { generateVideo, generateImage, getPromptSuggestions } from "../services/geminiService";
import { Sparkles, Video, Image as ImageIcon, Wand2, Loader2, Download, AlertCircle, Upload, X, Trash2, Layout, Scissors, Play, Pause, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sanitizeText, validateFile, scanFileForMalware } from "../utils/security";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ErrorDisplay } from "../components/ErrorDisplay";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MediaStudio: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("16:9");
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video' | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<any>(null);
  const [generatedMedia, setGeneratedMedia] = useState<{ type: 'image' | 'video', url: string }[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ file: File, url: string } | null>(null);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 10]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimmed, setIsTrimmed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const videoFile = files.find(f => f.type.startsWith('video/'));
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      
      if (videoFile) await processVideo(videoFile);
      for (const file of imageFiles) {
        await processFile(file);
      }
    }
  };

  const processVideo = async (file: File) => {
    const validation = validateFile(file, 50, ["video/mp4", "video/quicktime", "video/webm"]);
    if (!validation.valid) {
      setError(validation.error || "Invalid video file");
      return;
    }

    // Add malware scanning for production safety
    const scan = await scanFileForMalware(file);
    if (!scan.safe) {
      setError(scan.error || "Security scan failed for this file.");
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedVideo({ file, url });
    setMode('video');
  };

  const processFile = async (file: File) => {
    if (selectedImages.length >= 3) {
      setError("Maximum 3 reference images allowed.");
      return;
    }
    const validation = validateFile(file, 5, ["image/jpeg", "image/png", "image/webp"]);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    // Add malware scanning for production safety
    const scan = await scanFileForMalware(file);
    if (!scan.safe) {
      setError(scan.error || "Security scan failed for this file.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImages(prev => [
        ...prev, 
        { file, preview: reader.result as string }
      ].slice(0, 3));
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        await processFile(file);
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processVideo(file);
  };

  const removeVideo = () => {
    if (selectedVideo) URL.revokeObjectURL(selectedVideo.url);
    setSelectedVideo(null);
    setTrimRange([0, 10]);
    setIsTrimmed(false);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const extractFrame = async (time: number): Promise<{ data: string, mimeType: string } | null> => {
    if (!videoPreviewRef.current) return null;
    const video = videoPreviewRef.current;
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      const onSeeked = () => {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        video.removeEventListener('seeked', onSeeked);
        resolve({ data, mimeType: 'image/jpeg' });
      };
      
      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });
  };

  const handleCaptureFrame = () => {
    if (!videoPreviewRef.current) return;
    if (selectedImages.length >= 3) {
      setError("Maximum 3 reference images allowed.");
      return;
    }

    const video = videoPreviewRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `captured_frame_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const reader = new FileReader();
        reader.onload = () => {
          setSelectedImages(prev => [
            ...prev,
            { file, preview: reader.result as string }
          ].slice(0, 3));
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  // Keep video within trim range during playback
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime < trimRange[0]) {
        video.currentTime = trimRange[0];
      }
      if (video.currentTime > trimRange[1]) {
        if (isPlaying) {
          video.pause();
          setIsPlaying(false);
        }
        video.currentTime = trimRange[0];
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimRange, isPlaying]);

  const handleGenerate = async (type: 'image' | 'video') => {
    if (!prompt.trim()) return;
    setError(null);

    // Check for API key if generating video
    if (type === 'video') {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        setError("A paid Google Cloud API key is required for video generation. Please select one in the settings or click below.");
        await (window as any).aistudio?.openSelectKey();
        return;
      }
    }

    setIsGenerating(true);
    setGenerationType(type);
    setProgress(0);
    
    // Sanitize prompt
    const sanitizedPrompt = sanitizeText(prompt);

    // Prepare reference images
    const referenceImages = selectedImages.map(img => ({
      data: img.preview.split(",")[1],
      mimeType: img.file.type
    }));

    let firstFrame = null;
    let lastFrame = null;

    if (selectedVideo && type === 'video') {
      setProgress(5);
      firstFrame = await extractFrame(trimRange[0]);
      lastFrame = await extractFrame(trimRange[1]);
      if (firstFrame) referenceImages.unshift(firstFrame);
    }
    
    try {
      if (type === 'video') {
        // Veo only supports 16:9 and 9:16
        const videoRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
        const videoUrl = await generateVideo(
          sanitizedPrompt, 
          referenceImages, 
          videoRatio, 
          (p) => setProgress(p),
          lastFrame || undefined
        );
        if (videoUrl) {
          setGeneratedMedia(prev => [{ type: 'video', url: videoUrl }, ...prev]);
        }
      } else {
        const imageUrl = await generateImage(sanitizedPrompt, referenceImages, aspectRatio);
        if (imageUrl) {
          setGeneratedMedia(prev => [{ type: 'image', url: imageUrl }, ...prev]);
        }
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      setError(error);
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const handleGetSuggestions = async () => {
    setIsGettingSuggestions(true);
    setShowSuggestions(true);
    try {
      const referenceImages = selectedImages.map(img => ({
        data: img.preview.split(",")[1],
        mimeType: img.file.type
      }));

      if (selectedVideo && mode === 'video') {
        const firstFrame = await extractFrame(trimRange[0]);
        const lastFrame = await extractFrame(trimRange[1]);
        if (firstFrame) referenceImages.unshift(firstFrame);
        if (lastFrame) referenceImages.push(lastFrame);
      }

      const results = await getPromptSuggestions(mode, referenceImages);
      setSuggestions(results);
    } catch (err) {
      console.error("Failed to get suggestions:", err);
    } finally {
      setIsGettingSuggestions(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-accent font-mono text-sm mb-4">
          <Wand2 size={16} />
          <span>NEUROWEAVE CREATIVE STUDIO</span>
        </div>
        <h2 className="text-5xl font-serif font-bold text-white mb-4">
          Turn thoughts into <span className="italic text-accent">reality</span>.
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl">
          Use the power of Veo and Gemini to generate high-fidelity images and cinematic videos from simple text prompts.
        </p>
        <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-2xl max-w-2xl flex items-start gap-3">
          <AlertCircle className="text-accent mt-0.5" size={18} />
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="text-accent font-bold">Note:</span> Video generation requires a paid Google Cloud API key. 
            If you haven't selected one, you'll be prompted to do so. 
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-accent underline">billing and API keys</a>.
          </p>
        </div>
      </header>

      <div className="max-w-4xl">
        <div className="glass rounded-3xl p-6 mb-12 border-accent/20">
          {error && (
            <div className="mb-6">
              <ErrorDisplay 
                error={error} 
                onRetry={() => generationType && handleGenerate(generationType)} 
              />
            </div>
          )}
          <div className="flex items-center gap-4 mb-8 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
            <button
              onClick={() => setMode('image')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-sm font-bold",
                mode === 'image' ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"
              )}
            >
              <ImageIcon size={16} />
              IMAGE GEN
            </button>
            <button
              onClick={() => setMode('video')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-sm font-bold",
                mode === 'video' ? "bg-accent text-white shadow-xl shadow-accent/20" : "text-gray-500 hover:text-white"
              )}
            >
              <Video size={16} />
              VIDEO GEN
            </button>
          </div>

          <div 
            className={cn(
              "relative transition-all duration-300",
              isDragging && "scale-[0.98] opacity-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === 'image' ? "Describe the image you want to create..." : "Describe the scene for your cinematic video..."}
              className="w-full bg-transparent border-none focus:ring-0 text-white text-2xl font-serif min-h-[140px] resize-none placeholder:text-gray-700 leading-relaxed"
            />

            <div className="mt-4">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2 text-xs font-mono text-accent hover:text-accent-light transition-colors"
              >
                <Sparkles size={14} />
                <span className="uppercase tracking-widest">{showSuggestions ? "Hide Suggestions" : "Get AI Suggestions"}</span>
                {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 space-y-3">
                      {isGettingSuggestions ? (
                        <div className="flex items-center gap-3 text-gray-500 text-xs font-mono animate-pulse p-4 bg-white/5 rounded-2xl border border-white/5">
                          <Loader2 size={14} className="animate-spin" />
                          <span>BRAINSTORMING CREATIVE PROMPTS...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setPrompt(s)}
                              className="text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/30 transition-all text-sm text-gray-400 hover:text-white group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 rounded-md bg-accent/10 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Wand2 size={12} />
                                </div>
                                <span>{s}</span>
                              </div>
                            </button>
                          ))}
                          <button 
                            onClick={handleGetSuggestions}
                            className="text-center py-2 text-[10px] font-mono text-gray-600 hover:text-accent transition-colors uppercase tracking-widest"
                          >
                            Refresh Suggestions
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleGetSuggestions}
                          className="w-full p-8 rounded-2xl border border-dashed border-white/10 text-gray-500 text-xs font-mono hover:bg-white/5 hover:border-accent/20 transition-all flex flex-col items-center gap-3"
                        >
                          <Sparkles size={24} className="text-accent/40" />
                          <span>CLICK TO GENERATE TAILORED PROMPT IDEAS</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-accent/10 border-2 border-dashed border-accent rounded-2xl pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-accent">
                  <Upload size={32} className="animate-bounce" />
                  <span className="font-mono text-xs uppercase tracking-widest">Drop Reference Image</span>
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedVideo && mode === 'video' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-8 glass p-6 rounded-3xl border-accent/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-accent font-mono text-[10px] uppercase tracking-widest">
                    <Scissors size={14} />
                    <span>Video Trimmer {isTrimmed && "(Applied)"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {!isTrimmed ? (
                      <button 
                        onClick={() => setIsTrimmed(true)}
                        className="text-[10px] uppercase tracking-widest font-bold text-accent hover:text-accent-light transition-colors"
                      >
                        Apply Trim
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsTrimmed(false)}
                        className="text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-colors"
                      >
                        Edit Trim
                      </button>
                    )}
                    <button onClick={removeVideo} className="text-gray-500 hover:text-white transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "relative aspect-video rounded-2xl overflow-hidden bg-black mb-6 group transition-all duration-500",
                  isTrimmed ? "ring-2 ring-accent ring-offset-4 ring-offset-black/50" : "ring-0"
                )}>
                  <video
                    ref={videoPreviewRef}
                    src={selectedVideo.url}
                    className="w-full h-full object-contain"
                    onLoadedMetadata={(e) => {
                      const duration = e.currentTarget.duration;
                      setVideoDuration(duration);
                      setTrimRange([0, Math.min(duration, 10)]);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity gap-4">
                    <button 
                      onClick={() => {
                        if (videoPreviewRef.current) {
                          if (isPlaying) videoPreviewRef.current.pause();
                          else {
                            if (videoPreviewRef.current.currentTime >= trimRange[1]) {
                              videoPreviewRef.current.currentTime = trimRange[0];
                            }
                            videoPreviewRef.current.play();
                          }
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all"
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                    </button>
                    
                    <button 
                      onClick={handleCaptureFrame}
                      className="w-16 h-16 rounded-full bg-accent/20 backdrop-blur-md flex items-center justify-center text-accent border border-accent/20 hover:bg-accent/30 transition-all"
                      title="Capture Current Frame as Reference"
                    >
                      <Camera size={32} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    <span>Start: {trimRange[0].toFixed(1)}s</span>
                    <span className="text-accent">Duration: {(trimRange[1] - trimRange[0]).toFixed(1)}s</span>
                    <span>End: {trimRange[1].toFixed(1)}s</span>
                  </div>
                  
                  <div className="relative h-16 flex items-center px-2 bg-white/5 rounded-xl border border-white/10">
                    {/* Timeline Ticks */}
                    <div className="absolute inset-x-4 inset-y-0 flex justify-between items-center pointer-events-none opacity-20">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className={cn("w-px bg-white", i % 5 === 0 ? "h-3" : "h-1.5")} />
                      ))}
                    </div>

                    <div className="absolute inset-x-2 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-accent/40"
                        style={{ 
                          left: `${(trimRange[0] / videoDuration) * 100}%`,
                          width: `${((trimRange[1] - trimRange[0]) / videoDuration) * 100}%`
                        }}
                      />
                    </div>

                    {/* Start/End Visual Markers on Bar */}
                    <div 
                      className="absolute h-4 w-1 bg-white rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                      style={{ left: `calc(${(trimRange[0] / videoDuration) * 100}% + 8px)` }}
                    />
                    <div 
                      className="absolute h-4 w-1 bg-accent rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(242,125,38,0.5)]"
                      style={{ left: `calc(${(trimRange[1] / videoDuration) * 100}% + 8px)` }}
                    />

                    {/* Playhead */}
                    <div 
                      className="absolute h-12 w-0.5 bg-white z-30 pointer-events-none transition-all duration-75"
                      style={{ left: `calc(${(currentTime / videoDuration) * 100}% + 8px)` }}
                    >
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rounded-full shadow-lg" />
                    </div>

                    {/* Start Marker (Bracket) */}
                    <div 
                      className="absolute h-10 w-4 border-l-2 border-t-2 border-b-2 border-white z-10 pointer-events-none rounded-l-md"
                      style={{ left: `calc(${(trimRange[0] / videoDuration) * 100}% + 8px)` }}
                    >
                      <div className="absolute -top-6 left-0 text-[9px] font-mono text-white font-bold uppercase tracking-tighter">Start</div>
                    </div>

                    {/* End Marker (Bracket) */}
                    <div 
                      className="absolute h-10 w-4 border-r-2 border-t-2 border-b-2 border-accent z-10 pointer-events-none rounded-r-md"
                      style={{ left: `calc(${(trimRange[1] / videoDuration) * 100}% - 8px)` }}
                    >
                      <div className="absolute -top-6 right-0 text-[9px] font-mono text-accent font-bold uppercase tracking-tighter text-right">End</div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={videoDuration}
                      step={0.01}
                      value={trimRange[0]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimRange([Math.min(val, trimRange[1] - 0.5), trimRange[1]]);
                        if (videoPreviewRef.current) videoPreviewRef.current.currentTime = val;
                      }}
                      className="absolute inset-x-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-xl z-20"
                    />
                    <input
                      type="range"
                      min={0}
                      max={videoDuration}
                      step={0.01}
                      value={trimRange[1]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimRange([trimRange[0], Math.max(val, trimRange[0] + 0.5)]);
                        if (videoPreviewRef.current) videoPreviewRef.current.currentTime = val;
                      }}
                      className="absolute inset-x-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-xl z-20"
                    />
                  </div>
                  <p className="text-[10px] text-gray-600 text-center font-mono">
                    The AI will use the first and last frames of your selection as visual anchors.
                  </p>
                </div>
              </motion.div>
            )}

            {selectedImages.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6">
                {selectedImages.map((img, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="relative w-32 h-32 group"
                  >
                    <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-2xl" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                      <button 
                        onClick={() => removeImage(index)}
                        className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                        title="Remove Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-lg">
                      {index + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mt-8 pt-8 border-t border-white/5 gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                multiple
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedImages.length >= 3}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl transition-all text-xs font-mono uppercase tracking-widest disabled:opacity-30"
              >
                <Upload size={14} />
                <span>{selectedImages.length > 0 ? `Add Reference (${selectedImages.length}/3)` : "Reference"}</span>
              </button>
              
              <input 
                type="file" 
                ref={videoInputRef} 
                onChange={handleVideoSelect} 
                accept="video/mp4,video/quicktime,video/webm" 
                className="hidden" 
              />
              <button
                onClick={() => videoInputRef.current?.click()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-mono uppercase tracking-widest",
                  selectedVideo ? "bg-accent/20 text-accent border border-accent/30" : "bg-white/5 hover:bg-white/10 text-gray-400 border border-transparent"
                )}
              >
                <Video size={14} />
                <span>{selectedVideo ? "Video Loaded" : "Video Reference"}</span>
              </button>
              
              <div className="flex items-center gap-2">
                {(["16:9", "9:16", "1:1", "4:3", "3:4"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all",
                      aspectRatio === ratio 
                        ? "bg-white/10 text-white" 
                        : "text-gray-600 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
                Images: Max 5MB (JPG, PNG, WEBP) • Videos: Max 50MB (MP4, MOV, WEBM)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
              {isGenerating && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3 text-accent animate-pulse">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                      {generationType === 'video' ? 'Weaving...' : 'Painting...'}
                    </span>
                  </div>
                  {generationType === 'video' && (
                    <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => handleGenerate(mode)}
                disabled={isGenerating || !prompt.trim()}
                className={cn(
                  "flex items-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-2xl",
                  mode === 'video' 
                    ? "bg-accent text-white shadow-accent/20 hover:bg-accent-light" 
                    : "bg-white text-black hover:bg-gray-200"
                )}
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  mode === 'video' ? <Video size={20} /> : <ImageIcon size={20} />
                )}
                <span className="uppercase tracking-widest text-sm">
                  {isGenerating ? 'Processing' : `Generate ${mode}`}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-serif font-bold text-white">Generated Gallery</h3>
          {generatedMedia.length > 0 && (
            <button 
              onClick={() => setGeneratedMedia([])}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} />
              Clear Gallery
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence>
            {generatedMedia.map((media, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative glass rounded-2xl overflow-hidden border-white/10"
              >
                {media.type === 'video' ? (
                  <video src={media.url} controls className="w-full aspect-video object-cover" />
                ) : (
                  <img src={media.url} alt="Generated" className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button className="p-3 rounded-full bg-accent text-white hover:scale-110 transition-transform">
                    <Download size={20} />
                  </button>
                  <button className="p-3 rounded-full bg-white text-black hover:scale-110 transition-transform">
                    <Sparkles size={20} />
                  </button>
                </div>
                
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur text-[10px] uppercase tracking-widest font-bold text-white border border-white/10">
                    {media.type}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
  );
};
