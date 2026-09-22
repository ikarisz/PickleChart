// Web Audio API Synthesizer for Big Trade alerts
class AudioAlertService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playBigTradeChime(side: 'buy' | 'sell', notional: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch is higher for buy, deeper for sell
      // Scale tone frequency with size
      const isWhale = notional > 50000;
      const baseFreq = side === 'buy' ? (isWhale ? 880 : 660) : (isWhale ? 220 : 330);

      osc.type = side === 'buy' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      if (side === 'buy') {
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.12);
      } else {
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.12);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isWhale ? 0.4 : 0.22));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + (isWhale ? 0.42 : 0.25));
    } catch {
      // Audio playback might be restricted before first user interaction
    }
  }
}

export const audioAlertService = new AudioAlertService();
