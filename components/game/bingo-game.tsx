// components/game/bingo-game.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import "./bingo-game.css"

// Interfaces
interface SpeechSynthesisWindow extends Window {
  speechSynthesis?: SpeechSynthesis;
}

interface BingoCardData {
  columns: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  };
  numbers: Array<{
    col: number;
    row: number;
    index: number;
    letter: string;
    number: number | string;
    isFree?: boolean;
  }>;
  generatedAt: string;
  cartelaNumber: string;
}

interface CurrentGameData {
  bingoCard: {
    id: number;
    cartelaId: number;
    userId: string;
    cardData: BingoCardData;
    cardNumber: number;
    createdAt: string;
  };
  cartela: {
    id: number;
    cartelaNumber: string;
    isAvailable: boolean;
  };
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface WinDetails {
  isFirstWinner?: boolean;
  position?: number;
  prizeAmount?: number;
  message?: string;
  winType?: string;
  winPattern?: number[];
}

interface MultiplayerSession {
  code: string;
  userId: string;
  sessionId: number;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
}

interface Player {
  user_id: string;
  username?: string;
  first_name?: string;
  player_status: string;
}

// Environment detection
const detectEnvironment = (): string => {
  if (typeof window === 'undefined') return 'server';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('telegram')) {
    return 'telegram';
  } else if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  } else {
    return 'desktop';
  }
};

// Speech synthesis support check
const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const win = window as SpeechSynthesisWindow;
  
  if (!('speechSynthesis' in win)) return false;
  if (!win.speechSynthesis) return false;
  
  try {
    const voices = win.speechSynthesis.getVoices();
    return Array.isArray(voices);
  } catch (error) {
    console.warn('Speech synthesis check failed:', error);
    return false;
  }
};

