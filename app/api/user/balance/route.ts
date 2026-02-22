import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';


export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user
    const userData = await verifyToken(token);
    if (!userData || !userData.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = userData.id;

    // Get user's base balance from users table
    const userResult = await db.query(
      'SELECT balance, bonus_balance FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const baseBalance = parseFloat(userResult[0].balance) || 0;
    const bonusBalance = parseFloat(userResult[0].bonus_balance) || 0;

    // Get sum of all approved deposits for this user
    const depositsResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_deposits 
       FROM deposits 
       WHERE user_id = ? AND status = 'approved'`,
      [userId]
    ) as any[];

    const totalDeposits = parseFloat(depositsResult[0]?.total_deposits) || 0;

    // Calculate total available balance
    const totalBalance = baseBalance + totalDeposits;

    return NextResponse.json({
      success: true,
      data: {
        baseBalance,
        bonusBalance,
        totalDeposits,
        totalBalance,
        formattedTotal: totalBalance.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}