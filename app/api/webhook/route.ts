import { NextRequest, NextResponse } from 'next/server'
import { bot } from '@/lib/telegram/bot'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Process webhook update
    await bot.handleUpdate(body)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Simple health check for webhook
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Habesha Bingo Bot Webhook',
    timestamp: new Date().toISOString()
  })
}