import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const GalleryGenerator: React.FC = () => {
  const [images, setImages] = useState<{url: string, title: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const prompts = [
    { 
      title: "Dashboard Interface", 
      prompt: "A high-tech web application dashboard for 'NeuroWeave AI'. Dark mode, grid layout showing various AI agent cards with icons like 'Live Agent', 'Creative Storyteller', 'UI Navigator'. Emerald green accent colors, sleek glassmorphism UI, 3:2 aspect ratio." 
    },
    { 
      title: "Neural Chat Experience", 
      prompt: "A professional AI chat interface. Dark mode, technical dashboard style. A conversation between a user and an AI. The AI response includes a generated image of a futuristic city and a small audio waveform. Sleek typography, emerald accents, 3:2 aspect ratio." 
    },
    { 
      title: "Media Studio Panel", 
      prompt: "A creative AI media generation panel. Dark mode, minimalist UI. Sliders for aspect ratio and resolution. A preview of a generated high-quality video of a neon cat. Professional software aesthetic, 3:2 aspect ratio." 
    },
    { 
      title: "Audio Lab Visualization", 
      prompt: "A futuristic audio lab interface for AI voice interaction. A large, glowing emerald green 3D waveform in the center. Dark background, technical labels like 'Frequency', 'Modulation', 'Voice: Zephyr'. 3:2 aspect ratio." 
    }
  ];

  const generateGallery = async () => {
    setLoading(true);
    const generated: {url: string, title: string}[] = [];
    
    for (const item of prompts) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: item.prompt }] },
          config: { imageConfig: { aspectRatio: "3:2" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            generated.push({
              url: `data:image/png;base64,${part.inlineData.data}`,
              title: item.title
            });
          }
        }
      } catch (error) {
        console.error("Failed to generate image:", error);
      }
    }
    setImages(generated);
    setLoading(false);
  };

  useEffect(() => {
    generateGallery();
  }, []);

  return (
    <div className="p-8 bg-bg min-h-screen">
      <h2 className="text-3xl font-serif font-bold text-white mb-8">NeuroWeave AI <span className="italic text-accent">Gallery</span></h2>
      
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 font-mono text-sm animate-pulse">GENERATING CONCEPTUAL SCREENSHOTS...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {images.map((img, i) => (
          <div key={i} className="glass rounded-3xl overflow-hidden border-white/5 group">
            <div className="aspect-[3/2] overflow-hidden">
              <img 
                src={img.url} 
                alt={img.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6">
              <h3 className="text-white font-bold text-lg mb-1">{img.title}</h3>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">NeuroWeave v1.0 • 3:2 Ratio</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
