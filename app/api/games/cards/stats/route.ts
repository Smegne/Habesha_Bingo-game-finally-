// app/api/games/cards/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    // Get total card counts
    let total = 0;
    let used = 0;
    let available = 0;
    
    try {
      const [totalResult] = await db.query(
        'SELECT COUNT(*) as total FROM cartelas'
      ) as any[];
      total = totalResult[0]?.total || 0;
      
      if (total > 0) {
        const [usedResult] = await db.query(
          'SELECT COUNT(*) as used FROM cartelas WHERE is_used = TRUE OR game_id IS NOT NULL'
        ) as any[];
        used = usedResult[0]?.used || 0;
        
        const [availableResult] = await db.query(
          'SELECT COUNT(*) as available FROM cartelas WHERE is_used = FALSE AND game_id IS NULL'
        ) as any[];
        available = availableResult[0]?.available || 0;
      }
    } catch (queryError) {
      console.warn('Stats query error, database might be empty:', queryError);
    }
    
    // Get recent game activity
    let recentGames = [];
    try {
      const [gamesResult] = await db.query(
        `SELECT 
          g.id,
          g.stake,
          g.status,
          g.created_at,
          COUNT(gp.user_id) as player_count
        FROM games g
        LEFT JOIN game_players gp ON g.id = gp.game_id
        WHERE g.status IN ('waiting', 'in_progress')
        GROUP BY g.id
        ORDER BY g.created_at DESC
        LIMIT 5`
      ) as any[];
      recentGames = gamesResult || [];
    } catch (gamesError) {
      console.warn('Games query error:', gamesError);
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        totalCards: total,
        usedCards: used,
        availableCards: available,
        recentGames: recentGames,
        needsSetup: total === 0,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Get card stats error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch card statistics',
        stats: {
          totalCards: 0,
          usedCards: 0,
          availableCards: 0,
          recentGames: [],
          needsSetup: true,
        }
      },
      { status: 500 }
    );
  }
}