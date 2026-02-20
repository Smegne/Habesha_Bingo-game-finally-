"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, History, Loader2, Crown } from "lucide-react"

interface LeaderboardPlayer {
  userId: string
  name: string
  wins: number
  totalWon: number
  lastWinDate: string
}

interface RecentWinner {
  id: number
  winnerName: string
  winPattern: string
  stake: number
  prizeAmount: number
  cartelaNumber: string
  declaredAt: string
}

export function ScoresView() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([])
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchScores()
  }, [])

  const fetchScores = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/scores")
      const result = await response.json()

      if (!result.success) throw new Error(result.error)

      setLeaderboard(result.data.leaderboard || [])
      setRecentWinners(result.data.recentWinners || [])
    } catch (err: any) {
      setError(err.message || "Failed to load scores")
    } finally {
      setLoading(false)
    }
  }

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  /* ================= ERROR ================= */

  if (error) {
    return (
      <div className="text-center p-6">
        <p className="font-semibold text-red-500">Error loading scores</p>
        <button
          onClick={fetchScores}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    )
  }

  /* ================= MAIN ================= */

  return (
    <div className="space-y-6">

      {/* ===== LEADERBOARD ===== */}

      <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-100">
        <CardContent className="p-6 space-y-4">

          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h2 className="font-bold text-lg">Top Winners</h2>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No winners yet. Be the first 🏆
            </p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((player, idx) => {
                const isTop3 = idx < 3

                return (
                  <motion.div
                    key={player.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl shadow-sm ${
                      isTop3
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">

                      {/* Rank */}
                      <div className="h-9 w-9 flex items-center justify-center rounded-full bg-black/10 font-bold">
                        {idx === 0 && <Crown className="h-4 w-4 text-yellow-700" />}
                        {idx !== 0 && idx + 1}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="font-semibold">{player.name}</div>
                        <div className="text-xs opacity-80">
                          {player.wins} {player.wins === 1 ? "win" : "wins"}
                        </div>
                      </div>
                    </div>

                    <div className="font-bold">
                      {player.totalWon.toLocaleString()} Birr
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== RECENT WINNERS ===== */}

      <Card className="border-0 shadow-xl">
        <CardContent className="p-6 space-y-4">

          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-green-600" />
            <h2 className="font-bold text-lg">Recent Winners</h2>
          </div>

          {recentWinners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No completed games yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentWinners.map((winner) => (
                <div
                  key={winner.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="text-sm">
                    <div className="font-semibold text-green-700">
                      {winner.winnerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {winner.winPattern} • Stake {winner.stake} Birr
                      {winner.cartelaNumber &&
                        ` • Cartela #${winner.cartelaNumber}`}
                    </div>
                  </div>

                  <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold">
                    +{winner.prizeAmount.toLocaleString()} Birr
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}