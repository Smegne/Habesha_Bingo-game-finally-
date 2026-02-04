"use client"

import { useGameStore } from "@/lib/game-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, History } from "lucide-react"

export function ScoresView() {
  const { gameHistory, completedGames } = useGameStore()

  const leaderboard = gameHistory
    .filter((g: any) => g.result === "win")
    .reduce((acc: any[], game: any) => {
      const existing = acc.find(p => p.userId === game.odoo)
      if (existing) {
        existing.wins += 1
        existing.totalWon += game.amount
      } else {
        acc.push({
          odoo: game.odoo,
          name: game.odooName,
          wins: 1,
          totalWon: game.amount,
        })
      }
      return acc
    }, [])
    .sort((a: any, b: any) => b.totalWon - a.totalWon)
    .slice(0, 10)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Trophy className="h-5 w-5 text-secondary" />
            <CardTitle>Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No winners yet. Be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((player: any, idx: number) => (
                <div
                  key={player.odoo}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0
                          ? "bg-secondary text-secondary-foreground"
                          : idx === 1
                            ? "bg-muted-foreground/30 text-foreground"
                            : idx === 2
                              ? "bg-orange-200 text-orange-800"
                              : "bg-muted-foreground/20 text-foreground"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">{player.wins} wins</div>
                    </div>
                  </div>
                  <div className="font-bold text-primary">{player.totalWon} Birr</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedGames.filter((g: any) => g.winner).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No completed games yet
            </p>
          ) : (
            <div className="space-y-2">
              {completedGames
                .filter((g: any) => g.winner)
                .slice(-5)
                .reverse()
                .map((game: any) => (
                  <div key={game.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{game.winnerName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {game.winPattern} - {game.stake} Birr stake
                      </span>
                    </div>
                    <Badge variant="secondary">{(game.stake || 10) * 5} Birr</Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}