// app/api/game/sessions/route.ts - UPDATED WITH NULL CHECKS
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bingoCardId } = body;
    
    if (!userId || !bingoCardId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is already in an active session
    const activeUserSession = await db.query(`
      SELECT gs.*, gpq.status as player_status
      FROM game_sessions gs
      JOIN game_players_queue gpq ON gs.id = gpq.session_id
      WHERE gpq.user_id = ? 
        AND gs.status IN ('waiting', 'countdown', 'active')
        AND gpq.status IN ('waiting', 'ready', 'playing')
      LIMIT 1
    `, [userId]) as any[];

    if (activeUserSession && activeUserSession.length > 0) {
      const session = activeUserSession[0];
      let remainingSeconds = 50;
      
      if (session.status === 'countdown' && session.countdown_start_at) {
        const now = new Date();
        const start = new Date(session.countdown_start_at);
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        remainingSeconds = Math.max(0, 50 - elapsed);
      }

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          code: session.session_code,
          status: session.status,
          countdownRemaining: remainingSeconds,
          playerCount: await getPlayerCount(session.id),
          createdAt: session.created_at
        },
        alreadyJoined: true
      });
    }

    // Find available session or create new one
    let sessionId: number | null = null;
    let sessionCode: string = '';
    let isNewSession = false;
    
    const availableSession = await db.query(`
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

    if (availableSession && availableSession.length > 0) {
      sessionId = availableSession[0].id;
      sessionCode = availableSession[0].session_code;
      isNewSession = false;
    } else {
      sessionCode = `BINGO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const [sessionResult] = await db.execute(
        `INSERT INTO game_sessions (session_code, status, created_at) VALUES (?, 'waiting', NOW())`,
        [sessionCode]
      ) as any;
      sessionId = sessionResult.insertId;
      isNewSession = true;
    }

    if (!sessionId) {
      throw new Error('Failed to create or find session');
    }

    // Add player to queue
    await db.execute(
      `INSERT INTO game_players_queue (session_id, user_id, bingo_card_id, status, joined_at)
       VALUES (?, ?, ?, 'waiting', NOW())
       ON DUPLICATE KEY UPDATE 
         status = 'waiting',
         left_at = NULL,
         is_spectator = FALSE`,
      [sessionId, userId, bingoCardId]
    );

    // Update bingo card with session id
    await db.execute(
      `UPDATE bingo_cards SET game_session_id = ? WHERE id = ?`,
      [sessionId, bingoCardId]
    );

    // Get updated player count
    const playerCount = await getPlayerCount(sessionId);

    // If this is the second player joining and session is waiting, start countdown
    if (playerCount >= 2 && !isNewSession) {
      const sessionStatus = await db.query(
        `SELECT status FROM game_sessions WHERE id = ?`,
        [sessionId]
      ) as any[];
      
      if (sessionStatus && sessionStatus[0]?.status === 'waiting') {
        await db.execute(
          `UPDATE game_sessions 
           SET status = 'countdown', 
               countdown_start_at = NOW(),
               updated_at = NOW()
           WHERE id = ?`,
          [sessionId]
        );
      }
    }

    // Get session info
    const sessionInfo = await db.query(`
      SELECT 
        gs.*,
        TIMESTAMPDIFF(SECOND, gs.countdown_start_at, NOW()) as elapsed_seconds
      FROM game_sessions gs
      WHERE gs.id = ?
    `, [sessionId]) as any[];

    const session = sessionInfo[0];
    let remainingSeconds = 50;
    
    if (session && session.status === 'countdown' && session.countdown_start_at) {
      const elapsed = session.elapsed_seconds || 0;
      remainingSeconds = Math.max(0, 50 - elapsed);
      
      if (remainingSeconds <= 0 && playerCount >= 2) {
        await startGame(sessionId);
        remainingSeconds = 0;
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        code: sessionCode,
        status: session?.status || 'waiting',
        countdownRemaining: remainingSeconds,
        playerCount: playerCount,
        createdAt: session?.created_at || new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Session error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}


// In the GET function, after getting session data, add winner details lookup

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionCode = searchParams.get('code');
    const userId = searchParams.get('userId');

    if (!sessionCode) {
      return NextResponse.json(
        { success: false, message: 'Session code required' },
        { status: 400 }
      );
    }

    const sessions = await db.query(`
      SELECT 
        gs.*,
        TIMESTAMPDIFF(SECOND, gs.countdown_start_at, NOW()) as elapsed_seconds,
        gs.called_numbers
      FROM game_sessions gs
      WHERE gs.session_code = ?
    `, [sessionCode]) as any[];

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      });
    }

    const session = sessions[0];
    const playerCount = await getPlayerCount(session.id);
    
    const players = await db.query(`
      SELECT 
        gpq.user_id,
        gpq.status as player_status,
        gpq.joined_at,
        gpq.is_spectator,
        COALESCE(u.username, 'Player') as username,
        COALESCE(u.first_name, 'Guest') as first_name
      FROM game_players_queue gpq
      LEFT JOIN users u ON gpq.user_id = u.id
      WHERE gpq.session_id = ?
      ORDER BY gpq.joined_at ASC
    `, [session.id]) as any[];

    let remainingSeconds = 50;
    let shouldStartGame = false;
    
    if (session.status === 'countdown') {
      const elapsed = session.elapsed_seconds || 0;
      remainingSeconds = Math.max(0, 50 - elapsed);
      
      if (remainingSeconds <= 0) {
        if (playerCount >= 2) {
          await startGame(session.id);
          session.status = 'active';
          shouldStartGame = true;
          remainingSeconds = 0;
        } else {
          await db.execute(
            `UPDATE game_sessions SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
            [session.id]
          );
          session.status = 'cancelled';
        }
      }
    }

    let userRole = 'player';
    if (userId) {
      const userInSession = players?.find(p => p.user_id === userId);
      if (!userInSession && session.status === 'active') {
        userRole = 'spectator';
      }
    }

    // Parse called numbers (stored as JSON string)
    let calledNumbers: number[] = [];
    if (session.called_numbers) {
      try {
        calledNumbers = JSON.parse(session.called_numbers);
      } catch (e) {
        calledNumbers = [];
      }
    }

    // --- NEW: Get winner details if session has a winner ---
    let winnerDetails = null;
    if (session.winner_id) {
      const winnerResult = await db.query(`
        SELECT 
          gw.user_id,
          u.username,
          gw.win_type,
          gw.win_pattern,
          gw.prize_amount,
          gw.declared_at
        FROM game_wins gw
        JOIN users u ON gw.user_id = u.id
        WHERE gw.session_id = ?
        ORDER BY gw.declared_at DESC
        LIMIT 1
      `, [session.id]) as any[];
      
      if (winnerResult && winnerResult.length > 0) {
        winnerDetails = {
          userId: winnerResult[0].user_id,
          username: winnerResult[0].username,
          winType: winnerResult[0].win_type,
          winPattern: winnerResult[0].win_pattern ? JSON.parse(winnerResult[0].win_pattern) : null,
          prizeAmount: winnerResult[0].prize_amount || 0,
          declaredAt: winnerResult[0].declared_at
        };
      } else {
        // Fallback if no game_wins record yet
        winnerDetails = {
          userId: session.winner_id,
          username: players.find(p => p.user_id === session.winner_id)?.username || 'Player',
          winType: session.winning_type || 'BINGO',
          winPattern: session.winning_pattern ? JSON.parse(session.winning_pattern) : null,
          prizeAmount: 0,
          declaredAt: session.ended_at || new Date().toISOString()
        };
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        code: session.session_code,
        status: session.status,
        countdownRemaining: remainingSeconds,
        playerCount: playerCount,
        createdAt: session.created_at,
        startedAt: session.started_at,
        finishedAt: session.finished_at,
        winnerUserId: session.winner_id,
        winningPattern: session.winning_pattern,
        shouldStartGame: shouldStartGame,
        calledNumbers: calledNumbers,
        lastCalledNumber: calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null,
        // --- NEW: Include winner details directly ---
        winner: winnerDetails
      },
      players: players || [],
      userRole: userRole
    });

  } catch (error: any) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
async function getPlayerCount(sessionId: number): Promise<number> {
  if (!sessionId) return 0;
  
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM game_players_queue 
       WHERE session_id = ? AND status IN ('waiting', 'ready', 'playing')`,
      [sessionId]
    ) as any[];
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error getting player count:', error);
    return 0;
  }
}

async function startGame(sessionId: number) {
  if (!sessionId) return;
  
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE game_sessions 
         SET status = 'active', 
             started_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [sessionId]
      );
      
      await tx.execute(
        `UPDATE game_players_queue 
         SET status = 'playing',
             ready_at = NOW()
         WHERE session_id = ? AND status IN ('waiting', 'ready')`,
        [sessionId]
      );
    });
    console.log(`Game started for session ${sessionId}`);
  } catch (error) {
    console.error('Error starting game:', error);
  }
}