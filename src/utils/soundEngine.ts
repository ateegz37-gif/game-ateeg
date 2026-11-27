import { VoiceTone } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playClick(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.055);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playWheelTick(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.03);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playCorrect(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playWrong(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.26);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playTickUrgent(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playTimeUp(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [340, 280, 210].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + idx * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playCountdownBeep(step: 3 | 2 | 1): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = step === 3 ? 523.25 : step === 2 ? 659.25 : 783.99;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playCountdownGo(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  public playRoundEndHorn(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.58);
    });
  }

  public playLifeline(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playVehicleMove(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.36);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playApplauseAndWin(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Victory Fanfare Arpeggio
    const melody = [
      { f: 523.25, t: 0, d: 0.14 },
      { f: 659.25, t: 0.13, d: 0.14 },
      { f: 783.99, t: 0.26, d: 0.14 },
      { f: 1046.5, t: 0.4, d: 0.45 },
      { f: 783.99, t: 0.56, d: 0.14 },
      { f: 1046.5, t: 0.72, d: 0.55 },
    ];
    melody.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.16, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.04);
    });

    // 2. Synthesized Crowd Applause (bandpass-filtered noise bursts)
    const bufferLength = Math.floor(ctx.sampleRate * 1.4);
    const noiseBuffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      // Envelope with slight rhythmic clapping flutter
      const env = Math.sin((i / bufferLength) * Math.PI);
      const flutter = 0.65 + 0.35 * Math.sin(i * 0.0045);
      data[i] = (Math.random() * 2 - 1) * env * flutter * 0.35;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.85;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now + 0.15);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.15);
  }

  /**
   * Decodes a recorded Blob and plays it with the chosen fun voice tone via Web Audio API.
   * Returns a Promise that resolves with durationMs once playback finishes so caller can wipe memory.
   */
  public async playProcessedVoiceBlob(
    blob: Blob,
    tone: VoiceTone,
    onStart?: (durationMs: number) => void
  ): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      let rate = 1.0;
      if (tone === 'chipmunk') {
        rate = 1.65;
      } else if (tone === 'robot') {
        rate = 0.96;
      }
      source.playbackRate.value = rate;

      const effectiveDurationMs = Math.max(
        900,
        Math.ceil((audioBuffer.duration / rate) * 1000)
      );

      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.25;

      let ringOsc: OscillatorNode | null = null;

      if (tone === 'robot') {
        // Space robot ring-modulator + metallic resonator
        const modGain = ctx.createGain();
        modGain.gain.value = 0.5;

        ringOsc = ctx.createOscillator();
        ringOsc.type = 'sawtooth';
        ringOsc.frequency.value = 62;

        const oscDepth = ctx.createGain();
        oscDepth.gain.value = 0.5;

        ringOsc.connect(oscDepth);
        oscDepth.connect(modGain.gain);

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1200;
        bandpass.Q.value = 1.4;

        const delay = ctx.createDelay();
        delay.delayTime.value = 0.032;
        const delayGain = ctx.createGain();
        delayGain.gain.value = 0.35;

        source.connect(modGain);
        modGain.connect(bandpass);
        bandpass.connect(masterGain);

        // Subtle metallic slapback
        bandpass.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(masterGain);

        masterGain.connect(ctx.destination);
        ringOsc.start();
      } else {
        source.connect(masterGain);
        masterGain.connect(ctx.destination);
      }

      onStart?.(effectiveDurationMs);

      source.onended = () => {
        try {
          ringOsc?.stop();
          ringOsc?.disconnect();
          source.disconnect();
          masterGain.disconnect();
        } catch {
          // ignore cleanup errors
        }
        resolve();
      };

      source.start();
    });
  }
}

export const soundEngine = new SoundEngine();