// Custom hook for safe speech synthesis
const useSafeSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false);
  const userInteractedRef = useRef(false);
  
  const handleUserInteraction = useCallback(() => {
    userInteractedRef.current = true;
    setIsReady(true);
    
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  }, []);

  useEffect(() => {
    if (detectEnvironment() === 'mobile') {
      console.log('📱 Mobile detected - waiting for user interaction');
      setRequiresUserInteraction(true);
      
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      
      setTimeout(() => {
        if (!userInteractedRef.current) {
          console.log('⏳ Waiting for user tap/click to enable sound...');
        }
      }, 100);
    } else {
      setIsReady(true);
    }
    
    const checkSupport = () => {
      const supported = isSpeechSynthesisSupported();
      setIsSupported(supported);
      
      if (supported && window.speechSynthesis) {
        setSynth(window.speechSynthesis);
        
        const loadVoices = () => {
          try {
            const availableVoices = window.speechSynthesis!.getVoices();
            setVoices(availableVoices);
            
            if (availableVoices.length > 0) {
              let preferredVoice = availableVoices[0];
              
              if (detectEnvironment() === 'mobile') {
                const mobileVoice = availableVoices.find(v => 
                  v.lang.includes('en') && 
                  (v.name.toLowerCase().includes('compact') || 
                   v.name.toLowerCase().includes('siri') ||
                   v.name.toLowerCase().includes('google'))
                );
                if (mobileVoice) preferredVoice = mobileVoice;
              } else {
                const desktopVoice = availableVoices.find(v => 
                  v.lang.includes('en') && 
                  !v.name.toLowerCase().includes('compact')
                );
                if (desktopVoice) preferredVoice = desktopVoice;
              }
              
              setSelectedVoice(preferredVoice);
              console.log('✅ Speech synthesis initialized with', availableVoices.length, 'voices');
              console.log('🎙️ Selected voice:', preferredVoice.name);
            }
          } catch (error) {
            console.error('Error loading voices:', error);
          }
        };
        
        loadVoices();
        
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        setTimeout(loadVoices, 1000);
      } else {
        console.warn('⚠️ Speech synthesis not supported in this environment');
      }
    };
    
    if (typeof window !== 'undefined') {
      setTimeout(checkSupport, 100);
    }
    
    return () => {
      if (synth) synth.cancel();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [handleUserInteraction, synth]);
  
  return { 
    isSupported, 
    isReady: isReady || !requiresUserInteraction,
    requiresUserInteraction,
    userInteractedRef,
    synth, 
    selectedVoice, 
    voices 
  };
};

export default function BingoGame() {
  // Core game state
  const [called, setCalled] = useState<number[]>([]);
  const [cardMatrix, setCardMatrix] = useState<Array<Array<any>>>([]);
  const [isWinner, setIsWinner] = useState(false);
  const [recentCalls, setRecentCalls] = useState<string[]>(["—", "—", "—"]);
  
  // Game data state
  const [gameState, setGameState] = useState<CurrentGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winDetails, setWinDetails] = useState<WinDetails | null>(null);
  
  // Multiplayer state
  const [multiplayerSession, setMultiplayerSession] = useState<MultiplayerSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected');
  const [syncedCalled, setSyncedCalled] = useState<number[]>([]);
  
  // Game status and countdown
  const [gameStatus, setGameStatus] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');
  const [countdown, setCountdown] = useState<number>(50);
  const [playersReady, setPlayersReady] = useState<Record<string, boolean>>({});
  
  // Auto-call settings - NOW EVERYONE CAN AUTO-CALL
  const [callInterval] = useState<number>(3000); // 3 seconds default
  const [isAutoCalling, setIsAutoCalling] = useState<boolean>(false);
  const [autoToggle, setAutoToggle] = useState(true); // For single player mode
  
  // Audio settings
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  
  // Environment
  const [environment, setEnvironment] = useState<string>('unknown');
  const [showMobileSoundPrompt, setShowMobileSoundPrompt] = useState(false);
  
  // Speech synthesis
  const { 
    isSupported: isSpeechSupported, 
    isReady: isSpeechReady,
    requiresUserInteraction,
    userInteractedRef,
    synth: safeSynth, 
    selectedVoice: safeSelectedVoice 
  } = useSafeSpeechSynthesis();
  
  // Refs
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isSpeakingRef = useRef(false);
  const isCallingRef = useRef(false);
  const classicGridRef = useRef<HTMLDivElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null); // For single player
  const hasInitializedRef = useRef(false);

  // ==================== INITIALIZATION ====================

  // Initialize component
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const init = async () => {
      await fetchCurrentGame();
      
      // Get multiplayer session info
      const storedSession = localStorage.getItem('multiplayerSession');
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          setMultiplayerSession(session);
          console.log('Multiplayer session loaded:', session);
        } catch (e) {
          console.error('Failed to parse multiplayer session:', e);
        }
      }
      
      // Initialize fallback audio for mobile
      if (typeof window !== 'undefined' && detectEnvironment() === 'mobile') {
        clickSoundRef.current = new Audio();
        clickSoundRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ';
        clickSoundRef.current.load();
        
        const promptTimer = setTimeout(() => {
          if (requiresUserInteraction && !userInteractedRef.current) {
            setShowMobileSoundPrompt(true);
          }
        }, 2000);
        
        return () => clearTimeout(promptTimer);
      }
    };

    init();

    return () => {
      // Cleanup all intervals and timeouts
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (autoCallIntervalRef.current) clearInterval(autoCallIntervalRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // Environment detection
  useEffect(() => {
    const env = detectEnvironment();
    setEnvironment(env);
    console.log('🌍 Detected environment:', env);
    
    if (env === 'telegram') {
      console.log('⚠️ Running in Telegram WebView - applying compatibility fixes');
      if (!isSpeechSupported) {
        console.log('🔇 Speech not supported in Telegram, forcing silent mode');
        setIsMuted(true);
      }
    } else if (env === 'mobile') {
      console.log('📱 Mobile browser detected - adjusting for mobile autoplay policies');
      setVolume(0.7);
      setIsMuted(false);
    }
  }, [isSpeechSupported]);

  // Sync speech synthesis refs
  useEffect(() => {
    if (isSpeechSupported && safeSynth) {
      synthRef.current = safeSynth;
    }
    if (safeSelectedVoice) {
      selectedVoiceRef.current = safeSelectedVoice;
    }
  }, [isSpeechSupported, safeSynth, safeSelectedVoice]);

  // Auto-hide mobile sound prompt
  useEffect(() => {
    if (showMobileSoundPrompt && userInteractedRef.current) {
      const timer = setTimeout(() => setShowMobileSoundPrompt(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showMobileSoundPrompt, userInteractedRef.current]);

  // ==================== MULTIPLAYER SYNC ====================

  // Sync called numbers from server
  const syncCalledNumbers = useCallback(async () => {
    if (!multiplayerSession?.code) return;

    try {
      setConnectionStatus('syncing');
      
      const response = await fetch(`/api/game/sessions?code=${multiplayerSession.code}&userId=${gameState?.user?.id}`);
      const data = await response.json();

      if (data.success && data.session) {
        const serverCalled = data.session.calledNumbers || [];
        setPlayers(data.players || []);
        
        // Update game status
        const serverStatus = data.session.status;
        let newStatus: 'waiting' | 'countdown' | 'playing' | 'finished' = 'waiting';
        
        if (serverStatus === 'active') {
          newStatus = 'playing';
        } else if (serverStatus === 'countdown') {
          newStatus = 'countdown';
          setCountdown(data.session.countdownRemaining || 50);
        } else if (serverStatus === 'finished') {
          newStatus = 'finished';
          stopAutoCalling();
        }
        
        if (newStatus !== gameStatus) {
          setGameStatus(newStatus);
          
          if (newStatus === 'playing' && gameStatus !== 'playing') {
            console.log('🎮 Game started!');
            if (!isMuted && isSpeechReady) {
              speak("Game started! Numbers will be called automatically!");
            }
          }
        }
        
        // Update player ready status
        const readyState: Record<string, boolean> = {};
        data.players?.forEach((p: Player) => {
          readyState[p.user_id] = p.player_status === 'ready' || p.player_status === 'playing';
        });
        setPlayersReady(readyState);
        
        // Update called numbers if changed
        if (JSON.stringify(serverCalled) !== JSON.stringify(syncedCalled)) {
          console.log('Syncing called numbers from server:', serverCalled);
          setCalled(serverCalled);
          setSyncedCalled(serverCalled);
          
          if (serverCalled.length > 0) {
            const newRecent = [...recentCalls];
            const lastNum = serverCalled[serverCalled.length - 1];
            const letter = getLetter(lastNum);
            newRecent.unshift(`${letter}-${lastNum}`);
            newRecent.pop();
            setRecentCalls(newRecent);
          }
          
          updateCardMatches(serverCalled);
        }
        
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Failed to sync called numbers:', error);
      setConnectionStatus('disconnected');
    }
  }, [multiplayerSession, gameState, gameStatus, syncedCalled, recentCalls, isMuted, isSpeechReady]);

  // Start multiplayer sync
  useEffect(() => {
    if (!multiplayerSession?.code || !multiplayerSession?.sessionId) return;

    console.log('Starting multiplayer sync for session:', multiplayerSession.code);
    setConnectionStatus('connected');

    syncCalledNumbers();
    syncIntervalRef.current = setInterval(syncCalledNumbers, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [multiplayerSession, syncCalledNumbers]);

  // ==================== COUNTDOWN TIMER ====================

  useEffect(() => {
    if (gameStatus === 'countdown' && countdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setGameStatus('playing');
            clearInterval(countdownTimerRef.current!);
            
            if (!isMuted && isSpeechReady) {
              speak("Game started! Numbers will be called automatically!");
            }
            
            // Start auto-calling for everyone when game starts
            if (multiplayerSession) {
              startAutoCalling();
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
      };
    }
  }, [gameStatus, countdown, isMuted, isSpeechReady, multiplayerSession]);

  // ==================== AUTO-CALLING LOGIC - EVERYONE CAN AUTO-CALL ====================

  const startAutoCalling = useCallback(() => {
    // In multiplayer, everyone can auto-call
    // We just need to make sure we don't double-call the same number
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
    }
    
    setIsAutoCalling(true);
    console.log('🎮 Started auto-calling');
    
    autoCallIntervalRef.current = setInterval(() => {
      if (gameStatus === 'playing' && !isWinner && called.length < 75) {
        autoCallNextNumber();
      } else if (called.length >= 75) {
        stopAutoCalling();
      }
    }, callInterval);
  }, [gameStatus, isWinner, called.length, callInterval]);

  const stopAutoCalling = useCallback(() => {
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
      autoCallIntervalRef.current = null;
    }
    setIsAutoCalling(false);
    console.log('⏹️ Auto-calling stopped');
  }, []);

  const autoCallNextNumber = useCallback(async () => {
    if (isCallingRef.current || isWinner || gameStatus !== 'playing') return;
    
    // Find all numbers that haven't been called yet
    const availableNumbers = [];
    for (let i = 1; i <= 75; i++) {
      if (!called.includes(i)) {
        availableNumbers.push(i);
      }
    }
    
    if (availableNumbers.length === 0) return;
    
    // Pick a RANDOM number from available numbers
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const nextNumber = availableNumbers[randomIndex];
    
    console.log(`🎲 Auto-calling random number: ${nextNumber}`);
    await callNumber(nextNumber);
  }, [called, isWinner, gameStatus]);

  // Handle auto toggle for single player
  useEffect(() => {
    if (multiplayerSession) return; // Don't use this in multiplayer
    
    if (autoToggle && !isWinner && gameStatus === 'playing') {
      autoTimerRef.current = setInterval(() => {
        if (called.length >= 75 || isCallingRef.current || isWinner) {
          if (called.length >= 75) {
            clearInterval(autoTimerRef.current!);
            setAutoToggle(false);
          }
          return;
        }
        
        // Find random uncalled number
        let n;
        do {
          n = Math.floor(Math.random() * 75) + 1;
        } while (called.includes(n));
        
        callNumber(n);
      }, 3000);
      
      return () => {
        if (autoTimerRef.current) {
          clearInterval(autoTimerRef.current);
        }
      };
    } else {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    }
  }, [autoToggle, called, isWinner, multiplayerSession, gameStatus]);

  // ==================== API CALLS ====================

  const fetchCurrentGame = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/game/current', {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      const result: ApiResponse<CurrentGameData> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch game');
      }
      
      if (result.data) {
        setGameState(result.data);
        const matrix = transformCardData(result.data.bingoCard.cardData);
        setCardMatrix(matrix);
        console.log('Game loaded successfully:', result.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load game');
      console.error('Error fetching game:', err);
    } finally {
      setLoading(false);
    }
  };

  const callNumberToServer = async (num: number): Promise<{success: boolean; calledNumbers?: number[]; alreadyCalled?: boolean}> => {
    if (!multiplayerSession?.sessionId || !gameState?.user?.id) {
      return { success: false };
    }

    try {
      const response = await fetch('/api/game/call-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: multiplayerSession.sessionId,
          number: num,
          userId: gameState.user.id,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to call number to server:', error);
      return { success: false };
    }
  };

  const declareWinToServer = async (winType: string, pattern: number[]): Promise<boolean> => {
    if (!multiplayerSession?.sessionId || !gameState?.user?.id) return false;

    try {
      const response = await fetch('/api/game/declare-win', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          sessionId: multiplayerSession.sessionId,
          userId: gameState.user.id,
          winType,
          pattern,
          calledNumbers: called,
          cartelaNumber: gameState.cartela.cartelaNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('Win declared successfully:', data);
        
        if (data.winDetails) {
          setWinDetails(data.winDetails);
          
          if (data.winDetails.isFirstWinner) {
            setGameStatus('finished');
            stopAutoCalling();
          }
        }
        
        return true;
      } else {
        console.log('Win declaration rejected:', data.message);
        
        if (data.message?.includes('already won')) {
          alert('Someone else already won this round!');
          setGameStatus('finished');
          stopAutoCalling();
        }
        
        return false;
      }
    } catch (error) {
      console.error('Failed to declare win:', error);
      return false;
    }
  };

  const readyUp = async () => {
    if (!multiplayerSession?.sessionId || !gameState?.user?.id) return;
    
    try {
      const response = await fetch('/api/game/ready', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          sessionId: multiplayerSession.sessionId,
          userId: gameState.user.id,
          ready: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Ready status updated');
      }
    } catch (error) {
      console.error('Failed to ready up:', error);
    }
  };

  // ==================== GAME LOGIC ====================

  const transformCardData = (cardData: BingoCardData) => {
    const matrix = [];
    
    for (let row = 0; row < 5; row++) {
      const rowArray = [];
      for (let col = 0; col < 5; col++) {
        rowArray.push({
          text: '',
          num: null,
          isMatch: false,
          isWin: false,
          row,
          col
        });
      }
      matrix.push(rowArray);
    }
    
    cardData.numbers.forEach(cell => {
      if (cell.row !== undefined && cell.col !== undefined) {
        matrix[cell.row][cell.col] = {
          text: cell.isFree ? 'FREE' : cell.number,
          num: cell.isFree ? null : Number(cell.number),
          isMatch: cell.isFree || false,
          isWin: false,
          row: cell.row,
          col: cell.col
        };
      }
    });
    
    return matrix;
  };

  const updateCardMatches = (calledNumbers: number[]) => {
    setCardMatrix(prevMatrix => {
      const newMatrix = JSON.parse(JSON.stringify(prevMatrix)); // Deep copy
      
      newMatrix.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          if (cell.num && calledNumbers.includes(cell.num)) {
            newMatrix[rowIndex][colIndex] = {
              ...cell,
              isMatch: true
            };
          }
        });
      });
      
      // Check for win after updating matches
      setTimeout(() => {
        checkWin(newMatrix);
      }, 100);
      
      return newMatrix;
    });
  };

  const getLetter = (n: number): string => {
    if (n <= 15) return "B";
    if (n <= 30) return "I";
    if (n <= 45) return "N";
    if (n <= 60) return "G";
    return "O";
  };

  const getNumberWord = (num: number): string => {
    const words = [
      'zero', 'one', 'two', 'three', 'four', 'five', 
      'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
      'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'
    ];
    
    const tensWords = [
      '', '', 'twenty', 'thirty', 'forty', 'fifty', 
      'sixty', 'seventy', 'eighty', 'ninety'
    ];
    
    if (num <= 20) return words[num];
    if (num < 100) {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      if (ones === 0) return tensWords[tens];
      return tensWords[tens] + ' ' + words[ones];
    }
    return num.toString();
  };

  const speak = (text: string, callback?: () => void) => {
    const canSpeak = isSpeechSupported && 
                     selectedVoiceRef.current && 
                     synthRef.current && 
                     !isSpeakingRef.current && 
                     !isMuted &&
                     isSpeechReady;
    
    if (!canSpeak) {
      console.log('Speech skipped');
      
      if (environment === 'mobile' && !isMuted && isSpeechReady) {
        playMobileFallbackSound();
      }
      
      if (callback) {
        setTimeout(callback, 100);
      }
      return;
    }
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoiceRef.current;
      
      if (environment === 'mobile') {
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = volume * 0.9;
      } else {
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        utterance.volume = volume;
      }
      
      isSpeakingRef.current = true;
      
      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (callback) callback();
      };
      
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        isSpeakingRef.current = false;
        
        if (environment === 'mobile') {
          playMobileFallbackSound();
        }
        
        if (callback) callback();
      };
      
      synthRef.current.cancel();
      
      setTimeout(() => {
        synthRef.current!.speak(utterance);
      }, environment === 'mobile' ? 50 : 0);
      
    } catch (error) {
      console.error('Failed to create speech utterance:', error);
      isSpeakingRef.current = false;
      
      if (environment === 'mobile') {
        playMobileFallbackSound();
      }
      
      if (callback) callback();
    }
  };

  const playMobileFallbackSound = () => {
    try {
      if (clickSoundRef.current && !isMuted) {
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.volume = volume;
        clickSoundRef.current.play().catch(e => {
          console.log('Mobile fallback sound failed:', e);
        });
      }
    } catch (error) {
      console.log('Fallback sound error:', error);
    }
  };

  const speakBingoNumber = (num: number, callback?: () => void) => {
    const letter = getLetter(num);
    let numberText: string;
    
    if (num <= 20 || num % 10 === 0) {
      numberText = getNumberWord(num);
    } else {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      numberText = `${getNumberWord(tens * 10)} ${getNumberWord(ones)}`;
    }
    
    const speakText = environment === 'mobile' 
      ? `${letter} ${num}`
      : `${letter} ${numberText}`;
    
    speak(speakText, callback);
  };

  const callNumber = async (num: number) => {
    if (gameStatus !== 'playing') {
      console.log('Game has not started yet');
      if (gameStatus === 'countdown') {
        alert(`Game starts in ${countdown} seconds. Please wait!`);
      } else if (gameStatus === 'waiting') {
        alert('Waiting for game to start...');
      }
      return;
    }

    if (called.includes(num) || isCallingRef.current || isWinner) {
      if (called.includes(num)) {
        console.log(`Number ${num} already called`);
      }
      return;
    }

    if (multiplayerSession) {
      isCallingRef.current = true;
      
      const result = await callNumberToServer(num);
      
      if (result.success) {
        if (result.alreadyCalled) {
          console.log('Number was already called by another player');
          isCallingRef.current = false;
          return;
        }
        
        console.log(`✅ Number ${num} called successfully`);
        
        // Server will sync via interval, but we can optimistically update
        if (result.calledNumbers) {
          setCalled(result.calledNumbers);
          updateCardMatches(result.calledNumbers);
          
          // Update recent calls
          const letter = getLetter(num);
          setRecentCalls(prev => {
            const newRecent = [ `${letter}-${num}`, ...prev.slice(0, 2) ];
            return newRecent;
          });
        }
        
        speakBingoNumber(num, () => {
          isCallingRef.current = false;
        });
      } else {
        console.log('Failed to call number');
        isCallingRef.current = false;
      }
    } else {
      // Single player mode
      isCallingRef.current = true;
      
      const newCalled = [...called, num];
      setCalled(newCalled);
      
      const letter = getLetter(num);
      const displayText = `${letter}-${num}`;
      
      setRecentCalls(prev => {
        const newRecent = [displayText, ...prev.slice(0, 2)];
        return newRecent;
      });
      
      const newCardMatrix = JSON.parse(JSON.stringify(cardMatrix)); // Deep copy
      let cellUpdated = false;
      
      newCardMatrix.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          if (cell.num === num) {
            newCardMatrix[rowIndex][colIndex] = {
              ...cell,
              isMatch: true
            };
            cellUpdated = true;
          }
        });
      });
      
      setCardMatrix(newCardMatrix);
      
      speakBingoNumber(num, () => {
        isCallingRef.current = false;
        
        if (cellUpdated) {
          checkWin(newCardMatrix);
        }
      });
    }
  };

  const checkWin = (matrix: any[][] = cardMatrix): boolean => {
    const wins: {
      type: string;
      cells: any[];
      pattern: number[];
    }[] = [];
    
    // Check rows
    for (let r = 0; r < 5; r++) {
      if (matrix[r].every((cell: any) => cell.isMatch)) {
        const cells = matrix[r];
        wins.push({
          type: 'horizontal',
          cells: cells,
          pattern: cells.map((cell: any) => cell.row * 5 + cell.col)
        });
      }
    }
    
    // Check columns
    for (let c = 0; c < 5; c++) {
      const col = [];
      for (let r = 0; r < 5; r++) col.push(matrix[r][c]);
      if (col.every((cell: any) => cell.isMatch)) {
        wins.push({
          type: 'vertical',
          cells: col,
          pattern: col.map((cell: any) => cell.row * 5 + cell.col)
        });
      }
    }
    
    // Check main diagonal
    const diag1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]];
    if (diag1.every((cell: any) => cell.isMatch)) {
      wins.push({
        type: 'diagonal',
        cells: diag1,
        pattern: diag1.map((cell: any) => cell.row * 5 + cell.col)
      });
    }
    
    // Check other diagonal
    const diag2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]];
    if (diag2.every((cell: any) => cell.isMatch)) {
      wins.push({
        type: 'diagonal',
        cells: diag2,
        pattern: diag2.map((cell: any) => cell.row * 5 + cell.col)
      });
    }
    
    // Check four corners
    const corners = [matrix[0][0], matrix[0][4], matrix[4][0], matrix[4][4]];
    if (corners.every((cell: any) => cell.isMatch)) {
      wins.push({
        type: 'corners',
        cells: corners,
        pattern: corners.map((cell: any) => cell.row * 5 + cell.col)
      });
    }
    
    // Check full house
    const allCells = matrix.flat();
    const allMarked = allCells.every((cell: any) => cell.isMatch || cell.text === 'FREE');
    if (allMarked) {
      wins.push({
        type: 'full-house',
        cells: allCells,
        pattern: allCells.map((cell: any) => cell.row * 5 + cell.col)
      });
    }
    
    if (wins.length > 0) {
      console.log('🎉 BINGO DETECTED!', wins);
      
      // Mark winning cells
      const newMatrix = JSON.parse(JSON.stringify(matrix)); // Deep copy
      
      wins.forEach(win => {
        win.cells.forEach((winCell: any) => {
          newMatrix.forEach((row: any[], rowIndex: number) => {
            row.forEach((cell: any, colIndex: number) => {
              if (cell === winCell || 
                  (cell.row === winCell.row && cell.col === winCell.col)) {
                newMatrix[rowIndex][colIndex] = {
                  ...cell,
                  isWin: true
                };
              }
            });
          });
        });
      });
      
      setCardMatrix(newMatrix);
      
      // Stop auto-calling
      stopAutoCalling();
      setAutoToggle(false);
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      
      setIsWinner(true);
      
      // Speak win message
      const winTypes = wins.map(w => w.type).join(', ');
      const winMessage = `BINGO! ${winTypes.toUpperCase()}! Congratulations ${gameState?.user?.username || ''}!`;
      
      setTimeout(() => {
        speak(winMessage);
      }, 300);
      
      // Declare win to server
      if (wins.length > 0 && multiplayerSession) {
        const firstWin = wins[0];
        declareWinToServer(firstWin.type, firstWin.pattern);
      }
      
      return true;
    }
    
    return false;
  };

  // ==================== UI HANDLERS ====================

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (synthRef.current) {
      synthRef.current.cancel();
      isSpeakingRef.current = false;
    }
  };

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState && synthRef.current) {
      synthRef.current.cancel();
      isSpeakingRef.current = false;
    }
    
    if (!newMutedState && environment === 'mobile' && isSpeechReady) {
      setTimeout(() => {
        speak("Sound enabled");
      }, 100);
    }
  };

  const testSound = () => {
    if (isMuted) {
      alert("Please unmute first to test sound");
      return;
    }
    
    if (environment === 'mobile' && requiresUserInteraction && !userInteractedRef.current) {
      alert("Please tap anywhere on the screen first to enable sound");
      return;
    }
    
    speak("Testing sound. Bingo number B five");
    
    userInteractedRef.current = true;
    setShowMobileSoundPrompt(false);
  };

  const resetGame = () => {
    setCalled([]);
    setIsWinner(false);
    setWinDetails(null);
    setRecentCalls(["—", "—", "—"]);
    
    stopAutoCalling();
    setAutoToggle(!multiplayerSession);
    
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    
    if (gameState) {
      const matrix = transformCardData(gameState.bingoCard.cardData);
      setCardMatrix(matrix);
    }
    
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const handleLeaveGame = async () => {
    if (!confirm('Are you sure you want to leave the game?')) return;

    try {
      if (multiplayerSession?.sessionId && gameState?.user?.id) {
        setConnectionStatus('disconnected');
        
        await fetch('/api/game/leave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            sessionId: multiplayerSession.sessionId,
            userId: gameState.user.id
          })
        });
      }

      // Clear storage
      localStorage.removeItem('multiplayerSession');
      localStorage.removeItem('currentSession');
      localStorage.removeItem('currentBingoCardId');
      localStorage.removeItem('cartelaNumber');
      localStorage.removeItem('cardNumber');
      localStorage.removeItem('bingoGameData');

      // Cleanup
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (autoCallIntervalRef.current) clearInterval(autoCallIntervalRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (synthRef.current) synthRef.current.cancel();

      window.location.href = '/';
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Failed to leave game properly. Please try again.');
      window.location.href = '/';
    }
  };

  const handleClassicGridClick = (num: number) => {
    if (gameStatus !== 'playing') {
      if (gameStatus === 'countdown') {
        alert(`Game starts in ${countdown} seconds. Please wait!`);
      } else {
        alert('Waiting for game to start...');
      }
      return;
    }
    
    // EVERYONE can click and call numbers in multiplayer
    if (!called.includes(num) && !isWinner) {
      console.log(`👆 Player clicked number: ${num}`);
      callNumber(num);
    } else if (called.includes(num)) {
      console.log(`Number ${num} already called`);
    }
  };

  // ==================== RENDER HELPERS ====================

  const getOrdinalSuffix = (n: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  };

  const BingoHeader = () => (
    <div className="bingo-header">
      <div className="bingo-letter b">B</div>
      <div className="bingo-letter i">I</div>
      <div className="bingo-letter n">N</div>
      <div className="bingo-letter g">G</div>
      <div className="bingo-letter o">O</div>
    </div>
  );

  const EnvironmentBadge = () => {
    if (environment === 'telegram') {
      return (
        <div className="environment-badge telegram">
          <span className="badge-icon">📱</span>
          <span className="badge-text">Telegram</span>
         
        </div>
      );
    } else if (environment === 'mobile') {
      return (
        <div className="environment-badge mobile">
          <span className="badge-icon">📱</span>
          <span className="badge-text">Mobile</span>
          {requiresUserInteraction && !userInteractedRef.current && (
            <span className="badge-warning" title="Tap to enable sound">
              👆
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const SpeechSupportIndicator = () => {
    if (!isSpeechReady && requiresUserInteraction) {
      return (
        <div className="speech-indicator waiting" title="Tap anywhere to enable sound">
          <span>👆 Tap to Enable Sound</span>
        </div>
      );
    } else if (isSpeechSupported && isSpeechReady) {
      return (
        <div className="speech-indicator supported" title="Voice features are available">
          <span>{isMuted ? '🔇 Muted' : '🔊 Sound On'}</span>
        </div>
      );
    } else {
      return (
        <div className="speech-indicator unsupported" title="Voice features not available">
          <span>🔇 Sound Off</span>
        </div>
      );
    }
  };

  const MobileSoundPrompt = () => {
    if (!showMobileSoundPrompt || environment !== 'mobile' || userInteractedRef.current) {
      return null;
    }
    
    return (
      <div className="mobile-sound-prompt">
        <div className="prompt-content">
          <div className="prompt-icon">🔊</div>
          <div className="prompt-text">
            <p className="prompt-title">Tap to Enable Sound</p>
            <p className="prompt-description">Tap anywhere on the screen to enable game sounds</p>
          </div>
          <button 
            className="prompt-close"
            onClick={() => setShowMobileSoundPrompt(false)}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // ==================== LOADING STATES ====================

  if (loading) {
    return (
      <div className="bingo-container flex-center">
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Loading your Bingo game...</p>
          {environment === 'mobile' && (
            <p className="mobile-hint">
              Sound will be enabled after you tap the screen
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bingo-container flex-center">
        <div className="error-message">
          <h3>Error Loading Game</h3>
          <p>{error}</p>
          <button 
            onClick={fetchCurrentGame}
            className="control-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="bingo-container flex-center">
        <div className="no-game-message">
          <h3>No Active Game</h3>
          <p>You don't have an active Bingo game.</p>
          <p>Please select a cartela to start playing.</p>
          <a href="/game/select" className="control-button">
            Select Cartela
          </a>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

 return (
  <div 
    className="bingo-game-fullscreen"
    onClick={() => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        setShowMobileSoundPrompt(false);
      }
    }}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#0f172a',
      background: 'linear-gradient(180deg, #2b1b3f, #0f172a)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
      boxSizing: 'border-box',
    }}
  >
    <MobileSoundPrompt />
    
    {/* WIN POPUP */}
    {isWinner && (
      <div 
        className="flex-center"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          zIndex: 1000000
        }}
      >
        <div 
          className="win-popup-content"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a, #22c55e)',
            color: '#000',
            padding: '40px',
            borderRadius: '25px',
            textAlign: 'center',
            maxWidth: '90%',
            width: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '8px solid rgba(255, 255, 255, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.1) 70%)',
            zIndex: 1
          }} />
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '20px',
              animation: 'bounce 1s infinite alternate',
              textShadow: '0 5px 15px rgba(0,0,0,0.3)'
            }}>
              🏆
            </div>
            
            <h1 style={{
              fontSize: '48px',
              fontWeight: 900,
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              background: 'linear-gradient(45deg, #000, #333)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              BINGO!
            </h1>
            
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '25px',
              color: '#1e40af',
              textShadow: '1px 1px 2px rgba(255,255,255,0.5)'
            }}>
              {gameState?.user?.username ? (
                <>
                  CONGRATULATIONS<br />
                  <span style={{
                    color: '#000',
                    display: 'block',
                    fontSize: '32px',
                    marginTop: '5px',
                    textTransform: 'uppercase'
                  }}>
                    {gameState.user.username}!
                  </span>
                </>
              ) : (
                'CONGRATULATIONS!'
              )}
            </div>
            
            {winDetails && (
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                display: 'inline-block'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                  {winDetails.message || `You won with ${winDetails.winType || 'BINGO'}!`}
                </div>
                {winDetails.position && (
                  <div style={{ fontSize: '16px', color: '#475569', marginTop: '5px' }}>
                    Position: {winDetails.position}{getOrdinalSuffix(winDetails.position)}
                  </div>
                )}
                {winDetails.prizeAmount && winDetails.prizeAmount > 0 && (
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', marginTop: '5px' }}>
                    Prize: ${winDetails.prizeAmount.toFixed(2)}
                  </div>
                )}
              </div>
            )}
            
            {gameState?.cartela && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '25px',
                display: 'inline-block'
              }}>
                <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.7)' }}>
                  Winning Cartela
                </div>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: 800,
                  color: '#000'
                }}>
                  #{gameState.cartela.cartelaNumber}
                </div>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center',
              marginTop: '20px'
            }}>
              <button
                onClick={() => {
                  setIsWinner(false);
                  setWinDetails(null);
                  resetGame();
                }}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '15px 30px',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <span style={{ fontSize: '20px' }}>🔄</span>
                Play Again
              </button>
              
              <button
                onClick={() => {
                  setIsWinner(false);
                  setWinDetails(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.3)',
                  border: '3px solid #000',
                  borderRadius: '15px',
                  padding: '15px 30px',
                  color: '#000',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              >
                <span style={{ fontSize: '20px' }}>✕</span>
                Close
              </button>
            </div>
            
            <div style={{
              marginTop: '25px',
              fontSize: '14px',
              color: 'rgba(0,0,0,0.6)',
              fontStyle: 'italic'
            }}>
              Your win has been recorded! 🎊
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Environment indicator */}
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 20
    }}>
      <EnvironmentBadge />
    </div>
    
    {/* Multiplayer Status Bar */}
    {multiplayerSession && (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 20,
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{
          background: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.2)' : 
                      connectionStatus === 'syncing' ? 'rgba(234, 179, 8, 0.2)' : 
                      'rgba(239, 68, 68, 0.2)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          color: connectionStatus === 'connected' ? '#22c55e' : 
                 connectionStatus === 'syncing' ? '#eab308' : 
                 '#ef4444',
          border: `1px solid ${connectionStatus === 'connected' ? '#22c55e' : 
                               connectionStatus === 'syncing' ? '#eab308' : 
                               '#ef4444'}`,
        }}>
          {connectionStatus === 'connected' ? '● Connected' : 
           connectionStatus === 'syncing' ? '⟳ Syncing' : 
           '○ Disconnected'}
        </div>

        {isAutoCalling && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#22c55e',
            border: '1px solid #22c55e',
          }}>
            🔊 Auto-calling Active
          </div>
        )}
      </div>
    )}
    
    {/* TOP STATS BAR */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '8px',
      marginBottom: '10px',
      flexShrink: 0,
    }}>
      <div style={{ background: '#2490e2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px' }}>Cartela</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '2px' }}>{gameState.cartela.cartelaNumber}</div>
      </div>
      <div style={{ background: '#2490e2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px' }}>Card #</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '2px' }}>{gameState.bingoCard.cardNumber}</div>
      </div>
      <div style={{ background: '#2490e2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px' }}>Player</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '2px' }}>{players.length}</div>
      </div>
      <div style={{ background: '#2490e2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px' }}>Called</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '2px' }}>{called.length}/75</div>
      </div>
      <div style={{ background: '#2490e2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px' }}>Status</div>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '14px', 
          marginTop: '2px',
          color: isWinner ? '#22c55e' : '#f59e0b' 
        }}>
          {isWinner ? 'BINGO!' : gameStatus === 'playing' ? 'Playing' : 'Waiting'}
        </div>
      </div>
    </div>

    {/* MAIN GAME AREA - Two columns */}
    <div style={{
      display: 'flex',
      gap: '10px',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* LEFT COLUMN - Classic Board (75 numbers) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* BINGO Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '2px',
          marginBottom: '8px',
          flexShrink: 0
        }}>
          {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
            <div key={letter} style={{
              background: index === 0 ? '#3b82f6' : 
                         index === 1 ? '#6366f1' : 
                         index === 2 ? '#8b5cf6' : 
                         index === 3 ? '#22c55e' : '#f97316',
              borderRadius: '20px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px'
            }}>
              {letter}
            </div>
          ))}
        </div>

        {/* 75 Number Grid */}
        <div ref={classicGridRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px',
          flex: 1,
          overflowY: 'auto',
          padding: '4px'
        }}>
          {Array.from({ length: 75 }, (_, i) => i + 1).map(num => (
            <div
              key={num}
              onClick={() => handleClassicGridClick(num)}
              style={{
                background: called.includes(num) ? '#ec10b1' : 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                aspectRatio: '1/1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                cursor: gameStatus !== 'playing' ? 'not-allowed' : 'pointer',
                opacity: gameStatus !== 'playing' ? 0.5 : 1,
                color: called.includes(num) ? '#000' : '#fff',
                fontSize: 'clamp(10px, 2vw, 16px)',
                transition: 'all 0.3s'
              }}
              title={
                gameStatus !== 'playing'
                  ? gameStatus === 'countdown' 
                    ? `Game starts in ${countdown}s` 
                    : 'Waiting for game to start'
                  : called.includes(num) 
                    ? `Number ${num} already called` 
                    : `Click to call number ${num}`
              }
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN - Controls and Bingo Card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        gap: '10px',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Voice Controls */}
        <div style={{
          background: '#1e40af',
          borderRadius: '20px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleMuteToggle}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '18px'
              }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Volume:</span>
            <SpeechSupportIndicator />
          </div>
          
          {isSpeechSupported ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                disabled={isMuted || !isSpeechReady}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Voice not available
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div style={{
          display: 'flex',
          gap: '4px',
          flexShrink: 0
        }}>
          {recentCalls.map((call, index) => (
            <div key={index} style={{
              background: '#6d28d9',
              padding: '8px 12px',
              borderRadius: '12px',
              fontSize: '14px',
              flex: 1,
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {call}
            </div>
          ))}
        </div>

        {/* Current Number Display */}
        <div style={{
          background: 'radial-gradient(circle, #fde047, #f59e0b)',
          color: '#4c1d95',
          height: '60px',
          borderRadius: '12px',
          fontSize: '40px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {called.length > 0 
            ? `${getLetter(called[called.length - 1])}-${called[called.length - 1]}`
            : '—'
          }
        </div>

        {/* Control Buttons */}
        <div style={{
  display: 'flex',
  gap: '36px',
  flexShrink: 0
}}>

  {!multiplayerSession ? (
    <button
      onClick={() => setAutoToggle(!autoToggle)}
      disabled={isWinner || gameStatus !== 'playing'}
      style={{
        background: autoToggle ? '#dc2626' : '#22c55e',
        border: 'none',
        borderRadius: '6px',
        padding: '4px 8px',
        color: '#fff',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '12px',
        minWidth: '50px'
      }}
    >
      {autoToggle ? '⏹' : '▶'}
    </button>
  ) : (
    <button
      onClick={() => isAutoCalling ? stopAutoCalling() : startAutoCalling()}
      disabled={isWinner || gameStatus !== 'playing'}
      style={{
        background: isAutoCalling ? '#dc2626' : '#22c55e',
        border: 'none',
        borderRadius: '6px',
        padding: '4px 8px',
        color: '#fff',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '12px',
        minWidth: '50px'
      }}
    >
      {isAutoCalling ? '⏹' : '▶'}
    </button>
  )}

  <button
    onClick={resetGame}
    disabled={gameStatus === 'playing' && !isWinner}
    style={{
      background: '#3b82f6',
      border: 'none',
      borderRadius: '6px',
      padding: '4px 8px',
      color: '#fff',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '12px',
      minWidth: '50px'
    }}
  >
    🔄
  </button>

  <button
    onClick={handleLeaveGame}
    style={{
      background: '#ef4444',
      border: 'none',
      borderRadius: '6px',
      padding: '4px 8px',
      color: '#fff',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '12px',
      minWidth: '50px'
    }}
  >
    🚪
  </button>

</div>


        {/* Bingo Card Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* BINGO Header for Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '2px',
            marginBottom: '8px',
            flexShrink: 0
          }}>
            {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
              <div key={letter} style={{
                background: index === 0 ? '#3b82f6' : 
                           index === 1 ? '#6366f1' : 
                           index === 2 ? '#8b5cf6' : 
                           index === 3 ? '#22c55e' : '#f97316',
                borderRadius: '20px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {letter}
              </div>
            ))}
          </div>

          {/* 5x5 Bingo Card Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(5, 1fr)',
            gap: '4px',
            flex: 1,
            overflowY: 'auto',
            padding: '4px'
          }}>
            {cardMatrix.map((row, rowIndex) => 
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => cell.num && handleClassicGridClick(cell.num)}
                  style={{
                    background: cell.isWin ? '#fbbf24' : cell.isMatch ? '#4ade80' : '#970ae3',
                    border: cell.isWin ? '3px solid #f59e0b' : 'none',
                    borderRadius: '50%',
                    aspectRatio: '1/1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    color: '#fff',
                    fontSize: 'clamp(8px, 1.5vw, 12px)',
                    cursor: cell.num ? 'pointer' : 'default',
                    transition: 'all 0.3s'
                  }}
                  title={
                    cell.isMatch 
                      ? `${cell.text} - Matched!` 
                      : cell.isWin 
                      ? 'Winning cell!' 
                      : cell.text === 'FREE' 
                      ? 'Free space' 
                      : `Click to mark number ${cell.num}`
                  }
                >
                  {cell.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}