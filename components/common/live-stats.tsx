"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Zap, Award } from "lucide-react"
import { useGameStore } from "@/lib/game-store"

export function LiveStats() {
  const { activePlayers, gamesPlayed, dailyWinners } = useGameStore()

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold">{activePlayers}</div>
          <div className="text-xs text-muted-foreground">Active Players</div>
        </CardContent>
      </Card>
      <Card className="bg-secondary/30 border-secondary/40">
        <CardContent className="p-3 text-center">
          <Zap className="h-5 w-5 mx-auto mb-1 text-secondary-foreground" />
          <div className="text-lg font-bold">{gamesPlayed}</div>
          <div className="text-xs text-muted-foreground">Games Played</div>
        </CardContent>
      </Card>
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 text-center">
          <Award className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold">{dailyWinners}</div>
          <div className="text-xs text-muted-foreground">Daily Winners</div>
        </CardContent>
      </Card>
    </div>
  )
}