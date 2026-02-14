// app/api/game/countdown/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory store for countdown timers (survives between API calls)
const countdownStore = new Map<string, {
  startTime: number;
  duration: number;
  endTime: number;
}>();

// Clean up old countdowns every hour
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of countdownStore.entries()) {
    if (data.endTime < now) {
      countdownStore.delete(code);
    }
  }
}, 3600000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionCode, action } = body;

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: 'Session code required' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      // Start a new countdown
      const startTime = Date.now();
      countdownStore.set(sessionCode, {
        startTime,
        duration: 50,
        endTime: startTime + (50 * 1000)
      });
      
      console.log(`✅ Countdown started for ${sessionCode} at ${new Date(startTime).toISOString()}`);
      
      return NextResponse.json({
        success: true,
        remaining: 50,
        startTime
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Countdown error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionCode = searchParams.get('code');

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: 'Session code required' },
        { status: 400 }
      );
    }

    const countdown = countdownStore.get(sessionCode);
    
    if (!countdown) {
      return NextResponse.json({
        success: true,
        active: false,
        remaining: 50
      });
    }

    const now = Date.now();
    const elapsed = Math.floor((now - countdown.startTime) / 1000);
    const remaining = Math.max(0, countdown.duration - elapsed);

    // Clean up if countdown is finished
    if (remaining <= 0) {
      countdownStore.delete(sessionCode);
    }

    return NextResponse.json({
      success: true,
      active: remaining > 0,
      remaining,
      startTime: countdown.startTime,
      endTime: countdown.endTime
    });

  } catch (error: any) {
    console.error('Countdown fetch error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}