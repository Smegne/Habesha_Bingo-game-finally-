"use client"

import { motion } from "framer-motion"
import { useGameStore } from "@/lib/game-store"
import { Gamepad2, Trophy, History, Wallet, User } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
      <div className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 
                      shadow-2xl rounded-2xl py-2 px-2 flex justify-between items-center">

        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 mx-2 rounded-xl 
                             bg-gradient-to-r from-yellow-400 to-amber-500"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-1">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-black" : "text-white/80"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive ? "text-black" : "text-white/80"
                  )}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}