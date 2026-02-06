// app/api/admin/test-deposits/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    // Test the deposits query
    const deposits = await db.query(
      `SELECT 
        d.*,
        u.username,
        u.first_name,
        u.telegram_id,
        u.balance as user_balance
       FROM deposits d
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC
       LIMIT 5`
    ) as any[];
    
    return NextResponse.json({
      success: true,
      count: deposits.length,
      deposits: deposits.map(d => ({
        id: d.id,
        user_id: d.user_id,
        username: d.username,
        amount: d.amount,
        method: d.method,
        status: d.status
      })),
      tableStructure: {
        deposits: ['id', 'user_id', 'amount', 'method', 'transaction_ref', 'screenshot_url', 'status', 'approved_by', 'approved_at', 'created_at', 'updated_at'],
        users: ['id', 'username', 'first_name', 'telegram_id', 'balance']
      }
    });
    
  } catch (error: any) {
    console.error('Test deposits error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      query: "SELECT d.*, u.username, u.first_name, u.telegram_id, u.balance FROM deposits d LEFT JOIN users u ON d.user_id = u.id"
    }, { status: 500 });
  }
}