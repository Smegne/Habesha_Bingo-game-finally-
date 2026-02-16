// app/api/game/declare-win/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface GameSessionRow extends RowDataPacket {
  id: number;
  status: string;
  winner_id: string | null;
  called_numbers: string | null;
  code: string;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
  countdown_started_at: Date | null;
}

interface GamePlayerRow extends RowDataPacket {
  user_id: string;
  session_id: number;
  player_status: string;
  joined_at: Date;
  username?: string;
  first_name?: string;
}

interface GameWinRow extends RowDataPacket {
  id: number;
  session_id: number;
  user_id: string;
  win_type: string;
  win_pattern: string;
  position: number;
  prize_amount: number;
  called_numbers: string;
  cartela_number: string;
  declared_at: Date;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, userId, winType, pattern, calledNumbers, cartelaNumber } = body;

    console.log('Win declaration request:', {
      sessionId,
      userId,
      winType,
      pattern,
      calledNumbersCount: calledNumbers?.length,
      cartelaNumber
    });

    // Validate required fields
    if (!sessionId || !userId || !winType || !pattern || !cartelaNumber) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (connection) => {
      // 1. Check if game session exists and if someone already won
      const sessions = await connection.execute(
        `SELECT id, status, winner_id, called_numbers, code 
         FROM game_sessions 
         WHERE id = ? FOR UPDATE`, // FOR UPDATE to lock the row
        [sessionId]
      ) as GameSessionRow[];

      if (!sessions || sessions.length === 0) {
        throw new Error('Game session not found');
      }

      const session = sessions[0];

      // Check if someone already won
      if (session.winner_id) {
        return {
          success: false,
          alreadyWon: true,
          message: 'Someone already won this game',
          winnerId: session.winner_id
        };
      }

      // Check if game is still active
      if (session.status !== 'active' && session.status !== 'playing') {
        return {
          success: false,
          message: 'Game is not active'
        };
      }

      // 2. Get all players in this session for prize calculation
      const players = await connection.execute(
        `SELECT gp.*, u.username, u.first_name 
         FROM game_players gp
         LEFT JOIN users u ON gp.user_id = u.id
         WHERE gp.session_id = ? AND gp.player_status IN ('ready', 'playing')`,
        [sessionId]
      ) as GamePlayerRow[];

      const playerCount = players.length;
      console.log(`Found ${playerCount} players in session`);

      // 3. Calculate prize (example: $100 base prize divided among players)
      const basePrize = 100.00;
      const prizeAmount = playerCount > 0 ? Number((basePrize / playerCount).toFixed(2)) : 0;

      // 4. Update game session with winner
      const calledNumbersStr = JSON.stringify(calledNumbers || []);
      
      await connection.execute(
        `UPDATE game_sessions 
         SET winner_id = ?, 
             status = 'finished', 
             winning_pattern = ?,
             winning_type = ?,
             ended_at = NOW(),
             called_numbers = ?
         WHERE id = ?`,
        [userId, JSON.stringify(pattern), winType, calledNumbersStr, sessionId]
      );

      // 5. Record the win details
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          sessionId,
          userId,
          winType,
          JSON.stringify(pattern),
          1, // First position
          prizeAmount,
          calledNumbersStr,
          cartelaNumber
        ]
      ) as ResultSetHeader;

      // 6. Update all players' status to finished
      await connection.execute(
        `UPDATE game_players 
         SET player_status = 'finished' 
         WHERE session_id = ?`,
        [sessionId]
      );

      // 7. Get the inserted win record
      const wins = await connection.execute(
        `SELECT * FROM game_wins WHERE id = ?`,
        [winResult.insertId]
      ) as GameWinRow[];

      const winRecord = wins[0];

      return {
        success: true,
        winDetails: {
          isFirstWinner: true,
          position: 1,
          prizeAmount: prizeAmount,
          winType: winType,
          message: `BINGO! You won with ${winType}!`,
          winId: winRecord.id,
          declaredAt: winRecord.declared_at
        },
        sessionCode: session.code
      };
    });

    // Handle the transaction result
    if (result.alreadyWon) {
      return NextResponse.json({
        success: false,
        message: result.message || 'Someone already won this game',
        alreadyWon: true
      }, { status: 409 }); // 409 Conflict
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to declare win'
      }, { status: 400 });
    }

    console.log('Win declared successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Win declared successfully',
      winDetails: result.winDetails,
      sessionCode: result.sessionCode
    });

  } catch (error: any) {
    console.error('Error declaring win:', {
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });

    // Check for specific MySQL errors
    if (error.code === 'ER_LOCK_DEADLOCK') {
      return NextResponse.json({
        success: false,
        message: 'Concurrent win detection, please try again'
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

// Optional: GET endpoint to check win status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID is required'
      }, { status: 400 });
    }

    // Check if session has a winner
    const sessions = await db.execute(
      `SELECT gs.*, 
              u.username as winner_username,
              gw.win_type,
              gw.win_pattern,
              gw.prize_amount,
              gw.declared_at
       FROM game_sessions gs
       LEFT JOIN users u ON gs.winner_id = u.id
       LEFT JOIN game_wins gw ON gs.id = gw.session_id AND gw.user_id = gs.winner_id
       WHERE gs.id = ?`,
      [sessionId]
    ) as any[];

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      }, { status: 404 });
    }

    const session = sessions[0];

    if (session.winner_id) {
      return NextResponse.json({
        success: true,
        hasWinner: true,
        winner: {
          userId: session.winner_id,
          username: session.winner_username,
          winType: session.win_type,
          winPattern: session.win_pattern ? JSON.parse(session.win_pattern) : null,
          prizeAmount: session.prize_amount,
          declaredAt: session.declared_at
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        hasWinner: false
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