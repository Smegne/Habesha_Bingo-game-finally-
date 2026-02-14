// app/api/game/winner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId, winningPattern, cardData } = body;
    
    if (!sessionId || !userId || !winningPattern) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Start transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Check if game is still active and no winner yet
      const gameCheck = await tx.query(`
        SELECT status, winner_user_id 
        FROM game_sessions 
        WHERE id = ? 
          AND status = 'active'
        FOR UPDATE
      `, [sessionId]) as any[];
      
      if (gameCheck.length === 0) {
        throw new Error('Game not found or not active');
      }
      
      if (gameCheck[0].winner_user_id) {
        throw new Error('Winner already declared');
      }
      
      // Declare winner
      const [updateResult] = await tx.execute(`
        UPDATE game_sessions 
        SET status = 'finished',
            winner_user_id = ?,
            winning_pattern = ?,
            win_declared_at = NOW(),
            finished_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [userId, winningPattern, sessionId]) as any;
      
      if (updateResult.affectedRows === 0) {
        throw new Error('Failed to declare winner');
      }
      
      // Update player statuses
      await tx.execute(`
        UPDATE game_players_queue 
        SET status = CASE 
          WHEN user_id = ? THEN 'winner'
          ELSE 'finished'
        END
        WHERE session_id = ?
      `, [userId, sessionId]);
      
      // Update user stats (optional)
      await tx.execute(`
        UPDATE users 
        SET games_won = COALESCE(games_won, 0) + 1,
            last_win_at = NOW()
        WHERE id = ?
      `, [userId]);
      
      console.log(`Winner declared: ${userId} in session ${sessionId}`);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Winner declared successfully'
    });
    
  } catch (error: any) {
    console.error('Winner declaration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to declare winner',
        error: error.message 
      },
      { status: 500 }
    );
  }
}