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
  const [isScreenActive, setIsScreenActive] = useState(false);
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioProcessor = useRef(new AudioProcessor());
  const sessionRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setVolume(audioProcessor.current.getVolume());
      }, 100);
    } else {
      setVolume(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 10 } 
      });
      videoStreamRef.current = stream;
      setIsVideoActive(true);
      startFrameCapture(stream);
    } catch (err: any) {
      console.error("Failed to start camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else {
        setError("Failed to start camera: " + (err.message || "Unknown error"));
      }
    }
  };

  const startScreen = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { frameRate: 5 } 
      });
      screenStreamRef.current = stream;
      setIsScreenActive(true);
      startFrameCapture(stream);

      stream.getVideoTracks()[0].onended = () => {
        stopScreen();
      };
    } catch (err: any) {
      console.error("Failed to start screen share:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Screen share permission denied. Please allow screen capture when prompted.");
      } else {
        setError("Failed to start screen share: " + (err.message || "Unknown error"));
      }
    }
  };

  const startFrameCapture = (stream: MediaStream) => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute('playsinline', '');
    
    video.onloadedmetadata = () => {
      video.play().catch(console.error);
    };

    frameIntervalRef.current = window.setInterval(() => {
      if (sessionRef.current && isConnected && video.readyState >= 2) {
        // Use a fixed size or maintain aspect ratio but cap it for performance
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          sessionRef.current.sendRealtimeInput({
            media: { data: base64, mimeType: 'image/jpeg' }
          });
          // console.log("Frame sent", canvas.width, "x", canvas.height);
        }
      }
    }, 500);
  };

  const stopCamera = () => {
    if (frameIntervalRef.current && !isScreenActive) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    setIsVideoActive(false);
  };

  const stopScreen = () => {
    if (frameIntervalRef.current && !isVideoActive) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenActive(false);
  };

  const connect = useCallback(async () => {
    if (!apiKey) return;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      setTranscript("");
      setModelTranscript("");
      
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
            console.log("Live session socket opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              audioProcessor.current.playPCMChunk(base64Audio);
            }

            if (message.serverContent?.interrupted) {
              audioProcessor.current.stopPlayback();
            }

            // Handle Model Transcription
            if (message.serverContent?.modelTurn?.parts) {
              const textPart = message.serverContent.modelTurn.parts.find(p => p.text);
              if (textPart?.text) {
                setModelTranscript(prev => prev + textPart.text);
              }
            }

            // Handle User Transcription
            const userTurn = (message.serverContent as any)?.userTurn;
            if (userTurn?.parts) {
              const textPart = (userTurn.parts as any[]).find(p => p.text);
              if (textPart?.text) {
                setTranscript(prev => prev + textPart.text);
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopMic();
            stopCamera();
            stopScreen();
            console.log("Live session closed");
          },
          onerror: (error) => {
            console.error("Live session error:", error);
            setIsConnected(false);
            stopMic();
            stopCamera();
            stopScreen();
          }
        }
      });

      sessionRef.current = session;
      setIsConnected(true);
      startMic();
      console.log("Live session connected and ready");
    } catch (error) {
      console.error("Failed to connect to live session:", error);
    }
  }, [systemInstruction]);

  const startMic = async () => {
    setError(null);
    try {
      if (!isRecording) {
        setIsRecording(true);
        await audioProcessor.current.startRecording((base64) => {
          if (sessionRef.current && isConnected) {
            sessionRef.current.sendRealtimeInput({
              media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
            });
          }
        });
      }
    } catch (err: any) {
      console.error("Failed to start microphone:", err);
      setIsRecording(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else {
        setError("Failed to start microphone: " + (err.message || "Unknown error"));
      }
    }
  };

  const stopMic = () => {
    setIsRecording(false);
    setIsRecordingMessage(false);
    audioProcessor.current.stopRecording();
    audioProcessor.current.stopPlayback();
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  };

  const startVoiceMessage = async () => {
    if (!isRecording) {
      await startMic();
    }
    audioProcessor.current.startBuffering();
    setIsRecordingMessage(true);
  };

  const stopVoiceMessage = (): File | null => {
    const blob = audioProcessor.current.stopBuffering();
    setIsRecordingMessage(false);
    if (!isConnected) {
      stopMic();
    }
    if (blob) {
      return new File([blob], `voice_message_${Date.now()}.wav`, { type: 'audio/wav' });
    }
    return null;
  };

  const toggleSession = () => {
    if (isConnected) {
      stopMic();
      stopCamera();
      stopScreen();
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

  const toggleScreen = () => {
    if (isScreenActive) {
      stopScreen();
    } else {
      startScreen();
    }
  };

  useEffect(() => {
    return () => {
      stopMic();
      stopCamera();
      stopScreen();
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
    isScreenActive,
    videoStream: videoStreamRef.current,
    screenStream: screenStreamRef.current,
    volume,
    error,
    isRecordingMessage,
    startVoiceMessage,
    stopVoiceMessage,
    clearError: () => setError(null),
    toggleSession,
    toggleVideo,
    toggleScreen,
    sendMedia
  };
};
