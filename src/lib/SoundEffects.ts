'use client';

// Sound Effects System for DropDollar
export class SoundEffects {
  private static audioContext: AudioContext | null = null;
  private static isInitialized = false;

  private static initAudioContext() {
    if (!this.isInitialized && typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.isInitialized = true;
        console.log('✅ Audio context initialized successfully');
        
        // Resume audio context if it's suspended (required by browsers)
        if (this.audioContext.state === 'suspended') {
          console.log('⚠️ Audio context suspended, attempting to resume...');
          this.audioContext.resume().then(() => {
            console.log('✅ Audio context resumed');
          }).catch(err => {
            console.error('❌ Failed to resume audio context:', err);
          });
        }
      } catch (error) {
        console.error('❌ Audio not supported:', error);
      }
    }
  }

  // Call this on first user interaction to enable audio
  static enableAudio() {
    this.initAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('✅ Audio enabled after user interaction');
      });
    }
  }

  // Game completion sounds
  static playGameWin() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Victory fanfare: ascending notes
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.2); // E5
      oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.4); // G5
      oscillator.frequency.setValueAtTime(1047, this.audioContext.currentTime + 0.6); // C6
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 1);
    } catch (error) {
      console.log('Game win sound error:', error);
    }
  }

  static playPracticeComplete() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      // Play a celebratory multi-layered sound
      const frequencies = [
        [523, 659, 784],   // C major chord at start
        [587, 739, 880],   // D major chord
        [659, 831, 988],   // E major chord
        [784, 988, 1175],  // G major chord
        [1047, 1319, 1568] // C major chord (higher octave)
      ];
      
      frequencies.forEach((chord, chordIndex) => {
        setTimeout(() => {
          chord.forEach((freq, noteIndex) => {
            const oscillator = this.audioContext!.createOscillator();
            const gainNode = this.audioContext!.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext!.destination);
            
            oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
            gainNode.gain.setValueAtTime(0.15, this.audioContext!.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.4);
            
            oscillator.start(this.audioContext!.currentTime);
            oscillator.stop(this.audioContext!.currentTime + 0.4);
          });
        }, chordIndex * 200);
      });
    } catch (error) {
      console.log('Practice complete sound error:', error);
    }
  }

  static playGameLoss() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Loss sound: descending notes
      oscillator.frequency.setValueAtTime(392, this.audioContext.currentTime); // G4
      oscillator.frequency.setValueAtTime(330, this.audioContext.currentTime + 0.2); // E4
      oscillator.frequency.setValueAtTime(262, this.audioContext.currentTime + 0.4); // C4
      
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.8);
    } catch (error) {
      console.log('Game loss sound error:', error);
    }
  }

  // Token purchase sounds
  static playTokenPurchase() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      // Play multiple chimes for token purchase
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const oscillator = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext!.destination);
          
          oscillator.frequency.setValueAtTime(600 + (i * 200), this.audioContext!.currentTime);
          gainNode.gain.setValueAtTime(0.2, this.audioContext!.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.3);
          
          oscillator.start(this.audioContext!.currentTime);
          oscillator.stop(this.audioContext!.currentTime + 0.3);
        }, i * 150);
      }
    } catch (error) {
      console.log('Token purchase sound error:', error);
    }
  }

  // Category-specific sounds
  static playElectronicsSound() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Electronic beep sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Electronics sound error:', error);
    }
  }

  static playBooksSound() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Soft page turn sound
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Books sound error:', error);
    }
  }

  static playMusicSound() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      // Musical chord progression
      const frequencies = [261, 329, 392, 523]; // C, E, G, C
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext!.destination);
          
          oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
          gainNode.gain.setValueAtTime(0.15, this.audioContext!.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.3);
          
          oscillator.start(this.audioContext!.currentTime);
          oscillator.stop(this.audioContext!.currentTime + 0.3);
        }, index * 100);
      });
    } catch (error) {
      console.log('Music sound error:', error);
    }
  }

  static playToolsSound() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Tool clank sound
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime + 0.05);
      oscillator.frequency.setValueAtTime(250, this.audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Tools sound error:', error);
    }
  }

  static playArtSound() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Artistic brush stroke sound
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Art sound error:', error);
    }
  }

  // Button click sounds
  static playButtonClick() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Button click sound error:', error);
    }
  }

  // Notification sounds
  static playNotification() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Notification sound error:', error);
    }
  }

  // Success sounds
  static playSuccess() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Success sound error:', error);
    }
  }

  // Error sounds
  static playError() {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Error sound error:', error);
    }
  }
}

export default SoundEffects;
