"use client"

import { useGameStore } from "@/lib/game-store"
import { Gamepad2, Trophy, History, Wallet, User } from "lucide-react"

export function BottomNav() {
  const { currentTab, setTab } = useGameStore()

  const tabs = [
    { id: "game" as const, label: "Game", icon: Gamepad2 },
    { id: "scores" as const, label: "Scores", icon: Trophy },
    { id: "history" as const, label: "History", icon: History },
    { id: "wallet" as const, label: "Wallet", icon: Wallet },
    { id: "profile" as const, label: "Profile", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentTab === tab.id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}