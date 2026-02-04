import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    console.log(`Starting game: ${gameId}`);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For development mode, simulate starting a game
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: simulating game start');
      
      // Return mock success response
      return NextResponse.json({
        success: true,
        message: 'Game started successfully (development mode)',
        game: {
          id: gameId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          current_number: null,
          called_numbers: [],
        },
      });
    }
    
    // Check if game exists
    const [game] = await db.execute(
      'SELECT * FROM games WHERE id = ?',
      [gameId]
    ) as any[];
    
    if (game.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const currentGame = game[0];
    
    // Check if game can be started
    if (currentGame.status !== 'waiting') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Game cannot be started. Current status: ${currentGame.status}` 
        },
        { status: 400 }
      );
    }
    
    // Check if there are enough players
    const [players] = await db.execute(
      'SELECT COUNT(*) as count FROM game_players WHERE game_id = ?',
      [gameId]
    ) as any[];
    
    const playerCount = players[0]?.count || 0;
    
    if (playerCount < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Need at least 2 players to start the game' 
        },
        { status: 400 }
      );
    }
    
    // Update game status
    await db.execute(
      `UPDATE games 
       SET status = 'in_progress', started_at = NOW()
       WHERE id = ?`,
      [gameId]
    );
    
    // Initialize called numbers
    await db.execute(
      `INSERT INTO game_numbers (game_id, number, called_at)
       VALUES (?, 0, NOW())`, // 0 represents the free space
      [gameId]
    );
    
    // Get updated game info
    const [updatedGame] = await db.execute(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count
       FROM games g
       WHERE g.id = ?`,
      [gameId]
    ) as any[];
    
    return NextResponse.json({
      success: true,
      message: 'Game started successfully',
      game: updatedGame[0],
    });
    
  } catch (error: any) {
    console.error('Start game error:', error);
    
    // For development, return mock success
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Game started successfully (development fallback)',
        game: {
          id: params.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          current_number: null,
          called_numbers: [],
        },
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start game',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}