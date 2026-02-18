// app/api/game/start/route.ts - Updated with waiting state handling
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Start API received:', { cartelaId: body.cartelaId, userId: body.userId });
    
    const { cartelaId, userId, cardData } = body;
    
    if (!cartelaId || !userId || !cardData) {
      console.error('Missing fields:', { cartelaId, userId, cardData: !!cardData });
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      try {
        // Check cartela status - should be waiting and owned by this user OR available
        const cartelaCheck = await tx.query(
          `SELECT id, cartela_number, status, waiting_user_id 
           FROM cartela_card 
           WHERE id = ? AND (status = 'waiting' OR status = 'available')`,
          [cartelaId]
        ) as any[];

        if (!cartelaCheck || cartelaCheck.length === 0) {
          throw new Error('Cartela not found');
        }

        const cartela = cartelaCheck[0];

        // If cartela is waiting but owned by someone else, prevent use
        if (cartela.status === 'waiting' && cartela.waiting_user_id !== userId) {
          throw new Error('This cartela is already selected by another user');
        }

        // 1. Mark cartela as in_game
        await tx.execute(
          'UPDATE cartela_card SET status = "in_game", is_available = FALSE WHERE id = ?',
          [cartelaId]
        );

        // 2. Get next card number
        const lastCardResult = await tx.query(
          'SELECT MAX(card_number) as last_number FROM bingo_cards WHERE cartela_id = ?',
          [cartelaId]
        ) as any[];
        
        const lastCard = lastCardResult && lastCardResult[0] ? lastCardResult[0] : { last_number: 0 };
        const nextCardNumber = (lastCard.last_number || 0) + 1;

        // 3. Save bingo card
        const insertResult = await tx.execute(
          `INSERT INTO bingo_cards (cartela_id, user_id, card_data, card_number, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [cartelaId, userId, JSON.stringify(cardData), nextCardNumber]
        ) as any;
        
        const bingoCardId = insertResult.insertId;

        // 4. Create or join session
        const sessionResult = await createOrJoinSession(tx, userId, bingoCardId, cartelaId);
        
        // 5. Log to waiting history if it was waiting
        if (cartela.status === 'waiting') {
          await tx.execute(
            `INSERT INTO cartela_waiting_history (cartela_id, user_id, session_id, status)
             VALUES (?, ?, ?, 'joined_game')`,
            [cartelaId, userId, sessionResult.session.id]
          );
        }
        
        return {
          success: true,
          session: sessionResult.session,
          bingoCardId,
          cartelaNumber: cartela.cartela_number,
          cardNumber: nextCardNumber
        };
      } catch (txError) {
        console.error('Transaction error:', txError);
        throw txError;
      }
    });

    console.log('Start API success:', result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Game start error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createOrJoinSession(tx: any, userId: string, bingoCardId: number, cartelaId: number) {
  try {
    // Check for existing waiting session
    const sessionsResult = await tx.query(`
      SELECT gs.*, COUNT(gpq.id) as player_count
      FROM game_sessions gs
      LEFT JOIN game_players_queue gpq ON gs.id = gpq.session_id 
        AND gpq.status IN ('waiting', 'ready')
      WHERE gs.status IN ('waiting', 'countdown')
      GROUP BY gs.id
      HAVING player_count < 10
      ORDER BY gs.created_at ASC
      LIMIT 1
    `) as any[];

    let sessionId, sessionCode, isNewSession = false;

    if (sessionsResult && sessionsResult.length > 0 && sessionsResult[0]) {
      sessionId = sessionsResult[0].id;
      sessionCode = sessionsResult[0].session_code;
      isNewSession = false;
    } else {
      sessionCode = `BINGO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const sessionInsertResult = await tx.execute(
        'INSERT INTO game_sessions (session_code, status, created_at) VALUES (?, "waiting", NOW())',
        [sessionCode]
      ) as any;
      
      if (!sessionInsertResult || !sessionInsertResult.insertId) {
        throw new Error('Failed to create new session');
      }
      
      sessionId = sessionInsertResult.insertId;
      isNewSession = true;
    }

    if (!sessionId) {
      throw new Error('Failed to create or find session');
    }

    // Remove any previous waiting entries for this user
    await tx.execute(
      `DELETE FROM game_players_queue WHERE user_id = ? AND status = 'waiting'`,
      [userId]
    );

    // Add player to queue
    await tx.execute(
      `INSERT INTO game_players_queue (session_id, user_id, bingo_card_id, cartela_id, status, joined_at)
       VALUES (?, ?, ?, ?, 'waiting', NOW())
       ON DUPLICATE KEY UPDATE status = 'waiting', left_at = NULL, cartela_id = VALUES(cartela_id)`,
      [sessionId, userId, bingoCardId, cartelaId]
    );

    // Update bingo card with session id
    await tx.execute(
      'UPDATE bingo_cards SET game_session_id = ? WHERE id = ?',
      [sessionId, bingoCardId]
    );

    // Get player count
    const countResult = await tx.query(
      'SELECT COUNT(*) as count FROM game_players_queue WHERE session_id = ? AND status IN ("waiting", "ready", "playing")',
      [sessionId]
    ) as any[];
    
    const playerCount = (countResult && countResult[0] && countResult[0].count) || 0;

    // If this is second player and session is waiting, start countdown
    if (playerCount >= 2 && !isNewSession) {
      const sessionStatusResult = await tx.query(
        'SELECT status FROM game_sessions WHERE id = ?',
        [sessionId]
      ) as any[];
      
      if (sessionStatusResult && sessionStatusResult[0] && sessionStatusResult[0].status === 'waiting') {
        await tx.execute(
          `UPDATE game_sessions 
           SET status = 'countdown', 
               countdown_start_at = NOW(),
               updated_at = NOW()
           WHERE id = ?`,
          [sessionId]
        );
      }
    }

    // Get final session info
    const sessionInfoResult = await tx.query(`
      SELECT 
        gs.*,
        TIMESTAMPDIFF(SECOND, gs.countdown_start_at, NOW()) as elapsed_seconds
      FROM game_sessions gs
      WHERE gs.id = ?
    `, [sessionId]) as any[];

    if (!sessionInfoResult || sessionInfoResult.length === 0 || !sessionInfoResult[0]) {
      throw new Error('Failed to retrieve session info');
    }

    const session = sessionInfoResult[0];
    let remainingSeconds = 50;

    if (session.status === 'countdown' && session.countdown_start_at) {
      const elapsed = session.elapsed_seconds || 0;
      remainingSeconds = Math.max(0, 50 - elapsed);
    }

    return {
      session: {
        id: sessionId,
        code: sessionCode,
        status: session.status,
        countdownRemaining: remainingSeconds,
        playerCount: playerCount,
        createdAt: session.created_at
      }
    };
  } catch (error) {
    console.error('Error in createOrJoinSession:', error);
    throw error;
  }
}