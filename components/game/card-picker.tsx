// components/game/card-picker.tsx - UPDATED FOR 50-SECOND HOLD
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlayCircle, VolumeUpFill, VolumeMuteFill, 
  CardChecklist, XCircle, BoxArrowRight,
  PersonCircle, ArrowClockwise, ShieldCheck,
  StarFill, TrophyFill, Coin, Grid3x3GapFill,
  Search, Filter, SortNumericDown, SortNumericUpAlt,
  LightningChargeFill, AwardFill, GiftFill,
  Dice5Fill, Stars, PeopleFill, ClockFill, HourglassSplit
} from 'react-bootstrap-icons';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/game-store';
import CountdownDisplay from './CountdownDisplay';

// Dynamic import for BingoGame component
const BingoGame = dynamic(() => import('./bingo-game'), {
  loading: () => (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20"></div>
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <Dice5Fill size={32} className="text-white animate-spin" />
          </div>
        </div>
        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
          Loading BINGO Game...
        </p>
        <p className="text-white/70 mt-2">Preparing your gaming experience</p>
      </div>
    </div>
  ),
  ssr: false
});

interface Cartela {
  id: number;
  cartela_number: string;
  is_available: boolean;
  status?: 'available' | 'waiting' | 'in_game';
  popularity?: number;
  waiting_user_id?: string | null;
  waiting_expires_at?: string | null;
  waiting_seconds_remaining?: number | null;
  waiting_username?: string | null;
  waiting_first_name?: string | null;
}

interface User {
  id: string;
  telegramId?: string;
  username: string;
  firstName: string;
  balance: number;
  bonusBalance?: number;
  role?: string;
  email?: string;
  referralCode?: string;
  isOnline?: boolean;
}

interface GameSession {
  id: number;
  code: string;
  status: 'waiting' | 'countdown' | 'active' | 'finished' | 'cancelled';
  countdownRemaining: number;
  playerCount: number;
  createdAt: string;
}

interface WaitingCartela {
  userId: string;
  username?: string;
  firstName?: string;
  expiresAt: string;
  sessionId?: number;
  expiresInSeconds: number;
}

interface CardPickerProps {
  onGameStart?: (gameData: any) => void;
}

