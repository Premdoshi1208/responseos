/**
 * Real Audio Engine for ResponseOS.
 * - Browser MediaRecorder with Web Audio API real volume analysis.
 * - Groq TTS playback with transparent, real browser SpeechSynthesis fallback.
 * - Resource cleanup and cancellation support.
 */

export class AudioEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  /**
   * Request microphone permission and start recording.
   * Feeds real microphone volume level (0.0 to 1.0) into the onVolume callback.
   */
  async startRecording(onVolume?: (vol: number) => void): Promise<void> {
    this.stopPlayback();
    this.audioChunks = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser environment.');
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      }
      throw err;
    }

    // Set up Web Audio API Analyser for real volume visualization
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const updateVolume = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          // Normalize to 0.0 - 1.0 range
          const normalized = Math.min(1, Math.max(0, average / 128));
          if (onVolume) onVolume(normalized);
          this.animFrameId = requestAnimationFrame(updateVolume);
        };
        this.animFrameId = requestAnimationFrame(updateVolume);
      }
    } catch {
      // Audio visualization fallback if AudioContext restricted
    }

    // Pick supported MIME type
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }

    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Slices of 250ms
  }

  /**
   * Stop recording and return the recorded Audio Blob.
   * Cleans up microphone streams and Web Audio resources.
   */
  async stopRecording(): Promise<Blob> {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanupMicrophone();
        resolve(new Blob(this.audioChunks, { type: 'audio/webm' }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanupMicrophone();
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanupMicrophone() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
  }

  /**
   * Play spoken response using either base64 audio (Groq TTS) or browser SpeechSynthesis fallback.
   */
  async playSpeech(
    text: string,
    audioBase64: string | null = null,
    contentType: string = 'audio/mp3',
    onEnded?: () => void
  ): Promise<void> {
    this.stopPlayback();

    // 1. If real synthesized audio bytes provided
    if (audioBase64) {
      try {
        const audioSrc = `data:${contentType};base64,${audioBase64}`;
        this.currentAudio = new Audio(audioSrc);
        this.currentAudio.onended = () => {
          this.currentAudio = null;
          if (onEnded) onEnded();
        };
        this.currentAudio.onerror = () => {
          this.currentAudio = null;
          this.fallbackBrowserSpeech(text, onEnded);
        };
        await this.currentAudio.play();
        return;
      } catch {
        // Fall through to browser speech synthesis
      }
    }

    // 2. Genuine Browser Speech Synthesis fallback
    this.fallbackBrowserSpeech(text, onEnded);
  }

  private fallbackBrowserSpeech(text: string, onEnded?: () => void) {
    if (!('speechSynthesis' in window)) {
      if (onEnded) onEnded();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        if (onEnded) onEnded();
      };
      utterance.onerror = () => {
        if (onEnded) onEnded();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnded) onEnded();
    }
  }

  /**
   * Immediately cancel all audio playback and speech synthesis.
   */
  stopPlayback(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioEngine = new AudioEngine();
