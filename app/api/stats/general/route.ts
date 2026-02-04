import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    // Get active players (online in last 5 minutes)
    const [activePlayers] = await db.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE is_online = TRUE 
       AND last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    ) as any[];
    
    // Get total games played
    const [gamesPlayed] = await db.query(
      'SELECT COUNT(*) as count FROM games WHERE status = "completed"'
    ) as any[];
    
    // Get today's winners
    const [dailyWinners] = await db.query(
      `SELECT COUNT(DISTINCT winner_id) as count 
       FROM games 
       WHERE winner_id IS NOT NULL 
       AND DATE(completed_at) = CURDATE()`
    ) as any[];
    
    return NextResponse.json({
      success: true,
      activePlayers: activePlayers[0].count,
      gamesPlayed: gamesPlayed[0].count,
      dailyWinners: dailyWinners[0].count,
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}