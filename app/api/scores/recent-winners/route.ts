import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('Fetching recent winners...');
    
    // Get 5 most recent winners with session details
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
        gw.called_numbers as calledNumbers,
        gs.stake as stakeAmount
      FROM game_wins gw
      JOIN users u ON gw.user_id = u.id
      LEFT JOIN game_sessions gs ON gw.session_id = gs.id
      ORDER BY gw.declared_at DESC
      LIMIT 5
    `);

    console.log(`Found ${recentWinners.length} recent winners`);

    // Format the data to match your frontend structure
    const formattedWinners = (recentWinners as any[]).map(winner => {
      // Parse called numbers if it's a string
      let calledNumbers = winner.calledNumbers;
      if (typeof calledNumbers === 'string') {
        try {
          calledNumbers = JSON.parse(calledNumbers);
        } catch {
          calledNumbers = [];
        }
      }

      return {
        id: winner.id,
        winnerName: winner.winnerName,
        winPattern: winner.winPattern || 'Unknown Pattern',
        stake: winner.stakeAmount || 10, // Default stake if not available
        prizeAmount: parseFloat(winner.prizeAmount) || 0,
        cartelaNumber: winner.cartelaNumber,
        declaredAt: winner.declaredAt,
        calledNumbers: calledNumbers
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: formattedWinners 
    });
  } catch (error: any) {
    console.error('Recent winners fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent winners',
        message: error.message 
      },
      { status: 500 }
    );
  }
}