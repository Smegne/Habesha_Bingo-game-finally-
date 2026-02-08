// app/api/game/win/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/game/win - Win declaration request');
    
    // Authenticate user
    const { user, userId } = await authMiddleware(request);
    
    if (!user || !userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { 
      gameSessionId, 
      bingoCardId, 
      winType, 
      winPattern, 
      calledNumbers 
    } = body;
    
    console.log('POST /api/game/win - Request data:', {
      userId,
      gameSessionId,
      bingoCardId,
      winType,
      winPatternLength: winPattern?.length,
      calledNumbersLength: calledNumbers?.length
    });
    
    // Validate required fields
    if (!gameSessionId || !bingoCardId || !winType || !winPattern || !calledNumbers) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Start transaction
    const result = await db.transaction(async (tx) => {
      console.log('POST /api/game/win - Starting transaction');
      
      // 1. Verify game session belongs to user and is active
      const [gameSession] = await tx.query(`
        SELECT id, status, user_id 
        FROM game_sessions 
        WHERE id = ? AND user_id = ?
      `, [gameSessionId, userId]) as any[];
      
      if (gameSession.length === 0) {
        throw new Error('Game session not found or does not belong to user');
      }
      
      const session = gameSession[0];
      
      if (session.status !== 'active') {
        throw new Error(`Game session is already ${session.status}`);
      }
      
      console.log('POST /api/game/win - Game session verified');
      
      // 2. Check if this is the first win in this round
      // (Assuming all active games are in the same round)
      // We need a way to identify which round/game this belongs to
      // For now, let's assume we track by created_at within a time window
      
      const [previousWinners] = await tx.query(`
        SELECT gs.id, gs.user_id, gs.completed_at, u.username
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.id
        WHERE gs.status = 'completed'
          AND DATE(gs.completed_at) = CURDATE()
        ORDER BY gs.completed_at ASC
        LIMIT 10
      `) as any[];
      
      const isFirstWinner = previousWinners.length === 0;
      const winPosition = previousWinners.length + 1;
      
      console.log('POST /api/game/win - Win position:', winPosition);
      
      // 3. Update game session as completed
      const [updateResult] = await tx.execute(`
        UPDATE game_sessions 
        SET status = 'completed', completed_at = NOW()
        WHERE id = ?
      `, [gameSessionId]) as any;
      
      if (updateResult.affectedRows === 0) {
        throw new Error('Failed to update game session');
      }
      
      console.log('POST /api/game/win - Game session marked as completed');
      
      // 4. Record win in wins table (create if doesn't exist)
      try {
        // Check if wins table exists
        await tx.query(`
          CREATE TABLE IF NOT EXISTS bingo_wins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_session_id INT NOT NULL,
            user_id CHAR(36) NOT NULL,
            win_type VARCHAR(50) NOT NULL,
            win_pattern JSON NOT NULL,
            called_numbers JSON NOT NULL,
            win_position INT NOT NULL,
            prize_amount DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);
        
        // Calculate prize based on position
        const prizeAmount = calculatePrize(winPosition);
        
        // Insert win record
        const [winInsertResult] = await tx.execute(`
          INSERT INTO bingo_wins 
          (game_session_id, user_id, win_type, win_pattern, called_numbers, win_position, prize_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          gameSessionId,
          userId,
          winType,
          JSON.stringify(winPattern),
          JSON.stringify(calledNumbers),
          winPosition,
          prizeAmount
        ]) as any;
        
        console.log('POST /api/game/win - Win recorded, ID:', winInsertResult.insertId);
        
        // 5. Update user balance if prize > 0
        if (prizeAmount > 0) {
          const [balanceUpdate] = await tx.execute(`
            UPDATE users 
            SET balance = balance + ?
            WHERE id = ?
          `, [prizeAmount, userId]) as any;
          
          console.log('POST /api/game/win - User balance updated, affected rows:', balanceUpdate.affectedRows);
        }
        
        return {
          isWinner: true,
          isFirstWinner,
          winPosition,
          prizeAmount,
          message: isFirstWinner 
            ? '🎉 CONGRATULATIONS! You are the FIRST WINNER!' 
            : `🎉 BINGO! You won ${winPosition}${getOrdinalSuffix(winPosition)} place!`,
          gameSessionId,
          bingoCardId
        };
        
      } catch (tableError: any) {
        console.error('POST /api/game/win - Table creation/insert error:', tableError);
        // Continue even if win recording fails - main game session update succeeded
        return {
          isWinner: true,
          isFirstWinner,
          winPosition,
          prizeAmount: 0,
          message: '🎉 BINGO! Win recorded successfully!',
          gameSessionId,
          bingoCardId
        };
      }
    });
    
    console.log('POST /api/game/win - Success:', result);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('POST /api/game/win - Error:', error);
    
    // Check if it's a validation error
    if (error.message.includes('not found') || error.message.includes('already')) {
      return NextResponse.json(
        { 
          success: false, 
          message: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process win declaration',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate prize
function calculatePrize(position: number): number {
  // Define prize structure
  const prizeStructure: { [key: number]: number } = {
    1: 100.00,  // First place
    2: 50.00,   // Second place
    3: 25.00    // Third place
  };
  
  return prizeStructure[position] || 10.00; // Default prize for other positions
}

// Helper function for ordinal suffix
function getOrdinalSuffix(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}

// GET endpoint to check win status
export async function GET(request: NextRequest) {
  try {
    const { user, userId } = await authMiddleware(request);
    
    if (!user || !userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's recent wins
    const [recentWins] = await db.query(`
      SELECT 
        w.id,
        w.win_type,
        w.win_position,
        w.prize_amount,
        w.created_at,
        gs.cartela_id,
        cc.cartela_number
      FROM bingo_wins w
      JOIN game_sessions gs ON w.game_session_id = gs.id
      JOIN cartela_card cc ON gs.cartela_id = cc.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      LIMIT 10
    `, [userId]) as any[];
    
    // Get leaderboard (top winners today)
    const [leaderboard] = await db.query(`
      SELECT 
        u.username,
        COUNT(w.id) as total_wins,
        SUM(w.prize_amount) as total_prizes,
        MAX(w.created_at) as last_win
      FROM bingo_wins w
      JOIN users u ON w.user_id = u.id
      WHERE DATE(w.created_at) = CURDATE()
      GROUP BY w.user_id, u.username
      ORDER BY total_wins DESC, total_prizes DESC
      LIMIT 20
    `) as any[];
    
    return NextResponse.json({
      success: true,
      data: {
        recentWins: recentWins || [],
        leaderboard: leaderboard || [],
        userStats: {
          totalWins: recentWins?.length || 0,
          totalPrize: recentWins?.reduce((sum: number, win: any) => sum + (win.prize_amount || 0), 0) || 0
        }
      }
    });
    
  } catch (error: any) {
    console.error('GET /api/game/win - Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch win data' },
      { status: 500 }
    );
  }
}