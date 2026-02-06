// components/game/card-picker.tsx - FULLY CORRECTED VERSION
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlayCircle, VolumeUpFill, VolumeMuteFill, 
  CardChecklist, XCircle, BoxArrowRight,
  PersonCircle, ArrowClockwise,
  ShieldCheck
} from 'react-bootstrap-icons';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/game-store';

const BingoGame = dynamic(() => import('./bingo-game'), {
  loading: () => <div className="text-white text-center py-10">Loading BINGO Game...</div>,
  ssr: false
});

interface Cartela {
  id: number;
  cartela_number: string;
  is_available: boolean;
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
  const [selectedCartela, setSelectedCartela] = useState<Cartela | null>(null);
  const [bingoCardNumbers, setBingoCardNumbers] = useState<(number | string)[]>([]);
  const [generatedCardData, setGeneratedCardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // User state - derived from store
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userVerification, setUserVerification] = useState<{
    verified: boolean;
    source: string;
    timestamp: string;
  } | null>(null);
  
  // Game modal state
  const [showBingoGame, setShowBingoGame] = useState<boolean>(false);
  const [bingoGameData, setBingoGameData] = useState<any>(null);
  
  // Refs
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and fetch data
  useEffect(() => {
    // Initialize audio
    clickSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-casino-bling-achievement-2067.mp3');
    if (clickSoundRef.current) {
      clickSoundRef.current.load();
    }

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
      
      // Update verification
      if (!userVerification?.verified) {
        setUserVerification({
          verified: true,
          source: 'store_sync',
          timestamp: new Date().toISOString()
        });
      }
      
      // Store in localStorage for backup
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else if (!isLoggedIn && currentUser) {
      // User logged out from store
      console.log('🔄 Store logged out, clearing local user');
      setCurrentUser(null);
      setUserVerification(null);
      localStorage.removeItem('currentUser');
    }
  }, [storeUser, isLoggedIn]);

  // Check authentication and load user data
  const checkAuthAndLoadData = async () => {
    setUserLoading(true);
    try {
      console.log('🔐 Checking authentication...');
      
      // First, check if we have a valid token in localStorage (from store)
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('currentUser');
      
      if (token && storedUser) {
        try {
          // Verify token with API
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
            
            // Update store if needed
            if (!storeUser || storeUser.id !== user.id) {
              // Store user in localStorage for component use
              localStorage.setItem('currentUser', JSON.stringify(user));
            }
            
            setUserLoading(false);
            return;
          }
        } catch (error) {
          console.log('❌ Token verification failed:', error);
        }
      }
      
      // If no valid token, check if store has user
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
      
      // Try Telegram auth as fallback
      console.log('🔄 Trying Telegram auth...');
      const telegramSuccess = await initializeTelegramAuth();
      
      if (telegramSuccess) {
        console.log('✅ Telegram auth successful');
        // Store will update, useEffect will handle the rest
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

  // Fetch cartelas
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

  // Play sound
  const playSound = useCallback(() => {
    if (!soundEnabled || !clickSoundRef.current) return;
    try {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.volume = 0.3;
      clickSoundRef.current.play().catch(e => console.log("Audio play failed:", e));
    } catch (error) {
      console.log("Sound error:", error);
    }
  }, [soundEnabled]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // Handle cartela selection
  const handleCartelaSelect = async (cartela: Cartela) => {
    if (!cartela.is_available) {
      alert(`Cartela ${cartela.cartela_number} is already taken`);
      return;
    }
    
    if (!currentUser) {
      alert('Please login to select a cartela');
      checkAuthAndLoadData(); // Try to re-auth
      return;
    }
    
    playSound();
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

  // Confirm and start game
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
    
    console.log('🚀 Starting game for user:', {
      username: currentUser.username,
      userId: currentUser.id,
      cartela: selectedCartela.cartela_number
    });
    
    playSound();
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
          saveGame: true
        })
      });
      
      const data = await response.json();
      console.log('🎮 Game start response:', data);
      
