import Phaser from 'phaser';

export class SoundManager {
  private scene: Phaser.Scene;
  private soundEnabled: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Sound Placeholders: Uses Web Audio synthesized tones for sound effects.
   */
  public playDiceRoll(): void {
    if (!this.soundEnabled) return;
    this.playSyntheticBeep(320, 0.08, 'sawtooth');
  }

  public playTokenStep(): void {
    if (!this.soundEnabled) return;
    this.playSyntheticBeep(520, 0.04, 'sine');
  }

  public playCapture(): void {
    if (!this.soundEnabled) return;
    this.playSyntheticBeep(220, 0.18, 'square');
  }

  public playVictory(): void {
    if (!this.soundEnabled) return;
    this.playSyntheticBeep(880, 0.3, 'triangle');
  }

  private playSyntheticBeep(freq: number, duration: number, type: OscillatorType): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context ignored if disabled by browser autoplay policies
    }
  }
}
