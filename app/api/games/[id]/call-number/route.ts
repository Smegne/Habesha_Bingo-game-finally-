import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    
    console.log(`Calling number for game: ${gameId}`);
    
    // For development mode
    if (process.env.NODE_ENV === 'development') {
      const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
      const calledNumber = numbers[Math.floor(Math.random() * numbers.length)];
      
      return NextResponse.json({
        success: true,
        number: calledNumber,
        message: `Number ${calledNumber} called (development mode)`,
      });
    }
    
    // Get already called numbers
    const [calledNumbers] = await db.execute(
      'SELECT number FROM game_numbers WHERE game_id = ? ORDER BY called_at',
      [gameId]
    ) as any[];
    
    const calledSet = new Set(calledNumbers.map((n: any) => n.number));
    
    // Generate new unique number (1-75)
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const availableNumbers = allNumbers.filter(n => !calledSet.has(n));
    
    if (availableNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All numbers have been called' },
        { status: 400 }
      );
    }
    
    const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    
    // Record the called number
    await db.execute(
      `INSERT INTO game_numbers (game_id, number, called_at)
       VALUES (?, ?, NOW())`,
      [gameId, newNumber]
    );
    
    return NextResponse.json({
      success: true,
      number: newNumber,
      total_called: calledNumbers.length + 1,
    });
    
  } catch (error: any) {
    console.error('Call number error:', error);
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      const randomNumber = Math.floor(Math.random() * 75) + 1;
      return NextResponse.json({
        success: true,
        number: randomNumber,
        message: `Number ${randomNumber} called (error fallback)`,
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to call number',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}