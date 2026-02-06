// app/api/delete-cards/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST() {
  try {
    console.log('Deleting all cards from cartelas...');
    
    const [result] = await db.query(
      'DELETE FROM cartelas'
    ) as any[];
    
    const [verify] = await db.query(
      'SELECT COUNT(*) as count FROM cartelas'
    ) as any[];
    
    return NextResponse.json({
      success: true,
      message: `Deleted all cards. Remaining: ${verify[0].count}`,
      deletedCount: result.affectedRows,
      remaining: verify[0].count,
      action: 'DELETED'
    });
    
  } catch (error: any) {
    console.error('Delete cards error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      action: 'DELETE_FAILED'
    });
  }
}