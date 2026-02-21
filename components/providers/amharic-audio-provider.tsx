// components/providers/amharic-audio-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AmharicAudioManager from '@/lib/amharic-audio-manager';

interface AmharicAudioContextType {
  playNumber: (number: number, callback?: () => void) => void;
  isReady: boolean;
  isMobile: boolean;
  unlockAudio: () => Promise<boolean>;
  userInteracted: boolean;
  getAmharicText: (number: number) => string;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  isMuted: boolean;
  volume: number;
}

const AmharicAudioContext = createContext<AmharicAudioContextType | undefined>(undefined);

export const useAmharicAudio = () => {
  const context = useContext(AmharicAudioContext);
  if (!context) {
    throw new Error('useAmharicAudio must be used within AmharicAudioProvider');
  }
  return context;
};

interface AmharicAudioProviderProps {
  children: ReactNode;
}

export const AmharicAudioProvider: React.FC<AmharicAudioProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  
  const audioManager = useRef(AmharicAudioManager);
  const unlockAttempted = useRef(false);
  const unlockPromptTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Detect mobile
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    
    if (!mobile) {
      // Desktop - audio is ready immediately
      setUserInteracted(true);
      setIsReady(true);
      audioManager.current.setUserInteracted();
    } else {
      // Show unlock prompt after 2 seconds on mobile
      unlockPromptTimer.current = setTimeout(() => {
        if (!userInteracted) {
          setShowUnlockPrompt(true);
        }
      }, 2000);
    }

    return () => {
      if (unlockPromptTimer.current) {
        clearTimeout(unlockPromptTimer.current);
      }
    };
  }, [userInteracted]);

  // Global click handler for mobile unlock
  useEffect(() => {
    if (!isMobile || userInteracted) return;

    const handleUserInteraction = async () => {
      if (!unlockAttempted.current) {
        unlockAttempted.current = true;
        setShowUnlockPrompt(false);
        
        const success = await audioManager.current.unlockAudio();
        if (success) {
          setUserInteracted(true);
          setIsReady(true);
        }
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [isMobile, userInteracted]);

  const playNumber = (number: number, callback?: () => void) => {
    audioManager.current.playNumber(number, callback);
  };

  const unlockAudio = async () => {
    setShowUnlockPrompt(false);
    const success = await audioManager.current.unlockAudio();
    if (success) {
      setUserInteracted(true);
      setIsReady(true);
    }
    return success;
  };

  const getAmharicText = (number: number): string => {
    return audioManager.current.getAmharicText(number);
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    audioManager.current.setVolume(newVolume);
  };

  const setMuted = (muted: boolean) => {
    setIsMuted(muted);
    audioManager.current.setMuted(muted);
  };

  return (
    <AmharicAudioContext.Provider
      value={{
        playNumber,
        isReady,
        isMobile,
        unlockAudio,
        userInteracted,
        getAmharicText,
        setVolume,
        setMuted,
        isMuted,
        volume,
      }}
    >
      {children}
      
      {/* Mobile Unlock Prompt */}
      {showUnlockPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            textAlign: 'center',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease',
            border: '2px solid rgba(255,255,255,0.2)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎤</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            የአማርኛ ድምጽ ማግበር (Enable Amharic Voice)
          </h3>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
            እባክዎ ድምጹን ለማግበር ማያ ገጹን ነካ ያድርጉ
          </p>
          <button
            onClick={unlockAudio}
            style={{
              background: 'white',
              color: '#6d28d9',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            አሁን አግብር (Enable Now)
          </button>
        </div>
      )}
    </AmharicAudioContext.Provider>
  );
};