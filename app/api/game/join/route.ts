// app/api/game/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartelaId, userId, cardData } = body;
    
    // Start transaction
    return await db.transaction(async (tx) => {
      // 1. Get or create global lobby
      const lobby = await tx.query(`
        SELECT * FROM global_lobby 
        WHERE status = 'open' 
        ORDER BY created_at ASC 
        LIMIT 1 
        FOR UPDATE
      `) as any[];
      
      let lobbyId = lobby[0]?.id;
      let sessionId = lobby[0]?.session_id;
      
      // 2. If no lobby, create one
      if (!lobbyId) {
        const [lobbyResult] = await tx.execute(`
          INSERT INTO global_lobby (status) VALUES ('open')
        `) as any;
        lobbyId = lobbyResult.insertId;
      }
      
      // 3. If no session in lobby, create one
      if (!sessionId) {
        const sessionCode = `BINGO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const [sessionResult] = await tx.execute(`
          INSERT INTO game_sessions (session_code, status, created_at)
          VALUES (?, 'waiting', NOW())
        `, [sessionCode]) as any;
        sessionId = sessionResult.insertId;
        
        // Update lobby with session
        await tx.execute(`
          UPDATE global_lobby SET session_id = ? WHERE id = ?
        `, [sessionId, lobbyId]);
      }
      
      // 4. Check if user already in this session
      const existingPlayer = await tx.query(`
        SELECT * FROM game_players_queue 
        WHERE session_id = ? AND user_id = ?
      `, [sessionId, userId]) as any[];
      
      if (existingPlayer.length > 0) {
        // User already in session, return session info
        const sessionInfo = await getSessionInfo(tx, sessionId);
        return NextResponse.json({
          success: true,
          session: sessionInfo,
          isNewPlayer: false
        });
      }
      
      // 5. Save bingo card
      const [cardResult] = await tx.execute(`
        INSERT INTO bingo_cards 
        (cartela_id, user_id, card_data, card_number, game_session_id, created_at)
        VALUES (?, ?, ?, 1, ?, NOW())
      `, [cartelaId, userId, JSON.stringify(cardData), sessionId]) as any;
      
      const bingoCardId = cardResult.insertId;
      
      // 6. Add player to queue
      await tx.execute(`
        INSERT INTO game_players_queue 
        (session_id, user_id, bingo_card_id, status, joined_at)
        VALUES (?, ?, ?, 'waiting', NOW())
      `, [sessionId, userId, bingoCardId]);
      
      // 7. Update cartela as unavailable
      await tx.execute(`
        UPDATE cartela_card SET is_available = FALSE WHERE id = ?
      `, [cartelaId]);
      
      // 8. Get player count
      const players = await tx.query(`
        SELECT COUNT(*) as count FROM game_players_queue 
        WHERE session_id = ? AND status IN ('waiting', 'ready')
      `, [sessionId]) as any[];
      
      const playerCount = players[0]?.count || 0;
      
      // 9. Start countdown if we have 2+ players
      if (playerCount >= 2) {
        await tx.execute(`
          UPDATE game_sessions 
          SET status = 'countdown', 
              countdown_start_at = NOW(),
              updated_at = NOW()
          WHERE id = ?
        `, [sessionId]);
        
        // Close lobby when game starts
        await tx.execute(`
          UPDATE global_lobby SET status = 'closed' WHERE id = ?
        `, [lobbyId]);
      }
      
      // 10. Get session info
      const sessionInfo = await getSessionInfo(tx, sessionId);
      
      return NextResponse.json({
        success: true,
        session: sessionInfo,
        isNewPlayer: true
      });
    });
    
  } catch (error: any) {
    console.error('Join error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

async function getSessionInfo(tx: any, sessionId: number) {
  const sessionInfo = await tx.query(`
    SELECT 
      gs.*,
      (SELECT COUNT(*) FROM game_players_queue WHERE session_id = gs.id AND status IN ('waiting', 'ready')) as player_count,
      TIMESTAMPDIFF(SECOND, gs.countdown_start_at, NOW()) as elapsed_seconds
    FROM game_sessions gs
    WHERE gs.id = ?
  `, [sessionId]) as any[];
  
  const session = sessionInfo[0];
  let remainingSeconds = 50;
  
  if (session.status === 'countdown' && session.countdown_start_at) {
    const elapsed = session.elapsed_seconds || 0;
    remainingSeconds = Math.max(0, 50 - elapsed);
  }
  
  return {
    id: session.id,
    code: session.session_code,
    status: session.status,
    countdownRemaining: remainingSeconds,
    playerCount: session.player_count || 0,
    createdAt: session.created_at
  };
}