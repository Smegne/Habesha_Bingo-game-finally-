import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    const body = await request.json();
    const { userId, markedNumbers, cardNumbers } = body;
    
    console.log(`Checking win for game: ${gameId}, user: ${userId}`);
    
    if (!userId || !markedNumbers || !cardNumbers) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Convert to arrays if needed
    const marked = Array.isArray(markedNumbers) ? markedNumbers : [];
    const card = Array.isArray(cardNumbers) ? cardNumbers : [];
    
    // For development mode, simulate random win
    if (process.env.NODE_ENV === 'development') {
      const winChance = Math.random() > 0.7; // 30% chance to win
      
      if (winChance) {
        const patterns = ['horizontal', 'vertical', 'diagonal', 'four-corners'];
        const winPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        return NextResponse.json({
          success: true,
          win: true,
          pattern: winPattern,
          message: `BINGO! ${winPattern} win (development mode)`,
        });
      }
      
      return NextResponse.json({
        success: true,
        win: false,
        message: 'No win yet (development mode)',
      });
    }
    
    // Check win patterns
    const checkPatterns = (numbers: number[][], marked: number[]) => {
      const patterns = [];
      
      // Check horizontal lines
      for (let i = 0; i < 5; i++) {
        if (numbers[i].every(num => marked.includes(num) || num === 0)) {
          patterns.push(`horizontal-${i}`);
        }
      }
      
      // Check vertical lines
      for (let i = 0; i < 5; i++) {
        if (numbers.every(row => marked.includes(row[i]) || row[i] === 0)) {
          patterns.push(`vertical-${i}`);
        }
      }
      
      // Check diagonal (top-left to bottom-right)
      if (numbers.every((row, i) => marked.includes(row[i]) || row[i] === 0)) {
        patterns.push('diagonal-main');
      }
      
      // Check diagonal (top-right to bottom-left)
      if (numbers.every((row, i) => marked.includes(row[4 - i]) || row[4 - i] === 0)) {
        patterns.push('diagonal-anti');
      }
      
      // Check four corners
      if (
        (marked.includes(numbers[0][0]) || numbers[0][0] === 0) &&
        (marked.includes(numbers[0][4]) || numbers[0][4] === 0) &&
        (marked.includes(numbers[4][0]) || numbers[4][0] === 0) &&
        (marked.includes(numbers[4][4]) || numbers[4][4] === 0)
      ) {
        patterns.push('four-corners');
      }
      
      return patterns;
    };
    
    const winPatterns = checkPatterns(card, marked);
    
    if (winPatterns.length > 0) {
      // Update game as completed
      await db.execute(
        `UPDATE games 
         SET status = 'completed', 
             winner_id = ?,
             completed_at = NOW(),
             win_pattern = ?
         WHERE id = ?`,
        [userId, winPatterns[0], gameId]
      );
      
      // Calculate win amount
      const [game] = await db.execute(
        'SELECT stake FROM games WHERE id = ?',
        [gameId]
      ) as any[];
      
      const stake = game[0]?.stake || 10;
      const winAmount = stake * 5;
      
      // Award winnings to user
      await db.execute(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [winAmount, userId]
      );
      
      // Record transaction
      await db.execute(
        `INSERT INTO transactions (user_id, type, amount, description, reference_id)
         VALUES (?, 'game_win', ?, 'Bingo game win', ?)`,
        [userId, winAmount, gameId]
      );
      
      return NextResponse.json({
        success: true,
        win: true,
        pattern: winPatterns[0],
        winAmount,
        message: 'BINGO! You win!',
      });
    }
    
    return NextResponse.json({
      success: true,
      win: false,
      message: 'No winning pattern yet',
    });
    
  } catch (error: any) {
    console.error('Check win error:', error);
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        win: false,
        message: 'No win (error fallback)',
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check win',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}