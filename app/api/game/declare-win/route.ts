// app/api/game/declare-win/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface GameSessionRow extends RowDataPacket {
  id: number;
  status: string;
  winner_user_id: string | null;
  winner_username: string | null;
  winner_cartela: string | null;
  called_numbers: string | null;
  session_code: string;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  game_ended_at: Date | null;
}

interface GamePlayerRow extends RowDataPacket {
  user_id: string;
  username: string;
  first_name: string;
  cartela_number: string;
  player_status: string;
}

interface GameWinRow extends RowDataPacket {
  id: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      sessionId, 
      userId, 
      winType, 
      pattern, 
      calledNumbers, 
      cartelaNumber,
      username // Add username to the request
    } = body;

    console.log('🎯 Win declaration received:', {
      sessionId,
      userId,
      username,
      winType,
      cartelaNumber,
      calledNumbersCount: calledNumbers?.length
    });

    // Validate required fields
    if (!sessionId || !userId || !winType || !pattern || !cartelaNumber) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Use transaction with SERIALIZABLE isolation to prevent race conditions
    const result = await db.transaction(async (connection) => {
      // Step 1: Lock the session row and check status
      const sessions = await connection.execute(
        `SELECT id, status, winner_user_id, winner_username, winner_cartela, 
                called_numbers, session_code, game_ended_at
         FROM game_sessions 
         WHERE id = ? 
         FOR UPDATE`, // Critical: Locks the row to prevent concurrent modifications
        [sessionId]
      ) as GameSessionRow[];

      if (!sessions || sessions.length === 0) {
        throw new Error('Game session not found');
      }

      const session = sessions[0];

      // Step 2: Check if game is already finished
      if (session.status === 'finished' || session.game_ended_at) {
        // Game already ended, get winner info
        const winner = await connection.execute(
          `SELECT u.username, gw.cartela_number, gw.declared_at
           FROM game_wins gw
           JOIN users u ON gw.user_id = u.id
           WHERE gw.session_id = ?
           ORDER BY gw.declared_at ASC
           LIMIT 1`,
          [sessionId]
        ) as any[];

        return {
          success: false,
          gameEnded: true,
          message: 'This game has already ended',
          winner: winner[0] || {
            username: session.winner_username || 'Someone',
            cartelaNumber: session.winner_cartela || 'Unknown'
          }
        };
      }

      // Step 3: Check if someone already won (double-check after lock)
      if (session.winner_user_id) {
        return {
          success: false,
          alreadyWon: true,
          message: 'Someone already won this game',
          winner: {
            userId: session.winner_user_id,
            username: session.winner_username || 'Another player',
            cartelaNumber: session.winner_cartela || 'Unknown'
          }
        };
      }

      // Step 4: Verify the player is actually in this session
      const playerCheck = await connection.execute(
        `SELECT gpq.*, u.username
         FROM game_players_queue gpq
         JOIN users u ON gpq.user_id = u.id
         WHERE gpq.session_id = ? AND gpq.user_id = ? 
         AND gpq.status IN ('ready', 'playing')`,
        [sessionId, userId]
      ) as GamePlayerRow[];

      if (!playerCheck || playerCheck.length === 0) {
        throw new Error('Player not found in this session or not active');
      }

      const playerUsername = username || playerCheck[0].username || 'Player';

      // Step 5: Get all players in this session for announcement
      const allPlayers = await connection.execute(
        `SELECT gpq.user_id, u.username, gpq.bingo_card_id,
                bc.card_number
         FROM game_players_queue gpq
         JOIN users u ON gpq.user_id = u.id
         LEFT JOIN bingo_cards bc ON gpq.bingo_card_id = bc.id
         WHERE gpq.session_id = ? AND gpq.status IN ('ready', 'playing')`,
        [sessionId]
      ) as GamePlayerRow[];

      const playerCount = allPlayers.length;
      
      // Step 6: Calculate prize (if any)
      const prizeAmount = 100.00; // You can make this configurable

      // Step 7: Prepare data
      const calledNumbersStr = JSON.stringify(calledNumbers || []);
      const patternStr = JSON.stringify(pattern);
      const now = new Date();

      // Step 8: Update game session with winner
      await connection.execute(
        `UPDATE game_sessions 
         SET winner_user_id = ?,
             winner_username = ?,
             winner_cartela = ?,
             status = 'finished',
             winning_pattern = ?,
             winning_type = ?,
             game_ended_at = ?,
             finished_at = ?,
             winner_declared_at = ?,
             called_numbers = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          userId,
          playerUsername,
          cartelaNumber,
          patternStr,
          winType,
          now,
          now,
          now,
          calledNumbersStr,
          sessionId
        ]
      );

      // Step 9: Record the win in game_wins table
      const winResult = await connection.execute(
        `INSERT INTO game_wins (
          session_id,
          user_id,
          win_type,
          win_pattern,
          position,
          prize_amount,
          called_numbers,
          cartela_number,
          declared_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          winType,
          patternStr,
          1, // First position
          prizeAmount,
          calledNumbersStr,
          cartelaNumber,
          now
        ]
      ) as ResultSetHeader;

      // Step 10: Update all players' status to 'finished' (but keep them in queue for history)
      await connection.execute(
        `UPDATE game_players_queue 
         SET status = 'finished',
             left_at = ?
         WHERE session_id = ? AND user_id != ?`,
        [now, sessionId, userId]
      );

      // Update winner's status separately (optional)
      await connection.execute(
        `UPDATE game_players_queue 
         SET status = 'winner',
             left_at = ?
         WHERE session_id = ? AND user_id = ?`,
        [now, sessionId, userId]
      );

      // Step 11: Get the complete win record
      const winRecord = await connection.execute(
        `SELECT gw.*, u.username
         FROM game_wins gw
         JOIN users u ON gw.user_id = u.id
         WHERE gw.id = ?`,
        [winResult.insertId]
      ) as GameWinRow[];

      // Step 12: Prepare winner announcement data for all clients
      const winnerAnnouncement = {
        isFirstWinner: true,
        winner: {
          userId: userId,
          username: playerUsername,
          cartelaNumber: cartelaNumber,
          winType: winType,
          winPattern: pattern,
          prizeAmount: prizeAmount,
          declaredAt: now.toISOString()
        },
        gameInfo: {
          sessionId: sessionId,
          sessionCode: session.session_code,
          playerCount: playerCount,
          totalNumbersCalled: calledNumbers?.length || 0
        },
        message: `🏆 ${playerUsername} won with ${winType}! 🏆`
      };

      return {
        success: true,
        isFirstWinner: true,
        winDetails: {
          id: winResult.insertId,
          position: 1,
          prizeAmount: prizeAmount,
          winType: winType,
          message: `BINGO! You won with ${winType}!`,
          declaredAt: now.toISOString()
        },
        winnerAnnouncement: winnerAnnouncement,
        sessionCode: session.session_code
      };

    }, { 
      isolationLevel: 'REPEATABLE READ', // Prevents phantom reads
      timeout: 10000 // 10 second timeout
    });

    // Handle transaction result
    if (result.alreadyWon || result.gameEnded) {
      return NextResponse.json({
        success: false,
        message: result.message,
        gameEnded: result.gameEnded,
        winner: result.winner
      }, { status: 409 }); // 409 Conflict
    }

    console.log('✅ Win declared successfully:', result.winnerAnnouncement);

    return NextResponse.json({
      success: true,
      message: 'Win declared successfully',
      winDetails: result.winDetails,
      winnerAnnouncement: result.winnerAnnouncement,
      sessionCode: result.sessionCode
    });

  } catch (error: any) {
    console.error('❌ Error declaring win:', {
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });

    // Handle specific MySQL errors
    if (error.code === 'ER_LOCK_DEADLOCK') {
      return NextResponse.json({
        success: false,
        message: 'Concurrent win detection, please try again',
        retry: true
      }, { status: 409 });
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({
        success: false,
        message: 'Win already recorded for this session'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to declare win: ' + error.message
    }, { status: 500 });
  }
}

