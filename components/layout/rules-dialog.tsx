"use client"

import { useGameStore } from "@/lib/game-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function RulesDialog() {
  const { showRules, toggleRules } = useGameStore()

  return (
    <Dialog open={showRules} onOpenChange={toggleRules}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Play Habesha Bingo</DialogTitle>
          <DialogDescription>Complete guide to winning!</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Getting Started</h4>
            <p className="text-muted-foreground">
              Register with your Telegram account, deposit funds, and choose a stake level (10 or 20
              Birr).
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Select Your Card</h4>
            <p className="text-muted-foreground">
              Choose from 400 available Bingo cards. Each card has unique numbers arranged in a 5x5
              grid.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Play the Game</h4>
            <p className="text-muted-foreground">
              Numbers are called randomly. Mark the numbers on your card as they are called.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. Winning Patterns</h4>
            <ul className="text-muted-foreground space-y-1">
              <li>- Horizontal: Complete any row</li>
              <li>- Vertical: Complete any column</li>
              <li>- Diagonal: Complete diagonal line</li>
              <li>- Square: Complete any 2x2 square</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">5. Claim Your Prize</h4>
            <p className="text-muted-foreground">
              When you achieve a winning pattern, click BINGO to claim your prize!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}