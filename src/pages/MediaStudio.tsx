import React, { useState, useRef } from "react";
import { generateVideo, generateImage } from "../services/geminiService";
import { Sparkles, Video, Image as ImageIcon, Wand2, Loader2, Download, AlertCircle, Upload, X, Trash2, Layout } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sanitizeText, validateFile } from "../utils/security";
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, 5, ["image/jpeg", "image/png"]);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

    let imageBase64 = "";
    if (selectedImage) {
      imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(selectedImage);
      });
    }
    
    try {
      if (type === 'video') {
        // Veo only supports 16:9 and 9:16
        const videoRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
        const videoUrl = await generateVideo(sanitizedPrompt, imageBase64, videoRatio, (p) => setProgress(p));
        if (videoUrl) {
          setGeneratedMedia(prev => [{ type: 'video', url: videoUrl }, ...prev]);
        }
      } else {
        const imageUrl = await generateImage(sanitizedPrompt, imageBase64, aspectRatio);
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

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 'image' ? "Describe the image you want to create..." : "Describe the scene for your cinematic video..."}
            className="w-full bg-transparent border-none focus:ring-0 text-white text-2xl font-serif min-h-[140px] resize-none placeholder:text-gray-700 leading-relaxed"
          />

          <AnimatePresence>
            {imagePreview && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="relative w-40 h-40 mb-6 group"
              >
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-2xl" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                  <button 
                    onClick={removeImage}
                    className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="absolute -bottom-2 -left-2 px-2 py-1 bg-accent text-white text-[8px] font-mono uppercase tracking-widest rounded shadow-lg">
                  Reference Active
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mt-8 pt-8 border-t border-white/5 gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl transition-all text-xs font-mono uppercase tracking-widest"
              >
                <Upload size={14} />
                <span>Reference</span>
              </button>
              
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
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
    </div>
  );
};
