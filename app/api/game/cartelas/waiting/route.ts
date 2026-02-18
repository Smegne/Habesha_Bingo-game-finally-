import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    let query = `
      SELECT 
        cc.id,
        cc.cartela_number,
        cc.status,
        cc.waiting_user_id,
        cc.waiting_session_id,
        cc.waiting_expires_at,
        u.username as waiting_username,
        u.first_name as waiting_first_name,
        gs.session_code as waiting_session_code,
        TIMESTAMPDIFF(SECOND, NOW(), cc.waiting_expires_at) as expires_in_seconds
      FROM cartela_card cc
      LEFT JOIN users u ON cc.waiting_user_id = u.id
      LEFT JOIN game_sessions gs ON cc.waiting_session_id = gs.id
      WHERE cc.status IN ('waiting', 'in_game')
    `;

    const params: any[] = [];

    if (userId) {
      query += ` AND cc.waiting_user_id = ?`;
      params.push(userId);
    }

    if (sessionId) {
      query += ` AND cc.waiting_session_id = ?`;
      params.push(sessionId);
    }

    query += ` ORDER BY cc.cartela_number`;

    const waitingCartelas = await db.query(query, params);

    return NextResponse.json({
      success: true,
      waitingCartelas,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching waiting cartelas:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch waiting cartelas' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartelaId = searchParams.get('cartelaId');
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!cartelaId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Cartela ID and User ID are required' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Check if this user owns the waiting cartela
      const cartela = await tx.query(
        `SELECT * FROM cartela_card 
         WHERE id = ? AND waiting_user_id = ? AND status = 'waiting'`,
        [cartelaId, userId]
      ) as any[];

      if (!cartela || cartela.length === 0) {
        throw new Error('Cartela not found or you do not have permission to release it');
      }

      // Release the cartela
      await tx.execute(
        `UPDATE cartela_card 
         SET status = 'available', 
             waiting_user_id = NULL, 
             waiting_session_id = NULL,
             waiting_expires_at = NULL
         WHERE id = ?`,
        [cartelaId]
      );

      // Log to history
      await tx.execute(
        `INSERT INTO cartela_waiting_history (cartela_id, user_id, session_id, status)
         VALUES (?, ?, ?, 'cancelled')`,
        [cartelaId, userId, sessionId || null]
      );

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      message: 'Cartela released successfully'
    });

  } catch (error: any) {
    console.error('Error releasing waiting cartela:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to release cartela' },
      { status: 500 }
    );
  }
}