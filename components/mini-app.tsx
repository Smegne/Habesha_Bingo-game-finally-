"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from 'next/dynamic'
import { useGameStore } from "@/lib/game-store"
import { 
  isTelegramWebApp, 
  initializeTelegramWebApp,
  isOpenedFromTelegramBot,
  getAuthSource 
} from "@/lib/telegram/telegram-webapp"

// Import components
import { Header } from "@/components/layout/header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { RulesDialog } from "@/components/layout/rules-dialog"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { ErrorScreen } from "@/components/ui/error-screen"
import { AuthScreen } from "@/components/auth/auth-screen"
import { GameHome } from "@/components/game/game-home"
import { ScoresView } from "@/components/scores/scores-view"
import { HistoryView } from "@/components/history/history-view"
import { WalletView } from "@/components/wallet/wallet-view"
import { ProfileView } from "@/components/profile/profile-view"
import { Bot } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Dynamically import components that use window object
const DynamicHeader = dynamic(() => Promise.resolve(Header), { ssr: false })
const DynamicBottomNav = dynamic(() => Promise.resolve(BottomNav), { ssr: false })
const DynamicGameHome = dynamic(() => Promise.resolve(GameHome), { ssr: false })
const DynamicScoresView = dynamic(() => Promise.resolve(ScoresView), { ssr: false })
const DynamicHistoryView = dynamic(() => Promise.resolve(HistoryView), { ssr: false })
const DynamicWalletView = dynamic(() => Promise.resolve(WalletView), { ssr: false })
const DynamicProfileView = dynamic(() => Promise.resolve(ProfileView), { ssr: false })
const DynamicRulesDialog = dynamic(() => Promise.resolve(RulesDialog), { ssr: false })

