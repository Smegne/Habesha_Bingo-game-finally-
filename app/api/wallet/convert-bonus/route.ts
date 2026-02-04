import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import { authMiddleware } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await db.transaction(async (connection) => {
      // Get user bonus balance
      const [user] = await connection.execute(
        'SELECT bonus_balance FROM users WHERE id = ? FOR UPDATE',
        [auth.userId]
      ) as any[];
      
      const bonusBalance = user[0].bonus_balance;
      
      if (bonusBalance <= 0) {
        throw new Error('No bonus to convert');
      }
      
      // Convert bonus to main balance
      await connection.execute(
        `UPDATE users 
         SET balance = balance + ?,
             bonus_balance = 0
         WHERE id = ?`,
        [bonusBalance, auth.userId]
      );
      
      // Record transaction
      await connection.execute(
        `INSERT INTO transactions 
        (user_id, type, amount, description)
        VALUES (?, 'bonus_convert', ?, 'Bonus converted to balance')`,
        [auth.userId, bonusBalance]
      );
    });
    
    // Get updated user data
    const [updatedUser] = await db.query(
      'SELECT balance, bonus_balance FROM users WHERE id = ?',
      [auth.userId]
    ) as any[];
    
    return NextResponse.json({
      success: true,
      balance: updatedUser[0].balance,
      bonusBalance: updatedUser[0].bonus_balance,
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Conversion failed' },
      { status: 400 }
    );
  }
}