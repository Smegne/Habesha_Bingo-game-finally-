// components/providers/tts-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import TTSManager from '@/lib/tts-manager';

interface TTSContextType {
  speak: (number: number, options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }) => Promise<void>;
  isReady: boolean;
  isPlaying: boolean;
  isMobile: boolean;
  unlockAudio: () => Promise<boolean>;
  userInteracted: boolean;
  setVolume: (volume: number) => void;
  mute: (muted: boolean) => void;
  stop: () => void;
  preloadNumbers: (numbers?: number[]) => Promise<void>;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within TTSProvider');
  }
  return context;
};

interface TTSProviderProps {
  children: ReactNode;
  autoPreload?: boolean;
  preloadCount?: number;
}

export const TTSProvider: React.FC<TTSProviderProps> = ({ 
  children, 
  autoPreload = true,
  preloadCount = 20 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const ttsManager = useRef(TTSManager);
  const unlockAttempted = useRef(false);

  useEffect(() => {
    // Detect mobile
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    
    // Set up global interaction handler for mobile
    if (mobile) {
      const handleInteraction = async () => {
        if (!unlockAttempted.current) {
          unlockAttempted.current = true;
          const success = await ttsManager.current.unlockAudio();
          if (success) {
            setUserInteracted(true);
            setIsReady(true);
            
            // Auto-preload if enabled
            if (autoPreload) {
              const numbers = Array.from({ length: preloadCount }, (_, i) => i + 1);
              ttsManager.current.preloadNumbers(numbers);
            }
          }
        }
      };
      
      document.addEventListener('click', handleInteraction);
      document.addEventListener('touchstart', handleInteraction);
      
      return () => {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
      };
    } else {
      // Desktop - ready immediately
      setUserInteracted(true);
      setIsReady(true);
      
      // Preload on desktop
      if (autoPreload) {
        const numbers = Array.from({ length: preloadCount }, (_, i) => i + 1);
        ttsManager.current.preloadNumbers(numbers);
      }
    }
    
    // Cleanup on unmount
    return () => {
      ttsManager.current.stop();
      ttsManager.current.clearCache();
    };
  }, [autoPreload, preloadCount]);

  const speak = useCallback(async (number: number, options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }) => {
    if (!userInteracted && isMobile) {
      console.log('Waiting for user interaction');
      return;
    }
    
    setIsPlaying(true);
    options?.onStart?.();
    
    await ttsManager.current.speak(number, {
      ...options,
      onEnd: () => {
        setIsPlaying(false);
        options?.onEnd?.();
      },
      onError: (error) => {
        setIsPlaying(false);
        options?.onError?.(error);
      }
    });
  }, [userInteracted, isMobile]);

  const unlockAudio = useCallback(async () => {
    const success = await ttsManager.current.unlockAudio();
    if (success) {
      setUserInteracted(true);
      setIsReady(true);
    }
    return success;
  }, []);

  const setVolume = useCallback((volume: number) => {
    ttsManager.current.setVolume(volume);
  }, []);

  const mute = useCallback((muted: boolean) => {
    ttsManager.current.mute(muted);
  }, []);

  const stop = useCallback(() => {
    ttsManager.current.stop();
    setIsPlaying(false);
  }, []);

  const preloadNumbers = useCallback(async (numbers?: number[]) => {
    await ttsManager.current.preloadNumbers(numbers);
  }, []);

  return (
    <TTSContext.Provider
      value={{
        speak,
        isReady,
        isPlaying,
        isMobile,
        unlockAudio,
        userInteracted,
        setVolume,
        mute,
        stop,
        preloadNumbers,
      }}
    >
      {children}
      
      {/* Mobile unlock prompt */}
      {isMobile && !userInteracted && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            textAlign: 'center',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
            animation: 'slideUp 0.5s ease',
            border: '2px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎤</div>
          <p style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            የአማርኛ ድምጽ ማግበር
          </p>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
            Tap anywhere to enable the Amharic caller voice
          </p>
          <button
            onClick={() => unlockAudio()}
            style={{
              background: 'white',
              color: '#8b5cf6',
              border: 'none',
              borderRadius: '30px',
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            Enable Voice 🎤
          </button>
        </div>
      )}
    </TTSContext.Provider>
  );
};