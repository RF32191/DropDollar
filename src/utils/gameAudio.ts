// Game Audio Utility - Optimized for Zero Delay
// Handles audio effects for all games with preloaded buffers

export class GameAudio {
  private static audioContext: AudioContext | null = null;
  private static audioEnabled = true;
  private static audioBuffers: Map<string, AudioBuffer> = new Map();
  private static isInitialized = false;

  // Initialize audio context and preload sounds
  static async init() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context immediately to avoid delays
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Preload all audio buffers
      await this.preloadAudioBuffers();
      this.isInitialized = true;
      console.log('GameAudio: Initialized with zero-delay buffers');
    }
  }

  // Preload all audio buffers to eliminate delay
  private static async preloadAudioBuffers() {
    if (!this.audioContext) return;

    const sounds = {
      // Multi-Target sounds
      targetHit: () => this.generateToneBuffer(800, 0.1, 'sine', 0.4),
      targetMiss: () => this.generateToneBuffer(150, 0.2, 'sawtooth', 0.3),
      
      // Falling Object sounds
      coinCatch: () => this.generateComplexToneBuffer([
        { freq: 1000, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.4, delay: 0 },
        { freq: 1500, duration: 0.05, type: 'sine' as OscillatorType, volume: 0.2, delay: 0.05 }
      ]),
      dollarCatch: () => this.generateComplexToneBuffer([
        { freq: 600, duration: 0.08, type: 'triangle' as OscillatorType, volume: 0.4, delay: 0 },
        { freq: 800, duration: 0.08, type: 'triangle' as OscillatorType, volume: 0.3, delay: 0.08 },
        { freq: 1000, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.2, delay: 0.16 }
      ]),
      objectMiss: () => this.generateToneBuffer(200, 0.15, 'sawtooth', 0.2),
      
      // Color sounds
      colorRed: () => this.generateToneBuffer(261.63, 0.3, 'sine', 0.4),
      colorBlue: () => this.generateToneBuffer(293.66, 0.3, 'sine', 0.4),
      colorGreen: () => this.generateToneBuffer(329.63, 0.3, 'sine', 0.4),
      colorYellow: () => this.generateToneBuffer(349.23, 0.3, 'sine', 0.4),
      colorPurple: () => this.generateToneBuffer(392.00, 0.3, 'sine', 0.4),
      colorOrange: () => this.generateToneBuffer(440.00, 0.3, 'sine', 0.4),
      
      // Countdown sounds
      countdown5: () => this.generateToneBuffer(440, 0.15, 'square', 0.4),
      countdown4: () => this.generateToneBuffer(494, 0.15, 'square', 0.4),
      countdown3: () => this.generateToneBuffer(523, 0.15, 'square', 0.4),
      countdown2: () => this.generateToneBuffer(587, 0.15, 'square', 0.4),
      countdown1: () => this.generateToneBuffer(659, 0.15, 'square', 0.4),
      countdownGo: () => this.generateComplexToneBuffer([
        { freq: 523, duration: 0.3, type: 'sine' as OscillatorType, volume: 0.5, delay: 0 },
        { freq: 659, duration: 0.3, type: 'sine' as OscillatorType, volume: 0.4, delay: 0.05 },
        { freq: 784, duration: 0.3, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.1 }
      ]),
      
      // Game state sounds
      gameStart: () => this.generateComplexToneBuffer([
        { freq: 440, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.3, delay: 0 },
        { freq: 554, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.1 },
        { freq: 659, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.2 }
      ]),
      gameEnd: () => this.generateComplexToneBuffer([
        { freq: 659, duration: 0.15, type: 'sine' as OscillatorType, volume: 0.3, delay: 0 },
        { freq: 554, duration: 0.15, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.15 },
        { freq: 440, duration: 0.2, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.3 }
      ]),
      
      // Success/Error sounds
      sequenceComplete: () => this.generateComplexToneBuffer([
        { freq: 523.25, duration: 0.2, type: 'sine' as OscillatorType, volume: 0.3, delay: 0 },
        { freq: 659.25, duration: 0.2, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.1 },
        { freq: 783.99, duration: 0.2, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.2 },
        { freq: 1046.50, duration: 0.2, type: 'sine' as OscillatorType, volume: 0.3, delay: 0.3 }
      ]),
      sequenceError: () => this.generateComplexToneBuffer([
        { freq: 220, duration: 0.3, type: 'sawtooth' as OscillatorType, volume: 0.4, delay: 0 },
        { freq: 180, duration: 0.2, type: 'sawtooth' as OscillatorType, volume: 0.3, delay: 0.15 }
      ])
    };

    // Generate all buffers
    for (const [name, generator] of Object.entries(sounds)) {
      try {
        const buffer = await generator();
        this.audioBuffers.set(name, buffer);
        console.log(`GameAudio: Preloaded ${name}`);
      } catch (error) {
        console.error(`GameAudio: Failed to preload ${name}:`, error);
      }
    }
  }

  // Generate a simple tone buffer
  private static async generateToneBuffer(
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine', 
    volume: number = 0.3
  ): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('No audio context');

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
      }

      // Apply envelope (fade in/out to prevent clicks)
      const fadeTime = Math.min(0.01, duration * 0.1);
      const fadeInSamples = fadeTime * sampleRate;
      const fadeOutSamples = fadeTime * sampleRate;

      if (i < fadeInSamples) {
        sample *= i / fadeInSamples;
      } else if (i > length - fadeOutSamples) {
        sample *= (length - i) / fadeOutSamples;
      }

      data[i] = sample * volume;
    }

    return buffer;
  }

  // Generate a complex tone buffer with multiple overlapping sounds
  private static async generateComplexToneBuffer(
    tones: Array<{
      freq: number;
      duration: number;
      type: OscillatorType;
      volume: number;
      delay: number;
    }>
  ): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('No audio context');

    const sampleRate = this.audioContext.sampleRate;
    const totalDuration = Math.max(...tones.map(t => t.delay + t.duration));
    const length = sampleRate * totalDuration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Initialize with silence
    for (let i = 0; i < length; i++) {
      data[i] = 0;
    }

    // Add each tone
    for (const tone of tones) {
      const startSample = Math.floor(tone.delay * sampleRate);
      const toneSamples = Math.floor(tone.duration * sampleRate);

      for (let i = 0; i < toneSamples && startSample + i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;

        switch (tone.type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * tone.freq * t);
            break;
          case 'square':
            sample = Math.sin(2 * Math.PI * tone.freq * t) > 0 ? 1 : -1;
            break;
          case 'sawtooth':
            sample = 2 * (t * tone.freq - Math.floor(t * tone.freq + 0.5));
            break;
          case 'triangle':
            sample = 2 * Math.abs(2 * (t * tone.freq - Math.floor(t * tone.freq + 0.5))) - 1;
            break;
        }

        // Apply envelope
        const fadeTime = Math.min(0.01, tone.duration * 0.1);
        const fadeInSamples = fadeTime * sampleRate;
        const fadeOutSamples = fadeTime * sampleRate;

        if (i < fadeInSamples) {
          sample *= i / fadeInSamples;
        } else if (i > toneSamples - fadeOutSamples) {
          sample *= (toneSamples - i) / fadeOutSamples;
        }

        data[startSample + i] += sample * tone.volume;
      }
    }

    return buffer;
  }

  // Play a preloaded sound with zero delay
  private static playBuffer(bufferName: string) {
    if (!this.audioEnabled) return;
    if (!this.audioContext || !this.isInitialized) {
      console.warn('GameAudio: Not initialized, call init() first');
      return;
    }

    const buffer = this.audioBuffers.get(bufferName);
    if (!buffer) {
      console.warn(`GameAudio: Buffer ${bufferName} not found`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      console.log(`GameAudio: Playing ${bufferName} (zero delay)`);
    } catch (error) {
      console.error(`GameAudio: Error playing ${bufferName}:`, error);
    }
  }

  // Enable/disable audio
  static setEnabled(enabled: boolean) {
    this.audioEnabled = enabled;
    console.log(`GameAudio: Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get audio status
  static getStatus() {
    return {
      enabled: this.audioEnabled,
      initialized: this.isInitialized,
      contextState: this.audioContext?.state || 'not-initialized',
      contextAvailable: !!this.audioContext,
      buffersLoaded: this.audioBuffers.size
    };
  }

  // Test audio functionality
  static testAudio() {
    console.log('GameAudio: Testing audio...');
    this.playBuffer('targetHit');
  }

  // Multi-Target Game Sounds
  static playTargetHit() {
    this.playBuffer('targetHit');
  }

  static playTargetMiss() {
    this.playBuffer('targetMiss');
  }

  static playGameStart() {
    this.playBuffer('gameStart');
  }

  static playGameEnd() {
    this.playBuffer('gameEnd');
  }

  // Falling Object Game Sounds
  static playCoinCatch() {
    this.playBuffer('coinCatch');
  }

  static playDollarCatch() {
    this.playBuffer('dollarCatch');
  }

  static playObjectMiss() {
    this.playBuffer('objectMiss');
  }

  // Color Sequence Game Sounds
  static playColorSound(color: string) {
    const colorMap: { [key: string]: string } = {
      red: 'colorRed',
      blue: 'colorBlue',
      green: 'colorGreen',
      yellow: 'colorYellow',
      purple: 'colorPurple',
      orange: 'colorOrange'
    };

    const bufferName = colorMap[color];
    if (bufferName) {
      this.playBuffer(bufferName);
    } else {
      console.warn(`GameAudio: Unknown color ${color}`);
    }
  }

  static playSequenceComplete() {
    this.playBuffer('sequenceComplete');
  }

  static playSequenceError() {
    this.playBuffer('sequenceError');
  }

  // Universal Game Sounds
  static playCountdown(number: number) {
    const countdownMap: { [key: number]: string } = {
      5: 'countdown5',
      4: 'countdown4',
      3: 'countdown3',
      2: 'countdown2',
      1: 'countdown1'
    };

    const bufferName = countdownMap[number];
    if (bufferName) {
      this.playBuffer(bufferName);
    } else {
      console.warn(`GameAudio: Unknown countdown number ${number}`);
    }
  }

  static playGameStartCountdown() {
    this.playBuffer('countdownGo');
  }

  static playFinalCountdown() {
    this.playBuffer('countdown1'); // Use countdown1 for final tick
  }

  // Additional sounds (using existing buffers or fallbacks)
  static playLevelUp() {
    this.playBuffer('sequenceComplete'); // Reuse success sound
  }

  static playPowerUp() {
    this.playBuffer('coinCatch'); // Reuse coin sound
  }
}

// Initialize audio on first user interaction with immediate setup
if (typeof window !== 'undefined') {
  const initAudio = async () => {
    try {
      await GameAudio.init();
      console.log('GameAudio: Initialized on user interaction');
    } catch (error) {
      console.error('GameAudio: Failed to initialize:', error);
    }
    
    // Remove listeners after first successful init
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
    document.removeEventListener('touchstart', initAudio);
  };

  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);
  document.addEventListener('touchstart', initAudio);
}