const CardPicker: React.FC<CardPickerProps> = ({ onGameStart }) => {
  // Get state and actions from the store
  const { 
    user: storeUser, 
    isLoggedIn, 
    logout: storeLogout,
    initializeTelegramAuth
  } = useGameStore();
  
  // Cartela states
  const [cartelas, setCartelas] = useState<Cartela[]>([]);
  const [filteredCartelas, setFilteredCartelas] = useState<Cartela[]>([]);
  const [selectedCartela, setSelectedCartela] = useState<Cartela | null>(null);
  const [bingoCardNumbers, setBingoCardNumbers] = useState<(number | string)[]>([]);
  const [generatedCardData, setGeneratedCardData] = useState<any>(null);
  
  // Waiting cartela states
  const [waitingCartelas, setWaitingCartelas] = useState<{[key: number]: WaitingCartela}>({});
  const [myWaitingCartela, setMyWaitingCartela] = useState<Cartela | null>(null);
  const [waitingExpiryTime, setWaitingExpiryTime] = useState<number | null>(null);
  const [waitingExpiryInterval, setWaitingExpiryInterval] = useState<NodeJS.Timeout | null>(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'availability'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userVerification, setUserVerification] = useState<{
    verified: boolean;
    source: string;
    timestamp: string;
  } | null>(null);
  
  // Game states
  const [showBingoGame, setShowBingoGame] = useState<boolean>(false);
  const [bingoGameData, setBingoGameData] = useState<any>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  
  // UI states
  const [showQuickStats, setShowQuickStats] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Refs
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const confirmSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const winnerPollingRef = useRef<NodeJS.Timeout | null>(null);
  const waitingPollingRef = useRef<NodeJS.Timeout | null>(null);
  const cartelaRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and fetch data
  useEffect(() => {
    // Initialize audio
    clickSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-casino-bling-achievement-2067.mp3');
    confirmSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');
    selectSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3');
    
    [clickSoundRef.current, confirmSoundRef.current, selectSoundRef.current].forEach(audio => {
      if (audio) audio.load();
    });

    // Check for existing session
    const savedSession = localStorage.getItem('currentSession');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setGameSession(session);
      setShowCountdown(true);
    }

    // Fetch initial data
    checkAuthAndLoadData();
    fetchCartelas();
    startWaitingCartelaPolling();

    // Auto-refresh cartelas every 10 seconds to update waiting statuses
    cartelaRefreshRef.current = setInterval(() => {
      fetchCartelas();
    }, 10000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (winnerPollingRef.current) clearInterval(winnerPollingRef.current);
      if (waitingPollingRef.current) clearInterval(waitingPollingRef.current);
      if (waitingExpiryInterval) clearInterval(waitingExpiryInterval);
      if (cartelaRefreshRef.current) clearInterval(cartelaRefreshRef.current);
    };
  }, []);

  // Sync store user with component state
  useEffect(() => {
    if (storeUser && isLoggedIn) {
      const user: User = {
        id: storeUser.id,
        telegramId: storeUser.telegramId,
        username: storeUser.username,
        firstName: storeUser.firstName,
        balance: storeUser.balance,
        bonusBalance: storeUser.bonusBalance || 0,
        role: storeUser.role,
        email: storeUser.email,
        referralCode: storeUser.referralCode,
        isOnline: storeUser.isOnline
      };
      setCurrentUser(user);
      
      if (!userVerification?.verified) {
        setUserVerification({
          verified: true,
          source: 'store_sync',
          timestamp: new Date().toISOString()
        });
      }
      
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else if (!isLoggedIn && currentUser) {
      setCurrentUser(null);
      setUserVerification(null);
      localStorage.removeItem('currentUser');
    }
  }, [storeUser, isLoggedIn]);

  // Filter and sort cartelas
  useEffect(() => {
    let result = [...cartelas];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(c => 
        c.cartela_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'number') {
        const numA = parseInt(a.cartela_number);
        const numB = parseInt(b.cartela_number);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      } else {
        // Sort by availability (available first, then waiting with time left, then in_game)
        const getStatusPriority = (status?: string, secondsRemaining?: number | null) => {
          if (status === 'available') return 0;
          if (status === 'waiting') {
            // Waiting with less time left appears higher (will become available soon)
            if (secondsRemaining && secondsRemaining < 10) return 1;
            return 2;
          }
          return 3;
        };
        const priorityA = getStatusPriority(a.status, a.waiting_seconds_remaining);
        const priorityB = getStatusPriority(b.status, b.waiting_seconds_remaining);
        return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
    });
    
    setFilteredCartelas(result);
  }, [cartelas, searchTerm, sortBy, sortOrder]);

  // Update expiry countdown for selected cartela
  useEffect(() => {
    if (myWaitingCartela && waitingExpiryTime !== null) {
      if (waitingExpiryInterval) {
        clearInterval(waitingExpiryInterval);
      }

      const interval = setInterval(() => {
        setWaitingExpiryTime(prev => {
          if (prev && prev > 0) {
            return prev - 1;
          } else {
            // Expired - release automatically
            setMyWaitingCartela(null);
            setSelectedCartela(null);
            setBingoCardNumbers([]);
            setGeneratedCardData(null);
            clearInterval(interval);
            
           
            
            // Refresh cartelas to show updated status
            fetchCartelas();
            return null;
          }
        });
      }, 1000);

      setWaitingExpiryInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [myWaitingCartela]);

  const checkAuthAndLoadData = async () => {
    setUserLoading(true);
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('currentUser');
      
      if (token && storedUser) {
        try {
          const response = await fetch('/api/auth/secure-check', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.success && data.user) {
            const user: User = {
              id: data.user.id,
              telegramId: data.user.telegram_id,
              username: data.user.username,
              firstName: data.user.first_name,
              balance: data.user.balance,
              bonusBalance: data.user.bonus_balance,
              role: data.user.role,
              email: data.user.email,
              referralCode: data.user.referral_code,
              isOnline: data.user.is_online
            };
            
            setCurrentUser(user);
            setUserVerification({
              verified: true,
              source: data.source || 'token_auth',
              timestamp: new Date().toISOString()
            });
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            setUserLoading(false);
            return;
          }
        } catch (error) {
          console.log('Token verification failed:', error);
        }
      }
      
      if (storeUser && isLoggedIn) {
        const user: User = {
          id: storeUser.id,
          telegramId: storeUser.telegramId,
          username: storeUser.username,
          firstName: storeUser.firstName,
          balance: storeUser.balance,
          bonusBalance: storeUser.bonusBalance,
          role: storeUser.role,
          email: storeUser.email,
          referralCode: storeUser.referralCode,
          isOnline: storeUser.isOnline
        };
        
        setCurrentUser(user);
        setUserVerification({
          verified: true,
          source: 'store_auth',
          timestamp: new Date().toISOString()
        });
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        setUserLoading(false);
        return;
      }
      
      const telegramSuccess = await initializeTelegramAuth();
      
      if (telegramSuccess) {
        console.log('Telegram auth successful');
      } else {
        setCurrentUser(null);
        setUserVerification({
          verified: false,
          source: 'no_auth',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Auth check error:', error);
      setCurrentUser(null);
      setUserVerification({
        verified: false,
        source: 'error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setUserLoading(false);
    }
  };

  const fetchCartelas = async () => {
    try {
      const response = await fetch('/api/game/cartelas');
      const data = await response.json();
      
      if (data.success) {
        setCartelas(data.cartelas);
        
        // Update my waiting cartela if it exists
        if (currentUser && myWaitingCartela) {
          const updatedMyCartela = data.cartelas.find((c: Cartela) => c.id === myWaitingCartela.id);
          if (updatedMyCartela) {
            if (updatedMyCartela.status !== 'waiting' || updatedMyCartela.waiting_user_id !== currentUser.id) {
              // My cartela is no longer waiting for me - release it
              setMyWaitingCartela(null);
              setSelectedCartela(null);
              setBingoCardNumbers([]);
              setGeneratedCardData(null);
              setWaitingExpiryTime(null);
              
             
            } else if (updatedMyCartela.waiting_seconds_remaining) {
              // Update expiry time
              setWaitingExpiryTime(updatedMyCartela.waiting_seconds_remaining);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cartelas:', error);
    }
  };

  const startWaitingCartelaPolling = useCallback(() => {
    if (waitingPollingRef.current) {
      clearInterval(waitingPollingRef.current);
    }

    const pollWaitingCartelas = async () => {
      try {
        const response = await fetch('/api/game/cartelas/waiting');
        const data = await response.json();
        
        if (data.success) {
          const waitingMap: {[key: number]: WaitingCartela} = {};
          data.waitingCartelas.forEach((w: any) => {
            waitingMap[w.id] = {
              userId: w.waiting_user_id,
              username: w.waiting_username || w.waiting_first_name,
              firstName: w.waiting_first_name,
              expiresAt: w.waiting_expires_at,
              sessionId: w.waiting_session_id,
              expiresInSeconds: w.expires_in_seconds
            };
          });
          setWaitingCartelas(waitingMap);
        }
      } catch (error) {
        console.error('Error polling waiting cartelas:', error);
      }
    };

    // Poll immediately
    pollWaitingCartelas();

    // Then poll every 2 seconds
    waitingPollingRef.current = setInterval(pollWaitingCartelas, 2000);
  }, []);

  const playSound = useCallback((soundType: 'click' | 'confirm' | 'select' = 'click') => {
    if (!soundEnabled) return;
    try {
      let sound;
      switch(soundType) {
        case 'confirm': sound = confirmSoundRef.current; break;
        case 'select': sound = selectSoundRef.current; break;
        default: sound = clickSoundRef.current;
      }
      
      if (sound) {
        sound.currentTime = 0;
        sound.volume = 0.3;
        sound.play().catch(e => console.log("Audio play failed:", e));
      }
    } catch (error) {
      console.log("Sound error:", error);
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  const handleCartelaSelect = async (cartela: Cartela) => {
    // Check if cartela is taken by someone else waiting
    if (cartela.status === 'waiting' && cartela.waiting_user_id !== currentUser?.id) {
      playSound('click');
      
      // Show who has it and how much time left
      const waiterName = cartela.waiting_first_name || cartela.waiting_username || 'Another user';
      const timeLeft = cartela.waiting_seconds_remaining || 0;
      
      
    }
    
    if (cartela.status === 'in_game') {
      playSound('click');
      alert(`Cartela ${cartela.cartela_number} is already in an active game`);
      return;
    }
    
    if (!currentUser) {
      alert('Please login to select a cartela');
      checkAuthAndLoadData();
      return;
    }
    
    playSound('select');
    setIsLoading(true);
    
    try {
      // First, select the cartela for waiting (50-second hold)
      const selectResponse = await fetch('/api/game/cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartelaId: cartela.id,
          userId: currentUser.id,
          action: 'select_for_waiting'
        })
      });
      
      const selectData = await selectResponse.json();
      
      if (!selectData.success) {
        alert(selectData.message || 'Failed to select cartela');
        setIsLoading(false);
        return;
      }
      
      // Then generate preview (using deterministic card)
      const previewResponse = await fetch('/api/game/cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartelaId: cartela.id,
          userId: currentUser.id,
          generatePreview: true
        })
      });
      
      const previewData = await previewResponse.json();
      
      if (previewData.success) {
        const numbers = previewData.cardData.numbers.map((item: any) => item.number);
        setBingoCardNumbers(numbers);
        setGeneratedCardData(previewData.cardData);
        setSelectedCartela(cartela);
        setMyWaitingCartela(cartela);
        setWaitingExpiryTime(selectData.expiresIn || 50); // 50 seconds hold time
        
      
        
        // Refresh cartelas to show updated status
        fetchCartelas();
      } else {
        alert(previewData.message || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Error selecting cartela:', error);
      alert('Error selecting cartela');
    } finally {
      setIsLoading(false);
    }
  };

  const releaseCartela = async () => {
    if (!selectedCartela || !currentUser) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/game/cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartelaId: selectedCartela.id,
          userId: currentUser.id,
          action: 'release_waiting'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedCartela(null);
        setBingoCardNumbers([]);
        setGeneratedCardData(null);
        setMyWaitingCartela(null);
        setWaitingExpiryTime(null);
        playSound('click');
        
        
        
        // Refresh cartelas to show updated status
        fetchCartelas();
      } else {
        alert(data.message || 'Failed to release cartela');
      }
    } catch (error) {
      console.error('Error releasing cartela:', error);
      alert('Error releasing cartela');
    } finally {
      setIsLoading(false);
    }
  };

  const startMultiplayerGame = async () => {
    if (!selectedCartela || !generatedCardData || !currentUser) {
      alert('Please select a cartela and login first');
      return;
    }
    
    // Verify cartela is still waiting for us and not expired
    if (waitingExpiryTime && waitingExpiryTime <= 0) {
      alert('Your 50-second selection period has expired. Please select again.');
      setSelectedCartela(null);
      setMyWaitingCartela(null);
      return;
    }
    
    setIsLoading(true);
    playSound('confirm');
    
    try {
      console.log('Starting game with:', {
        cartelaId: selectedCartela.id,
        userId: currentUser.id,
        cardData: generatedCardData
      });
      
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartelaId: selectedCartela.id,
          userId: currentUser.id,
          cardData: generatedCardData
        })
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to start game');
      }
      
      if (!data.session) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response from server: missing session data');
      }
      
      // Save session info
      localStorage.setItem('currentSession', JSON.stringify(data.session));
      localStorage.setItem('currentBingoCardId', data.bingoCardId.toString());
      if (data.cartelaNumber) {
        localStorage.setItem('cartelaNumber', data.cartelaNumber);
      }
      if (data.cardNumber) {
        localStorage.setItem('cardNumber', data.cardNumber.toString());
      }
      
      // Clear waiting state
      setMyWaitingCartela(null);
      setWaitingExpiryTime(null);
      
      // Set session state and show countdown
      setGameSession(data.session);
      setShowCountdown(true);
      
      // Refresh cartelas to show updated status
      fetchCartelas();
      
      // Start polling for session updates
      startSessionPolling(data.session.code, currentUser.id);
      
    } catch (error: any) {
      console.error('Failed to start multiplayer game:', error);
      
      let errorMessage = error.message || 'Failed to start game';
      
      if (error.message.includes('expired')) {
        errorMessage = 'Your 50-second selection period has expired. Please select again.';
        setSelectedCartela(null);
        setMyWaitingCartela(null);
        setWaitingExpiryTime(null);
      }
      
      alert(errorMessage);
      setIsLoading(false);
    }
  };

  const startSessionPolling = (sessionCode: string, userId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/game/sessions?code=${sessionCode}&userId=${userId}`);
        const data = await response.json();
        
        if (data.success) {
          consecutiveErrors = 0;
          const session = data.session;
          const players = data.players;
          
          // Update session state
          setGameSession({
            id: session.id,
            code: session.code,
            status: session.status,
            countdownRemaining: session.countdownRemaining,
            playerCount: session.playerCount,
            createdAt: session.createdAt
          });
          
          // Check if we have 2+ players and session is waiting
          if (session.playerCount >= 2 && session.status === 'waiting') {
            console.log('✅ Two players detected, forcing countdown start');
            setGameSession(prev => prev ? {
              ...prev,
              status: 'countdown',
              countdownRemaining: 50
            } : null);
          }
          
          // Handle session state changes
          if (session.status === 'cancelled') {
            stopPolling();
            setShowCountdown(false);
            setGameSession(null);
            setIsLoading(false);
            localStorage.removeItem('currentSession');
            alert('No other players joined yet. Please try again.');
          }
          
          if (session.status === 'active' || session.shouldStartGame) {
            console.log('🎮 Game is starting!');
            stopPolling();
            setShowCountdown(false);
            startBingoGame(sessionCode, userId);
          }
        } else {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error('Too many polling errors, stopping...');
            stopPolling();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          stopPolling();
        }
      }
    }, 1500);
  };

  const startBingoGame = async (sessionCode: string, userId: string) => {
    try {
      // Fetch current session data
      const response = await fetch(`/api/game/sessions?code=${sessionCode}&userId=${userId}`);
      const data = await response.json();
      
      if (data.success && data.session) {
        // Get stored data
        const bingoCardId = localStorage.getItem('currentBingoCardId');
        const cartelaNumber = localStorage.getItem('cartelaNumber');
        
        const gameData = {
          sessionId: data.session.id,
          sessionCode: sessionCode,
          isMultiplayer: true,
          gameMode: 'multiplayer',
          startTime: new Date().toISOString(),
          playerCount: data.session.playerCount,
          players: data.players || [],
          bingoCardId: bingoCardId,
          cartelaNumber: cartelaNumber,
          cardData: generatedCardData
        };
        
        localStorage.setItem('bingoGameData', JSON.stringify(gameData));
        localStorage.setItem('multiplayerSession', JSON.stringify({
          code: sessionCode,
          userId: userId,
          sessionId: data.session.id
        }));
        
        setBingoGameData(gameData);
        setShowBingoGame(true);
        setIsLoading(false);
        
        // Start winner detection polling
        startWinnerPolling(sessionCode, userId);
      } else {
        console.error('Failed to get session data:', data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to start bingo game:', error);
      setIsLoading(false);
    }
  };

  const startWinnerPolling = (sessionCode: string, userId: string) => {
    if (winnerPollingRef.current) {
      clearInterval(winnerPollingRef.current);
    }
    
    winnerPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/game/sessions?code=${sessionCode}`);
        const data = await response.json();
        
        if (data.success && data.session.status === 'finished') {
          stopWinnerPolling();
          
          if (data.session.winner_user_id === userId) {
            alert('🎉 Congratulations! You won the game!');
          } else {
            const winner = data.players.find((p: any) => p.user_id === data.session.winner_user_id);
            alert(`🏆 ${winner?.first_name || winner?.username || 'Another player'} won the game!`);
          }
          
          localStorage.removeItem('currentSession');
          localStorage.removeItem('multiplayerSession');
          setGameSession(null);
          
          // Refresh cartelas
          fetchCartelas();
        }
      } catch (error) {
        console.error('Winner polling error:', error);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const stopWinnerPolling = () => {
    if (winnerPollingRef.current) {
      clearInterval(winnerPollingRef.current);
      winnerPollingRef.current = null;
    }
  };

  const handleCountdownCancel = (reason: string) => {
    setShowCountdown(false);
    setGameSession(null);
    setIsLoading(false);
    localStorage.removeItem('currentSession');
    stopPolling();
    
    if (reason !== 'User cancelled') {
      alert(reason);
    }
  };

  const handleCountdownStart = () => {
    if (gameSession?.code && currentUser?.id) {
      const storedSessionData = localStorage.getItem('currentSessionData');
      if (storedSessionData) {
        const sessionData = JSON.parse(storedSessionData);
        console.log('Starting game with session data:', sessionData);
        localStorage.removeItem('currentSessionData');
      }
      
      startBingoGame(gameSession.code, currentUser.id);
    }
  };

  const handleBingoGameClose = () => {
    console.log('🎮 Closing BINGO game');
    setShowBingoGame(false);
    setBingoGameData(null);
    
    setSelectedCartela(null);
    setBingoCardNumbers([]);
    setGeneratedCardData(null);
    setMyWaitingCartela(null);
    setWaitingExpiryTime(null);
    
    setGameSession(null);
    localStorage.removeItem('currentSession');
    localStorage.removeItem('multiplayerSession');
    
    stopPolling();
    stopWinnerPolling();
    
    fetchCartelas();
    
    playSound('click');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // Release any waiting cartela first
      if (myWaitingCartela && currentUser) {
        releaseCartela();
      }
      
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('bingoGameData');
      localStorage.removeItem('currentSession');
      localStorage.removeItem('multiplayerSession');
      
      storeLogout();
      
      setCurrentUser(null);
      setUserVerification(null);
      setSelectedCartela(null);
      setBingoCardNumbers([]);
      setGeneratedCardData(null);
      setShowBingoGame(false);
      setBingoGameData(null);
      setGameSession(null);
      setShowCountdown(false);
      setMyWaitingCartela(null);
      setWaitingExpiryTime(null);
      
      stopPolling();
      stopWinnerPolling();
      
      alert('Logged out successfully.');
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([
      checkAuthAndLoadData(),
      fetchCartelas()
    ]);
    setIsLoading(false);
    alert('Data refreshed!');
  };

  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  const handleReauth = async () => {
    setIsLoading(true);
    await checkAuthAndLoadData();
    setIsLoading(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    playSound('click');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    playSound('click');
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  // Get cartela status display
  const getCartelaStatusDisplay = (cartela: Cartela) => {
    if (cartela.status === 'available') {
      return { bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:bg-green-200', label: 'Available' };
    } else if (cartela.status === 'waiting') {
      if (cartela.waiting_user_id === currentUser?.id) {
        return { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200', label: 'Your Selection' };
      } else {
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', hover: '', label: `Selected by ${cartela.waiting_first_name || cartela.waiting_username || 'Another user'}` };
      }
    } else if (cartela.status === 'in_game') {
      return { bg: 'bg-red-100', text: 'text-red-500', hover: '', label: 'In Game' };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-500', hover: '', label: 'Unknown' };
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-yellow-400 to-pink-500 opacity-20"></div>
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <TrophyFill size={32} className="text-white" />
              </div>
            </div>
            <div className="animate-pulse">
              <p className="text-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300 mb-1">
                BINGO ROYALE
              </p>
              <p className="text-lg font-semibold text-white/80">Securing your session...</p>
              <p className="text-sm text-white/60 mt-2">Preparing your gaming experience</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

 return (
  <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-4 md:p-8 relative overflow-hidden">

    {/* Countdown */}
    {showCountdown && gameSession && currentUser && (
      <CountdownDisplay
        sessionCode={gameSession.code}
        userId={currentUser.id}
        onGameStart={handleCountdownStart}
        onCancel={handleCountdownCancel}
      />
    )}

    {/* BINGO Game */}
    {showBingoGame && bingoGameData && (
      <div className="fixed inset-0 z-50 bg-white">
        <BingoGame 
          initialData={bingoGameData}
          onClose={handleBingoGameClose}
          isMultiplayer={true}
          sessionId={gameSession?.id}
          userId={currentUser?.id}
        />
      </div>
    )}

    {/* Top Action Buttons */}
    {currentUser && !showBingoGame && !showCountdown && (
      <div className="fixed top-4 right-10 z-40 flex gap-3">
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded-xl shadow hover:shadow-lg transition disabled:opacity-50"
        >
          Logout
        </button>
      </div>
    )}

    <div className="max-w-7xl mx-auto">

      {!showBingoGame && !showCountdown ? (
        <>
          {/* HEADER */}
          <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mb-8 border border-green-100">
            {currentUser ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div>
                  <h1 className="text-2xl font-bold text-green-700">
                    Welcome, {currentUser.firstName}
                  </h1>
                  
                </div>

                <div className="flex gap-6">
                  <div className="bg-green-50 px-4 py-3 rounded-xl">
                    <p className="text-sm text-green-500">Balance</p>
                    <p className="font-bold text-green-700">
                      ETB {currentUser.balance?.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  
                </div>

              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-semibold text-green-700 mb-4">
                  Login Required
                </h2>
                <button
                  onClick={handleLoginRedirect}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl shadow hover:shadow-lg transition"
                >
                  Login Now
                </button>
              </div>
            )}
          </div>

         
          

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* LEFT - CARTELA SELECTION */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-green-100">
              <div className="flex justify-between items-center mb-4">
                
                
                {/* Search and filter controls */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search cartela #"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1 border border-green-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={toggleSortOrder}
                    className="p-2 bg-green-100 rounded-lg hover:bg-green-200"
                    title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    {sortOrder === 'asc' ? <SortNumericDown /> : <SortNumericUpAlt />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 md:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto p-1">
                {filteredCartelas.map((cartela) => {
                  const statusStyle = getCartelaStatusDisplay(cartela);
                  const isMyWaiting = cartela.status === 'waiting' && cartela.waiting_user_id === currentUser?.id;
                  const isTakenByOther = cartela.status === 'waiting' && !isMyWaiting;
                  
                  // Determine if cartela is clickable
                  const isClickable = 
                    (cartela.status === 'available') || 
                    (isMyWaiting) ||
                    (cartela.status === 'waiting' && cartela.waiting_user_id === currentUser?.id);

                  return (
                    <div
                      key={cartela.id}
                      onClick={() => {
                        if (isClickable && !isLoading) {
                          handleCartelaSelect(cartela);
                        } else if (isTakenByOther) {
                          // Show who has it and time left
                          const waiterName = cartela.waiting_first_name || cartela.waiting_username || 'Another user';
                          alert(`⏳ Cartela ${cartela.cartela_number} is currently selected by ${waiterName}. It will become available in ${cartela.waiting_seconds_remaining || 0} seconds.`);
                        }
                      }}
                      className={`
                        aspect-square flex flex-col items-center justify-center 
                        rounded-xl text-sm font-semibold transition-all
                        ${statusStyle.bg} ${statusStyle.text}
                        ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-75'}
                        ${selectedCartela?.id === cartela.id ? 'ring-4 ring-green-500 ring-opacity-50 scale-105' : ''}
                        relative
                      `}
                      title={statusStyle.label}
                    >
                      <span>{cartela.cartela_number}</span>
                      
                      {/* Show timer for waiting cartelas */}
                      {cartela.status === 'waiting' && cartela.waiting_seconds_remaining && (
                        <span className="absolute -top-1 -right-1 bg-white rounded-full text-xs px-1 min-w-[20px] text-center shadow">
                          {cartela.waiting_seconds_remaining}s
                        </span>
                      )}
                      
                      {/* Icon indicators */}
                      {cartela.status === 'waiting' && isTakenByOther && (
                        <ClockFill size={12} className="absolute -bottom-1 -right-1 text-yellow-600" />
                      )}
                      {cartela.status === 'in_game' && (
                        <span className="absolute -bottom-1 -right-1 text-red-500 text-xs">🎮</span>
                      )}
                    </div>
                  );
                })}
              </div>
 {/* ===== SELECTED CARTELA INFO - ALWAYS VISIBLE WHEN CARTELA IS SELECTED ===== */}
              {selectedCartela && myWaitingCartela && waitingExpiryTime !== null && (
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-2 mb-2 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
                
                <div className="flex gap-3">
                  <button
                    onClick={startMultiplayerGame}
                    disabled={isLoading || waitingExpiryTime <= 0}
                    className="px-8 py-4 bg-yellow-400 text-blue-900 rounded-xl font-bold text-lg shadow-lg hover:bg-yellow-300 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoading ? 'Starting...' : '🚀 START GAME NOW'}
                  </button>
                  
                  <button
                    onClick={releaseCartela}
                    disabled={isLoading}
                    className="px-6 py-4 bg-white/20 text-white rounded-xl font-semibold backdrop-blur-sm hover:bg-white/30 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              
              {/* Progress bar for time remaining */}
              <div className="mt-4 w-full bg-white/30 rounded-full h-3">
                <div 
                  className="bg-yellow-400 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(waitingExpiryTime / 50) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
            </div>

            {/* RIGHT - PREVIEW */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-green-100">
              <h3 className="text-xl font-bold text-green-700 mb-6">
                BINGO Card Preview
                {selectedCartela && (
                  <span className="text-sm font-normal text-green-500 ml-2">
                    (Cartela #{selectedCartela.cartela_number})
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-5 gap-3">
                {bingoCardNumbers.length > 0 ? (
                  bingoCardNumbers.map((num, index) => (
                    <div
                      key={index}
                      className={`
                        aspect-square flex items-center justify-center rounded-xl font-bold text-lg
                        ${index === 12
                          ? 'bg-green-600 text-white'
                          : index % 5 === 0 ? 'bg-blue-50 text-blue-700'   // B column
                          : index % 5 === 1 ? 'bg-indigo-50 text-indigo-700' // I column
                          : index % 5 === 2 ? 'bg-purple-50 text-purple-700' // N column
                          : index % 5 === 3 ? 'bg-pink-50 text-pink-700'    // G column
                          : 'bg-orange-50 text-orange-700'                  // O column
                        }
                      `}
                    >
                      {index === 12 ? 'FREE' : num}
                    </div>
                  ))
                ) : (
                  <div className="col-span-5 text-center text-green-400 py-12">
                    Select a cartela to preview your deterministic card
                  </div>
                )}
              </div>

              {/* Card info */}
              {selectedCartela && (
                <div className="mt-6 text-sm text-green-600 text-center border-t border-green-100 pt-4">
                  <p>✨ This card is permanently assigned to Cartela #{selectedCartela.cartela_number}</p>
                  <p className="text-xs text-green-400 mt-1">Same card every time you select this cartela</p>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          {currentUser && (
            <div className="mt-8 bg-white rounded-2xl p-4 border border-green-100 text-green-600 text-sm text-center">
              Playing as {currentUser.firstName} • Session ID: {currentUser.id?.substring(0, 8)}...
              {myWaitingCartela && (
                <span className="ml-2 text-blue-600 font-semibold">
                  • Cartela #{myWaitingCartela.cartela_number} selected ({waitingExpiryTime}s remaining)
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-green-600 text-xl font-semibold">
          Opening BINGO Game...
        </div>
      )}
    </div>
  </div>
);
};

export default CardPicker;