// app/api/game/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    const sessions = await db.query(`
      SELECT 
        gs.id,
        gs.session_code,
        gs.status,
        gs.countdown_start_at,
        gs.created_at,
        COUNT(gpq.id) as player_count,
        GROUP_CONCAT(CONCAT(u.first_name, ' (', gpq.status, ')')) as players
      FROM game_sessions gs
      LEFT JOIN game_players_queue gpq ON gs.id = gpq.session_id
      LEFT JOIN users u ON gpq.user_id = u.id
      WHERE gs.status IN ('waiting', 'countdown')
      GROUP BY gs.id
      ORDER BY gs.created_at DESC
    `) as any[];
    
    return NextResponse.json({
      success: true,
      sessions: sessions,
      total: sessions.length
    });
    
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}