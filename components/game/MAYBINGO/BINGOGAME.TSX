"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useGameStore } from "@/lib/game-store"
import { BingoCardDisplay } from "./bingo-card-display"
import { BingoBoardCompact } from "./bingo-board-compact"
import { Volume2, VolumeX, Check, RefreshCw, AlertCircle, Loader2, Trophy, Users, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export function BingoGame() {
  const { currentGame, selectedCard, markedNumbers, callNumber, markNumber, checkWin, user } =
    useGameStore()
  const [isWinner, setIsWinner] = useState(false)
  const [winType, setWinType] = useState<string | null>(null)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [lastSpokenNumber, setLastSpokenNumber] = useState<number | null>(null)
  const [callingNumber, setCallingNumber] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Safe defaults for game data
  const calledNumbers = currentGame?.called_numbers || currentGame?.calledNumbers || []
  const currentNumber = currentGame?.current_number || currentGame?.currentNumber || null
  const gameStake = currentGame?.stake || 10

  // Function to speak the number
  const speakNumber = useCallback((num: number) => {
    if (isMuted || typeof window === "undefined") return
    
    const letterForNum = (n: number) => {
      if (n <= 15) return "B"
      if (n <= 30) return "I"
      if (n <= 45) return "N"
      if (n <= 60) return "G"
      return "O"
    }
    
    const letter = letterForNum(num)
    const text = `${letter} ${num}`
    
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      
      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(v => v.lang.startsWith("en"))
      if (englishVoice) {
        utterance.voice = englishVoice
      }
      
      window.speechSynthesis.speak(utterance)
    }
  }, [isMuted])

  const handleCallNumber = useCallback(async () => {
    if (!currentGame?.id) {
      setError("No game ID found")
      return
    }
    
    try {
      setCallingNumber(true)
      setError(null)
      const number = await callNumber(currentGame.id)
      
      if (number) {
        speakNumber(number)
        setLastSpokenNumber(number)
      }
    } catch (err: any) {
      console.error("Call number error:", err)
      setError("Failed to call number")
    } finally {
      setCallingNumber(false)
    }
  }, [currentGame?.id, callNumber, speakNumber])

  // Speak number when it changes
  useEffect(() => {
    if (currentNumber && currentNumber !== lastSpokenNumber) {
      speakNumber(currentNumber)
      setLastSpokenNumber(currentNumber)
    }
  }, [currentNumber, lastSpokenNumber, speakNumber])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isAutoPlay && currentGame?.status === "in_progress") {
      interval = setInterval(handleCallNumber, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAutoPlay, currentGame?.status, handleCallNumber])

  const handleBingo = async () => {
    if (!currentGame?.id || !selectedCard) {
      setError("Game or card data missing")
      return
    }
    
    try {
      setError(null)
      const result = await checkWin(currentGame.id)
      
      if (result.win) {
        setWinType(result.pattern || "unknown")
        setIsWinner(true)
        // Announce winner
        if (!isMuted && "speechSynthesis" in window) {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance("Bingo! Congratulations, you won!")
          window.speechSynthesis.speak(utterance)
        }
      } else {
        setError("No winning pattern found. Keep playing!")
      }
    } catch (err: any) {
      console.error("Check win error:", err)
      setError("Failed to check for win")
    }
  }

  // If no game or selected card, show error
  if (!currentGame || !selectedCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Game data not found. Please return to the main screen.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Return to Home
        </Button>
      </div>
    )
  }

  const letterForNumber = (num: number) => {
    if (num <= 15) return "B"
    if (num <= 30) return "I"
    if (num <= 45) return "N"
    if (num <= 60) return "G"
    return "O"
  }

  // If game is completed
  if (currentGame.status === "completed" || isWinner) {
    const isPlayerWinner = isWinner || currentGame.winner_id === user?.id
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={cn(
            "inline-flex items-center justify-center p-4 rounded-full mb-4",
            isPlayerWinner 
              ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20" 
              : "bg-gradient-to-r from-primary/10 to-primary/5"
          )}>
            {isPlayerWinner ? (
              <Trophy className="h-12 w-12 text-yellow-500" />
            ) : (
              <AlertCircle className="h-12 w-12 text-primary" />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {isPlayerWinner ? '🎉 BINGO! You Win! 🎉' : 'Game Over'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {isPlayerWinner 
              ? `You won $${gameStake * 5}!`
              : 'Better luck next time!'
            }
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Game Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your Card</span>
                <span className="font-medium">#{selectedCard.card_number || selectedCard.id}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stake</span>
                <span className="font-medium">${gameStake}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Numbers Called</span>
                <span className="font-medium">{calledNumbers.length}</span>
              </div>
              
              {winType && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Win Pattern</span>
                  <Badge variant="outline">{winType}</Badge>
                </div>
              )}
              
              {isPlayerWinner && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Winnings</span>
                    <span className="font-bold text-green-600 text-lg">
                      +${gameStake * 5}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">New Balance</span>
                    <span className="font-bold text-green-600">
                      ${(user?.balance || 0) + (gameStake * 5)}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <div className="pt-4">
              <BingoCardDisplay 
                card={selectedCard} 
                marked={markedNumbers}
                small={false}
              />
            </div>
            
            <Button 
              className="w-full mt-4"
              onClick={() => window.location.reload()}
            >
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Number Display - Compact with Mute Button */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-full transition-colors ${
                  isMuted ? "bg-primary-foreground/20" : "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              {currentNumber ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-80 hidden sm:inline">Current:</span>
                  <span className="text-2xl sm:text-3xl font-bold">
                    {letterForNumber(currentNumber)}-{currentNumber}
                  </span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm">Tap Call to start</div>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] sm:text-xs opacity-80">Called</div>
                  <div className="text-sm sm:text-lg font-bold">{calledNumbers.length}/75</div>
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                  <Users className="h-3 w-3 mr-1" />
                  {currentGame.players?.length || 1}/2
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls - Compact Row */}
      <div className="flex gap-1.5">
        <Button 
          onClick={handleCallNumber} 
          className="flex-1 bg-transparent text-xs sm:text-sm" 
          variant="outline" 
          size="sm"
          disabled={callingNumber}
        >
          {callingNumber ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Calling...
            </>
          ) : (
            <>
              <Volume2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Call
            </>
          )}
        </Button>
        <Button
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          variant={isAutoPlay ? "destructive" : "secondary"}
          size="sm"
          className="text-xs sm:text-sm"
        >
          {isAutoPlay ? "Stop" : "Auto"}
          <RefreshCw className={`ml-1 h-3 w-3 sm:h-4 sm:w-4 ${isAutoPlay ? "animate-spin" : ""}`} />
        </Button>
        <Button 
          onClick={handleBingo} 
          variant="default" 
          size="sm" 
          className="text-xs sm:text-sm bg-gradient-to-r from-green-500 to-green-600"
        >
          <Check className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
          BINGO!
        </Button>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-2">
          <div className="text-xs text-muted-foreground">Stake</div>
          <div className="text-lg font-bold text-primary">${gameStake}</div>
        </Card>
        <Card className="p-2">
          <div className="text-xs text-muted-foreground">Win Prize</div>
          <div className="text-lg font-bold text-green-600">${gameStake * 5}</div>
        </Card>
        <Card className="p-2">
          <div className="text-xs text-muted-foreground">Balance</div>
          <div className="text-lg font-bold">${user?.balance || 0}</div>
        </Card>
      </div>

      {/* Side by Side Layout: Player Card (Left) and Called Numbers (Right) */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Player Card - Left Side */}
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm flex items-center justify-between">
              <span>Card #{selectedCard.card_number || selectedCard.id}</span>
              <Badge variant="outline" className="text-[10px]">
                <Zap className="h-2 w-2 mr-1" />
                ${gameStake} stake
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="flex justify-center">
              <BingoCardDisplay
                card={selectedCard}
                marked={markedNumbers}
                onMark={markNumber}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-center mt-1 text-muted-foreground">
              Tap numbers to mark as called
            </p>
          </CardContent>
        </Card>

        {/* Called Numbers - Right Side */}
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-1 px-2 pt-2">
            <CardTitle className="text-xs sm:text-sm">Called Numbers</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <BingoBoardCompact calledNumbers={calledNumbers} />
            <p className="text-[10px] sm:text-xs text-center mt-1 text-muted-foreground">
              {calledNumbers.length > 0 
                ? `${calledNumbers.length} numbers called so far`
                : "No numbers called yet"
              }
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
          <strong>How to play:</strong> Numbers will be called automatically or manually. 
          Mark numbers on your card when they match. Click "BINGO!" when you complete a line.
        </p>
      </div>
    </div>
  )
}
