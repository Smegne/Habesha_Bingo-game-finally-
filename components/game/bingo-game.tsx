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
  id?: number;
  declaredAt?: string;
}

interface WinnerAnnouncement {
  winner: {
    userId: string;
    username: string;
    cartelaNumber: string;
    winType: string;
    winPattern?: number[];
    prizeAmount?: number;
    declaredAt: string;
  };
  gameInfo: {
    sessionId: number;
    sessionCode: string;
    playerCount: number;
    totalNumbersCalled?: number;
  };
  message: string;
}

interface WinnerHistoryItem {
  id: number;
  user_id: string;
  username: string;
  win_type: string;
  win_pattern: any;
  prize_amount: number;
  declared_at: string;
  cartela_number: string;
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
  cartela_number?: string;
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
  
  // NEW: Game ended state
  const [gameEnded, setGameEnded] = useState(false);
  const [winnerAnnouncement, setWinnerAnnouncement] = useState<WinnerAnnouncement | null>(null);
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistoryItem[]>([]);
  
  // Auto-call settings
  const [callInterval] = useState<number>(3000);
  const [isAutoCalling, setIsAutoCalling] = useState<boolean>(false);
  const [autoToggle, setAutoToggle] = useState(true);
  
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
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // ==================== INITIALIZATION ====================

