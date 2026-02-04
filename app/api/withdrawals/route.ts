import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, method, accountNumber } = await request.json();
    
    // Validate
    if (amount < 10) {
      return NextResponse.json(
        { error: 'Minimum withdrawal is 10 Birr' },
        { status: 400 }
      );
    }
    
    // Check user balance
    const [user] = await db.query(
      'SELECT balance FROM users WHERE id = ?',
      [userId]
    ) as any[];
    
    if (user[0].balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }
    
    // Create withdrawal
    await db.transaction(async (connection) => {
      // Deduct from balance
      await connection.execute(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [amount, userId]
      );
      
      // Create withdrawal record
      await connection.execute(
        `INSERT INTO withdrawals 
        (user_id, amount, method, account_number, status)
        VALUES (?, ?, ?, ?, 'pending')`,
        [userId, amount, method, accountNumber]
      );
    });
    
    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted',
    });
    
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to submit withdrawal' },
      { status: 500 }
    );
  }
}