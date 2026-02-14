// components/game/bingo-game.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import "./bingo-game.css"

// Interface for speech synthesis window
interface SpeechSynthesisWindow extends Window {
  speechSynthesis?: SpeechSynthesis;
}

// Helper function to detect environment
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

// Helper function to check speech synthesis support
const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const win = window as SpeechSynthesisWindow;
  
  // Check for existence
  if (!('speechSynthesis' in win)) return false;
  if (!win.speechSynthesis) return false;
  
  // Check if it's actually functional
  try {
    // Some browsers return voices array synchronously
    const voices = win.speechSynthesis.getVoices();
    return Array.isArray(voices);
  } catch (error) {
    console.warn('Speech synthesis check failed:', error);
    return false;
  }
};

// Custom hook for safe speech synthesis with mobile support
const useSafeSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false);
  const userInteractedRef = useRef(false);
  
  // Handle user interaction for mobile autoplay policies
  const handleUserInteraction = () => {
    userInteractedRef.current = true;
    setIsReady(true);
    
    // Remove event listeners after first interaction
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };

  
  
  useEffect(() => {
    // Mobile browsers require user interaction before playing audio
    if (detectEnvironment() === 'mobile') {
      console.log('📱 Mobile detected - waiting for user interaction');
      setRequiresUserInteraction(true);
      
      // Add event listeners for user interaction
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      
      // Small timeout to ensure listeners are added
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
              // Mobile-friendly voice selection
              let preferredVoice = availableVoices[0];
              
              // Try to find a mobile-optimized voice
              if (detectEnvironment() === 'mobile') {
                // On mobile, prefer compact voices
                const mobileVoice = availableVoices.find(v => 
                  v.lang.includes('en') && 
                  (v.name.toLowerCase().includes('compact') || 
                   v.name.toLowerCase().includes('siri') ||
                   v.name.toLowerCase().includes('google'))
                );
                if (mobileVoice) {
                  preferredVoice = mobileVoice;
                }
              } else {
                // On desktop, prefer higher quality voices
                const desktopVoice = availableVoices.find(v => 
                  v.lang.includes('en') && 
                  !v.name.toLowerCase().includes('compact')
                );
                if (desktopVoice) {
                  preferredVoice = desktopVoice;
                }
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
        
        // Some browsers need this event
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // Try loading voices again after a delay
        setTimeout(loadVoices, 1000);
      } else {
        console.warn('⚠️ Speech synthesis not supported in this environment');
        console.warn('Environment:', detectEnvironment());
        console.warn('User Agent:', navigator.userAgent);
      }
    };
    
    // Only run in browser
    if (typeof window !== 'undefined') {
      // Small delay to ensure DOM is ready
      setTimeout(checkSupport, 100);
    }
    
    // Cleanup
    return () => {
      if (synth) {
        synth.cancel();
      }
      // Clean up event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);
  
  return { 
    isSupported, 
    isReady: isReady || !requiresUserInteraction, // Ready if not mobile or user interacted
    requiresUserInteraction,
    userInteractedRef,
    synth, 
    selectedVoice, 
    voices 
  };
};

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
}

interface MultiplayerSession {
  code: string;
  userId: string;
  sessionId: number;
  hostId?: string;
}

export default function BingoGame() {
  const [called, setCalled] = useState<number[]>([])
  const [autoTimer, setAutoTimer] = useState<NodeJS.Timeout | null>(null)
  const [cardMatrix, setCardMatrix] = useState<Array<Array<any>>>([])
  const [isWinner, setIsWinner] = useState(false)
  const [autoToggle, setAutoToggle] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [recentCalls, setRecentCalls] = useState<string[]>(["—", "—", "—"])
  
  // Game state
  const [gameState, setGameState] = useState<CurrentGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [winDetails, setWinDetails] = useState<WinDetails | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])
  
  // Multiplayer state
  const [multiplayerSession, setMultiplayerSession] = useState<MultiplayerSession | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [syncedCalled, setSyncedCalled] = useState<number[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected')
  
  // Use safe speech synthesis hook
  const { 
    isSupported: isSpeechSupported, 
    isReady: isSpeechReady,
    requiresUserInteraction,
    userInteractedRef,
    synth: safeSynth, 
    selectedVoice: safeSelectedVoice 
  } = useSafeSpeechSynthesis();
  
  // Refs
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const isSpeakingRef = useRef(false)
  const isCallingRef = useRef(false)
  const classicGridRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const clickSoundRef = useRef<HTMLAudioElement | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Environment detection
  const [environment, setEnvironment] = useState<string>('unknown')
  const [showMobileSoundPrompt, setShowMobileSoundPrompt] = useState(false)
  
  // Fetch current game on component mount
  useEffect(() => {
    fetchCurrentGame()
    
    // Get multiplayer session info
    const storedSession = localStorage.getItem('multiplayerSession');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setMultiplayerSession(session);
        
        // Check if this player is the host (you might need to determine this from your game state)
        // For now, assume first player is host - you'll need to set this when creating the session
        const isUserHost = localStorage.getItem('isHost') === 'true';
        setIsHost(isUserHost);
        
        console.log('Multiplayer session loaded:', session);
        console.log('Is host:', isUserHost);
      } catch (e) {
        console.error('Failed to parse multiplayer session:', e);
      }
    }
    
    // Initialize fallback audio for mobile
    if (typeof window !== 'undefined' && detectEnvironment() === 'mobile') {
      // Preload click sound for mobile fallback
      clickSoundRef.current = new Audio();
      clickSoundRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ';
      clickSoundRef.current.load();
      
      // Show prompt after a delay if user hasn't interacted
      const promptTimer = setTimeout(() => {
        if (requiresUserInteraction && !userInteractedRef.current) {
          setShowMobileSoundPrompt(true);
        }
      }, 2000);
      
      return () => clearTimeout(promptTimer);
    }
  }, [])

  // Initialize environment detection
  useEffect(() => {
    const env = detectEnvironment();
    setEnvironment(env);
    console.log('🌍 Detected environment:', env);
    
    // Apply environment-specific adjustments
    if (env === 'telegram') {
      console.log('⚠️ Running in Telegram WebView - applying compatibility fixes');
      
      // Force disable voice if not supported in Telegram
      if (!isSpeechSupported) {
        console.log('🔇 Speech not supported in Telegram, forcing silent mode');
        setIsMuted(true);
      }
    } else if (env === 'mobile') {
      console.log('📱 Mobile browser detected - adjusting for mobile autoplay policies');
      
      // On mobile, lower default volume slightly
      setVolume(0.7);
      
      // Enable sound by default on mobile (user can mute if needed)
      setIsMuted(false);
    }
  }, [isSpeechSupported]);

  // Sync safe speech synthesis with refs
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
      const timer = setTimeout(() => {
        setShowMobileSoundPrompt(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showMobileSoundPrompt, userInteractedRef.current]);

  // Start syncing called numbers with server for multiplayer
  useEffect(() => {
    if (!multiplayerSession?.code || !multiplayerSession?.sessionId) {
      // Not in multiplayer mode
      return;
    }

    console.log('Starting multiplayer sync for session:', multiplayerSession.code);
    setConnectionStatus('connected');

    // Initial sync
    syncCalledNumbers();

    // Set up polling every 2 seconds
    syncIntervalRef.current = setInterval(syncCalledNumbers, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [multiplayerSession]);

  // Disable auto mode in multiplayer - numbers come from host
  useEffect(() => {
    if (multiplayerSession) {
      console.log('Multiplayer mode detected - disabling auto call');
      setAutoToggle(false);
      if (autoTimer) {
        clearInterval(autoTimer);
        setAutoTimer(null);
      }
    }
  }, [multiplayerSession]);

  // Handle auto toggle for single player
  useEffect(() => {
    // Don't run auto in multiplayer mode
    if (multiplayerSession) return;
    
    if (autoToggle && !isWinner) {
      const timer = setInterval(() => {
        if (called.length >= 75 || isCallingRef.current || isWinner) {
          if (called.length >= 75) {
            clearInterval(timer)
            setAutoToggle(false)
          }
          return
        }
        let n
        do {
          n = Math.floor(Math.random() * 75) + 1
        } while (called.includes(n))
        callNumber(n)
      }, 3000)
      
      setAutoTimer(timer as any)
      
      return () => {
        clearInterval(timer)
      }
    } else {
      if (autoTimer) {
        clearInterval(autoTimer)
        setAutoTimer(null)
      }
    }
  }, [autoToggle, called, isWinner, multiplayerSession])

  // Fetch current game from API
  const fetchCurrentGame = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/game/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
      
      const result: ApiResponse<CurrentGameData> = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch game')
      }
      
      if (result.data) {
        setGameState(result.data)
        // Transform card data to matrix format
        const matrix = transformCardData(result.data.bingoCard.cardData)
        setCardMatrix(matrix)
        console.log('Game loaded successfully:', result.data)
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load game')
      console.error('Error fetching game:', err)
    } finally {
      setLoading(false)
    }
  }

  // Transform card data from API to matrix format
  const transformCardData = (cardData: BingoCardData) => {
    const matrix = []
    
    // Initialize 5x5 matrix
    for (let row = 0; row < 5; row++) {
      const rowArray = []
      for (let col = 0; col < 5; col++) {
        rowArray.push({
          text: '',
          num: null,
          isMatch: false,
          isWin: false,
          row,
          col
        })
      }
      matrix.push(rowArray)
    }
    
    // Fill matrix with card data
    cardData.numbers.forEach(cell => {
      if (cell.row !== undefined && cell.col !== undefined) {
        matrix[cell.row][cell.col] = {
          text: cell.isFree ? 'FREE' : cell.number,
          num: cell.isFree ? null : Number(cell.number),
          isMatch: cell.isFree || false,
          isWin: false,
          row: cell.row,
          col: cell.col
        }
      }
    })
    
    return matrix
  }

  // Sync called numbers from server
  const syncCalledNumbers = async () => {
    if (!multiplayerSession?.code) return;

    try {
      setConnectionStatus('syncing');
      
      const response = await fetch(`/api/game/sessions?code=${multiplayerSession.code}`);
      const data = await response.json();

      if (data.success && data.session) {
        const serverCalled = data.session.calledNumbers || [];
        setPlayers(data.players || []);
        
        // Update local state if server has different numbers
        if (JSON.stringify(serverCalled) !== JSON.stringify(syncedCalled)) {
          console.log('Syncing called numbers from server:', serverCalled);
          setSyncedCalled(serverCalled);
          
          // Update the called state
          setCalled(serverCalled);
          
          // Update recent calls
          if (serverCalled.length > 0) {
            const newRecent = [...recentCalls];
            const lastNum = serverCalled[serverCalled.length - 1];
            const letter = getLetter(lastNum);
            newRecent.unshift(`${letter}-${lastNum}`);
            newRecent.pop();
            setRecentCalls(newRecent);
          } else {
            setRecentCalls(["—", "—", "—"]);
          }
          
          // Update card matches
          updateCardMatches(serverCalled);
          
          setLastSyncTime(new Date());
        }
        
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Failed to sync called numbers:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Update card matches based on called numbers
  const updateCardMatches = (calledNumbers: number[]) => {
    const newCardMatrix = [...cardMatrix];
    
    newCardMatrix.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.num && calledNumbers.includes(cell.num)) {
          newCardMatrix[rowIndex][colIndex] = {
            ...cell,
            isMatch: true
          };
        }
      });
    });
    
    setCardMatrix(newCardMatrix);
    
    // Check for win with updated matches
    checkWin(newCardMatrix);
  };

  // Speech functions
  const getNumberWord = (num: number): string => {
    const words = [
      'zero', 'one', 'two', 'three', 'four', 'five', 
      'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
      'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'
    ]
    
    const tensWords = [
      '', '', 'twenty', 'thirty', 'forty', 'fifty', 
      'sixty', 'seventy', 'eighty', 'ninety'
    ]
    
    if (num <= 20) return words[num]
    if (num < 100) {
      const tens = Math.floor(num / 10)
      const ones = num % 10
      if (ones === 0) return tensWords[tens]
      return tensWords[tens] + ' ' + words[ones]
    }
    return num.toString()
  }

  // Mobile-friendly speak function
  const speak = (text: string, callback?: () => void) => {
    // Check all conditions for speaking
    const canSpeak = isSpeechSupported && 
                     selectedVoiceRef.current && 
                     synthRef.current && 
                     !isSpeakingRef.current && 
                     !isMuted &&
                     isSpeechReady;
    
    if (!canSpeak) {
      console.log('Speech skipped:', { 
        isSpeechSupported, 
        hasVoice: !!selectedVoiceRef.current,
        hasSynth: !!synthRef.current,
        isSpeaking: isSpeakingRef.current,
        isMuted,
        isSpeechReady
      });
      
      // On mobile, try fallback sound
      if (environment === 'mobile' && !isMuted && isSpeechReady) {
        playMobileFallbackSound();
      }
      
      // Still call callback for flow consistency
      if (callback) {
        setTimeout(callback, 100); // Small delay for natural feel
      }
      return;
    }
    
    try {
      // For mobile, use shorter utterances and slower rate
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoiceRef.current;
      
      // Adjust settings based on environment
      if (environment === 'mobile') {
        utterance.rate = 0.8; // Slower for mobile
        utterance.pitch = 1.0;
        utterance.volume = volume * 0.9; // Slightly lower on mobile
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
        
        // Try fallback on mobile
        if (environment === 'mobile') {
          playMobileFallbackSound();
        }
        
        if (callback) callback();
      };
      
      // Cancel any ongoing speech before starting new one
      synthRef.current.cancel();
      
      // Small delay for mobile stability
      setTimeout(() => {
        synthRef.current!.speak(utterance);
      }, environment === 'mobile' ? 50 : 0);
      
    } catch (error) {
      console.error('Failed to create speech utterance:', error);
      isSpeakingRef.current = false;
      
      // Try fallback on mobile
      if (environment === 'mobile') {
        playMobileFallbackSound();
      }
      
      if (callback) callback();
    }
  };

  // Mobile fallback sound (simple beep)
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
    const letter = getLetter(num)
    let numberText: string
    
    if (num <= 20 || num % 10 === 0) {
      numberText = getNumberWord(num)
    } else {
      const tens = Math.floor(num / 10)
      const ones = num % 10
      numberText = `${getNumberWord(tens * 10)} ${getNumberWord(ones)}`
    }
    
    // On mobile, use shorter text for better performance
    const speakText = environment === 'mobile' 
      ? `${letter} ${num}`  // Just say "B 5" instead of "B five" on mobile
      : `${letter} ${numberText}`;
    
    speak(speakText, callback)
  }

  // Get letter for number
  const getLetter = (n: number): string => {
    if (n <= 15) return "B"
    if (n <= 30) return "I"
    if (n <= 45) return "N"
    if (n <= 60) return "G"
    return "O"
  }

  // Call number to server (for multiplayer host)
  const callNumberToServer = async (num: number): Promise<boolean> => {
    if (!multiplayerSession?.sessionId || !gameState?.user?.id) return false;

    try {
      const response = await fetch('/api/game/call-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: multiplayerSession.sessionId,
          number: num,
          userId: gameState.user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.alreadyCalled) {
          console.log('Number already called by another player');
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to call number to server:', error);
      return false;
    }
  };

  // Main call number function (works for both single and multiplayer)
  const callNumber = async (num: number) => {
    // In multiplayer, only host can call numbers
    if (multiplayerSession && !isHost) {
      console.log('Only the host can call numbers in multiplayer mode');
      return;
    }

    if (called.includes(num) || isCallingRef.current || isWinner) return;

    // For multiplayer, send to server first
    if (multiplayerSession) {
      isCallingRef.current = true;
      
      const success = await callNumberToServer(num);
      
      if (success) {
        // Server will broadcast to all players via polling
        console.log('Number called successfully:', num);
        
        // Immediately update local state for responsiveness
        const newCalled = [...called, num];
        setCalled(newCalled);
        
        const letter = getLetter(num);
        const displayText = `${letter}-${num}`;
        
        const newRecent = [...recentCalls];
        newRecent.unshift(displayText);
        newRecent.pop();
        setRecentCalls(newRecent);
        
        // Update card matrix
        const newCardMatrix = [...cardMatrix];
        newCardMatrix.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (cell.num === num) {
              newCardMatrix[rowIndex][colIndex] = {
                ...cell,
                isMatch: true
              };
            }
          });
        });
        
        setCardMatrix(newCardMatrix);
        
        // Speak the number
        speakBingoNumber(num, () => {
          isCallingRef.current = false;
          
          // Check for win
          setTimeout(() => {
            checkWin(newCardMatrix);
          }, 100);
        });
      } else {
        isCallingRef.current = false;
      }
    } else {
      // Single player mode
      isCallingRef.current = true;
      
      const newCalled = [...called, num];
      setCalled(newCalled);
      
      const letter = getLetter(num);
      const displayText = `${letter}-${num}`;
      
      const newRecent = [...recentCalls];
      newRecent.unshift(displayText);
      newRecent.pop();
      setRecentCalls(newRecent);
      
      const newCardMatrix = [...cardMatrix];
      let cellUpdated = false;
      
      newCardMatrix.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
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
          setTimeout(() => {
            checkWin(newCardMatrix);
          }, 100);
        }
      });
    }
  }

  // Helper function to determine win type
  const determineWinType = (winningCells: any[]): 'row' | 'column' | 'diagonal' | 'full-house' => {
    const rows = new Set(winningCells.map(cell => cell.row))
    const cols = new Set(winningCells.map(cell => cell.col))
    
    if (rows.size === 1) return 'row'
    if (cols.size === 1) return 'column'
    
    // Check if it's the center diagonal
    const isDiag1 = winningCells.every(cell => cell.row === cell.col)
    const isDiag2 = winningCells.every(cell => cell.row + cell.col === 4)
    
    if (isDiag1 || isDiag2) return 'diagonal'
    
    // Check for full house (all cells marked)
    const allCellsMarked = cardMatrix.flat().every(cell => cell.isMatch || cell.text === 'FREE')
    if (allCellsMarked) return 'full-house'
    
    return 'row' // default
  }

  // Function to declare win to server
  const declareWinToServer = async (winType: string, winPattern: number[]): Promise<boolean> => {
    try {
      if (!gameState) return false
      
      const winData = {
        gameSessionId: multiplayerSession?.sessionId || gameState.bingoCard.id,
        bingoCardId: gameState.bingoCard.id,
        winType,
        winPattern,
        calledNumbers: called
      }
      
      console.log('Declaring win to server:', winData)
      
      const response = await fetch('/api/game/win', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(winData)
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('Win declared successfully:', result.data)
        setWinDetails({
          isFirstWinner: result.data.isFirstWinner,
          position: result.data.winPosition,
          prizeAmount: result.data.prizeAmount,
          message: result.data.message
        })
        return true
      } else {
        console.error('Win declaration failed:', result.message)
        return false
      }
      
    } catch (error) {
      console.error('Error declaring win:', error)
      return false
    }
  }

  // Check for win
  const checkWin = async (matrix: any[][] = cardMatrix): Promise<boolean> => {
    const wins = []
    const winPatterns: number[][] = []
    
    // Check rows
    for (let r = 0; r < 5; r++) {
      if (matrix[r].every(cell => cell.isMatch)) {
        wins.push(matrix[r])
        winPatterns.push(matrix[r].map(cell => cell.row * 5 + cell.col))
      }
    }
    
    // Check columns
    for (let c = 0; c < 5; c++) {
      const col = []
      for (let r = 0; r < 5; r++) col.push(matrix[r][c])
      if (col.every(cell => cell.isMatch)) {
        wins.push(col)
        winPatterns.push(col.map(cell => cell.row * 5 + cell.col))
      }
    }
    
    // Check diagonals
    const diag1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]]
    const diag2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]]
    
    if (diag1.every(cell => cell.isMatch)) {
      wins.push(diag1)
      winPatterns.push(diag1.map(cell => cell.row * 5 + cell.col))
    }
    
    if (diag2.every(cell => cell.isMatch)) {
      wins.push(diag2)
      winPatterns.push(diag2.map(cell => cell.row * 5 + cell.col))
    }
    
    if (wins.length > 0) {
      console.log('🎉 BINGO DETECTED! Number of wins:', wins.length)
      
      // Determine win type
      const winType = determineWinType(wins[0])
      console.log('Win type:', winType)
      
      // Mark winning cells in UI
      const newMatrix = [...matrix]
      wins.flat().forEach(winCell => {
        newMatrix.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (cell === winCell) {
              newMatrix[rowIndex][colIndex] = {
                ...cell,
                isWin: true
              }
            }
          })
        })
      })
      
      // Update state for visual feedback
      setCardMatrix(newMatrix)
      
      // Clear auto timer
      setAutoToggle(false)
      if (autoTimer) {
        clearInterval(autoTimer)
        setAutoTimer(null)
      }
      
      // Set winner state for popup
      setIsWinner(true)
      
      // Show immediate congratulations
      setTimeout(() => {
        if (gameState?.user?.username) {
          speak(`BINGO! Congratulations ${gameState.user.username}! You won!`)
        } else {
          speak("BINGO! Congratulations!")
        }
      }, 300)
      
      // Declare win to server
      declareWinToServer(winType, winPatterns[0]).then((success) => {
        if (success) {
          console.log('Win successfully declared to server')
        } else {
          console.warn('Win declaration to server failed, but local win is recorded')
        }
      }).catch((error) => {
        console.error('Error declaring win:', error)
      })
      
      return true
    }
    
    return false
  }

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    
    if (synthRef.current) {
      synthRef.current.cancel()
      isSpeakingRef.current = false
    }
  }
  // Add this function to your BingoGame component