// Simple Admin Panel Fallback
function SimpleAdminPanel() {
  const { user, logout } = useGameStore()
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-bold text-sm">
              A
            </div>
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              Admin
            </Badge>
            <button
              onClick={logout}
              className="p-2 text-primary-foreground hover:bg-primary-foreground/10 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="container max-w-6xl mx-auto p-4">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome Admin {user?.firstName}!</h1>
          <p className="text-muted-foreground mb-6">
            You are logged in as an administrator.
          </p>
          <div className="bg-card border rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold mb-2">Admin Functions</h2>
            <ul className="text-left space-y-2">
              <li>• User Management</li>
              <li>• Deposit Approvals</li>
              <li>• Withdrawal Approvals</li>
              <li>• Game Monitoring</li>
            </ul>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                Note: This is a fallback admin panel. Your main admin panel might have an error.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Main Mini App Component
export function MiniApp({ onAdminLogin }: { onAdminLogin?: () => void }) {
  const { user, isLoggedIn, currentTab, initializeTelegramAuth } = useGameStore()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authSource, setAuthSource] = useState<'telegram' | 'web'>('web')
  const [authError, setAuthError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [adminPanelError, setAdminPanelError] = useState<string | null>(null)

  console.log('MiniApp render:', { 
    isLoggedIn, 
    userRole: user?.role,
    isCheckingAuth,
    mounted 
  })

  // Set mounted state
  useEffect(() => {
    console.log('Setting mounted to true')
    setMounted(true)
  }, [])

  // Initialize Telegram WebApp if opened from Telegram
  useEffect(() => {
    if (mounted && isTelegramWebApp()) {
      console.log('Initializing Telegram WebApp')
      initializeTelegramWebApp()
      setAuthSource('telegram')
    }
  }, [mounted])

  // Check authentication status on component mount
  const checkAuth = useCallback(async () => {
    if (!mounted) {
      console.log('Not mounted yet, skipping auth check')
      return
    }

    console.log('Starting auth check')
    setIsCheckingAuth(true)
    setAuthError(null)
    
    try {
      // Check if we have a stored token first
      const token = localStorage.getItem('token')
      console.log('Token in localStorage:', !!token)
      
      if (token) {
        // Verify token is still valid
        try {
          console.log('Validating token...')
          const response = await fetch('/api/auth/telegram', {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          })
          
          console.log('Token validation response:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log('Token validation data:', data)
            
            if (data.authenticated) {
              // User is already logged in
              console.log('User is authenticated')
              setIsCheckingAuth(false)
              
              // Check if admin
              if (data.user?.role === 'admin') {
                console.log('Admin user authenticated via token')
              }
              return
            }
          }
        } catch (error) {
          console.error('Token validation error:', error)
        }
      }
      
      // If no valid token, try Telegram auto-login
      if (isOpenedFromTelegramBot()) {
        console.log('Attempting Telegram auto-login')
        const success = await initializeTelegramAuth()
        if (success) {
          console.log('Telegram auth successful')
          setIsCheckingAuth(false)
          return
        } else {
          console.log('Telegram auth failed')
          setAuthError('Failed to authenticate with Telegram. You may need to register first.')
        }
      }
      
      // If Telegram auto-login failed or not in Telegram, show auth screen
      console.log('No valid auth, showing auth screen')
      setIsCheckingAuth(false)
    } catch (error) {
      console.error('Auth check error:', error)
      setAuthError('An error occurred during authentication. Please try again.')
      setIsCheckingAuth(false)
    }
  }, [mounted, initializeTelegramAuth])

  useEffect(() => {
    console.log('Running auth check effect')
    checkAuth()
    
    // Cleanup function
    return () => {
      console.log('Cleaning up auth check')
    }
  }, [checkAuth])

  // Show loading while checking auth
  if (isCheckingAuth || !mounted) {
    console.log('Showing loading screen')
    return (
      <LoadingScreen 
        message={
          authSource === 'telegram' 
            ? 'Authenticating via Telegram...' 
            : 'Loading Habesha Bingo...'
        } 
      />
    )
  }

  // Show error screen if auth failed
  if (authError && isOpenedFromTelegramBot()) {
    console.log('Showing error screen:', authError)
    return (
      <ErrorScreen 
        message={authError}
        onRetry={() => {
          setAuthError(null)
          setIsCheckingAuth(true)
          setTimeout(() => {
            const checkAgain = async () => {
              const success = await initializeTelegramAuth()
              if (!success) {
                setAuthError('Still unable to authenticate. Please try registering manually.')
                setIsCheckingAuth(false)
              }
            }
            checkAgain()
          }, 1000)
        }}
        showTelegramHelp={true}
      />
    )
  }

  // If admin is logged in, show admin panel
  if (user?.role === 'admin' && isLoggedIn) {
    console.log('Admin detected, showing admin panel')
    
    // Dynamically import the admin panel with correct export name
    const DynamicAdminPanel = dynamic(() => import('@/components/admin-panel').then(mod => {
      console.log('Admin panel module loaded:', Object.keys(mod))
      
      // Try to get the exported component - use AdminPanelEnhanced
      return mod.AdminPanelEnhanced || mod.AdminPanel || mod.default || SimpleAdminPanel
    }).catch(error => {
      console.error('Error loading admin panel:', error)
      return () => SimpleAdminPanel
    }), { 
      ssr: false,
      loading: () => <LoadingScreen message="Loading admin panel..." />
    })
    
    return <DynamicAdminPanel />
  }

  // Show auth screen if not logged in
  if (!isLoggedIn) {
    console.log('User not logged in, showing auth screen')
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
          <div className="flex items-center justify-center px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-bold text-sm">
                HB
              </div>
              <span className="font-bold text-lg">Habesha Bingo</span>
              {authSource === 'telegram' && (
                <Badge variant="secondary" className="ml-2">
                  <Bot className="mr-1 h-3 w-3" />
                  Telegram
                </Badge>
              )}
            </div>
          </div>
        </header>
        <AuthScreen onAdminLogin={onAdminLogin || (() => {
          console.log('Admin login callback')
        })} />
      </div>
    )
  }

  // Show main app if logged in as regular user
  console.log('User logged in as regular user, showing main app')
  return (
    <div className="min-h-screen bg-background pb-20">
      <DynamicHeader />
      <DynamicRulesDialog />
      <main className="container max-w-md mx-auto p-4">
        {currentTab === "game" && <DynamicGameHome />}
        {currentTab === "scores" && <DynamicScoresView />}
        {currentTab === "history" && <DynamicHistoryView />}
        {currentTab === "wallet" && <DynamicWalletView />}
        {currentTab === "profile" && <DynamicProfileView />}
      </main>
      <DynamicBottomNav />
    </div>
  )
}