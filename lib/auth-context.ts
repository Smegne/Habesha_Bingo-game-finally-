'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTelegramWebApp, getTelegramInitData } from '@/lib/telegram/telegram-webapp'

interface User {
  id: string
  telegramId: string
  username: string
  firstName: string
  role: string
  balance: number
  bonusBalance: number
  referralCode: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  source: 'telegram' | 'web' | null
  login: (username: string, password: string) => Promise<boolean>
  telegramLogin: () => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'telegram' | 'web' | null>(null)
  
  const telegram = useTelegramWebApp()
  const isTelegram = telegram.isTelegram

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Auto-login for Telegram users
  useEffect(() => {
    if (isTelegram && telegram.isReady && !user && !isLoading) {
      telegramLogin()
    }
  }, [isTelegram, telegram.isReady, user, isLoading])

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('auth_token')
      
      if (!savedToken) {
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/auth/telegram', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          setUser(data.user)
          setToken(savedToken)
          setSource(data.source)
        } else {
          localStorage.removeItem('auth_token')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const telegramLogin = async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      const initData = getTelegramInitData()
      
      if (!initData) {
        console.error('No Telegram initData found')
        return false
      }

      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData,
          source: 'telegram'
        })
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setToken(data.token)
        setSource('telegram')
        localStorage.setItem('auth_token', data.token)
        return true
      } else if (data.needsRegistration) {
        // User exists in Telegram but not in our database
        // Redirect to registration or show message
        console.log('User needs registration:', data)
        return false
      } else {
        console.error('Telegram login failed:', data.error)
        return false
      }
    } catch (error) {
      console.error('Telegram login error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          source: 'web'
        })
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setToken(data.token)
        setSource('web')
        localStorage.setItem('auth_token', data.token)
        return true
      } else {
        console.error('Login failed:', data.error)
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setSource(null)
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: !!user,
      source,
      login,
      telegramLogin,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}