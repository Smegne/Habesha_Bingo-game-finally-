// app/api/game/current/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/game/current - Fetching current game');
    
    // Authenticate user
    const { user, userId } = await authMiddleware(request);
    
    if (!user || !userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('GET /api/game/current - User authenticated:', user.userId);
    
    // Get the most recent active bingo card for the user
    const bingoCards = await db.query(`
      SELECT 
        bc.id,
        bc.cartela_id,
        bc.user_id,
        bc.card_data,
        bc.card_number,
        bc.created_at,
        cc.cartela_number,
        cc.is_available
      FROM bingo_cards bc
      JOIN cartela_card cc ON bc.cartela_id = cc.id
      WHERE bc.user_id = ?
      ORDER BY bc.created_at DESC
      LIMIT 1
    `, [userId]) as any[];
    
    if (bingoCards.length === 0) {
      console.log('GET /api/game/current - No bingo cards found for user');
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active game found'
      });
    }
    
    const bingoCard = bingoCards[0];
    
    console.log('GET /api/game/current - Found bingo card:', {
      id: bingoCard.id,
      cartelaNumber: bingoCard.cartela_number,
      cardNumber: bingoCard.card_number
    });
    
    // Parse JSON data
    const cardData = typeof bingoCard.card_data === 'string' 
      ? JSON.parse(bingoCard.card_data)
      : bingoCard.card_data;
    
    const responseData = {
      bingoCard: {
        id: bingoCard.id,
        cartelaId: bingoCard.cartela_id,
        userId: bingoCard.user_id,
        cardData: cardData,
        cardNumber: bingoCard.card_number,
        createdAt: bingoCard.created_at
      },
      cartela: {
        id: bingoCard.cartela_id,
        cartelaNumber: bingoCard.cartela_number,
        isAvailable: bingoCard.is_available
      },
      user: {
        id: user.userId,
        username: user.username,
        role: user.role
      }
    };
    
    console.log('GET /api/game/current - Success');
    
    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Current game fetched successfully'
    });
    
  } catch (error: any) {
    console.error('GET /api/game/current - Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch current game',
        error: error.message 
      },
      { status: 500 }
    );
  }
}