      if (data.success) {
        // Store game data
        const gameData = {
          gameState: data.gameState,
          cardData: data.cardData,
          cartelaNumber: selectedCartela.cartela_number,
          userId: currentUser.id,
          user: currentUser,
          gameId: data.gameId,
          cardNumber: data.cardNumber,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('bingoGameData', JSON.stringify(gameData));
        
        // Prepare BingoGame data
        setBingoGameData({
          gameState: data.gameState,
          cardData: data.cardData,
          stats: {
            cartelaNumber: selectedCartela.cartela_number,
            cardNumber: data.cardNumber,
            userId: currentUser.id,
            user: currentUser,
            gameId: data.gameId
          }
        });
        
        // Open BingoGame modal
        setShowBingoGame(true);
        
        // Refresh cartelas
        fetchCartelas();
        
        // Notify parent
        if (onGameStart) {
          onGameStart({
            cartela: selectedCartela,
            bingoCard: data.cardData,
            gameId: data.gameId,
            user: currentUser,
            userId: currentUser.id,
            cardNumber: data.cardNumber
          });
        }
        
        console.log('✅ Game saved to database for user:', currentUser.username);
      } else {
        alert(data.message || 'Failed to start game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. Please check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // Clear all auth data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      
      // Clear store state
      storeLogout();
      
      // Clear component state
      setCurrentUser(null);
      setUserVerification(null);
      setSelectedCartela(null);
      setBingoCardNumbers([]);
      setGeneratedCardData(null);
      
      // Show message
      alert('Logged out successfully.');
    }
  };

  // Refresh all data
  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([
      checkAuthAndLoadData(),
      fetchCartelas()
    ]);
    setIsLoading(false);
    alert('Data refreshed!');
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  // Handle re-authentication
  const handleReauth = async () => {
    setIsLoading(true);
    await checkAuthAndLoadData();
    setIsLoading(false);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Verifying authentication...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we secure your session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* BingoGame Modal */}
      {showBingoGame && bingoGameData && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto p-4">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setShowBingoGame(false)}
              className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 text-white rounded-full flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg"
            >
              <BoxArrowRight /> Back to Card Picker
            </button>
            
            <BingoGame 
              initialData={bingoGameData}
              onClose={() => setShowBingoGame(false)}
            />
          </div>
        </div>
      )}

