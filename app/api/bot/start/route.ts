import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Dynamically import bot module (server-side only)
    const { startNgrokTunnel } = await import('@/lib/telegram/bot')
    
    const ngrokUrl = await startNgrokTunnel(3000)
    
    return NextResponse.json({
      success: true,
      message: 'Bot started successfully',
      ngrokUrl,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to start bot',
    }, { status: 500 })
  }
}