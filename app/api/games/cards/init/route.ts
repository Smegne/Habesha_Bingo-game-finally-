// app/api/games/cards/check/route.ts (GET endpoint)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    // Check if cards exist
    const [cardCount] = await db.query(
      'SELECT COUNT(*) as count FROM cartelas'
    ) as any[];
    
    // Check if the stored procedure exists
    const [procedureCheck] = await db.query(
      `SHOW PROCEDURE STATUS WHERE Db = DATABASE() AND Name = 'GenerateBingoCards'`
    ) as any[];
    
    return NextResponse.json({
      success: true,
      cardsExist: cardCount[0].count > 0,
      cardCount: cardCount[0].count,
      hasProcedure: procedureCheck.length > 0,
    });
    
  } catch (error: any) {
    console.error('Check cards error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check cards',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}