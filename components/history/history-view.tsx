"use client"

import { useGameStore } from "@/lib/game-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"

export function HistoryView() {
  const { gameHistory, user } = useGameStore()

  const userHistory = gameHistory.filter((g: any) => g.odoo === user?.id)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Your Game History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No games played yet. Start playing to see your history!
            </p>
          ) : (
            <div className="space-y-3">
              {userHistory.slice().reverse().map((game: any) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      Card #{game.cardId} - {game.stake} Birr
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(game.date).toLocaleString()}
                      {game.winPattern && ` - ${game.winPattern}`}
                    </div>
                  </div>
                  <Badge variant={game.result === "win" ? "default" : "secondary"}>
                    {game.result === "win" ? `+${game.amount}` : `-${game.stake}`} Birr
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