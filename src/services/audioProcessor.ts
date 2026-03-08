export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async startRecording(onData: (base64: string) => void) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // ScriptProcessor is deprecated but widely supported for simple PCM capture
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64 = this.arrayBufferToBase64(pcmData);
      onData(base64);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stopRecording() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.audioContext = null;
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Helper to play back PCM chunks from Gemini
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private playbackContext: AudioContext | null = null;

  async playPCMChunk(base64: string) {
    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
    }

    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm = new Int16Array(bytes.buffer);
    this.audioQueue.push(pcm);

    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  private currentSource: AudioBufferSourceNode | null = null;

  private async processQueue() {
    if (this.audioQueue.length === 0 || !this.playbackContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const pcm = this.audioQueue.shift()!;
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 32768.0;
    }

    const buffer = this.playbackContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    this.currentSource = this.playbackContext.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.connect(this.playbackContext.destination);
    this.currentSource.onended = () => {
      this.currentSource = null;
      this.processQueue();
    };
    this.currentSource.start();
  }

  stopPlayback() {
    this.audioQueue = [];
    this.isPlaying = false;
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null;
    }
  }
}
