// components/game/bingo-game.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Volume2, VolumeX, RefreshCw, Zap, Users, Trophy, LogOut, Bell, Crown, Dice5 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BingoGameProps {
  initialData?: any;
  onClose?: () => void;
}

export default function BingoGame({ initialData, onClose }: BingoGameProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [calledNumbers, setCalledNumbers] = useState<number[]>([36, 25, 61])
  const [currentNumber, setCurrentNumber] = useState<number>(61)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([])
  const [gameInfo, setGameInfo] = useState({
    gameId: "BBYSQJGD",
    players: 118,
    bet: 10,
    derash: 944,
    called: 3
  })

  // Initialize with initialData or localStorage
  useEffect(() => {
    if (initialData) {
      setSelectedCard(initialData.cardData || initialData.gameState?.bingoCardNumbers)
    } else {
      const savedCard = localStorage.getItem("selectedBingoCard")
      if (savedCard) {
        try {
          setSelectedCard(JSON.parse(savedCard))
        } catch (error) {
          console.error("Failed to parse saved card:", error)
        }
      }
    }
  }, [initialData])

  // Generate classical 5x5 BINGO card (1-75)
  const generateClassicalBingoCard = () => {
    const ranges = [
      { min: 1, max: 15, letter: 'B' },
      { min: 16, max: 30, letter: 'I' },
      { min: 31, max: 45, letter: 'N' },
      { min: 46, max: 60, letter: 'G' },
      { min: 61, max: 75, letter: 'O' }
    ]
    
    const card: any = { numbers: [], columns: {}, id: Date.now() }
    
    for (let col = 0; col < 5; col++) {
      const range = ranges[col]
      const columnNumbers: number[] = []
      
      // Generate 5 unique numbers for this column
      while (columnNumbers.length < 5) {
        const randomNum = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
        if (!columnNumbers.includes(randomNum)) {
          columnNumbers.push(randomNum)
        }
      }
      
      columnNumbers.sort((a, b) => a - b)
      card.columns[range.letter] = columnNumbers
      
      // Add to card numbers array
      for (let row = 0; row < 5; row++) {
        card.numbers.push({
          number: columnNumbers[row],
          letter: range.letter,
          row,
          col,
          isFree: row === 2 && col === 2
        })
      }
    }
    
    // Set center as FREE
    card.numbers[12] = { number: 'FREE', letter: 'N', row: 2, col: 2, isFree: true }
    return card
  }

  // Get card if not available
  const bingoCard = selectedCard || generateClassicalBingoCard()

  // Function to get letter for number
  const getLetterForNumber = (num: number) => {
    if (num <= 15) return "B"
    if (num <= 30) return "I"
    if (num <= 45) return "N"
    if (num <= 60) return "G"
    return "O"
  }

  // Speak number
  const speakNumber = useCallback((num: number) => {
    if (isMuted || typeof window === "undefined") return
    
    const letter = getLetterForNumber(num)
    const text = `${letter} ${num}`
    
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.volume = 1
      window.speechSynthesis.speak(utterance)
    }
  }, [isMuted])

  // Call new number
  const callNewNumber = () => {
    if (calledNumbers.length >= 75) return
    
    let newNumber: number
    do {
      newNumber = Math.floor(Math.random() * 75) + 1
    } while (calledNumbers.includes(newNumber))
    
    setCalledNumbers(prev => [...prev, newNumber])
    setCurrentNumber(newNumber)
    speakNumber(newNumber)
    
    // Update game info
    setGameInfo(prev => ({
      ...prev,
      called: prev.called + 1
    }))
  }

  // Auto-play effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isAutoPlay) {
      interval = setInterval(callNewNumber, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAutoPlay])

  // Mark/unmark number on card
  const toggleMarkNumber = (number: number | string) => {
    if (typeof number === 'number') {
      setMarkedNumbers(prev => 
        prev.includes(number) 
          ? prev.filter(n => n !== number)
          : [...prev, number]
      )
    }
  }

  // Check if number is called
  const isNumberCalled = (num: number) => calledNumbers.includes(num)

  // Render classical BINGO numbers (1-75 grid)
  const renderBingoNumbersGrid = () => {
    const numbers = []
    const letters = ['B', 'I', 'N', 'G', 'O']
    
    for (let row = 0; row < 15; row++) {
      const rowNumbers = []
      for (let col = 0; col < 5; col++) {
        const number = (col * 15) + row + 1
        const isCalled = calledNumbers.includes(number)
        
        rowNumbers.push(
          <div
            key={number}
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-semibold rounded",
              isCalled
                ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                : "bg-white text-gray-800"
            )}
          >
            {number}
          </div>
        )
      }
      numbers.push(
        <div key={row} className="flex gap-1 sm:gap-2 mb-1 sm:mb-2">
          {rowNumbers}
        </div>
      )
    }
    
    return (
      <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="flex gap-1 sm:gap-2 mb-2">
          {letters.map(letter => (
            <div 
              key={letter} 
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-lg font-bold bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded"
            >
              {letter}
            </div>
          ))}
        </div>
        {numbers}
      </div>
    )
  }

  // Render 5x5 BINGO card
  const renderBingoCard = () => {
    const cardNumbers = []
    const letters = ['B', 'I', 'N', 'G', 'O']
    
    // Get numbers from card data
    const numbers = bingoCard.numbers || Array.from({ length: 25 }, (_, i) => ({
      number: i === 12 ? 'FREE' : Math.floor(Math.random() * 75) + 1,
      isFree: i === 12
    }))
    
    return (
      <div className="p-3 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl border-2 border-indigo-600">
        <div className="flex gap-1 mb-2">
          {letters.map(letter => (
            <div 
              key={letter} 
              className="w-10 h-10 flex items-center justify-center text-lg font-bold bg-gradient-to-br from-indigo-700 to-purple-800 text-white rounded-lg"
            >
              {letter}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-5 gap-1">
          {numbers.map((cell: any, index: number) => {
            const isCalled = typeof cell.number === 'number' && isNumberCalled(cell.number)
            const isMarked = typeof cell.number === 'number' && markedNumbers.includes(cell.number)
            
            return (
              <div
                key={index}
                onClick={() => !cell.isFree && toggleMarkNumber(cell.number)}
                className={cn(
                  "aspect-square flex items-center justify-center font-bold text-sm rounded-lg cursor-pointer transition-all",
                  cell.isFree
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                    : isCalled || isMarked
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    : "bg-white text-gray-800"
                )}
              >
                {cell.isFree ? 'FREE' : cell.number}
                {(isCalled || isMarked) && !cell.isFree && (
                  <span className="absolute top-1 right-1 text-xs">✓</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header - Beteseb Bingo */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Dice5 className="h-5 w-5 sm:h-6 sm:w-6" />
                Beteseb Bingo
              </h1>
              <p className="text-xs sm:text-sm opacity-90">Classical BINGO 1-75</p>
            </div>
            
            <div className="mt-2 sm:mt-0 flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm rounded-full flex items-center gap-1 transition-colors"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                  Leave
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Left Column - Game Info & Called Numbers */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-4">
            {/* Game Info Card */}
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Game ID:</span>
                  <span className="font-bold text-indigo-700">{gameInfo.gameId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    Players:
                  </span>
                  <span className="font-bold text-green-600">{gameInfo.players}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                    Bet:
                  </span>
                  <span className="font-bold">${gameInfo.bet}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Derash:</span>
                  <span className="font-bold text-purple-600">${gameInfo.derash}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Called:</span>
                  <span className="font-bold text-orange-600">{gameInfo.called}/75</span>
                </div>
              </div>
            </div>

            {/* Current Number Display - Caller Screen */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-xl p-3 sm:p-4 text-center shadow-lg">
              <div className="mb-2">
                <div className="text-xs opacity-80">Last Called Numbers</div>
                <div className="text-lg font-bold">
                  {calledNumbers.slice(-3).map(num => (
                    <span key={num} className="mx-1">
                      {getLetterForNumber(num)}-{num}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-white/20 pt-3">
                <div className="text-xs opacity-80">Current Number</div>
                <div className="text-4xl sm:text-5xl font-bold my-2">
                  {getLetterForNumber(currentNumber)}-{currentNumber}
                </div>
                <div className="text-xs opacity-80">Automatic</div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-md p-3 border border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={callNewNumber}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs sm:text-sm rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Call Number
                </button>
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={cn(
                    "px-3 py-2 text-xs sm:text-sm rounded-lg font-semibold flex items-center gap-1",
                    isAutoPlay
                      ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  )}
                >
                  <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4", isAutoPlay && "animate-spin")} />
                  {isAutoPlay ? "Stop Auto" : "Auto Play"}
                </button>
              </div>
              
              <div className="mt-3">
                <button className="w-full px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs sm:text-sm rounded-lg font-bold hover:opacity-90 transition-opacity">
                  <Trophy className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  BINGO! - Claim ${gameInfo.bet * 50}
                </button>
              </div>
            </div>

            {/* Watching Only Message (Amharic) */}
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-3 border border-blue-200">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-blue-800 font-semibold mb-1">Watching Only</div>
                <div className="text-[10px] sm:text-xs text-blue-700">
                  የኮህ ዙር ጨዋታ<br />
                  ተጀምሯል፡፡ አዲስ ዙር<br />
                  እስከጀምር እዚሁ<br />
                  ይጠብቁ።
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - BINGO Numbers Grid (1-75) */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Full BINGO Numbers Grid */}
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                Called Numbers (1-75)
              </h3>
              <div className="overflow-auto max-h-[400px]">
                {renderBingoNumbersGrid()}
              </div>
              <div className="mt-3 text-xs text-gray-500 text-center">
                Total: {calledNumbers.length}/75 numbers called
              </div>
            </div>

            {/* Your BINGO Card */}
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  Your BINGO Card
                </h3>
                <div className="text-xs sm:text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  Card #{bingoCard.id || "001"}
                </div>
              </div>
              {renderBingoCard()}
              <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                <span>Matched: {markedNumbers.length}/24</span>
                <span>Click numbers to mark</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Game Instructions */}
        <div className="mt-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl p-3 sm:p-4">
          <div className="text-center">
            <h4 className="text-sm font-bold mb-1">🎮 How to Play Classical BINGO</h4>
            <p className="text-xs opacity-90">
              Numbers 1-75 are called automatically. Mark matching numbers on your 5×5 card.
              Complete a line (horizontal, vertical, or diagonal) and click "BINGO!" to win.
              Watch the current number display and track called numbers on the grid.
            </p>
          </div>
        </div>
      </div>

      {/* Add CSS styles */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        
        .current-number {
          animation: pulse 1s infinite;
        }
      `}</style>
    </div>
  )
}