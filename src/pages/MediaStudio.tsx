import React, { useState } from "react";
import { generateVideo } from "../services/geminiService";
import { Sparkles, Video, Image as ImageIcon, Wand2, Loader2, Download, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sanitizeText } from "../utils/security";

export const MediaStudio: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedMedia, setGeneratedMedia] = useState<{ type: 'image' | 'video', url: string }[]>([]);

  const handleGenerate = async (type: 'image' | 'video') => {
    if (!prompt.trim()) return;
    setError(null);
    setIsGenerating(true);
    
    // Sanitize prompt
    const sanitizedPrompt = sanitizeText(prompt);
    
    try {
      if (type === 'video') {
        const videoUrl = await generateVideo(sanitizedPrompt);
        if (videoUrl) {
          setGeneratedMedia(prev => [{ type: 'video', url: videoUrl }, ...prev]);
        }
      } else {
        // Image generation logic would go here
        const placeholderUrl = `https://picsum.photos/seed/${Math.random()}/1280/720`;
        setGeneratedMedia(prev => [{ type: 'image', url: placeholderUrl }, ...prev]);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setError("Failed to generate media. Please try again.");
    } finally {
      setIsGenerating(false);
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
      </header>

      <div className="max-w-4xl">
        <div className="glass rounded-3xl p-6 mb-12 border-accent/20">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision in detail... (e.g., 'A cinematic shot of a neon-lit cyberpunk city in the rain, 8k resolution')"
            className="w-full bg-transparent border-none focus:ring-0 text-white text-xl font-serif min-h-[120px] resize-none placeholder:text-gray-600"
          />
          
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
            <div className="flex gap-4">
              <button
                onClick={() => handleGenerate('image')}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-50"
              >
                <ImageIcon size={18} />
                <span>Generate Image</span>
              </button>
              <button
                onClick={() => handleGenerate('video')}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl transition-all disabled:opacity-50"
              >
                <Video size={18} />
                <span>Generate Video</span>
              </button>
            </div>

            {isGenerating && (
              <div className="flex items-center gap-3 text-accent animate-pulse">
                <Loader2 className="animate-spin" size={20} />
                <span className="font-mono text-sm uppercase tracking-widest">Weaving Reality...</span>
              </div>
            )}
          </div>
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