      {/* Sound Control */}
      <div 
        className="fixed bottom-6 right-6 bg-black/70 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer border-2 border-yellow-400 z-30 shadow-lg"
        onClick={toggleSound}
        title={soundEnabled ? "Mute sound" : "Unmute sound"}
      >
        {soundEnabled ? (
          <VolumeUpFill size={24} color="white" />
        ) : (
          <VolumeMuteFill size={24} color="white" />
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={refreshAll}
        disabled={isLoading}
        className="fixed top-4 left-4 z-30 px-4 py-2 bg-indigo-600 text-white rounded-full flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
        title="Refresh all data"
      >
        <ArrowClockwise className={isLoading ? "animate-spin" : ""} />
        Refresh
      </button>

      {/* Logout Button (if logged in) */}
      {currentUser && (
        <button
          onClick={handleLogout}
          className="fixed top-4 left-32 z-30 px-4 py-2 bg-red-600 text-white rounded-full flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg"
          title="Logout"
        >
          <BoxArrowRight size={16} />
          Logout
        </button>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ShieldCheck size={32} className="text-green-300" />
            <h1 className="text-3xl font-bold text-center">
              BINGO CARD PICKER
            </h1>
            <ShieldCheck size={32} className="text-green-300" />
          </div>
          
          <p className="text-center text-lg opacity-90 mb-6">
            Select a cartela to generate your BINGO card
          </p>
          
          {/* User Info Section */}
          <div className="mt-6">
            {currentUser ? (
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center gap-4 bg-white/20 rounded-2xl px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <PersonCircle size={40} />
                      {userVerification?.verified && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                          <ShieldCheck size={12} />
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-xl">{currentUser.firstName}</p>
                      <p className="opacity-90">
                        @{currentUser.username} • 
                        <span className="font-bold ml-1">${currentUser.balance?.toFixed(2)}</span>
                        {currentUser.bonusBalance && currentUser.bonusBalance > 0 && (
                          <span className="ml-2 text-yellow-300">(+${currentUser.bonusBalance?.toFixed(2)} bonus)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-green-500/30 rounded-full">
                          {userVerification?.verified ? '✅ Verified' : '⚠️ Unverified'}
                        </span>
                        {currentUser.role === 'admin' && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/30 rounded-full">
                            ⭐ ADMIN
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-blue-500/30 rounded-full">
                          {userVerification?.source?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Security Status */}
                <div className="mt-4 text-center">
                  {userVerification?.verified ? (
                    <p className="text-sm text-green-300">
                      🔐 Authenticated as {currentUser.firstName}
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-300">
                      ⚠️ Using cached session. Please re-authenticate.
                    </p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    User ID: {currentUser.id?.substring(0, 12)}...
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="inline-flex flex-col items-center gap-3 bg-red-500/30 rounded-2xl px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={32} className="text-red-300" />
                    <div className="text-left">
                      <p className="font-bold text-xl">Authentication Required</p>
                      <p className="opacity-90">Please login to play BINGO</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={handleReauth}
                      disabled={isLoading}
                      className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
                    >
                      Try Re-authenticate
                    </button>
                    <button
                      onClick={handleLoginRedirect}
                      className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100"
                    >
                      Go to Login Page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Only show if user is logged in */}
        {currentUser ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Cartela Selection */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-700">Available Cartelas</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {cartelas.filter(c => c.is_available).length} of {cartelas.length} available
                  </span>
                  <button
                    onClick={fetchCartelas}
                    disabled={isLoading}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1 hover:bg-indigo-200 text-sm"
                    title="Refresh cartelas"
                  >
                    <ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-3 bg-gray-50 rounded-xl">
                {cartelas.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700 mx-auto mb-3"></div>
                    <p>Loading cartelas...</p>
                  </div>
                ) : (
                  cartelas.map((cartela) => (
                    <div
                      key={cartela.id}
                      className={`cartela-cell ${!cartela.is_available ? 'unavailable' : ''} 
                        ${selectedCartela?.id === cartela.id ? 'selected' : ''}`}
                      onClick={() => cartela.is_available && handleCartelaSelect(cartela)}
                      title={cartela.is_available ? `Select ${cartela.cartela_number}` : 'Already taken'}
                    >
                      {cartela.cartela_number}
                      {!cartela.is_available && (
                        <span className="unavailable-badge">Taken</span>
                      )}
                      {selectedCartela?.id === cartela.id && (
                        <span className="selected-badge">✓</span>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {selectedCartela && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-green-800 font-semibold">
                        Selected Cartela: <span className="text-2xl font-bold">{selectedCartela.cartela_number}</span>
                      </p>
                      <p className="text-green-600 text-sm">
                        ✅ Ready to start game as <span className="font-semibold">{currentUser.firstName}</span>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedCartela(null)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-full flex items-center gap-2 hover:bg-red-200 transition-colors"
                        disabled={isLoading}
                      >
                        <XCircle size={16} /> Clear
                      </button>
                      <button
                        onClick={confirmAndStartGame}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <PlayCircle size={20} /> Confirm & Start Game
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-700">{cartelas.length}</div>
                    <div className="text-sm text-gray-600">Total Cartelas</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {cartelas.filter(c => c.is_available).length}
                    </div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">
                      {selectedCartela ? 1 : 0}
                    </div>
                    <div className="text-sm text-gray-600">Selected</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - BINGO Card Preview */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl shadow-xl p-6 border-4 border-indigo-600">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
                  <CardChecklist /> BINGO Card Preview
                </h3>
                {selectedCartela && (
                  <span className="px-4 py-1 bg-indigo-600 text-white rounded-full font-bold">
                    Cartela #{selectedCartela.cartela_number}
                  </span>
                )}
              </div>
              
              <div className="mb-6">
                {/* BINGO Letters Header */}
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <div 
                      key={letter}
                      className="aspect-square bg-gradient-to-br from-indigo-700 to-purple-800 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-md"
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                
                {/* BINGO Card Grid */}
                <div className="grid grid-cols-5 gap-2 min-h-[300px]">
                  {isLoading ? (
                    <div className="col-span-5 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Generating BINGO card...</p>
                      </div>
                    </div>
                  ) : bingoCardNumbers.length > 0 ? (
                    bingoCardNumbers.map((cellNumber, index) => (
                      <div
                        key={index}
                        className={`bingo-5x5-cell ${index === 12 ? 'free-space' : ''}`}
                      >
                        {cellNumber}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-5 flex items-center justify-center text-center">
                      <div className="text-gray-500">
                        <div className="text-4xl mb-4 opacity-30">BINGO</div>
                        <p className="text-lg">Select a cartela to preview</p>
                        <p className="text-sm mt-2">your 5×5 BINGO card</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Card Info */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-700">
                    ${currentUser.balance?.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Your Balance</div>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-700">
                    {selectedCartela ? selectedCartela.cartela_number : '--'}
                  </div>
                  <div className="text-sm text-gray-600">Selected Cartela</div>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-700">
                    {userVerification?.verified ? '✅' : '⚠️'}
                  </div>
                  <div className="text-sm text-gray-600">Security Status</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Show login prompt if not authenticated
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="max-w-md mx-auto">
              <ShieldCheck size={64} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Authentication Required</h2>
              <p className="text-gray-600 mb-6">
                You need to be logged in to access the BINGO game. 
                Please login to continue.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleReauth}
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Trying to login...' : 'Try Automatic Login'}
                </button>
                <button
                  onClick={handleLoginRedirect}
                  className="w-full py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50"
                >
                  Go to Login Page
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer Security Info */}
        {currentUser && (
          <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Secure Session Active</p>
                  <p className="text-sm text-green-600">
                    Playing as: {currentUser.firstName} (@{currentUser.username}) • 
                    Verified via: {userVerification?.source?.replace(/_/g, ' ') || 'unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS Styles */}
      <style jsx global>{`
        .cartela-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          border: 2px solid #e5e7eb;
          background: white;
          position: relative;
        }
        
        .cartela-cell:not(.unavailable):hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 12px rgba(79, 70, 229, 0.25);
          border-color: #6366f1;
          z-index: 10;
        }
        
        .cartela-cell.selected {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-color: #059669;
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4);
          transform: scale(1.05);
        }
        
        .cartela-cell.unavailable {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .unavailable-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 0.6rem;
          background-color: #ef4444;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: bold;
        }
        
        .selected-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 0.7rem;
          background-color: white;
          color: #059669;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .bingo-5x5-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 8px;
          font-weight: bold;
          font-size: 1rem;
          border: 2px solid #e5e7eb;
          transition: all 0.2s ease;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .bingo-5x5-cell:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .bingo-5x5-cell.free-space {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          border-color: #f59e0b;
          font-weight: bold;
          font-size: 0.9rem;
          box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
        }
        
        @media (max-width: 768px) {
          .cartela-cell {
            font-size: 0.8rem;
          }
          
          .bingo-5x5-cell {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CardPicker;