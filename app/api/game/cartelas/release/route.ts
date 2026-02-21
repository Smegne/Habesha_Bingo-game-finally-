// app/api/game/cartelas/release/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartelaId, sessionId, gameEnded } = body;

    console.log('POST /api/game/cartelas/release - Releasing cartela:', { cartelaId, sessionId, gameEnded });

    if (!cartelaId) {
      return NextResponse.json(
        { success: false, message: 'Cartela ID is required' },
        { status: 400 }
      );
    }

    // Release the cartela (make it available again)
    await db.execute(
      `UPDATE cartela_card 
       SET status = 'available', 
           is_available = TRUE,
           waiting_user_id = NULL, 
           waiting_session_id = NULL,
           waiting_expires_at = NULL
       WHERE id = ?`,
      [cartelaId]
    );

    // If game ended, log it
    if (gameEnded && sessionId) {
      await db.execute(
        `INSERT INTO cartela_usage_history (cartela_id, session_id, action, created_at)
         VALUES (?, ?, 'released_after_game', NOW())`,
        [cartelaId, sessionId]
      );
    }

    console.log('Cartela released successfully:', cartelaId);

    return NextResponse.json({
      success: true,
      message: 'Cartela released successfully'
    });

  } catch (error: any) {
    console.error('Error releasing cartela:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to release cartela: ' + error.message },
      { status: 500 }
    );
  }
}