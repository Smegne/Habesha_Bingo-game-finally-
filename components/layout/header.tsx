"use client"

import { motion } from "framer-motion"
import { useGameStore } from "@/lib/game-store"
import { Button } from "@/components/ui/button"
import { BookOpen, LogOut, Wallet } from "lucide-react"

export function Header() {
  const { user, toggleRules, logout } = useGameStore()

  return (
    <header className="sticky top-0 z-50 w-full shadow-md bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 text-white">

      <div className="flex items-center justify-between px-4 py-3">

        {/* LEFT: Logo Only */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
         <div className="inline-flex p-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl">
             <img
            src="/habsha.png"
            alt="Habesha Bingo"
            className="h-8 w-auto object-contain rounded-full"
          />
          </div>
          <h1 className="text-xl font-bold tracking-wide">
            ሐበሻ Bingo
          </h1>
        </motion.div>

        {/* RIGHT SIDE */}
        {user && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >

            {/* GOLD BALANCE */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full 
                            bg-gradient-to-r from-yellow-400 to-amber-500 
                            text-black shadow-lg font-semibold text-sm">
              <Wallet className="h-4 w-4" />
              {user.balance.toFixed(0)} Birr
            </div>

            {/* RULES */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRules}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <BookOpen className="h-5 w-5" />
            </Button>

            {/* LOGOUT */}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-white hover:bg-red-500/30 rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>

          </motion.div>
        )}
      </div>
    </header>
  )
}