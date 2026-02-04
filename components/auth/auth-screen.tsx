"use client"

import { useState, useEffect } from "react"
import { useGameStore } from "@/lib/game-store"
import { isOpenedFromTelegramBot } from "@/lib/telegram/telegram-webapp"
import { Bot, Loader2 } from "lucide-react"
import { SignupForm } from "./signup"
import { LoginForm } from "./login"
import { AuthWelcome } from "./auth-welcome"
import { AuthTelegram } from "./auth-telegram"
import { AuthBot } from "./auth-bot"

interface AuthScreenProps {
  onAdminLogin?: () => void
}

export function AuthScreen({ onAdminLogin }: AuthScreenProps) {
  const { initializeTelegramAuth } = useGameStore()
  const [mode, setMode] = useState<"welcome" | "register" | "login" | "bot" | "telegram">("welcome")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isRetryingTelegram, setIsRetryingTelegram] = useState(false)

  // Check if opened from Telegram but auth failed
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpenedFromTelegramBot()) {
      setMode("telegram")
    }
  }, [])

  const handleTelegramRetry = async () => {
    setIsRetryingTelegram(true)
    setError("")
    const success = await initializeTelegramAuth()
    if (!success) {
      setError("Failed to authenticate with Telegram. Please try registering manually.")
    }
    setIsRetryingTelegram(false)
  }

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode)
    setError("")
    setSuccess("")
  }

  // Render different auth screens based on mode
  switch (mode) {
    case "telegram":
      return (
        <AuthTelegram
          isRetryingTelegram={isRetryingTelegram}
          error={error}
          onTelegramRetry={handleTelegramRetry}
          onRegister={() => handleModeChange("register")}
          onLogin={() => handleModeChange("login")}
        />
      )

    case "welcome":
      return (
        <AuthWelcome
          onRegister={() => handleModeChange("register")}
          onLogin={() => handleModeChange("login")}
          onBot={() => handleModeChange("bot")}
          onTelegramRetry={handleTelegramRetry}
        />
      )

    case "bot":
      return (
        <AuthBot onBack={() => handleModeChange("welcome")} />
      )

    case "login":
      return (
        <LoginForm
          error={error}
          success={success}
          onLoginSuccess={(result) => {
            if (result.success) {
              setSuccess(result.message)
              if (result.role === "admin" && onAdminLogin) {
                onAdminLogin()
              }
            } else {
              setError(result.message)
            }
          }}
          onTelegramRetry={handleTelegramRetry}
          onSwitchToRegister={() => handleModeChange("register")}
          onBack={() => handleModeChange("welcome")}
        />
      )

    case "register":
      return (
        <SignupForm
          error={error}
          success={success}
          onRegisterSuccess={(result) => {
            if (result.success) {
              setSuccess(result.message)
              if (result.role === "admin" && onAdminLogin) {
                onAdminLogin()
              }
            } else {
              setError(result.message)
            }
          }}
          onTelegramRetry={handleTelegramRetry}
          onSwitchToLogin={() => handleModeChange("login")}
          onBack={() => handleModeChange("welcome")}
        />
      )

    default:
      return null
  }
}