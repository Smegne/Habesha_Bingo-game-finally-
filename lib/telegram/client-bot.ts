'use client'

// Client-side only - safe for frontend
export interface BotStatus {
  running: boolean
  ngrokUrl?: string
  timestamp: string
}

// Client-side functions that call API routes
export async function getBotStatusClient(): Promise<BotStatus> {
  try {
    const response = await fetch('/api/bot/status')
    if (!response.ok) {
      throw new Error('Failed to fetch bot status')
    }
    return await response.json()
  } catch (error) {
    console.error('Get bot status error:', error)
    return { running: false, timestamp: new Date().toISOString() }
  }
}

export async function startBotClient(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/bot/start', { method: 'POST' })
    const data = await response.json()
    return data
  } catch (error) {
    return { success: false, message: 'Failed to start bot' }
  }
}

export async function stopBotClient(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/bot/stop', { method: 'POST' })
    const data = await response.json()
    return data
  } catch (error) {
    return { success: false, message: 'Failed to stop bot' }
  }
}