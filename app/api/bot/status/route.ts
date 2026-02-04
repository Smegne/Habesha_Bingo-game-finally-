import { NextRequest, NextResponse } from 'next/server'

// This is a server API route - safe to import server-only modules dynamically

export async function GET(request: NextRequest) {
  try {
    // Dynamically import server-only modules
    const { getNgrokUrl } = await import('@/lib/telegram/bot')
    
    const ngrokUrl = getNgrokUrl()
    
    return NextResponse.json({
      status: 'running',
      ngrokUrl,
      webhookUrl: ngrokUrl ? `${ngrokUrl}/api/webhook` : null,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    // If bot module fails to load, return basic status
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Bot module not available',
      timestamp: new Date().toISOString(),
    })
  }
}