const handleLeaveGame = async () => {
  // Confirm with user
  if (!confirm('Are you sure you want to leave the game?')) {
    return;
  }

  try {
    // If in multiplayer session, notify server
    if (multiplayerSession?.sessionId && gameState?.user?.id) {
      setConnectionStatus('disconnected');
      
      // Call API to remove player from session
      const response = await fetch('/api/game/leave', {
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
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Successfully left multiplayer session');
        
        // Show message if user was the host
        if (isHost) {
          alert('You were the host. The game will end for other players.');
        }
      } else {
        console.error('Failed to leave session:', data.message);
      }
    }

    // Clear multiplayer session from localStorage
    localStorage.removeItem('multiplayerSession');
    localStorage.removeItem('currentSession');
    localStorage.removeItem('currentBingoCardId');
    localStorage.removeItem('cartelaNumber');
    localStorage.removeItem('cardNumber');
    localStorage.removeItem('isHost');
    localStorage.removeItem('bingoGameData');

    // Stop all intervals
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    if (autoTimer) {
      clearInterval(autoTimer);
      setAutoTimer(null);
    }

    // Cancel any speaking
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    // Redirect to game selection or lobby
    window.location.href = '/'; // or wherever your main game lobby is
    
  } catch (error) {
    console.error('Error leaving game:', error);
    alert('Failed to leave game properly. Please try again.');
    
    // Force redirect even if API fails
    window.location.href = '/';
  }
};

  // Handle mute toggle
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState && synthRef.current) {
      synthRef.current.cancel();
      isSpeakingRef.current = false;
    }
    
    // On mobile, play a test sound when unmuting
    if (!newMutedState && environment === 'mobile' && isSpeechReady) {
      setTimeout(() => {
        speak("Sound enabled");
      }, 100);
    }
  };

  // Test sound function (for mobile)
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
    
    // Also trigger user interaction
    userInteractedRef.current = true;
    setShowMobileSoundPrompt(false);
  };

  // Reset game
  const resetGame = () => {
    setCalled([])
    setIsWinner(false)
    setWinDetails(null)
    setRecentCalls(["—", "—", "—"])
    setAutoToggle(!multiplayerSession) // Only enable auto if not multiplayer
    
    // Reset card matrix to initial state
    if (gameState) {
      const matrix = transformCardData(gameState.bingoCard.cardData)
      setCardMatrix(matrix)
    }
    
    if (synthRef.current) {
      synthRef.current.cancel()
    }
  }

  // Helper function for ordinal suffix
  const getOrdinalSuffix = (n: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]
  }

  // Handle classic grid click
  const handleClassicGridClick = (num: number) => {
    if (multiplayerSession && !isHost) {
      // In multiplayer, non-host players cannot call numbers
      console.log('Only the host can call numbers');
      return;
    }
    
    callNumber(num);
  };

  // Render bingo header
  const BingoHeader = () => (
    <div className="bingo-header">
      <div className="bingo-letter b">B</div>
      <div className="bingo-letter i">I</div>
      <div className="bingo-letter n">N</div>
      <div className="bingo-letter g">G</div>
      <div className="bingo-letter o">O</div>
    </div>
  )

  // Environment badge
  const EnvironmentBadge = () => {
    if (environment === 'telegram') {
      return (
        <div className="environment-badge telegram">
          <span className="badge-icon">📱</span>
          <span className="badge-text">Telegram</span>
          {!isSpeechSupported && (
            <span className="badge-warning" title="Voice features not available in Telegram WebView">
              🔇
            </span>
          )}
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

  // Speech support indicator
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

  // Mobile sound prompt
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

  // Render loading state
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
    )
  }

  // Render error state
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
    )
  }

  // Render no game state
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
    )
  }

  return (
    <div className="bingo-container" onClick={() => {
      // Mark user interaction on any click
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        setShowMobileSoundPrompt(false);
      }
    }}>
      {/* Mobile Sound Prompt */}
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
            {/* Confetti effect background */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.1) 70%)',
              zIndex: 1
            }} />
            
            {/* Main content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Winner icon */}
              <div style={{
                fontSize: '80px',
                marginBottom: '20px',
                animation: 'bounce 1s infinite alternate',
                textShadow: '0 5px 15px rgba(0,0,0,0.3)'
              }}>
                🏆
              </div>
              
              {/* Main title */}
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
              
              {/* Congratulations with username */}
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
              
              {/* Win details */}
              {winDetails && (
                <div style={{
                  background: 'rgba(255,255,255,0.8)',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  display: 'inline-block'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                    {winDetails.message}
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
              
              {/* Cartela info */}
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
              
              {/* Action buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'center',
                marginTop: '20px'
              }}>
                <button
                  onClick={() => {
                    setIsWinner(false)
                    setWinDetails(null)
                    resetGame()
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
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <span style={{ fontSize: '20px' }}>🔄</span>
                  Play Again
                </button>
                
                <button
                  onClick={() => {
                    setIsWinner(false)
                    setWinDetails(null)
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
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                >
                  <span style={{ fontSize: '20px' }}>✕</span>
                  Close
                </button>
              </div>
              
              {/* Celebration text */}
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
            alignItems: 'center'
          }}>
            <div style={{
              background: isHost ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              color: isHost ? '#22c55e' : '#9ca3af',
              border: `1px solid ${isHost ? '#22c55e' : '#9ca3af'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span>{isHost ? '👑 Host' : '🎮 Player'}</span>
            </div>
            
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

            {players.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                👥 {players.length} Player{players.length !== 1 ? 's' : ''}
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
            <div>Card #</div>
            <div className="stat-value">{gameState.bingoCard.cardNumber}</div>
          </div>
          
          <div className="stat-item">
            <div>Player</div>
            <div className="stat-value">{gameState.user.username}</div>
          </div>
          
          <div className="stat-item">
            <div>Called</div>
            <div className="stat-value">{called.length}/75</div>
          </div>
          
          <div className="stat-item">
            <div>Status</div>
            <div className="stat-value" style={{ color: isWinner ? '#22c55e' : '#f59e0b' }}>
              {isWinner ? 'BINGO!' : 'Playing'}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex-column" style={{ gap: '10px', overflow: 'hidden', minHeight: 0 }}>
          <div className="flex-1" style={{ display: 'flex', gap: '10px', overflow: 'hidden', minHeight: 0 }}>
            {/* LEFT PANEL - CLASSIC BOARD (75 numbers) WITH VERTICAL SCROLL */}
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
                    title={multiplayerSession && !isHost && !called.includes(num) 
                      ? 'Only the host can call numbers' 
                      : `Call number ${num}`}
                    style={multiplayerSession && !isHost && !called.includes(num) 
                      ? { opacity: 0.5, cursor: 'not-allowed' } 
                      : {}}
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
                  
                  {/* Test sound button for mobile */}
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
                
                {/* Mobile instructions */}
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
            {/* CONTROLS */}
<div className="controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
  {!multiplayerSession && (
    <button
      className={`control-button ${autoToggle ? 'auto-button active' : 'auto-button'}`}
      onClick={() => setAutoToggle(!autoToggle)}
      disabled={isWinner}
      title={autoToggle ? 'Stop automatic number calling' : 'Start automatic number calling'}
    >
      {autoToggle ? '⏹️Auto' : '▶️Auto'}
    </button>
  )}
  <button
    className="control-button reset-button"
    onClick={resetGame}
    title="Reset the game"
  >
    🔄 Reset
  </button>
  
  {/* Leave Game Button - Always visible */}
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
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
  >
    <span>🚪</span>
    Leave Game
  </button>
</div>

              {/* BINGO CARD SECTION */}
              <div className="flex-column flex-1 min-height-0 overflow-hidden">
                <BingoHeader />
                
                {/* BINGO CARD GRID */}
                <div className="bingo-card">
                  {cardMatrix.map((row, rowIndex) => 
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`bingo-cell ${cell.isMatch ? 'matched' : ''} ${cell.isWin ? 'winning' : ''}`}
                        onClick={() => cell.num && handleClassicGridClick(cell.num)}
                        title={cell.num ? `Click to call ${cell.num}` : 'Free space'}
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
    </div>
  )
}