  // Initialize component
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const init = async () => {
      await fetchCurrentGame();
      
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

  // Fetch winner history
  const fetchWinnerHistory = useCallback(async (sessionId: number) => {
    try {
      const response = await fetch(`/api/game/declare-win?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success && data.allWinners) {
        setWinnerHistory(data.allWinners);
      }
    } catch (error) {
      console.error('Failed to fetch winner history:', error);
    }
  }, []);

  // Sync called numbers from server
// Replace your syncCalledNumbers function with this corrected version:

const syncCalledNumbers = useCallback(async () => {
  if (!multiplayerSession?.code) return;

  try {
    setConnectionStatus('syncing');
    
    const response = await fetch(`/api/game/sessions?code=${multiplayerSession.code}&userId=${gameState?.user?.id}`);
    const data = await response.json();

    if (data.success && data.session) {
      const serverCalled = data.session.calledNumbers || [];
      setPlayers(data.players || []);
      
      // CRITICAL FIX: Check if game has ended and show winner announcement for ALL non-winning players
      if (data.session.isGameFinished || data.session.status === 'finished' || data.session.gameEndedAt) {
        if (!gameEnded) {
          console.log('🏁 Game has ended - showing winner announcement');
          setGameEnded(true);
          setGameStatus('finished');
          stopAutoCalling();
          
          // Show winner announcement for ALL players (including winner, but we'll filter)
          if (data.session.winner) {
            // Check if current user is NOT the winner
            const isCurrentUserWinner = data.session.winner.userId === gameState?.user?.id;
            
            if (!isCurrentUserWinner) {
              // This is a non-winning player - show the winner announcement popup
              console.log('📢 Showing winner announcement for non-winning player:', data.session.winner);
              setWinnerAnnouncement({
                winner: {
                  userId: data.session.winner.userId,
                  username: data.session.winner.username || 'Someone',
                  cartelaNumber: data.session.winner.cartelaNumber || 'Unknown',
                  winType: data.session.winner.winType || 'BINGO',
                  prizeAmount: data.session.winner.prizeAmount,
                  declaredAt: data.session.winner.declaredAt || new Date().toISOString()
                },
                gameInfo: {
                  sessionId: data.session.id,
                  sessionCode: data.session.code,
                  playerCount: data.playerCount || players.length,
                  totalNumbersCalled: data.session.totalNumbersCalled || called.length
                },
                message: `🏆 ${data.session.winner.username || 'Someone'} won with ${data.session.winner.winType || 'BINGO'}! 🏆`
              });
            } else {
              // Current user IS the winner - their own win popup will show
              console.log('👑 Current user is the winner - showing win popup instead');
              // The winner's popup is already shown via declareWinToServer response
            }
            
            // Fetch winner history for everyone
            fetchWinnerHistory(data.session.id);
          } else {
            // No winner data but game ended - show generic message
            console.log('Game ended but no winner data');
            setWinnerAnnouncement({
              
              winner: {
                userId: '',
                username: 'Someone',
                cartelaNumber: 'Unknown',
                winType: 'BINGO',
                declaredAt: new Date().toISOString()
              },
              gameInfo: {
                sessionId: data.session.id,
                sessionCode: data.session.code,
                playerCount: data.playerCount || players.length
              },
              message: `🏆 Game Over! Someone won! 🏆`
            });
          }
        }
      }
      
      // Update game status (only if not finished)
      if (!data.session.isGameFinished && data.session.status !== 'finished' && !data.session.gameEndedAt) {
        const serverStatus = data.session.status;
        let newStatus: 'waiting' | 'countdown' | 'playing' | 'finished' = 'waiting';
        
        if (serverStatus === 'active') {
          newStatus = 'playing';
        } else if (serverStatus === 'countdown') {
          newStatus = 'countdown';
          setCountdown(data.session.countdownRemaining || 50);
        }
        
        if (newStatus !== gameStatus && !gameEnded) {
          setGameStatus(newStatus);
          
          if (newStatus === 'playing' && gameStatus !== 'playing') {
            console.log('🎮 Game started!');
            if (!isMuted && isSpeechReady) {
              speak("Game started! Numbers will be called automatically!");
            }
          }
        }
      }
      
      // Update player ready status
      const readyState: Record<string, boolean> = {};
      data.players?.forEach((p: Player) => {
        readyState[p.user_id] = p.player_status === 'ready' || p.player_status === 'playing';
      });
      setPlayersReady(readyState);
      
      // Update called numbers if changed and game not ended
      if (!gameEnded && JSON.stringify(serverCalled) !== JSON.stringify(syncedCalled)) {
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
}, [multiplayerSession, gameState, gameStatus, syncedCalled, recentCalls, isMuted, isSpeechReady, gameEnded, fetchWinnerHistory, players.length, called.length]);
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
    if (gameStatus === 'countdown' && countdown > 0 && !gameEnded) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setGameStatus('playing');
            clearInterval(countdownTimerRef.current!);
            
            if (!isMuted && isSpeechReady) {
              speak("Game started! Numbers will be called automatically!");
            }
            
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
  }, [gameStatus, countdown, isMuted, isSpeechReady, multiplayerSession, gameEnded]);

  // ==================== AUTO-CALLING LOGIC ====================

  const startAutoCalling = useCallback(() => {
    if (gameEnded) return;
    
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
    }
    
    setIsAutoCalling(true);
    console.log('🎮 Started auto-calling');
    
    autoCallIntervalRef.current = setInterval(() => {
      if (gameStatus === 'playing' && !isWinner && !gameEnded && called.length < 75) {
        autoCallNextNumber();
      } else if (called.length >= 75 || gameEnded) {
        stopAutoCalling();
      }
    }, callInterval);
  }, [gameStatus, isWinner, called.length, callInterval, gameEnded]);

  const stopAutoCalling = useCallback(() => {
    if (autoCallIntervalRef.current) {
      clearInterval(autoCallIntervalRef.current);
      autoCallIntervalRef.current = null;
    }
    setIsAutoCalling(false);
    console.log('⏹️ Auto-calling stopped');
  }, []);

  const autoCallNextNumber = useCallback(async () => {
    if (isCallingRef.current || isWinner || gameStatus !== 'playing' || gameEnded) return;
    
    const availableNumbers = [];
    for (let i = 1; i <= 75; i++) {
      if (!called.includes(i)) {
        availableNumbers.push(i);
      }
    }
    
    if (availableNumbers.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const nextNumber = availableNumbers[randomIndex];
    
    console.log(`🎲 Auto-calling random number: ${nextNumber}`);
    await callNumber(nextNumber);
  }, [called, isWinner, gameStatus, gameEnded]);

  // Handle auto toggle for single player
  useEffect(() => {
    if (multiplayerSession || gameEnded) return;
    
    if (autoToggle && !isWinner && gameStatus === 'playing') {
      autoTimerRef.current = setInterval(() => {
        if (called.length >= 75 || isCallingRef.current || isWinner || gameEnded) {
          if (called.length >= 75) {
            clearInterval(autoTimerRef.current!);
            setAutoToggle(false);
          }
          return;
        }
        
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
  }, [autoToggle, called, isWinner, multiplayerSession, gameStatus, gameEnded]);

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
          username: gameState.user.username,
          winType,
          pattern,
          calledNumbers: called,
          cartelaNumber: gameState.cartela.cartelaNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('🎉 Win declared successfully:', data);
        
        if (data.winDetails) {
          setWinDetails(data.winDetails);
          setIsWinner(true);
          setGameStatus('finished');
          setGameEnded(true);
          stopAutoCalling();
          
          if (data.winnerAnnouncement) {
            setWinnerAnnouncement(data.winnerAnnouncement);
          }
          
          if (!isMuted && isSpeechReady) {
            speak(`Congratulations! You won with ${winType}!`);
          }
        }
        
        return true;
      } else {
        console.log('Win declaration rejected:', data.message);
        
        if (data.gameEnded || data.alreadyWon) {
          setGameStatus('finished');
          setGameEnded(true);
          stopAutoCalling();
          
          if (data.winner) {
            setWinnerAnnouncement({
              winner: {
                userId: data.winner.userId || '',
                username: data.winner.username || 'Another player',
                cartelaNumber: data.winner.cartelaNumber || 'Unknown',
                winType: data.winner.winType || 'BINGO',
                prizeAmount: data.winner.prizeAmount,
                declaredAt: data.winner.declaredAt || new Date().toISOString()
              },
              gameInfo: {
                sessionId: multiplayerSession.sessionId,
                sessionCode: multiplayerSession.code,
                playerCount: players.length
              },
              message: `🏆 ${data.winner.username || 'Another player'} won! Better luck next time! 🏆`
            });
          }
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
      const newMatrix = JSON.parse(JSON.stringify(prevMatrix));
      
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
    if (gameEnded || gameStatus === 'finished') {
      console.log('Game has already ended');
      alert('This game has already ended. Please join a new game.');
      return;
    }

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
        
        if (result.calledNumbers) {
          setCalled(result.calledNumbers);
          updateCardMatches(result.calledNumbers);
          
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
      isCallingRef.current = true;
      
      const newCalled = [...called, num];
      setCalled(newCalled);
      
      const letter = getLetter(num);
      const displayText = `${letter}-${num}`;
      
      setRecentCalls(prev => {
        const newRecent = [displayText, ...prev.slice(0, 2)];
        return newRecent;
      });
      
      const newCardMatrix = JSON.parse(JSON.stringify(cardMatrix));
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
    if (gameEnded) return false;
    
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
    
    if (wins.length > 0 && !gameEnded) {
      console.log('🎉 BINGO DETECTED!', wins);
      
      const newMatrix = JSON.parse(JSON.stringify(matrix));
      
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
      
      stopAutoCalling();
      setAutoToggle(false);
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      
      setIsWinner(true);
      
      const winTypes = wins.map(w => w.type).join(', ');
      const winMessage = `BINGO! ${winTypes.toUpperCase()}! Congratulations ${gameState?.user?.username || ''}!`;
      
      setTimeout(() => {
        speak(winMessage);
      }, 300);
      
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
    setGameEnded(false);
    setWinnerAnnouncement(null);
    setWinnerHistory([]);
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

      localStorage.removeItem('multiplayerSession');
      localStorage.removeItem('currentSession');
      localStorage.removeItem('currentBingoCardId');
      localStorage.removeItem('cartelaNumber');
      localStorage.removeItem('cardNumber');
      localStorage.removeItem('bingoGameData');

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
    if (gameEnded || gameStatus === 'finished') {
      alert('This game has already ended. Please join a new game.');
      return;
    }
    
    if (gameStatus !== 'playing') {
      if (gameStatus === 'countdown') {
        alert(`Game starts in ${countdown} seconds. Please wait!`);
      } else {
        alert('Waiting for game to start...');
      }
      return;
    }
    
    if (!called.includes(num) && !isWinner) {
      console.log(`👆 Player clicked number: ${num}`);
      callNumber(num);
    } else if (called.includes(num)) {
      console.log(`Number ${num} already called`);
    }
  };

  const handleContinueToLobby = () => {
    window.location.href = '/game/lobby';
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

  // ==================== NEW POPUP COMPONENTS ====================

  const WinnerAnnouncementPopup = () => {
    if (!winnerAnnouncement) return null;
    
    return (
      <div className="winner-announcement-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.5s ease'
      }}>
        <div className="winner-announcement-content" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '4px solid gold',
          animation: 'slideUp 0.5s ease'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏆</div>
          <h2 style={{ fontSize: '36px', marginBottom: '10px' }}>Game Over!</h2>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
            {winnerAnnouncement.message}
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '10px' }}>
              Winner: <strong>{winnerAnnouncement.winner.username}</strong>
            </div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              Cartela: <strong>#{winnerAnnouncement.winner.cartelaNumber}</strong>
            </div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              Pattern: <strong>{winnerAnnouncement.winner.winType}</strong>
            </div>
            {winnerAnnouncement.winner.prizeAmount && winnerAnnouncement.winner.prizeAmount > 0 && (
              <div style={{ fontSize: '20px', color: 'gold' }}>
                Prize: ${winnerAnnouncement.winner.prizeAmount.toFixed(2)}
              </div>
            )}
          </div>

          <div style={{
            fontSize: '14px',
            marginBottom: '20px',
            opacity: 0.8
          }}>
            Game ID: {winnerAnnouncement.gameInfo.sessionCode}<br />
            Players: {winnerAnnouncement.gameInfo.playerCount}
          </div>

          <button
            onClick={handleContinueToLobby}
            style={{
              background: 'white',
              color: '#764ba2',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Continue to Lobby
          </button>
        </div>
      </div>
    );
  };

  const WinnerHistory = () => {
    if (!gameEnded || winnerHistory.length === 0) return null;
    
    return (
      <div className="winner-history" style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px'
      }}>
        <h3 style={{ marginBottom: '10px', color: '#fbbf24' }}>Game Results</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {winnerHistory.map((win, index) => (
            <div key={win.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>
                {index === 0 ? '🥇' : '🥈'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{win.username}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  Cartela #{win.cartela_number} • {win.win_type}
                </div>
              </div>
              {win.prize_amount > 0 && (
                <div style={{ color: 'gold', fontWeight: 'bold' }}>
                  ${win.prize_amount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const GameEndedOverlay = () => {
    if (!gameEnded || isWinner || winnerAnnouncement) return null;
    
    return (
      <div className="game-ended-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.5s ease'
      }}>
        <div style={{
          background: '#1e293b',
          color: 'white',
          padding: '30px',
          borderRadius: '15px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2 style={{ color: '#fbbf24', marginBottom: '20px', fontSize: '28px' }}>Game Ended</h2>
          <p style={{ marginBottom: '20px', fontSize: '16px' }}>
            This game has finished. Please join a new game to continue playing.
          </p>
          
          <WinnerHistory />
          
          <button
            onClick={handleContinueToLobby}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              marginTop: '20px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Join New Game
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
    <div className="bingo-container" onClick={() => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        setShowMobileSoundPrompt(false);
      }
    }}>
      <MobileSoundPrompt />
      
      {/* Winner Announcement Popup (for non-winners) */}
      <WinnerAnnouncementPopup />
      
      {/* Game Ended Overlay */}
      <GameEndedOverlay />
      
      {/* WIN POPUP (for winner) */}
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
            zIndex: 9999
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
                  onClick={resetGame}
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

      {/* MAIN LAYOUT */}
      <div className="flex-column" style={{ height: '100%', gap: '10px', overflow: 'hidden' }}>
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

            {gameEnded && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#ef4444',
                border: '1px solid #ef4444',
              }}>
                🏁 Game Ended
              </div>
            )}
          </div>
        )}
        
        {/* TOP STATS BAR */}
        <div className="stats-bar">
          <div className="stat-item">
            <div>Cartela</div>
            <div className="stat-value">{gameState.cartela.cartelaNumber}</div>
          </div>
          
          <div className="stat-item">
            <div>Card</div>
            <div className="stat-value">{gameState.bingoCard.cardNumber}</div>
          </div>
          
          <div className="stat-item">
            <div>Player</div>
            <div className="stat-value">{players.length}</div>
          </div>
          
          <div className="stat-item">
            <div>Called</div>
            <div className="stat-value">{called.length}/75</div>
          </div>
          
          <div className="stat-item">
            <div>Status</div>
            <div className="stat-value" style={{ color: isWinner ? '#22c55e' : gameEnded ? '#ef4444' : '#f59e0b' }}>
              {isWinner ? 'BINGO!' : gameEnded ? 'Ended' : gameStatus === 'playing' ? 'Playing' : 'Waiting'}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex-column" style={{ gap: '10px', overflow: 'hidden', minHeight: 0 }}>
          <div className="flex-1" style={{ display: 'flex', gap: '10px', overflow: 'hidden', minHeight: 0 }}>
            {/* LEFT PANEL - CLASSIC BOARD */}
            <div className="flex-column overflow-hidden min-width-0 flex-1">
              <BingoHeader />
              <div 
                ref={classicGridRef}
                className="classic-grid classic-grid-scroll"
              >
                {Array.from({ length: 75 }, (_, i) => i + 1).map(num => (
                  <div
                    key={num}
                    className={`classic-grid-item ${called.includes(num) ? 'called' : ''}`}
                    onClick={() => handleClassicGridClick(num)}
                    title={
                      gameEnded
                        ? 'Game has ended'
                        : gameStatus !== 'playing'
                          ? gameStatus === 'countdown' 
                            ? `Game starts in ${countdown}s` 
                            : 'Waiting for game to start'
                          : called.includes(num) 
                            ? `Number ${num} already called` 
                            : `Click to call number ${num}`
                    }
                    style={{
                      opacity: (gameEnded || gameStatus !== 'playing') ? 0.5 : 1,
                      cursor: (gameEnded || gameStatus !== 'playing') ? 'not-allowed' : 'pointer',
                      backgroundColor: called.includes(num) ? '#4ade80' : '',
                      color: called.includes(num) ? '#000' : ''
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT PANEL - CONTROLS & BINGO CARD */}
            <div className="flex-column min-width-0 flex-1 gap-10 overflow-hidden">
              {/* VOICE CONTROLS */}
              <div className="voice-controls">
                <div className="flex-center" style={{ gap: '8px', marginBottom: '8px' }}>
                  <button
                    className={`mute-button ${isMuted ? 'muted' : ''}`}
                    onClick={handleMuteToggle}
                    title={isMuted ? 'Unmute sound' : 'Mute sound'}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Volume:</span>
                  <SpeechSupportIndicator />
                  
                  {environment === 'mobile' && (
                    <button
                      onClick={testSound}
                      className="test-sound-button"
                      title="Test sound"
                    >
                      🔊 Test
                    </button>
                  )}
                </div>
                
                {isSpeechSupported ? (
                  <div className="flex-center" style={{ gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                      disabled={isMuted || !isSpeechReady}
                      title={`Volume: ${Math.round(volume * 100)}%`}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px' }}>
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    padding: '8px',
                    background: 'rgba(156, 163, 175, 0.1)',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    Voice features not available in this browser
                  </div>
                )}
                
                {environment === 'mobile' && requiresUserInteraction && !userInteractedRef.current && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#fbbf24',
                    padding: '8px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: '6px',
                    textAlign: 'center',
                    marginTop: '8px',
                    border: '1px solid rgba(251, 191, 36, 0.3)'
                  }}>
                    👆 <strong>Tap anywhere</strong> to enable game sounds
                  </div>
                )}
              </div>

              {/* RECENT CALLS */}
              <div className="recent-calls">
                {recentCalls.map((call, index) => (
                  <div 
                    key={index}
                    className="recent-call-item"
                  >
                    {call}
                  </div>
                ))}
              </div>

              {/* CURRENT NUMBER DISPLAY */}
              <div className={`current-number ${called.length > 0 ? 'active' : ''}`}>
                {called.length > 0 
                  ? `${getLetter(called[called.length - 1])}-${called[called.length - 1]}`
                  : '—'
                }
              </div>

              {/* CONTROLS */}
              <div className="controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {!multiplayerSession ? (
                  <button
                    className={`control-button ${autoToggle ? 'auto-button active' : 'auto-button'}`}
                    onClick={() => setAutoToggle(!autoToggle)}
                    disabled={isWinner || gameStatus !== 'playing' || gameEnded}
                    title={autoToggle ? 'Stop automatic number calling' : 'Start automatic number calling'}
                  >
                    {autoToggle ? '⏹️ Auto' : '▶️ Auto'}
                  </button>
                ) : (
                  <button
                    className={`control-button ${isAutoCalling ? 'auto-button active' : 'auto-button'}`}
                    onClick={() => {
                      if (isAutoCalling) {
                        stopAutoCalling();
                      } else {
                        startAutoCalling();
                      }
                    }}
                    disabled={isWinner || gameStatus !== 'playing' || gameEnded}
                    title={isAutoCalling ? 'Stop auto-calling' : 'Start auto-calling random numbers'}
                  >
                    {isAutoCalling ? '⏹️ ' : '▶️'}
                  </button>
                )}
                
                <button
                  className="control-button reset-button"
                  onClick={resetGame}
                  title="Reset the game"
                  disabled={gameStatus === 'playing' && !isWinner && !gameEnded}
                >
                  🔄 
                </button>
                
                <button
                  className="control-button leave-button"
                  onClick={handleLeaveGame}
                  title={multiplayerSession ? 'Leave multiplayer game' : 'Exit to lobby'}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span>🚪</span>
                </button>
              </div>

              {/* Winner History (if game ended) */}
              {gameEnded && !isWinner && !winnerAnnouncement && <WinnerHistory />}

              {/* BINGO CARD SECTION */}
              <div className="flex-column flex-1 min-height-0 overflow-hidden">
                <BingoHeader />
                
                <div className="bingo-card">
                  {cardMatrix.map((row, rowIndex) => 
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`bingo-cell ${cell.isMatch ? 'matched' : ''} ${cell.isWin ? 'winning' : ''}`}
                        onClick={() => cell.num && !gameEnded && handleClassicGridClick(cell.num)}
                        title={
                          gameEnded
                            ? 'Game has ended'
                            : cell.isMatch 
                              ? `${cell.text} - Matched!` 
                              : cell.isWin 
                              ? 'Winning cell!' 
                              : cell.text === 'FREE' 
                              ? 'Free space' 
                              : `Click to mark number ${cell.num}`
                        }
                        style={{
                          backgroundColor: cell.isWin ? '#fbbf24' : cell.isMatch ? '#4ade80' : '',
                          border: cell.isWin ? '3px solid #f59e0b' : '',
                          cursor: (cell.num && !gameEnded) ? 'pointer' : 'default',
                          opacity: gameEnded ? 0.7 : 1
                        }}
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
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}