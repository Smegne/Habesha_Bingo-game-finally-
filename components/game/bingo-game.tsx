// components/game/card-picker.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlayCircle, Clock, VolumeUpFill, VolumeMuteFill, 
  CardChecklist, XCircle, Lightning, PlusCircle,
  BoxArrowRight
} from 'react-bootstrap-icons';
import dynamic from 'next/dynamic';

// Types
interface Cartela {
  id: number;
  cartela_number: string;
  is_available: boolean;
}

interface BingoCardData {
  id?: number;
  cartela_id: number;
  user_id?: number;
  card_data: any;
  card_number: number;
  created_at?: string;
}

interface CardPickerProps {
  userId?: number;
  onGameStart?: (gameData: any) => void;
}

const BingoGame = dynamic(() => import('./bingo-game'), {
  loading: () => <div className="text-white text-center py-10">Loading BINGO Game...</div>,
  ssr: false
});

const CardPicker: React.FC<CardPickerProps> = ({ userId, onGameStart }) => {
  // State for cartelas (static numbers)
  const [cartelas, setCartelas] = useState<Cartela[]>([]);
  const [selectedCartela, setSelectedCartela] = useState<Cartela | null>(null);
  
  // Game state
  const [bingoCardNumbers, setBingoCardNumbers] = useState<(number | string)[]>([]);
  const [bingoCardMatches, setBingoCardMatches] = useState<Set<number>>(new Set());
  const [generatedCardData, setGeneratedCardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Bingo Game Modal
  const [showBingoGame, setShowBingoGame] = useState<boolean>(false);
  const [bingoGameData, setBingoGameData] = useState<any>(null);
  
  // Audio ref
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  // Fetch cartelas on component mount
  useEffect(() => {
    fetchCartelas();
    
    // Initialize audio
    clickSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-click-button-1109.mp3');
    if (clickSoundRef.current) {
      clickSoundRef.current.load();
    }
  }, []);

  // Fetch cartelas from API
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
    if (!cartela.is_available) return;
    
    playSound();
    setSelectedCartela(cartela);
    
    // Generate preview Bingo card
    setIsLoading(true);
    try {
      const response = await fetch('/api/game/cartelas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartelaId: cartela.id,
          generatePreview: true
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setBingoCardNumbers(data.cardData.numbers);
        setGeneratedCardData(data.cardData);
        
        // Auto-match FREE space
        setBingoCardMatches(new Set([12]));
      }
    } catch (error) {
      console.error('Error generating card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and start game
  const confirmAndStartGame = async () => {
    if (!selectedCartela || !generatedCardData || !userId) {
      alert('Please select a cartela first');
      return;
    }
    
    playSound();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/game/cartelas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartelaId: selectedCartela.id,
          userId: userId,
          cardData: generatedCardData,
          saveGame: true
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Store in localStorage for BingoGame
        localStorage.setItem('bingoGameData', JSON.stringify({
          gameState: data.gameState,
          cardData: data.cardData,
          cartelaNumber: selectedCartela.cartela_number
        }));
        
        // Prepare BingoGame data
        setBingoGameData({
          gameState: data.gameState,
          cardData: data.cardData,
          stats: {
            cartelaNumber: selectedCartela.cartela_number,
            cardNumber: data.cardNumber
          }
        });
        
        // Open BingoGame modal
        setShowBingoGame(true);
        
        // Notify parent
        if (onGameStart) {
          onGameStart({
            cartela: selectedCartela,
            bingoCard: data.cardData,
            gameId: data.gameId
          });
        }
      } else {
        alert(data.message || 'Failed to start game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  // Close BingoGame
  const closeBingoGame = useCallback(() => {
    setShowBingoGame(false);
    playSound();
  }, [playSound]);

  // Render cartela grid
  const renderCartelaGrid = () => {
    return cartelas.map((cartela) => (
      <div
        key={cartela.id}
        className={`cartela-cell ${!cartela.is_available ? 'unavailable' : ''} 
          ${selectedCartela?.id === cartela.id ? 'selected' : ''}`}
        onClick={() => handleCartelaSelect(cartela)}
      >
        {cartela.cartela_number}
        {!cartela.is_available && (
          <span className="unavailable-badge">Taken</span>
        )}
      </div>
    ));
  };

  // Render 5x5 Bingo grid
  const renderBingo5x5Grid = () => {
    if (bingoCardNumbers.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          Select a cartela to preview BINGO card
        </div>
      );
    }
    
    return bingoCardNumbers.map((cellNumber, index) => {
      const isFree = index === 12;
      const isMatched = bingoCardMatches.has(index);
      
      return (
        <div
          key={index}
          className={`bingo-5x5-cell ${isFree ? 'free-space' : ''} ${isMatched ? 'matched' : ''}`}
        >
          {cellNumber}
          {isMatched && !isFree && <span className="checkmark">✓</span>}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 relative">
      {/* BingoGame Modal */}
      {showBingoGame && bingoGameData && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto p-4">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={closeBingoGame}
              className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 text-white rounded-full flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg"
            >
              <BoxArrowRight /> Back to Card Picker
            </button>
            
            <BingoGame 
              initialData={bingoGameData}
              onClose={closeBingoGame}
            />
          </div>
        </div>
      )}

      {/* Sound Control */}
      <div 
        className="fixed bottom-6 right-6 bg-black/70 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer border-2 border-yellow-400 z-30 shadow-lg"
        onClick={toggleSound}
      >
        {soundEnabled ? (
          <VolumeUpFill size={24} color="white" />
        ) : (
          <VolumeMuteFill size={24} color="white" />
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6 mb-8 shadow-xl">
          <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-3">
            <CardChecklist size={36} />
            TELEGRAM BINGO CARD PICKER
          </h1>
          <p className="text-center text-lg opacity-90 mt-2">
            Select a cartela to generate your BINGO card
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Cartela Selection */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-indigo-700 mb-6 pb-3 border-b-2 border-indigo-200">
              Available Cartelas
            </h2>
            
            <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto p-2 bg-gray-50 rounded-xl">
              {renderCartelaGrid()}
            </div>
            
            {selectedCartela && (
              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-semibold">
                      Selected Cartela: <span className="text-2xl">{selectedCartela.cartela_number}</span>
                    </p>
                    <p className="text-green-600 text-sm">Click below to start game</p>
                  </div>
                  <button
                    onClick={confirmAndStartGame}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Clock className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle size={20} /> Confirm & Start Game
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
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
            
            <div className="mb-4">
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
              
              <div className="grid grid-cols-5 gap-2">
                {isLoading ? (
                  <div className="col-span-5 text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Generating BINGO card...</p>
                  </div>
                ) : (
                  renderBingo5x5Grid()
                )}
              </div>
            </div>
            
            {/* Card Info */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-700">{bingoCardMatches.size}</div>
                <div className="text-sm text-gray-600">Matched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-700">{25 - bingoCardMatches.size}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-700">
                  {selectedCartela ? selectedCartela.cartela_number : '--'}
                </div>
                <div className="text-sm text-gray-600">Cartela #</div>
              </div>
            </div>
            
            {/* Action Buttons */}
            {selectedCartela && !isLoading && (
              <div className="flex flex-wrap gap-3 mt-6">
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-md transition-all text-sm"
                  onClick={() => setBingoCardMatches(new Set([12]))}
                >
                  <Lightning /> Reset Matches
                </button>
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-md transition-all text-sm"
                  onClick={() => {
                    setSelectedCartela(null);
                    setBingoCardNumbers([]);
                    setBingoCardMatches(new Set());
                  }}
                >
                  <XCircle /> Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style jsx global>{`
        .cartela-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          border: 2px solid #e5e7eb;
          background-color: white;
          position: relative;
          user-select: none;
        }
        
        .cartela-cell:hover:not(.unavailable) {
          transform: scale(1.05);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          z-index: 10;
        }
        
        .cartela-cell.selected {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-color: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .cartela-cell.unavailable {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          border-color: #d1d5db;
        }
        
        .unavailable-badge {
          position: absolute;
          bottom: 2px;
          font-size: 0.6rem;
          background-color: #ef4444;
          color: white;
          padding: 1px 4px;
          border-radius: 4px;
        }
        
        .bingo-5x5-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: white;
          border-radius: 8px;
          font-weight: bold;
          font-size: 0.9rem;
          border: 2px solid #e5e7eb;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .bingo-5x5-cell.free-space {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          border-color: #f59e0b;
          font-weight: bold;
        }
        
        .bingo-5x5-cell.matched {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-color: #059669;
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        
        .bingo-5x5-cell.matched .checkmark {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 0.7rem;
          background: white;
          color: #059669;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default CardPicker;