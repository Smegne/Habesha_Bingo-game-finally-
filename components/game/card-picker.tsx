// components/game/card-picker.tsx - UPDATED VERSION
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlayCircle, VolumeUpFill, VolumeMuteFill, 
  CardChecklist, XCircle, BoxArrowRight,
  PersonCircle, ArrowClockwise, ShieldCheck,
  StarFill, TrophyFill, Coin, Grid3x3GapFill,
  Search, Filter, SortNumericDown, SortNumericUpAlt,
  LightningChargeFill, AwardFill, GiftFill,
  Dice5Fill, Stars, PeopleFill, ClockFill
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
  popularity?: number;
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

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (winnerPollingRef.current) clearInterval(winnerPollingRef.current);
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
        // Sort by availability (available first)
        if (a.is_available === b.is_available) return 0;
        if (a.is_available) return sortOrder === 'asc' ? -1 : 1;
        return sortOrder === 'asc' ? 1 : -1;
      }
    });
    
    setFilteredCartelas(result);
  }, [cartelas, searchTerm, sortBy, sortOrder]);

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
      }
    } catch (error) {
      console.error('Error fetching cartelas:', error);
    }
  };

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
    if (!cartela.is_available) {
      playSound('click');
      alert(`Cartela ${cartela.cartela_number} is already taken`);
      return;
    }
    
    if (!currentUser) {
      alert('Please login to select a cartela');
      checkAuthAndLoadData();
      return;
    }
    
    playSound('select');
    setSelectedCartela(cartela);
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/game/cartelas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cartelaId: cartela.id,
          generatePreview: true,
          userId: currentUser.id
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const numbers = data.cardData.numbers.map((item: any) => item.number);
        setBingoCardNumbers(numbers);
        setGeneratedCardData(data.cardData);
      } else {
        alert(data.message || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Error generating card:', error);
      alert('Error generating preview card');
    } finally {
      setIsLoading(false);
    }
  };


// In card-picker.tsx - Enhanced error handling
const startMultiplayerGame = async () => {
  if (!selectedCartela || !generatedCardData || !currentUser) {
    alert('Please select a cartela and login first');
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
    
    // Log raw response for debugging
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to start game');
    }
    
    // Validate response structure
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
    
    // Set session state and show countdown
    setGameSession(data.session);
    setShowCountdown(true);
    
    // Start polling for session updates
    startSessionPolling(data.session.code, currentUser.id);
    
  } catch (error: any) {
    console.error('Failed to start multiplayer game:', error);
    
    // Show more detailed error message
    let errorMessage = error.message || 'Failed to start game';
    
    // Check for specific error types
    if (error.message.includes('not iterable')) {
      errorMessage = 'Server returned invalid data format. Please try again.';
    }
    
    alert(errorMessage);
    setIsLoading(false);
  }
};

  // Polling function for session updates
