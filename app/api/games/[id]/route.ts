import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    
    console.log(`Fetching game: ${gameId}`);
    
    // For development mode
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        game: {
          id: gameId,
          stake: 10,
          status: 'waiting',
          players: ['user_1'],
          created_at: new Date().toISOString(),
        },
      });
    }
    
    const [game] = await db.execute(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
              (SELECT JSON_ARRAYAGG(number) FROM game_numbers WHERE game_id = g.id ORDER BY called_at) as called_numbers
       FROM games g
       WHERE g.id = ?`,
      [gameId]
    ) as any[];
    
    if (game.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      game: game[0],
    });
    
  } catch (error: any) {
    console.error('Get game error:', error);
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        game: {
          id: params.id,
          stake: 10,
          status: 'waiting',
          players: ['user_1'],
          created_at: new Date().toISOString(),
        },
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch game',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}