// GET endpoint to check win status and get winner info
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const sessionCode = searchParams.get('code');

    if (!sessionId && !sessionCode) {
      return NextResponse.json({
        success: false,
        message: 'Session ID or Code is required'
      }, { status: 400 });
    }

    let query = '';
    let params = [];

    if (sessionId) {
      query = `SELECT gs.*, 
                      u.username as winner_username,
                      gw.win_type,
                      gw.win_pattern,
                      gw.prize_amount,
                      gw.declared_at,
                      gw.cartela_number
               FROM game_sessions gs
               LEFT JOIN users u ON gs.winner_user_id = u.id
               LEFT JOIN game_wins gw ON gs.id = gw.session_id AND gw.user_id = gs.winner_user_id
               WHERE gs.id = ?`;
      params = [sessionId];
    } else {
      query = `SELECT gs.*, 
                      u.username as winner_username,
                      gw.win_type,
                      gw.win_pattern,
                      gw.prize_amount,
                      gw.declared_at,
                      gw.cartela_number
               FROM game_sessions gs
               LEFT JOIN users u ON gs.winner_user_id = u.id
               LEFT JOIN game_wins gw ON gs.id = gw.session_id AND gw.user_id = gs.winner_user_id
               WHERE gs.session_code = ?`;
      params = [sessionCode];
    }

    const sessions = await db.execute(query, params) as any[];

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      }, { status: 404 });
    }

    const session = sessions[0];

    // Get all winners for this session (in case of multiple, though we only expect one)
    const allWinners = await db.execute(
      `SELECT gw.*, u.username
       FROM game_wins gw
       JOIN users u ON gw.user_id = u.id
       WHERE gw.session_id = ?
       ORDER BY gw.declared_at ASC`,
      [session.id || sessionId]
    ) as any[];

    // Get all players who participated
    const players = await db.execute(
      `SELECT gpq.user_id, u.username, gpq.status, gpq.joined_at, gpq.left_at,
              bc.card_number
       FROM game_players_queue gpq
       JOIN users u ON gpq.user_id = u.id
       LEFT JOIN bingo_cards bc ON gpq.bingo_card_id = bc.id
       WHERE gpq.session_id = ?
       ORDER BY gpq.joined_at ASC`,
      [session.id || sessionId]
    ) as any[];

    if (session.winner_user_id) {
      return NextResponse.json({
        success: true,
        gameEnded: true,
        hasWinner: true,
        winner: {
          userId: session.winner_user_id,
          username: session.winner_username || 'Winner',
          cartelaNumber: session.winner_cartela || session.cartela_number,
          winType: session.win_type || session.winning_type,
          winPattern: session.win_pattern ? 
            (typeof session.win_pattern === 'string' ? JSON.parse(session.win_pattern) : session.win_pattern) : 
            null,
          prizeAmount: session.prize_amount,
          declaredAt: session.declared_at || session.winner_declared_at
        },
        allWinners: allWinners.map(w => ({
          ...w,
          win_pattern: typeof w.win_pattern === 'string' ? JSON.parse(w.win_pattern) : w.win_pattern
        })),
        players: players,
        session: {
          id: session.id,
          code: session.session_code,
          startedAt: session.started_at,
          endedAt: session.game_ended_at || session.finished_at,
          totalNumbersCalled: session.called_numbers ? 
            JSON.parse(session.called_numbers).length : 0
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        hasWinner: false,
        gameEnded: session.status === 'finished' || session.game_ended_at ? true : false,
        players: players,
        session: {
          id: session.id,
          code: session.session_code,
          status: session.status,
          startedAt: session.started_at
        }
      });
    }

  } catch (error: any) {
    console.error('Error checking win status:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check win status'
    }, { status: 500 });
  }
}