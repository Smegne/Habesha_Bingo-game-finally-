// components/game/card-picker.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dice5, Trophy, CheckCircle, ArrowClockwise, 
  Shuffle, Star, XCircle, CardText, PlayCircle,
  Clock, ClockHistory, InfoCircle, CardChecklist,
  PlusCircle, Lightning, Joystick, BoxArrowRight,
  VolumeUpFill, VolumeMuteFill, GraphUp, Grid3x3,
  CardHeading, Bullseye, LightningCharge, PauseCircle,
  Check2All, ChevronDoubleRight, Dice5 as Dice5Icon,
  CardChecklist as CardChecklistIcon
} from 'react-bootstrap-icons';
import { useRouter } from 'next/navigation';

// Types
interface BingoCardCell {
  number: number | string;
  letter: string;
  row: number;
  col: number;
  called: boolean;
  marked: boolean;
}

interface PatternStatus {
  horizontal: boolean[];
  vertical: boolean[];
  diagonal: boolean[];
  corners: boolean;
  fullCard: boolean;
}

interface RecentNumber {
  number: number;
  letter: string;
}

interface CardPickerProps {
  onCardSelected?: (cardData: any) => void;
  onCountdownComplete?: () => void;
}

const CardPicker: React.FC<CardPickerProps> = ({ onCardSelected, onCountdownComplete }) => {
  const router = useRouter();
  
  // Game state variables
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(new Set());
  const [lastSelectedNumbers, setLastSelectedNumbers] = useState<number[]>([]);
  const [bingoCardNumbers, setBingoCardNumbers] = useState<(number | string)[]>([]);
  const [bingoCardMatches, setBingoCardMatches] = useState<Set<number>>(new Set());
  const [bingoCardCount, setBingoCardCount] = useState<number>(0);
  const [bingoCardGenerated, setBingoCardGenerated] = useState<boolean>(false);
  const [countdownActive, setCountdownActive] = useState<boolean>(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(50);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showCountdownOverlay, setShowCountdownOverlay] = useState<boolean>(false);
  const [gameStats, setGameStats] = useState({
    stack: 10,
    prize: 50,
    balance: 20
  });

  // Refs for intervals
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callSoundRef = useRef<HTMLAudioElement | null>(null);
  const bingoWinSoundRef = useRef<HTMLAudioElement | null>(null);

  // Constants
  const TOTAL_NUMBERS = 400;
  const MAX_LAST_NUMBERS = 10;
  const COUNTDOWN_TIME = 50;

  // Initialize audio
  useEffect(() => {
    // Create audio elements
    callSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-casino-bling-achievement-2067.mp3');
    bingoWinSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');
    
    // Preload audio
    if (callSoundRef.current && bingoWinSoundRef.current) {
      callSoundRef.current.load();
      bingoWinSoundRef.current.load();
    }

    // Cleanup
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Play sound - Moved to top to avoid circular dependencies
  const playSound = useCallback((type: string) => {
    if (!soundEnabled) return;
    
    try {
      let sound = type === 'bingo' ? bingoWinSoundRef.current : callSoundRef.current;
      if (sound) {
        sound.currentTime = 0;
        sound.volume = type === 'bingo' ? 0.5 : 0.3;
        sound.play().catch(e => console.log("Audio play failed:", e));
      }
    } catch (error) {
      console.log("Sound error:", error);
    }
  }, [soundEnabled]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // Calculate progress percentages
  const selectedPercent = (selectedNumbers.size / TOTAL_NUMBERS) * 100;
  const markedPercent = (markedNumbers.size / TOTAL_NUMBERS) * 100;

  // Stop the countdown timer
  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownActive(false);
    setShowCountdownOverlay(false);
  }, []);

  // Check for matches between selected numbers and 5x5 BINGO card
  const checkBingoCardMatches = useCallback((selected: Set<number>, marked: Set<number>) => {
    if (!bingoCardGenerated || bingoCardNumbers.length === 0) return;
    
    const newMatches = new Set(bingoCardMatches);
    
    for (let i = 0; i < 25; i++) {
      const cellNumber = bingoCardNumbers[i];
      
      // Skip FREE space and already matched cells
      if (i === 12 || newMatches.has(i)) continue;
      
      // Check if this number is selected or marked
      if (typeof cellNumber === 'number' && (selected.has(cellNumber) || marked.has(cellNumber))) {
        newMatches.add(i);
      }
    }
    
    setBingoCardMatches(newMatches);
  }, [bingoCardGenerated, bingoCardNumbers, bingoCardMatches]);

  // Update statistics
  const updateStats = useCallback((selected: Set<number>, marked: Set<number>) => {
    // This would update any stats if needed
  }, []);

  // Check for bingo patterns
  const checkForBingo = useCallback((marked: Set<number>) => {
    // Show bingo alert if we have at least 20 marked numbers
    if (marked.size >= 20) {
      playSound('bingo');
    }
  }, [playSound]);

  // Select random numbers
  const selectRandomNumbers = useCallback((count: number) => {
    const newSelected = new Set(selectedNumbers);
    let selectedCount = 0;
    
    while (selectedCount < count && newSelected.size < TOTAL_NUMBERS) {
      const randomNum = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
      
      if (!newSelected.has(randomNum)) {
        newSelected.add(randomNum);
        selectedCount++;
        
        // Add to last selected numbers
        setLastSelectedNumbers(prev => {
          const newLast = [randomNum, ...prev];
          if (newLast.length > MAX_LAST_NUMBERS) {
            newLast.pop();
          }
          return newLast;
        });
      }
    }
    
    setSelectedNumbers(newSelected);
    playSound('click');
  }, [selectedNumbers, playSound]);

  // Mark random numbers as bingo
  const markRandomNumbers = useCallback((count: number) => {
    const newMarked = new Set(markedNumbers);
    const selectedArray = Array.from(selectedNumbers);
    let markedCount = 0;
    
    // Shuffle the array
    const shuffled = [...selectedArray].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const number = shuffled[i];
      if (!newMarked.has(number)) {
        newMarked.add(number);
        markedCount++;
      }
    }
    
    setMarkedNumbers(newMarked);
    playSound('mark');
  }, [selectedNumbers, markedNumbers, playSound]);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedNumbers(new Set());
    setMarkedNumbers(new Set());
    setLastSelectedNumbers([]);
    playSound('reset');
  }, [playSound]);

  // Generate a 5x5 BINGO card
  const generate5x5BingoCard = useCallback(() => {
    const newBingoCardCount = bingoCardCount + 1;
    setBingoCardCount(newBingoCardCount);
    
    // Initialize bingo card numbers array (5 columns x 5 rows)
    const ranges = [
      { min: 1, max: 15, letter: 'B' },   // B
      { min: 16, max: 30, letter: 'I' },  // I
      { min: 31, max: 45, letter: 'N' },  // N
      { min: 46, max: 60, letter: 'G' },  // G
      { min: 61, max: 75, letter: 'O' }   // O
    ];
    
    const newBingoCardNumbers: (number | string)[] = [];
    const cardData: any = {
      numbers: [],
      id: newBingoCardCount,
      createdAt: new Date().toISOString(),
      columns: {}
    };
    
    // Generate numbers for each column
    for (let col = 0; col < 5; col++) {
      const columnNumbers: number[] = [];
      const range = ranges[col];
      cardData.columns[range.letter] = [];
      
      // Generate 5 unique numbers for this column
      while (columnNumbers.length < 5) {
        const randomNum = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        if (!columnNumbers.includes(randomNum)) {
          columnNumbers.push(randomNum);
          cardData.columns[range.letter].push(randomNum);
        }
      }
      
      // Sort numbers for better display
      columnNumbers.sort((a, b) => a - b);
      
      // Add column numbers to the card
      for (let row = 0; row < 5; row++) {
        newBingoCardNumbers.push(columnNumbers[row]);
        cardData.numbers.push({
          number: columnNumbers[row],
          letter: range.letter,
          row,
          col
        });
      }
    }
    
    // Set the center cell as FREE
    newBingoCardNumbers[12] = 'FREE';
    cardData.numbers[12] = { number: 'FREE', letter: 'N', row: 2, col: 2, isFree: true };
    
    // Clear previous matches
    setBingoCardMatches(new Set([12])); // Auto-match FREE space
    setBingoCardNumbers(newBingoCardNumbers);
    
    // Store card data for passing to bingo game
    localStorage.setItem('selectedBingoCard', JSON.stringify(cardData));
    
    // Notify parent component about card selection
    if (onCardSelected) {
      onCardSelected(cardData);
    }
    
    // Show the container (handled in render)
    playSound('card');
  }, [bingoCardCount, onCardSelected, playSound]);

  // Clear BINGO card
  const clearBingoCard = useCallback(() => {
    setBingoCardNumbers([]);
    setBingoCardMatches(new Set());
    setBingoCardGenerated(false);
    setBingoCardCount(0);
    setShowCountdownOverlay(false);
    stopCountdown();
    playSound('reset');
  }, [stopCountdown, playSound]);

  // Auto-match selected numbers with 5x5 BINGO card
  const autoMatchBingoCard = useCallback(() => {
    if (!bingoCardGenerated) return;
    
    const newMatches = new Set(bingoCardMatches);
    
    for (let i = 0; i < 25; i++) {
      const cellNumber = bingoCardNumbers[i];
      
      // Skip FREE space
      if (i === 12) continue;
      
      // Check if this number is selected or marked
      if (typeof cellNumber === 'number' && 
          (selectedNumbers.has(cellNumber) || markedNumbers.has(cellNumber))) {
        newMatches.add(i);
      }
    }
    
    setBingoCardMatches(newMatches);
    playSound('match');
  }, [bingoCardGenerated, bingoCardNumbers, bingoCardMatches, selectedNumbers, markedNumbers, playSound]);

  // Redirect to bingo game
  const redirectToBingoGame = useCallback(() => {
    playSound('redirect');
    
    // Store game state for the bingo game
    const gameState = {
      selectedNumbers: Array.from(selectedNumbers),
      markedNumbers: Array.from(markedNumbers),
      bingoCardNumbers,
      bingoCardMatches: Array.from(bingoCardMatches),
      cardId: bingoCardCount,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('bingoGameState', JSON.stringify(gameState));
    
    // Also store the card data separately for the BingoGame page
    const cardData = JSON.parse(localStorage.getItem('selectedBingoCard') || '{}');
    localStorage.setItem('bingoCardData', JSON.stringify(cardData));
    
    // Notify parent component about countdown completion
    if (onCountdownComplete) {
      onCountdownComplete();
    }
    
    // Navigate to the BingoGame page
    router.push('/game/bingo');
  }, [selectedNumbers, markedNumbers, bingoCardNumbers, bingoCardMatches, bingoCardCount, onCountdownComplete, router, playSound]);

  // Start the countdown timer
  const startCountdown = useCallback(() => {
    if (countdownActive) return;
    
    setCountdownActive(true);
    setCountdownRemaining(COUNTDOWN_TIME);
    setShowCountdownOverlay(true);
    
    playSound('start');
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setCountdownActive(false);
          redirectToBingoGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdownActive, playSound, redirectToBingoGame]);

  // Toggle number selection - Defined AFTER all functions it depends on
  const toggleNumberSelection = useCallback((number: number) => {
    setSelectedNumbers(prevSelected => {
      const newSelected = new Set(prevSelected);
      const newMarked = new Set(markedNumbers);
      
      if (prevSelected.has(number)) {
        if (markedNumbers.has(number)) {
          // Remove from marked and selected
          newMarked.delete(number);
          newSelected.delete(number);
        } else {
          // Mark as bingo
          newMarked.add(number);
        }
      } else {
        // Select the number
        newSelected.add(number);
        
        // Generate a 5x5 BINGO card if this is the first selection
        if (!bingoCardGenerated || bingoCardCount === 0) {
          generate5x5BingoCard();
          setBingoCardGenerated(true);
          
          // Show countdown overlay and start countdown
          setShowCountdownOverlay(true);
          if (!countdownActive) {
            startCountdown();
          }
        }
        
        // Check for matches in the 5x5 BINGO card
        checkBingoCardMatches(newSelected, newMarked);
      }
      
      // Update last selected numbers
      setLastSelectedNumbers(prev => {
        const newLast = [number, ...prev];
        if (newLast.length > MAX_LAST_NUMBERS) {
          newLast.pop();
        }
        return newLast;
      });
      
      setMarkedNumbers(newMarked);
      updateStats(newSelected, newMarked);
      checkForBingo(newMarked);
      playSound('click');
      
      return newSelected;
    });
  }, [bingoCardGenerated, bingoCardCount, countdownActive, markedNumbers, generate5x5BingoCard, startCountdown, checkBingoCardMatches, updateStats, checkForBingo, playSound]);

  // Reset everything
  const resetGame = useCallback(() => {
    clearSelections();
    clearBingoCard();
    stopCountdown();
  }, [clearSelections, clearBingoCard, stopCountdown]);

  // Render the number grid
  const renderNumberGrid = () => {
    const cells = [];
    
    for (let i = 1; i <= TOTAL_NUMBERS; i++) {
      const isSelected = selectedNumbers.has(i);
      const isMarked = markedNumbers.has(i);
      
      let bgColor = '#ffebee'; // O - Red (default for > 320)
      if (i <= 80) bgColor = '#e3f2fd'; // B - Blue
      else if (i <= 160) bgColor = '#f3e5f5'; // I - Purple
      else if (i <= 240) bgColor = '#e8f5e9'; // N - Green
      else if (i <= 320) bgColor = '#fff3e0'; // G - Orange
      
      cells.push(
        <div
          key={i}
          className="number-cell"
          style={{ backgroundColor: bgColor }}
          onClick={() => toggleNumberSelection(i)}
          data-selected={isSelected}
          data-marked={isMarked}
        >
          {i}
        </div>
      );
    }
    
    return cells;
  };

  // Render the 5x5 BINGO grid
  const renderBingo5x5Grid = () => {
    if (bingoCardNumbers.length === 0) return null;
    
    return bingoCardNumbers.map((cellNumber, index) => {
      const isFree = index === 12;
      const isMatched = bingoCardMatches.has(index);
      
      return (
        <div
          key={index}
          className={`bingo-5x5-cell ${isFree ? 'free-space' : ''} ${isMatched ? 'matched' : ''}`}
          onClick={() => {
            if (!isFree) {
              const newMatches = new Set(bingoCardMatches);
              if (newMatches.has(index)) {
                newMatches.delete(index);
              } else {
                newMatches.add(index);
              }
              setBingoCardMatches(newMatches);
              playSound('click');
            }
          }}
        >
          {cellNumber}
          {isMatched && !isFree && <span className="checkmark">✓</span>}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Countdown Overlay */}
      {showCountdownOverlay && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 max-w-md w-full mx-4 text-center text-white shadow-2xl animate-pulse">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Clock className="text-yellow-300" />
              Game Starting Soon!
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Your 5×5 BINGO card has been generated. The game will begin in:
            </p>
            
            <div className="text-6xl font-bold font-mono text-yellow-300 my-8 animate-bounce">
              {countdownRemaining}
            </div>
            
            <p className="text-lg mb-6 opacity-90">Get ready to play BINGO!</p>
            
            <div className="w-full bg-white/20 rounded-full h-4 mb-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-red-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${((COUNTDOWN_TIME - countdownRemaining) / COUNTDOWN_TIME) * 100}%` }}
              ></div>
            </div>
            
            <p className="text-sm opacity-75">
              You will be automatically redirected to the BINGO game when the countdown reaches zero.
            </p>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  stopCountdown();
                  setShowCountdownOverlay(false);
                }}
                className="flex-1 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={redirectToBingoGame}
                className="flex-1 px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle /> Start Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sound Control */}
      <div 
        className="fixed bottom-6 right-6 bg-black/70 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer border-2 border-yellow-400 z-40 shadow-lg"
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
            <Dice5Icon size={36} />
            BINGO CARTELA
          </h1>
          <p className="text-center text-lg opacity-90 mt-2">
            Select numbers to generate your BINGO card
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Number Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 pb-3 border-b-2 border-indigo-200">
                Select Numbers (1-400)
              </h2>
              
              <div className="flex justify-between mb-6">
                {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
                  <div key={letter} className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {letter}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2 max-h-[400px] overflow-y-auto p-2 bg-gray-50 rounded-xl">
                {renderNumberGrid()}
              </div>
              
              <div className="flex flex-wrap gap-4 mt-8">
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-lg transition-all"
                  onClick={() => selectRandomNumbers(10)}
                >
                  <Shuffle /> Select 10 Random
                </button>
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-lg transition-all"
                  onClick={() => markRandomNumbers(5)}
                >
                  <Star /> Mark 5 as BINGO
                </button>
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-lg transition-all"
                  onClick={clearSelections}
                >
                  <XCircle /> Clear All
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - Stats & BINGO Card */}
          <div className="space-y-8">
            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-pink-600 mb-6 flex items-center gap-2">
                <GraphUp /> Game Stats
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Selected Numbers:</span>
                    <span className="text-2xl font-bold text-indigo-700">{selectedNumbers.size}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${selectedPercent}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Marked Numbers:</span>
                    <span className="text-2xl font-bold text-indigo-700">{markedNumbers.size}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-yellow-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${markedPercent}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <ClockHistory className="text-yellow-500" />
                    <span className="font-semibold">Countdown Status:</span>
                    <span className="ml-auto font-bold">
                      {countdownActive ? `${countdownRemaining}s remaining` : 'Ready'}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Last Selected:</h4>
                    <div className="flex flex-wrap gap-2">
                      {lastSelectedNumbers.length === 0 ? (
                        <span className="text-gray-500 italic">None yet</span>
                      ) : (
                        lastSelectedNumbers.map(num => (
                          <span 
                            key={num} 
                            className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm font-semibold"
                          >
                            {num}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Generated BINGO Card */}
            {bingoCardGenerated && (
              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl shadow-xl p-6 border-4 border-indigo-600">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
                    <CardChecklistIcon /> Your BINGO Card
                  </h3>
                  <span className="px-4 py-1 bg-indigo-600 text-white rounded-full font-bold">
                    #{bingoCardCount}
                  </span>
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
                    {renderBingo5x5Grid()}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-700">{bingoCardMatches.size}</div>
                    <div className="text-sm text-gray-600">Matched</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-700">{25 - bingoCardMatches.size}</div>
                    <div className="text-sm text-gray-600">Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-700">{bingoCardCount}</div>
                    <div className="text-sm text-gray-600">Card #</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-md transition-all text-sm"
                    onClick={generate5x5BingoCard}
                  >
                    <PlusCircle /> New Card
                  </button>
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-md transition-all text-sm"
                    onClick={autoMatchBingoCard}
                  >
                    <Lightning /> Auto-Match
                  </button>
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-full flex items-center gap-2 hover:shadow-md transition-all text-sm"
                    onClick={clearBingoCard}
                  >
                    <XCircle /> Clear Card
                  </button>
                </div>
                
                {/* Start Game Button */}
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full flex items-center gap-2 hover:shadow-lg transition-all mt-4 w-full justify-center"
                  onClick={redirectToBingoGame}
                >
                  <PlayCircle size={20} /> Start BINGO Game Now
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="bg-white/80 rounded-2xl p-6 mt-8 border-l-4 border-indigo-600">
          <h4 className="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <InfoCircle /> How to Play
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
                  <span><strong>Click numbers</strong> to select them (they turn green)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-yellow-500 rounded-full mt-1"></div>
                  <span><strong>Click again</strong> to mark as BINGO (they turn yellow)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-indigo-600 rounded-full mt-1"></div>
                  <span><strong>First selection</strong> generates a 5×5 BINGO card automatically</span>
                </li>
              </ul>
            </div>
            <div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Clock className="text-yellow-500 mt-1" />
                  <span><strong>50-second countdown</strong> starts when card is generated</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="text-yellow-500 mt-1" />
                  <span><strong>When timer ends</strong>, you'll be redirected to the BINGO game page</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bullseye className="text-red-500 mt-1" />
                  <span><strong>Complete patterns</strong> to win in the BINGO game</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS styles */}
      <style jsx global>{`
        .number-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.75rem;
          border: 1px solid #e5e7eb;
          user-select: none;
        }
        
        .number-cell:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          z-index: 10;
        }
        
        .number-cell[data-selected="true"] {
          background-color: #10b981 !important;
          color: white;
          border-color: #10b981;
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        
        .number-cell[data-marked="true"] {
          background-color: #f59e0b !important;
          color: white;
          border-color: #f59e0b;
          box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
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
          cursor: pointer;
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
        
        @media (max-width: 768px) {
          .number-cell {
            font-size: 0.65rem;
          }
          
          .bingo-5x5-cell {
            font-size: 0.8rem;
          }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default CardPicker;