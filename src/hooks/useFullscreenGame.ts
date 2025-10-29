import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle fullscreen mode for games
 * Automatically enters fullscreen when game starts
 * Exits fullscreen when game ends
 */
export function useFullscreenGame(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wasFullscreen = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const enterFullscreen = async () => {
      try {
        const element = document.documentElement; // Use the whole document for fullscreen
        
        if (!document.fullscreenElement) {
          // Try different fullscreen methods for browser compatibility
          if (element.requestFullscreen) {
            await element.requestFullscreen();
          } else if ((element as any).webkitRequestFullscreen) {
            await (element as any).webkitRequestFullscreen();
          } else if ((element as any).mozRequestFullScreen) {
            await (element as any).mozRequestFullScreen();
          } else if ((element as any).msRequestFullscreen) {
            await (element as any).msRequestFullscreen();
          }
          
          wasFullscreen.current = true;
          console.log('✅ Entered fullscreen mode for game');
        }
      } catch (error) {
        console.log('⚠️ Could not enter fullscreen:', error);
        // Not a critical error - game can still be played
      }
    };

    const exitFullscreen = async () => {
      try {
        if (document.fullscreenElement && wasFullscreen.current) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
          
          wasFullscreen.current = false;
          console.log('✅ Exited fullscreen mode');
        }
      } catch (error) {
        console.log('⚠️ Could not exit fullscreen:', error);
      }
    };

    if (isActive) {
      // Enter fullscreen when game becomes active
      enterFullscreen();
    } else {
      // Exit fullscreen when game becomes inactive
      exitFullscreen();
    }

    // Cleanup: exit fullscreen when component unmounts
    return () => {
      exitFullscreen();
    };
  }, [isActive]);

  // Handle ESC key to exit fullscreen gracefully
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && wasFullscreen.current) {
        console.log('🚪 User exited fullscreen manually');
        wasFullscreen.current = false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return containerRef;
}

/**
 * Utility function to manually enter fullscreen
 */
export async function enterFullscreen() {
  try {
    const element = document.documentElement;
    
    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      console.log('✅ Entered fullscreen mode');
      return true;
    }
    return false;
  } catch (error) {
    console.log('⚠️ Could not enter fullscreen:', error);
    return false;
  }
}

/**
 * Utility function to manually exit fullscreen
 */
export async function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      console.log('✅ Exited fullscreen mode');
      return true;
    }
    return false;
  } catch (error) {
    console.log('⚠️ Could not exit fullscreen:', error);
    return false;
  }
}

/**
 * Check if currently in fullscreen mode
 */
export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

