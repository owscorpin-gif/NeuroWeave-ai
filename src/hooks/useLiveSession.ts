import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AudioProcessor } from '../services/audioProcessor';

const apiKey = process.env.GEMINI_API_KEY || "";

export const useLiveSession = (systemInstruction?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [modelTranscript, setModelTranscript] = useState("");
  const [isVideoActive, setIsVideoActive] = useState(false);
  
  const audioProcessor = useRef(new AudioProcessor());
  const sessionRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 10 } 
      });
      videoStreamRef.current = stream;
      setIsVideoActive(true);
      
      // Start frame capture loop
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      frameIntervalRef.current = window.setInterval(() => {
        if (sessionRef.current && isConnected) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            sessionRef.current.sendRealtimeInput({
              media: { data: base64, mimeType: 'image/jpeg' }
            });
          }
        }
      }, 500); // Send frame every 500ms (2fps is usually enough for vision tasks)
    } catch (error) {
      console.error("Failed to start camera:", error);
    }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    setIsVideoActive(false);
  };

  const connect = useCallback(async () => {
    if (!apiKey) return;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              audioProcessor.current.playPCMChunk(base64Audio);
            }

            if (message.serverContent?.interrupted) {
              audioProcessor.current.stopPlayback();
            }

            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setModelTranscript(prev => prev + message.serverContent!.modelTurn!.parts[0].text);
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopMic();
            stopCamera();
          },
          onerror: (error) => {
            console.error("Live session error:", error);
            setIsConnected(false);
            stopMic();
            stopCamera();
          }
        }
      });

      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to live session:", error);
    }
  }, [systemInstruction]);

  const startMic = async () => {
    setIsRecording(true);
    await audioProcessor.current.startRecording((base64) => {
      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput({
          media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      }
    });
  };

  const stopMic = () => {
    setIsRecording(false);
    audioProcessor.current.stopRecording();
    audioProcessor.current.stopPlayback();
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  };

  const toggleSession = () => {
    if (isConnected) {
      stopMic();
      stopCamera();
    } else {
      connect();
    }
  };

  const toggleVideo = () => {
    if (isVideoActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      stopMic();
      stopCamera();
    };
  }, []);

  const sendMedia = useCallback((base64: string, mimeType: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        media: { data: base64, mimeType }
      });
    }
  }, [isConnected]);

  return {
    isConnected,
    isRecording,
    transcript,
    modelTranscript,
    isVideoActive,
    videoStream: videoStreamRef.current,
    toggleSession,
    toggleVideo,
    sendMedia
  };
};
