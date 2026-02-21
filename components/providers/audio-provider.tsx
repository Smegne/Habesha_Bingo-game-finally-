// components/providers/audio-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AudioManager from '@/lib/audio-manager';

interface AudioContextType {
  playNumber: (number: number, callback?: () => void) => void;
  isAudioReady: boolean;
  isMobile: boolean;
  unlockAudio: () => Promise<boolean>;
  userInteracted: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioManager = useRef(AudioManager);
  const unlockAttempted = useRef(false);

  useEffect(() => {
    // Detect mobile
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    
    // Set up global click handler for mobile unlock
    if (mobile) {
      const handleUserInteraction = () => {
        if (!unlockAttempted.current) {
          unlockAttempted.current = true;
          audioManager.current.unlockAudio().then(() => {
            setUserInteracted(true);
            setIsAudioReady(true);
          });
        }
      };
      
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      
      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    } else {
      // Desktop - audio is ready immediately
      setUserInteracted(true);
      setIsAudioReady(true);
    }
  }, []);

  const playNumber = (number: number, callback?: () => void) => {
    audioManager.current.playNumber(number, callback);
  };

  const unlockAudio = () => {
    return audioManager.current.unlockAudio().then((success) => {
      if (success) {
        setUserInteracted(true);
        setIsAudioReady(true);
      }
      return success;
    });
  };

  return (
    <AudioContext.Provider
      value={{
        playNumber,
        isAudioReady,
        isMobile,
        unlockAudio,
        userInteracted,
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
            background: '#3b82f6',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center',
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease',
          }}
        >
          <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            🔊 Tap to Enable Sound
          </p>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>
            Tap anywhere on the screen to enable the caller voice
          </p>
        </div>
      )}
    </AudioContext.Provider>
  );
};