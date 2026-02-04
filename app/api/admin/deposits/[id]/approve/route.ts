import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import { authMiddleware } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    
    if (!auth.user || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const depositId = params.id;
    const { notes } = await request.json();
    
    await db.transaction(async (connection) => {
      // Get deposit details
      const [deposit] = await connection.execute(
        `SELECT d.*, u.balance
         FROM deposits d
         JOIN users u ON d.user_id = u.id
         WHERE d.id = ? AND d.status = 'pending'
         FOR UPDATE`,
        [depositId]
      ) as any[];
      
      if (deposit.length === 0) {
        throw new Error('Deposit not found or already processed');
      }
      
      const depositData = deposit[0];
      
      // Update deposit status
      await connection.execute(
        `UPDATE deposits 
         SET status = 'approved', 
             approved_by = ?, 
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [auth.userId, depositId]
      );
      
      // Update user balance
      await connection.execute(
        `UPDATE users 
         SET balance = balance + ?,
             updated_at = NOW()
         WHERE id = ?`,
        [depositData.amount, depositData.user_id]
      );
      
      // Record transaction
      await connection.execute(
        `INSERT INTO transactions 
        (user_id, type, amount, description, reference_id)
        VALUES (?, 'deposit', ?, 'Deposit approved', ?)`,
        [depositData.user_id, depositData.amount, depositId]
      );
      
      // Record approval log
      await connection.execute(
        `INSERT INTO approval_logs 
        (admin_id, action_type, target_id, target_type, notes)
        VALUES (?, 'deposit_approve', ?, 'deposit', ?)`,
        [auth.userId, depositId, notes || 'Deposit approved']
      );
    });
    
    return NextResponse.json({
      success: true,
      message: 'Deposit approved successfully',
    });
    
  } catch (error: any) {
    console.error('Approve deposit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve deposit' },
      { status: 500 }
    );
  }
}