// components/game/card-picker.tsx - DEBUGGED VERSION
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlayCircle, VolumeUpFill, VolumeMuteFill, 
  CardChecklist, XCircle, BoxArrowRight,
  PersonCircle, ArrowClockwise, ShieldCheck,
  StarFill, TrophyFill, Coin, Grid3x3GapFill,
  Search, Filter, SortNumericDown, SortNumericUpAlt,
  LightningChargeFill, AwardFill, GiftFill,
  Dice5Fill, Stars
} from 'react-bootstrap-icons';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/game-store';

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

interface CardPickerProps {
  onGameStart?: (gameData: any) => void;
}

const CardPicker: React.FC<CardPickerProps> = ({ onGameStart }) => {
  // Get state and actions from the store
  const { 
    user: storeUser, 
    isLoggedIn, 
    login, 
    logout: storeLogout,
    initializeTelegramAuth,
    fetchAvailableCards: storeFetchCards,
    selectCard: storeSelectCard
  } = useGameStore();
  
  const [cartelas, setCartelas] = useState<Cartela[]>([]);
  const [filteredCartelas, setFilteredCartelas] = useState<Cartela[]>([]);
  const [selectedCartela, setSelectedCartela] = useState<Cartela | null>(null);
  const [bingoCardNumbers, setBingoCardNumbers] = useState<(number | string)[]>([]);
  const [generatedCardData, setGeneratedCardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'availability'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // User state - derived from store
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userVerification, setUserVerification] = useState<{
    verified: boolean;
    source: string;
    timestamp: string;
  } | null>(null);
  
  // Game modal state - SIMPLIFIED
  const [showBingoGame, setShowBingoGame] = useState<boolean>(false);
  const [bingoGameData, setBingoGameData] = useState<any>(null);
  
  // UI states
  const [showQuickStats, setShowQuickStats] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Refs
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const confirmSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and fetch data
  useEffect(() => {
    // Initialize audio
    clickSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-casino-bling-achievement-2067.mp3');
    confirmSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');
    selectSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3');
    
    [clickSoundRef.current, confirmSoundRef.current, selectSoundRef.current].forEach(audio => {
      if (audio) audio.load();
    });

    // Fetch initial data
    checkAuthAndLoadData();
    fetchCartelas();
  }, []);

  // Sync store user with component state
  useEffect(() => {
    if (storeUser && isLoggedIn) {
      console.log('🔄 Store user updated:', storeUser.username);
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
      console.log('🔄 Store logged out, clearing local user');
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
      console.log('🔐 Checking authentication...');
      
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
            console.log('✅ Token valid, user authenticated:', data.user.username);
            
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
          console.log('❌ Token verification failed:', error);
        }
      }
      
      if (storeUser && isLoggedIn) {
        console.log('✅ Using store user:', storeUser.username);
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
      
      console.log('🔄 Trying Telegram auth...');
      const telegramSuccess = await initializeTelegramAuth();
      
      if (telegramSuccess) {
        console.log('✅ Telegram auth successful');
      } else {
        console.log('❌ No authentication found');
        setCurrentUser(null);
        setUserVerification({
          verified: false,
          source: 'no_auth',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Auth check error:', error);
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
        console.log(`🎰 Loaded ${data.cartelas.length} cartelas`);
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
        console.log('✅ BINGO card preview generated for user:', currentUser.username);
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

  // SIMPLIFIED: Direct function to start bingo game
  const confirmAndStartGame = async () => {
    if (!selectedCartela || !generatedCardData) {
      alert('Please select a cartela first');
      return;
    }
    
    if (!currentUser) {
      alert('Please login to start a game');
      checkAuthAndLoadData();
      return;
    }
    
    console.log('🎮 Starting BINGO game with cartela:', selectedCartela.cartela_number);
    console.log('🎯 User:', currentUser.username);
    console.log('🎲 Generated card data:', generatedCardData);
    
    playSound('confirm');
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
          cartelaId: selectedCartela.id,
          userId: currentUser.id,
          username: currentUser.username,
          firstName: currentUser.firstName,
          cardData: generatedCardData,
          saveGame: true,
          startGame: true
        })
      });
      
      const data = await response.json();
      console.log('🎮 Game start API response:', data);
      
      if (data.success) {
        // Create simple game data
        const gameData = {
          gameId: data.gameId || `game_${Date.now()}`,
          cartelaNumber: selectedCartela.cartela_number,
          cardNumbers: bingoCardNumbers,
          cardData: data.cardData || generatedCardData,
          user: {
            id: currentUser.id,
            username: currentUser.username,
            firstName: currentUser.firstName,
            balance: currentUser.balance
          },
          startTime: new Date().toISOString(),
          status: 'active',
          drawnNumbers: [],
          markedNumbers: []
        };
        
        // Store game data
        localStorage.setItem('bingoGameData', JSON.stringify(gameData));
        
        // Set state to show bingo game - THIS IS THE KEY LINE
        setBingoGameData(gameData);
        
        // Wait a tiny bit to ensure state is set
        setTimeout(() => {
          console.log('🔄 Setting showBingoGame to TRUE');
          setShowBingoGame(true);
          setIsLoading(false);
        }, 100);
        
        // Refresh cartelas
        fetchCartelas();
        
        // Notify parent
        if (onGameStart) {
          onGameStart(gameData);
        }
        
        console.log('✅ BINGO game prepared, should open now');
        
      } else {
        alert(data.message || 'Failed to start game');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error starting game:', error);
      alert('Failed to start game. Please check console for details.');
      setIsLoading(false);
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
      
      storeLogout();
      
      setCurrentUser(null);
      setUserVerification(null);
      setSelectedCartela(null);
      setBingoCardNumbers([]);
      setGeneratedCardData(null);
      setShowBingoGame(false);
      setBingoGameData(null);
      
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
    console.log('🎮 showBingoGame state changed:', showBingoGame);
    console.log('🎮 bingoGameData:', bingoGameData);
  }, [showBingoGame, bingoGameData]);

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
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300 mb-2">
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
      {/* BINGO Game Component - RENDERED CONDITIONALLY */}
      {showBingoGame && bingoGameData && (
        <div className="fixed inset-0 z-50">
          <BingoGame 
            initialData={bingoGameData}
            onClose={handleBingoGameClose}
          />
        </div>
      )}

      {/* Control Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
        <div 
          className="relative group"
          onClick={toggleSound}
          title={soundEnabled ? "Mute sound" : "Unmute sound"}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur opacity-0 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative w-14 h-14 bg-black/70 rounded-full flex items-center justify-center cursor-pointer border-2 border-yellow-400 shadow-xl backdrop-blur-sm">
            {soundEnabled ? (
              <VolumeUpFill size={26} className="text-white" />
            ) : (
              <VolumeMuteFill size={26} className="text-white" />
            )}
          </div>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-0 group-hover:opacity-70 transition-opacity"></div>
          <button
            onClick={refreshAll}
            disabled={isLoading || showBingoGame}
            className="relative w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all shadow-lg backdrop-blur-sm disabled:opacity-50"
            title="Refresh all data"
          >
            <ArrowClockwise className={`text-white ${isLoading ? "animate-spin" : ""}`} size={24} />
          </button>
        </div>
      </div>

      {/* Top Action Buttons */}
      {currentUser && !showBingoGame && (
        <div className="fixed top-4 left-4 z-30 flex gap-2">
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full flex items-center gap-2 hover:shadow-xl hover:scale-105 transition-all shadow-lg backdrop-blur-sm text-sm disabled:opacity-50"
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
        {/* Only show card picker content when bingo game is NOT showing */}
        {!showBingoGame ? (
          <>
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl mb-6 md:mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-indigo-600/20 backdrop-blur-sm"></div>
              <div className="relative bg-gradient-to-r from-indigo-700/90 via-purple-700/90 to-pink-700/90 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                      <div className="relative">
                        <TrophyFill size={36} className="text-yellow-300 animate-pulse" />
                      </div>
                      <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-300">
                        BINGO ROYALE
                      </h1>
                      <div className="relative">
                        <TrophyFill size={36} className="text-yellow-300 animate-pulse" />
                      </div>
                    </div>
                    
                    <p className="text-lg opacity-90 mb-2">
                      Select your lucky cartela and start winning!
                    </p>
                    <p className="text-sm opacity-70">
                      Premium gaming experience with enhanced rewards
                    </p>
                  </div>
                  
                  {/* User Info */}
                  {currentUser ? (
                    <div className="flex flex-col items-center md:items-end gap-3">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <PersonCircle size={28} className="text-white" />
                              </div>
                              {userVerification?.verified && (
                                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1 shadow-lg">
                                  <ShieldCheck size={14} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-xl flex items-center gap-2">
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
                        <ShieldCheck size={48} className="text-red-300 mx-auto mb-2" />
                        <p className="font-bold text-xl mb-2">Authentication Required</p>
                        <p className="opacity-90">Login to access premium features</p>
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
                        <p className="text-3xl font-bold text-white">
                          {cartelas.filter(c => c.is_available).length}
                          <span className="text-sm text-white/50"> / {cartelas.length}</span>
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                        <Grid3x3GapFill size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Your Balance</p>
                        <p className="text-3xl font-bold text-white">
                          ${currentUser.balance?.toFixed(2)}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <Coin size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Bonus Balance</p>
                        <p className="text-3xl font-bold text-white">
                          ${currentUser.bonusBalance?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                        <GiftFill size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70 mb-1">Selected Cartela</p>
                        <p className="text-3xl font-bold text-white">
                          {selectedCartela?.cartela_number || '--'}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <TrophyFill size={24} className="text-white" />
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
                    <h2 className="text-2xl font-bold text-white mb-2">Available Cartelas</h2>
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
                  
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-full transition-all ${
                          viewMode === 'grid' 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode('compact')}
                        className={`px-4 py-2 rounded-full transition-all ${
                          viewMode === 'compact' 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Filters */}
                {showFilters && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Search */}
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Search size={20} className="text-white/50" />
                        </div>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search cartela number..."
                          className="w-full pl-10 pr-10 py-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
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
                          className="flex-1 px-4 py-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 text-white focus:outline-none focus:border-purple-500 transition-all"
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
                } max-h-[400px] overflow-y-auto p-3 bg-gradient-to-br from-black/20 to-black/10 rounded-2xl`}>
                  {filteredCartelas.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                      <Search size={48} className="text-white/30 mx-auto mb-4" />
                      <p className="text-white/50">No cartelas found</p>
                    </div>
                  ) : (
                    filteredCartelas.map((cartela) => (
                      <div
                        key={cartela.id}
                        className={`relative group ${viewMode === 'compact' ? 'h-10' : 'h-12'}`}
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
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
                            <AwardFill size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">
                              Selected Cartela: <span className="text-2xl text-yellow-300">{selectedCartela.cartela_number}</span>
                            </p>
                            <p className="text-green-300 text-sm">
                              Ready to start as <span className="font-semibold">{currentUser?.firstName}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedCartela(null)}
                          className="px-5 py-2.5 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white rounded-xl hover:bg-red-500/30 transition-all backdrop-blur-sm border border-red-500/20 flex items-center gap-2"
                        >
                          <XCircle size={16} /> Clear
                        </button>
                        <button
                          onClick={confirmAndStartGame}
                          disabled={isLoading}
                          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 backdrop-blur-sm flex items-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Starting Game...
                            </>
                          ) : (
                            <>
                              <PlayCircle size={20} /> 
                              <span className="hidden md:inline">Start BINGO Game</span>
                              <span className="md:hidden">Play BINGO</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column - BINGO Card Preview */}
              <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-sm rounded-3xl shadow-2xl p-5 md:p-6 border border-yellow-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                      <CardChecklist size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">BINGO Card Preview</h3>
                      <p className="text-sm text-white/70">Your lucky numbers are here!</p>
                    </div>
                  </div>
                  
                  {selectedCartela && (
                    <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-white shadow-lg">
                      Cartela #{selectedCartela.cartela_number}
                    </div>
                  )}
                </div>
                
                <div className="mb-6">
                  {/* BINGO Letters Header */}
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
                      <div 
                        key={letter}
                        className="aspect-square bg-gradient-to-br from-purple-700 to-pink-700 rounded-xl flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg relative overflow-hidden group"
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
                            <div className="w-16 h-16 mx-auto mb-4">
                              <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20"></div>
                              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                                <LightningChargeFill size={32} className="text-white animate-pulse" />
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
                                <span className="text-xs text-center px-2">FREE</span>
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
                              <span className="text-sm">Premium Experience</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Game Instructions */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl backdrop-blur-sm border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <LightningChargeFill size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white mb-1">How to Play BINGO</p>
                      <p className="text-sm text-white/70">
                        1. Select a cartela number from the grid<br />
                        2. Preview your BINGO card with lucky numbers<br />
                        3. Click "Start BINGO Game" to begin playing<br />
                        4. Numbers will be drawn automatically<br />
                        5. Mark matching numbers on your card<br />
                        6. Complete a line (row, column, diagonal) to WIN!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Resume Game Button */}
            {currentUser && localStorage.getItem('bingoGameData') && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    try {
                      const savedGame = JSON.parse(localStorage.getItem('bingoGameData') || '{}');
                      console.log('🎮 Resuming saved game:', savedGame.gameId);
                      setBingoGameData(savedGame);
                      setShowBingoGame(true);
                      playSound('confirm');
                    } catch (error) {
                      console.error('Error loading saved game:', error);
                      alert('Could not load saved game');
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                >
                  <PlayCircle size={20} />
                  Resume Previous BINGO Game
                </button>
              </div>
            )}
            
            {/* Footer Security Info */}
            {currentUser && (
              <div className="mt-6 md:mt-8 p-4 md:p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                      <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Secure Session Active</p>
                      <p className="text-sm text-green-300">
                        Playing as: {currentUser.firstName} • 
                        Verified via: {userVerification?.source?.replace(/_/g, ' ') || 'Premium Auth'}
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
                      Logout Session
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