const startSessionPolling = (sessionCode: string, userId: string) => {
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  
  pollingIntervalRef.current = setInterval(async () => {
    try {
      // Use the sessions endpoint (not current)
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
  // Start bingo game with multiplayer data
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
        // Include the card data that was generated earlier
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

  // Poll for winner announcements
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
          
          // Show winner announcement
          if (data.session.winner_user_id === userId) {
            alert('🎉 Congratulations! You won the game!');
          } else {
            // Get winner info from players list
            const winner = data.players.find((p: any) => p.user_id === data.session.winner_user_id);
            alert(`🏆 ${winner?.first_name || winner?.username || 'Another player'} won the game!`);
          }
          
          // Clean up
          localStorage.removeItem('currentSession');
          localStorage.removeItem('multiplayerSession');
          setGameSession(null);
        }
      } catch (error) {
        console.error('Winner polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
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

  // Handle countdown cancellation
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

// In card-picker.tsx - Enhanced handleCountdownStart
const handleCountdownStart = () => {
  if (gameSession?.code && currentUser?.id) {
    // Get stored session data if available
    const storedSessionData = localStorage.getItem('currentSessionData');
    if (storedSessionData) {
      const sessionData = JSON.parse(storedSessionData);
      console.log('Starting game with session data:', sessionData);
      localStorage.removeItem('currentSessionData'); // Clean up
    }
    
    startBingoGame(gameSession.code, currentUser.id);
  }
};
  // Handle bingo game close
  const handleBingoGameClose = () => {
    console.log('🎮 Closing BINGO game');
    setShowBingoGame(false);
    setBingoGameData(null);
    
    // Clear selection
    setSelectedCartela(null);
    setBingoCardNumbers([]);
    setGeneratedCardData(null);
    
    // Clean up session
    setGameSession(null);
    localStorage.removeItem('currentSession');
    localStorage.removeItem('multiplayerSession');
    
    // Stop all polling
    stopPolling();
    stopWinnerPolling();
    
    // Refresh cartelas
    fetchCartelas();
    
    playSound('click');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
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
      
      // Stop polling
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

  // Debug: Log when showBingoGame changes
  useEffect(() => {
    console.log('🎮 Game states:', {
      showBingoGame,
      showCountdown,
      gameSession,
      hasBingoGameData: !!bingoGameData
    });
  }, [showBingoGame, showCountdown, gameSession, bingoGameData]);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-3 md:p-6 relative overflow-hidden">
      {/* Countdown Display */}
      {showCountdown && gameSession && currentUser && (
        <CountdownDisplay
          sessionCode={gameSession.code}
          userId={currentUser.id}
          onGameStart={handleCountdownStart}
          onCancel={handleCountdownCancel}
        />
      )}

      {/* BINGO Game Component */}
      {showBingoGame && bingoGameData && (
        <div className="fixed inset-0 z-50">
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
        <div className="fixed top-2 right-4 z-300 flex gap-2">
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="px-2 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full flex items-center gap-2 hover:shadow-xl hover:scale-105 transition-all shadow-lg backdrop-blur-sm text-sm disabled:opacity-50"
            title="Logout"
          >
            <BoxArrowRight size={16} />
            Logout
          </button>
          <button
            onClick={() => setShowQuickStats(!showQuickStats)}
            disabled={isLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full flex items-center gap-2 hover:shadow-xl hover:scale-105 transition-all shadow-lg backdrop-blur-sm text-sm disabled:opacity-50"
          >
            <TrophyFill size={16} />
            {showQuickStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Only show card picker content when bingo game or countdown is NOT showing */}
        {!showBingoGame && !showCountdown ? (
          <>
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl mb-6 md:mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-indigo-600/20 backdrop-blur-sm"></div>
              <div className="relative bg-gradient-to-r from-indigo-700/90 via-purple-700/90 to-pink-700/90 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 
                  
                  {/* User Info */}
                  {currentUser ? (
                    <div className="flex flex-col items-center md:items-end gap-3">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <PersonCircle size={14} className="text-white" />
                              </div>
                              {userVerification?.verified && (
                                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1 shadow-lg">
                                  <ShieldCheck size={10} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm flex items-center gap-2">
                                {currentUser.firstName}
                                {currentUser.role === 'admin' && (
                                  <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
                                    ADMIN
                                  </span>
                                )}
                              </p>
                              <p className="opacity-90 text-sm">
                                @{currentUser.username}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 bg-black/30 rounded-full px-3 py-1">
                                  <Coin size={14} className="text-yellow-400" />
                                  <span className="font-bold">${currentUser.balance?.toFixed(2)}</span>
                                </div>
                                {currentUser.bonusBalance && currentUser.bonusBalance > 0 && (
                                  <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full px-3 py-1">
                                    <GiftFill size={14} className="text-orange-300" />
                                    <span className="font-bold text-yellow-300">+${currentUser.bonusBalance?.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <ShieldCheck size={28} className="text-red-300 mx-auto mb-2" />
                        <p className="font-bold text-xl mb-2">Authentication Required</p>
                        <p className="opacity-90">Login to access multiplayer games</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleReauth}
                          disabled={isLoading}
                          className="px-5 py-2.5 bg-gradient-to-r from-white/20 to-white/10 rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all backdrop-blur-sm"
                        >
                          Re-authenticate
                        </button>
                        <button
                          onClick={handleLoginRedirect}
                          className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                          Login Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats (Collapsible) */}
            {showQuickStats && currentUser && (
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Available Cartelas</p>
                        <p className="text-sm font-bold text-white">
                          {cartelas.filter(c => c.is_available).length}
                          <span className="text-sm text-white/50"> </span>
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Balance</p>
                        <p className="text-sm font-bold text-white">
                          {currentUser.balance?.toFixed(2)}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Bonus</p>
                        <p className="text-sm font-bold text-white">
                          ETB {currentUser.bonusBalance?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Selected Cartela</p>
                        <p className="text-sm font-bold text-white">
                          {selectedCartela?.cartela_number || '--'}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Left Column - Cartela Selection */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl shadow-2xl p-5 md:p-6 border border-white/10">
                {/* Controls Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2"></h2>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/70">
                        {filteredCartelas.filter(c => c.is_available).length} available
                      </span>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full text-sm text-white/90 hover:bg-blue-500/30 transition-all"
                      >
                        <Filter size={14} className="inline mr-1" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                      </button>
                    </div>
                  </div>
                  
                
                </div>
                
                {/* Filters */}
                {showFilters && (
                  <div className="mb-4 p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Search */}
                      <div className="relative">
                        <div className="absolute left-1 top-1/2 transform -translate-y-1/2">
                          <Search size={10} className="text-white/50" />
                        </div>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search cartela number..."
                          className="w-full text-sm pl-6 pr-6 py-2 bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        {searchTerm && (
                          <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                          >
                            <XCircle size={20} />
                          </button>
                        )}
                      </div>
                      
                      {/* Sort Controls */}
                      <div className="flex items-center gap-3">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'number' | 'availability')}
                          className="w-22 text-sm px-2 py-2 bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 text-white focus:outline-none focus:border-purple-500 transition-all"
                        >
                          <option value="number">Sort by Number</option>
                          <option value="availability">Sort by Availability</option>
                        </select>
                        <button
                          onClick={toggleSortOrder}
                          className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-white/20 hover:bg-purple-500/30 transition-all"
                          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                          {sortOrder === 'asc' ? (
                            <SortNumericDown size={20} className="text-white" />
                          ) : (
                            <SortNumericUpAlt size={20} className="text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Cartela Grid */}
                <div className={`grid gap-3 ${
                  viewMode === 'compact' 
                    ? 'grid-cols-8 md:grid-cols-10 lg:grid-cols-12' 
                    : 'grid-cols-6 md:grid-cols-8 lg:grid-cols-10'
                } max-h-[400px] overflow-y-auto p-2 bg-gradient-to-br from-black/20 to-black/10 rounded-2xl`}>
                  {filteredCartelas.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                      <Search size={48} className="text-white/30 mx-auto mb-4" />
                      <p className="text-white/50">No cartelas found</p>
                    </div>
                  ) : (
                    filteredCartelas.map((cartela) => (
                      <div
                        key={cartela.id}
                        className={`relative group ${viewMode === 'compact' ? 'h-6' : 'h-6' } ring-2 ring-green-400 ring-offset-2 ring-offset-black/50`}
                        onClick={() => cartela.is_available && handleCartelaSelect(cartela)}
                      >

                        <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
                          cartela.is_available
                            ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30'
                            : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'
                        } ${selectedCartela?.id === cartela.id ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black/50' : ''}`}></div>
                        
                        <div className={`relative h-full flex items-center justify-center rounded-lg transition-all duration-300 ${
                          selectedCartela?.id === cartela.id
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold scale-105'
                            : cartela.is_available
                              ? 'bg-gradient-to-br from-white/10 to-white/5 text-white group-hover:bg-white/20 group-hover:scale-105'
                              : 'bg-gradient-to-br from-red-900/30 to-pink-900/30 text-white/50'
                        } ${!cartela.is_available ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <span className={`${viewMode === 'compact' ? 'text-xs' : 'text-sm'} font-semibold`}>
                            {cartela.cartela_number}
                          </span>
                          
                          {!cartela.is_available && (
                            <div className="absolute -top-1 -right-1 w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                              <XCircle size={10} className="text-white" />
                            </div>
                          )}
                          
                          {selectedCartela?.id === cartela.id && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                              <StarFill size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Selection Actions */}
                {selectedCartela && (
                  <div className="mt-6 p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-500/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
                            <AwardFill size={6} className="text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              Selected: <span className="text-xl text-yellow-300">{selectedCartela.cartela_number}</span>
                            </p>
                            
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedCartela(null)}
                          className="px-1 py-1 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white rounded-sm hover:bg-red-500/30 transition-all backdrop-blur-sm border border-red-500/20 flex items-center gap-2"
                        >
                          <XCircle size={10} /> Clear
                        </button>
                        <button
                          onClick={startMultiplayerGame}
                          disabled={isLoading}
                          className="px-2 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 backdrop-blur-sm flex items-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Joining Game...
                            </>
                          ) : (
                            <>
                              <PlayCircle size={15} /> 
                              <span className="hidden md:inline">Start</span>
                              <span className="md:hidden">Play Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column - BINGO Card Preview */}
              <div className="bg-gradient-to-br from-black-500/10 via-green-500/10 to-green-500/10 backdrop-blur-sm rounded-xl shadow-2xl p-5 md:p-6 border border-yellow-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                      <CardChecklist size={14} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">BINGO Card Preview</h3>
                      
                    </div>
                  </div>
                  
                  {selectedCartela && (
                    <div className="px-2 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-white shadow-lg">
                      Cartela #{selectedCartela.cartela_number}
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  {/* BINGO Letters Header */}
                  <div className="grid grid-cols-5  mb-2">
                    {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
                      <div 
                        key={letter}
                        className="aspect-square bg-gradient-to-br from-purple-700 to-pink-700 rounded-xl flex items-center justify-center text-white text-sm md:text-sm font-bold shadow-sm relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="relative">{letter}</span>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* BINGO Card Grid */}
                  <div className="grid grid-cols-5 gap-3 min-h-[300px]">
                    {isLoading ? (
                      <div className="col-span-5 flex items-center justify-center">
                        <div className="text-center">
                          <div className="relative">
                            <div className="w-6 h-6 mx-auto mb-4">
                              <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20"></div>
                              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                                <LightningChargeFill size={12} className="text-white animate-pulse" />
                              </div>
                            </div>
                            <p className="text-white/80">Generating your lucky card...</p>
                          </div>
                        </div>
                      </div>
                    ) : bingoCardNumbers.length > 0 ? (
                      bingoCardNumbers.map((cellNumber, index) => (
                        <div
                          key={index}
                          className={`relative group ${index === 12 ? 'free-space' : ''}`}
                        >
                          <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                            index === 12
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                              : 'bg-gradient-to-br from-white/10 to-white/5 group-hover:bg-white/20'
                          }`}></div>
                          
                          <div className={`relative aspect-square flex items-center justify-center rounded-xl transition-all duration-300 ${
                            index === 12
                              ? 'text-black font-bold text-lg'
                              : 'text-white font-semibold text-lg group-hover:scale-110'
                          }`}>
                            {cellNumber}
                            {index === 12 && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs text-center px-2"></span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-5 flex items-center justify-center text-center">
                        <div className="text-white/50">
                          <div className="text-5xl mb-4 opacity-20 font-bold">BINGO</div>
                          <p className="text-lg mb-2">Select a cartela to see</p>
                          <p className="text-sm">your 5×5 BINGO card preview</p>
                          <div className="mt-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full">
                              <StarFill size={16} className="text-yellow-400" />
                              <span className="text-sm">Multiplayer Ready</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
               
              </div>
            </div>
            
            {/* Footer Security Info */}
            {currentUser && (
              <div className="mt-6 md:mt-8 p-4 md:p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                      <ShieldCheck size={10} className="text-white" />
                    </div>
                    <div>
                    
                      <p className="text-sm text-green-300">
                        Playing as: {currentUser.firstName} • 
                        
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-white/70">
                      Session ID: {currentUser.id?.substring(0, 8)}...
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white rounded-full hover:bg-red-500/30 transition-all"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // Show loading message when game is being prepared
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-green-500 to-emerald-500 opacity-20"></div>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                <Stars size={40} className="text-white animate-pulse" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-300 mb-4">
              Opening BINGO Game...
            </h3>
            <p className="text-white/80 text-lg">Please wait while we load your game</p>
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-400 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPicker;