"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useGameStore } from "@/lib/game-store"
import {
  Gamepad2,
  Loader2,
  AlertCircle,
  Trophy,
  Users,
  Zap,
  Coins,
  Sparkles,
  Wallet
} from "lucide-react"
import { LiveStats } from "../common/live-stats"
import { BingoCardDisplay } from "./bingo-card-display"
import CardPicker from "./card-picker"
import BingoGame from "./bingo-game"
import { cn } from "@/lib/utils"

export function GameHome() {
  const { user, selectedCard, currentGame, selectCard, startGame } = useGameStore()

  const [selectedStake, setSelectedStake] = useState<10 | 20>(10)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartGame = async () => {
    if (!currentGame?.id) return

    try {
      setLoading(true)
      setError(null)
      await startGame(String(currentGame.id))
    } catch (err: any) {
      setError("Failed to start game.")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCard = async (cardId: number) => {
    try {
      setLoading(true)
      await selectCard(cardId, selectedStake)
      setShowCardPicker(false)
    } catch {
      setError("Card selection failed")
    } finally {
      setLoading(false)
    }
  }

  if (currentGame && currentGame.status !== "waiting") {
    return <BingoGame />
  }

  /* ================= WAITING SCREEN ================= */

  if (selectedCard && currentGame?.status === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-black dark:to-zinc-900">

        <motion.div
          initial={{ opacity: 0, scale: .95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-5"
        >

          {/* Trophy Animation */}
          <div className="text-center space-y-3">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex p-4 bg-green-500 text-white rounded-full shadow-lg"
            >
              <Trophy size={26} />
            </motion.div>

            <h2 className="text-2xl font-bold">Ready to Play!</h2>
            <p className="text-sm text-muted-foreground">
              Waiting for another player...
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-xl border-0">
            <CardContent className="p-6 space-y-4">

              <div className="flex justify-between text-sm">
                <span>Stake</span>
                <span className="font-semibold">
                  {currentGame.stake} Birr
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Prize</span>
                <span className="font-bold text-green-600">
                  {currentGame.stake * 5} Birr
                </span>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <BingoCardDisplay card={selectedCard} small />
              </div>

              <Button
                onClick={handleStartGame}
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Start Game"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  /* ================= MAIN HOME ================= */

  return (
    <div className="min-h-screen px-4 py-6 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-black dark:to-zinc-900">

      <div className="max-w-md mx-auto space-y-6">

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex p-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl">
             <img
            src="/habsha.png"
            alt="Habesha Bingo"
            className="h-10 w-auto object-contain rounded-full"
          />
          </div>

          <h1 className="text-2xl font-bold">
            Welcome {user?.firstName}
          </h1>

          <p className="text-sm text-muted-foreground">
            Pick a card & win big 🎉
          </p>
        </motion.div>

        {/* BALANCE CARD */}
        <Card className="shadow-lg border-0 bg-white/70 dark:bg-zinc-900/60 backdrop-blur">
          <CardContent className="p-5 flex justify-between items-center">

            <div>
              <p className="text-xs text-muted-foreground">Your Balance</p>
              <p className="text-xl font-bold">
                {user?.balance || 0} Birr
              </p>
            </div>

            <Wallet className="text-indigo-500" />
          </CardContent>
        </Card>

        {/* STAKE SELECTOR */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-5 space-y-4">

            <h2 className="font-semibold">Select Stake</h2>

            <div className="grid grid-cols-2 gap-3">

              {[10, 20].map((stake) => (
                <motion.div
                  whileTap={{ scale: .95 }}
                  key={stake}
                >
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStake(stake as 10 | 20)}
                    className={cn(
                      "h-20 w-full flex-col rounded-xl border-2 transition-all",
                      selectedStake === stake &&
                      "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                    )}
                  >
                    <span className="text-lg font-bold">
                      {stake} Birr
                    </span>
                    <span className="text-xs opacity-70">
                      Win {stake * 5}
                    </span>
                  </Button>
                </motion.div>
              ))}
            </div>

            {user && user.balance < selectedStake && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Not enough balance to play.
                </AlertDescription>
              </Alert>
            )}

            <Dialog open={showCardPicker} onOpenChange={setShowCardPicker}>
              <Button
                className="w-full h-12 text-base bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                onClick={() => setShowCardPicker(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Pick Your Card
                  </>
                )}
              </Button>

              <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">
                    Choose Card ({selectedStake} Birr)
                  </h3>
                </div>

                <div className="p-4 max-h-[75vh] overflow-y-auto">
                  <CardPicker
                    stake={selectedStake}
                    onSelect={handleSelectCard}
                  />
                </div>
              </DialogContent>
            </Dialog>

          </CardContent>
        </Card>

        {/* LIVE STATS */}
        <LiveStats />

        <div className="flex justify-center text-xs text-muted-foreground gap-4">
          <span className="flex items-center gap-1">
            <Users size={14} /> 24 Playing
          </span>
          <span className="flex items-center gap-1">
            <Zap size={14} /> 3 Active
          </span>
        </div>

      </div>
    </div>
  )
}