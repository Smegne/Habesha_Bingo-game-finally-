"use client"

import { useGameStore } from "@/lib/game-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, LogOut } from "lucide-react"

export function Header() {
  const { user, toggleRules, logout } = useGameStore()

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-bold text-sm">
            HB
          </div>
          <span className="font-bold text-lg">Habesha Bingo</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Badge variant="secondary" className="font-semibold">
                {user.balance.toFixed(0)} Birr
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRules}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}