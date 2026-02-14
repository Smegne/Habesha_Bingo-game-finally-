// app/api/game/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Check if user is in the session
      const playerCheck = await tx.query(
        'SELECT * FROM game_players_queue WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      ) as any[];

      if (!playerCheck || playerCheck.length === 0) {
        throw new Error('Player not found in session');
      }

      // Check if this player is the host (first player in session)
      const hostCheck = await tx.query(
        `SELECT user_id FROM game_players_queue 
         WHERE session_id = ? 
         ORDER BY joined_at ASC 
         LIMIT 1`,
        [sessionId]
      ) as any[];

      const isHost = hostCheck[0]?.user_id === userId;

      // Update player status to left
      await tx.execute(
        `UPDATE game_players_queue 
         SET status = 'left', left_at = NOW() 
         WHERE session_id = ? AND user_id = ?`,
        [sessionId, userId]
      );

      // Get remaining players
      const remainingPlayers = await tx.query(
        `SELECT COUNT(*) as count FROM game_players_queue 
         WHERE session_id = ? AND status IN ('waiting', 'ready', 'playing')`,
        [sessionId]
      ) as any[];

      const remainingCount = remainingPlayers[0]?.count || 0;

      // If no players left, cancel the session
      if (remainingCount === 0) {
        await tx.execute(
          `UPDATE game_sessions 
           SET status = 'cancelled', finished_at = NOW() 
           WHERE id = ?`,
          [sessionId]
        );
      }
      // If host left and there are other players, assign new host (first player in queue)
      else if (isHost && remainingCount > 0) {
        // The next player in line becomes the new host automatically
        // No need to update anything, just log it
        console.log(`Host left session ${sessionId}, new host will be the next player in queue`);
      }

      // Update bingo card to remove session association
      await tx.execute(
        `UPDATE bingo_cards 
         SET game_session_id = NULL 
         WHERE user_id = ? AND game_session_id = ?`,
        [userId, sessionId]
      );

      // Make cartela available again (optional - you might want to keep it assigned)
      // Uncomment if you want to free up the cartela when player leaves
      /*
      const bingoCard = await tx.query(
        'SELECT cartela_id FROM bingo_cards WHERE user_id = ? AND game_session_id = ?',
        [userId, sessionId]
      ) as any[];
      
      if (bingoCard[0]?.cartela_id) {
        await tx.execute(
          'UPDATE cartela_card SET is_available = TRUE WHERE id = ?',
          [bingoCard[0].cartela_id]
        );
      }
      */

      return {
        success: true,
        message: 'Successfully left the game',
        remainingPlayers: remainingCount,
        sessionEnded: remainingCount === 0
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Leave game error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to leave game' },
      { status: 500 }
    );
  }
}