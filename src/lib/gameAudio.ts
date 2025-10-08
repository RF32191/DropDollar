// Game Audio System using Web Audio API
// Generates actual sounds instead of relying on base64 audio files

class GameAudioSystem {
  private audioContext: AudioContext | null = null;
  private isEnabled = true;

  constructor() {
    try {
      // Initialize AudioContext on first use
      this.initAudioContext();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.isEnabled = false;
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private createBeep(frequency: number, duration: number, volume: number = 0.3): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      this.initAudioContext();
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }

  private createNoise(duration: number, volume: number = 0.2): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      this.initAudioContext();
      
      const bufferSize = this.audioContext.sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      source.start(this.audioContext.currentTime);
    } catch (error) {
      console.warn('Noise audio playback failed:', error);
    }
  }

  // Countdown sounds
  playCountdownBeep(): void {
    this.createBeep(800, 0.15, 0.3);
  }

  playCountdownFinalBeep(): void {
    this.createBeep(1200, 0.2, 0.4);
  }

  // QuickClick sounds
  playQuickClickSuccess(reactionTime: number): void {
    const frequency = reactionTime < 200 ? 1000 : reactionTime < 400 ? 800 : 600;
    const volume = reactionTime < 200 ? 0.4 : 0.3;
    this.createBeep(frequency, 0.1, volume);
  }

  playQuickClickBonusHit(accuracy: number): void {
    if (accuracy > 80) {
      // Perfect hit - chord
      this.createBeep(800, 0.15, 0.3);
      setTimeout(() => this.createBeep(1000, 0.15, 0.3), 50);
    } else if (accuracy > 50) {
      // Good hit
      this.createBeep(900, 0.12, 0.25);
    } else {
      // Weak hit
      this.createBeep(600, 0.1, 0.2);
    }
  }

  playRoundTransition(): void {
    this.createBeep(600, 0.1, 0.2);
  }

  // Sword Slash sounds
  playSwordHit(hitType: string): void {
    switch (hitType) {
      case 'PERFECT HIT':
        // Perfect hit - bright chord
        this.createBeep(1200, 0.1, 0.35);
        setTimeout(() => this.createBeep(1500, 0.1, 0.25), 30);
        break;
      case 'EXCELLENT':
        this.createBeep(1000, 0.12, 0.3);
        break;
      case 'GOOD HIT':
        this.createBeep(800, 0.1, 0.25);
        break;
      default:
        this.createBeep(600, 0.1, 0.2);
    }
  }

  playSwordMiss(): void {
    this.createBeep(300, 0.05, 0.1);
  }

  // Laser Dodge sounds
  playLaserWarning(): void {
    this.createBeep(400, 0.1, 0.15);
  }

  playExtremeModeActivation(): void {
    // Rising tone sequence
    this.createBeep(600, 0.1, 0.25);
    setTimeout(() => this.createBeep(800, 0.1, 0.25), 100);
    setTimeout(() => this.createBeep(1000, 0.15, 0.3), 200);
  }

  playCrazyModeActivation(): void {
    // Intense warning sequence
    this.createBeep(1200, 0.1, 0.3);
    setTimeout(() => this.createBeep(1000, 0.1, 0.3), 80);
    setTimeout(() => this.createBeep(1400, 0.1, 0.3), 160);
    setTimeout(() => this.createBeep(1600, 0.2, 0.35), 240);
  }

  playCollision(): void {
    // Harsh noise burst for collision
    this.createNoise(0.3, 0.4);
  }

  // Game end sounds
  playGameEnd(performance: 'great' | 'good' | 'poor' = 'good'): void {
    switch (performance) {
      case 'great':
        // Victory fanfare
        this.createBeep(800, 0.15, 0.35);
        setTimeout(() => this.createBeep(1000, 0.15, 0.35), 100);
        setTimeout(() => this.createBeep(1200, 0.2, 0.4), 200);
        break;
      case 'poor':
        // Sad trombone effect
        this.createBeep(400, 0.3, 0.2);
        break;
      default:
        // Standard completion
        this.createBeep(600, 0.2, 0.25);
    }
  }

  // Utility methods
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled && !!this.audioContext;
  }
}

// Create singleton instance
export const gameAudio = new GameAudioSystem();

// Export individual functions for easy use
export const playCountdownBeep = () => gameAudio.playCountdownBeep();
export const playCountdownFinalBeep = () => gameAudio.playCountdownFinalBeep();
export const playQuickClickSuccess = (reactionTime: number) => gameAudio.playQuickClickSuccess(reactionTime);
export const playQuickClickBonusHit = (accuracy: number) => gameAudio.playQuickClickBonusHit(accuracy);
export const playRoundTransition = () => gameAudio.playRoundTransition();
export const playSwordHit = (hitType: string) => gameAudio.playSwordHit(hitType);
export const playSwordMiss = () => gameAudio.playSwordMiss();
export const playLaserWarning = () => gameAudio.playLaserWarning();
export const playExtremeModeActivation = () => gameAudio.playExtremeModeActivation();
export const playCrazyModeActivation = () => gameAudio.playCrazyModeActivation();
export const playCollision = () => gameAudio.playCollision();
export const playGameEnd = (performance: 'great' | 'good' | 'poor' = 'good') => gameAudio.playGameEnd(performance);
