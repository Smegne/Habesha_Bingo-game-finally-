import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('=== API /api/scores called ===');
    
    // Test database connection first
    try {
      const testResult = await db.query('SELECT 1 as test');
      console.log('Database connection test:', testResult);
    } catch (dbError: any) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: dbError?.message 
        },
        { status: 500 }
      );
    }
    
    // Fetch leaderboard
    console.log('Fetching leaderboard...');
    const leaderboard = await db.query(`
      SELECT 
        u.id as userId,
        COALESCE(u.username, u.email, 'Unknown Player') as name,
        COUNT(gw.id) as wins,
        COALESCE(SUM(gw.prize_amount), 0) as totalWon,
        MAX(gw.declared_at) as lastWinDate
      FROM users u
      LEFT JOIN game_wins gw ON u.id = gw.user_id
      GROUP BY u.id, u.username, u.email
      HAVING COUNT(gw.id) > 0
      ORDER BY totalWon DESC, wins DESC
      LIMIT 10
    `);
    
    console.log(`Found ${leaderboard.length} leaderboard entries`);

    // Fetch recent winners
    console.log('Fetching recent winners...');
    const recentWinners = await db.query(`
      SELECT 
        gw.id,
        gw.session_id as sessionId,
        gw.user_id as userId,
        COALESCE(u.username, u.email, 'Unknown Player') as winnerName,
        gw.win_type as winPattern,
        gw.prize_amount as prizeAmount,
        gw.cartela_number as cartelaNumber,
        gw.declared_at as declaredAt,
        gw.win_pattern as winPatternDetails
      FROM game_wins gw
      JOIN users u ON gw.user_id = u.id
      ORDER BY gw.declared_at DESC
      LIMIT 5
    `);

    console.log(`Found ${recentWinners.length} recent winners`);

    // Format recent winners
    const formattedRecentWinners = (recentWinners as any[]).map(winner => ({
      id: winner.id,
      winnerName: winner.winnerName,
      winPattern: winner.winPattern || 'Unknown Pattern',
      stake: 10, // Default stake since it's not in game_wins
      prizeAmount: parseFloat(winner.prizeAmount) || 0,
      cartelaNumber: winner.cartelaNumber || 'N/A',
      declaredAt: winner.declaredAt
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        leaderboard: leaderboard || [],
        recentWinners: formattedRecentWinners || []
      }
    });
    
  } catch (error: any) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch scores',
        message: error.message,
        code: error.code 
      },
      { status: 500 }
    );
  }
}