import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('Fetching leaderboard data...');
    
    // Get top winners by number of wins and total prize amount
    const leaderboard = await db.query(`
      SELECT 
        u.id as userId,
        COALESCE(u.username, u.email, 'Unknown Player') as name,
        COUNT(gw.id) as wins,
        SUM(gw.prize_amount) as totalWon,
        MAX(gw.declared_at) as lastWinDate
      FROM game_wins gw
      JOIN users u ON gw.user_id = u.id
      GROUP BY gw.user_id, u.id, u.username, u.email
      ORDER BY totalWon DESC, wins DESC
      LIMIT 10
    `);

    console.log(`Found ${leaderboard.length} leaderboard entries`);

    return NextResponse.json({ 
      success: true, 
      data: leaderboard 
    });
  } catch (error: any) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch leaderboard',
        message: error.message 
      },
      { status: 500 }
    );
  }
}