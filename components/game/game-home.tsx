"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useGameStore } from "@/lib/game-store"
import { Gamepad2, Loader2, AlertCircle, Trophy, Users, Zap, Sparkles } from "lucide-react"
import { LiveStats } from "../common/live-stats"
import { BingoCardDisplay } from "./bingo-card-display"
import CardPicker  from "./card-picker"
import BingoGame from "./bingo-game"
import { cn } from "@/lib/utils"

export function GameHome() {
  const { user, selectedCard, currentGame, selectCard, startGame } = useGameStore()
  const [selectedStake, setSelectedStake] = useState<10 | 20>(10)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [startGameLoading, setStartGameLoading] = useState(false)
  const [startGameError, setStartGameError] = useState<string | null>(null)
  const [selectCardLoading, setSelectCardLoading] = useState(false)

  // Handle starting the game
  const handleStartGame = async () => {
    if (!currentGame?.id) {
      setStartGameError("No game found to start")
      return
    }

    try {
      setStartGameLoading(true)
      setStartGameError(null)
      
      // Extract game ID properly
      let gameId = currentGame.id
      
      // Log for debugging
      console.log("Starting game with ID:", gameId)
      console.log("Game ID type:", typeof gameId)
      
      // Handle different possible game ID formats
      if (typeof gameId === 'object') {
        console.log("Game ID is object, structure:", gameId)
        
        // Try to extract from common structures
        if (gameId.gameId) {
          gameId = gameId.gameId
        } else if (gameId.id) {
          gameId = gameId.id
        } else if (gameId.data?.gameId) {
          gameId = gameId.data.gameId
        } else {
          // Try stringify/parse as last resort
          try {
            const stringified = JSON.stringify(gameId)
            const parsed = JSON.parse(stringified)
            if (parsed.gameId) gameId = parsed.gameId
            else if (parsed.id) gameId = parsed.id
          } catch (e) {
            console.error("Failed to parse game ID:", e)
          }
        }
      }
      
      // Ensure gameId is a string
      const gameIdStr = String(gameId).trim()
      
      console.log("Final game ID to start:", gameIdStr)
      
      if (gameIdStr.includes('[object') || !gameIdStr) {
        setStartGameError("Invalid game ID format. Please select a card again.")
        return
      }
      
      const success = await startGame(gameIdStr)
      
      if (!success) {
        setStartGameError("Failed to start game. Please try again or check your connection.")
      }
    } catch (err: any) {
      console.error("Start game error:", err)
      setStartGameError(err.message || "An unexpected error occurred")
    } finally {
      setStartGameLoading(false)
    }
  }

  // Handle selecting a card
  const handleSelectCard = async (cardId: number) => {
    try {
      setSelectCardLoading(true)
      const success = await selectCard(cardId, selectedStake)
      if (success) {
        setShowCardPicker(false)
        setStartGameError(null) // Clear any previous errors
      }
    } catch (err: any) {
      console.error("Select card error:", err)
      setStartGameError("Failed to select card. Please try again.")
    } finally {
      setSelectCardLoading(false)
    }
  }

  // If game is in progress, show the game interface
  if (currentGame && currentGame.status !== "waiting") {
    return <BingoGame />
  }

  // If user has selected a card but game is waiting to start
  if (selectedCard && currentGame?.status === "waiting") {
    return (
      <div className="space-y-6">
        <div className="text-center animate-in fade-in slide-in-from-top-5 duration-500">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full mb-3">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-balance">
            Card Selected! 🎉
          </h2>
          <p className="text-muted-foreground">
            Get ready to play Bingo!
          </p>
        </div>

        {startGameError && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-5 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{startGameError}</AlertDescription>
          </Alert>
        )}

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Card #{selectedCard.card_number || selectedCard.id}
                </CardTitle>
                <CardDescription className="mt-1">
                  ${currentGame.stake} stake • Waiting for game to start
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                <Users className="h-3 w-3 mr-1" />
                {currentGame.players?.length || 1}/2
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Card Preview */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-xl border">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium mb-1">Your Bingo Card</p>
                  <p className="text-xs text-muted-foreground">
                    Card will be auto-marked during the game
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  Ready to Play
                </Badge>
              </div>
              <div className="mt-4">
                <BingoCardDisplay card={selectedCard} small />
              </div>
            </div>

            {/* Game Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Game Stake
                </span>
                <span className="font-bold text-primary">${currentGame.stake}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Players Joined
                </span>
                <span className="font-bold">{currentGame.players?.length || 1}/2</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Potential Win
                </span>
                <span className="font-bold text-green-600">${currentGame.stake * 5}</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Balance</span>
                <span className={cn(
                  "font-bold transition-all duration-300",
                  (user?.balance || 0) < currentGame.stake ? 'text-destructive animate-pulse' : 'text-green-600'
                )}>
                  ${user?.balance || 0}
                </span>
              </div>
            </div>

            {/* Start Game Button */}
            <Button 
              onClick={handleStartGame} 
              className="w-full h-12 text-base"
              disabled={startGameLoading || !currentGame.id}
              size="lg"
            >
              {startGameLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Game...
                </>
              ) : (
                <>
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  🚀 Start Game Now
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Waiting for players to join... The game will start when you click "Start Game"
            </p>
            
            {/* Cancel Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Reset selected card (you might want to add a reset function to your store)
                // For now, just reload the page
                window.location.reload()
              }}
            >
              Cancel & Choose Different Card
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main game home screen (no card selected yet)
  return (
    <div className="space-y-6">
      <div className="text-center animate-in fade-in slide-in-from-top-5 duration-500">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full mb-3">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-balance">
          Welcome, {user?.firstName}! 👋
        </h2>
        <p className="text-muted-foreground">
          Choose your stake and start playing Bingo
        </p>
      </div>

      <LiveStats />

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Select Your Stake
          </CardTitle>
          <CardDescription>Choose how much you want to play for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stake Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={selectedStake === 10 ? "default" : "outline"}
              className={cn(
                "h-24 flex-col transition-all duration-300 relative overflow-hidden",
                selectedStake === 10 
                  ? "bg-gradient-to-br from-primary to-primary/80 shadow-lg scale-105"
                  : "hover:scale-105 hover:shadow-md"
              )}
              onClick={() => setSelectedStake(10)}
            >
              {selectedStake === 10 && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              )}
              <span className="text-3xl font-bold">10</span>
              <span className="text-sm mt-1">Birr</span>
              <span className="text-xs opacity-80 mt-1">Quick Play</span>
            </Button>
            
            <Button
              variant={selectedStake === 20 ? "default" : "outline"}
              className={cn(
                "h-24 flex-col transition-all duration-300 relative overflow-hidden",
                selectedStake === 20 
                  ? "bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg scale-105"
                  : "hover:scale-105 hover:shadow-md"
              )}
              onClick={() => setSelectedStake(20)}
            >
              {selectedStake === 20 && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              )}
              <span className="text-3xl font-bold">20</span>
              <span className="text-sm mt-1">Birr</span>
              <span className="text-xs opacity-80 mt-1">Premium Game</span>
            </Button>
          </div>

          {/* Stats for selected stake */}
          <div className="bg-gradient-to-r from-muted/30 to-muted/10 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Stake</p>
                <p className="text-xl font-bold text-primary">${selectedStake}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potential Win</p>
                <p className="text-xl font-bold text-green-600">${selectedStake * 5}</p>
              </div>
            </div>
          </div>

          {/* Card Picker Dialog */}
          <Dialog open={showCardPicker} onOpenChange={setShowCardPicker}
          >
  <DialogTrigger asChild>
    <Button 
      className="w-full h-12 text-base relative overflow-hidden group"
      size="lg"
      disabled={selectCardLoading}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {selectCardLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Gamepad2 className="mr-2 h-5 w-5" />
          🎮 Choose Card & Play
        </>
      )}
    </Button>
  </DialogTrigger>

  {/* FULL SCREEN EDGE-TO-EDGE DIALOG */}
 <DialogContent
  className="
   
    w-screen h-screen
    max-w-[100vw] max-h-[100vh]
    !top-0
   !translate-y-0
    rounded-none
    p-0
    flex flex-col
  "
>


    {/* Top Gradient Accent */}
    <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-500 to-pink-500" />

    {/* HEADER */}
    <div className="flex items-center justify-between px-8 py-5 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Select Your Bingo Card
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose from 400 available cards • ${selectedStake} stake required
        </p>
      </div>

      {/* Modern Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowCardPicker(false)}
        className="
          rounded-full 
          hover:bg-destructive/10 
          hover:text-destructive
          transition
        "
      >
        ✕
      </Button>
    </div>

    {/* BODY CONTENT */}
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-muted/20">
      <CardPicker
        stake={selectedStake}
        onSelect={handleSelectCard}
      />
    </div>
  </DialogContent>
</Dialog>


          {/* Balance Warning */}
          {user && user.balance < selectedStake && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-5 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need ${selectedStake} but have ${user.balance}. 
                <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => {
                  // Navigate to wallet tab
                  const event = new CustomEvent('tab-change', { detail: 'wallet' })
                  window.dispatchEvent(event)
                }}>
                  Deposit now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Info */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              How to Play
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Choose your stake amount (${selectedStake})</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Select an available bingo card</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Start the game and match numbers to win</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>First to complete a line wins ${selectedStake * 5}</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}