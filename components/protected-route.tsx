'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/lib/game-store'
import { isOpenedFromTelegramBot } from '@/lib/telegram/telegram-webapp'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { isLoggedIn, initializeTelegramAuth } = useGameStore()
  
  useEffect(() => {
    const handleAuth = async () => {
      // If already logged in, nothing to do
      if (isLoggedIn) return
      
      // If opened from Telegram, try auto-login
      if (isOpenedFromTelegramBot()) {
        await initializeTelegramAuth()
      }
    }
    
    if (requireAuth && !isLoggedIn) {
      handleAuth()
    }
  }, [isLoggedIn, requireAuth, initializeTelegramAuth])
  
  // Show loading while checking auth
  if (requireAuth && !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }
  
  // If auth is required and user is not logged in, don't render children
  if (requireAuth && !isLoggedIn) {
    return null
  }
  
  return <>{children}</>
}