'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/game-store'
import { Button } from '@/components/ui/button'

export default function TestPage() {
  const { initializeTelegramAuth, isLoggedIn, user } = useGameStore()
  const [status, setStatus] = useState<string>('Ready')

  const testTelegramAuth = async () => {
    setStatus('Testing...')
    const success = await initializeTelegramAuth()
    setStatus(success ? '✅ Success!' : '❌ Failed')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold mb-6">Telegram Auth Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Current Status:</h2>
          <p>Logged In: {isLoggedIn ? '✅ YES' : '❌ NO'}</p>
          <p>User: {user?.username || 'None'}</p>
          <p>Telegram ID: {user?.telegramId || 'None'}</p>
        </div>

        <Button onClick={testTelegramAuth} className="w-full">
          Test Telegram Authentication
        </Button>

        <div className="p-4 bg-yellow-100 rounded">
          <h3 className="font-bold mb-2">Status: {status}</h3>
        </div>

        <div className="p-4 bg-blue-100 rounded">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <p>Window available: {typeof window !== 'undefined' ? '✅ YES' : '❌ NO'}</p>
          <p>Telegram WebApp: {(window as any).Telegram?.WebApp ? '✅ YES' : '❌ NO'}</p>
          <p>initData: {(window as any).Telegram?.WebApp?.initData ? `✅ YES (${(window as any).Telegram.WebApp.initData.length} chars)` : '❌ NO'}</p>
        </div>

        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="w-full"
        >
          Reload Page
        </Button>
      </div>
    </div>
  )
}