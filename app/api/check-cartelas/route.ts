// app/api/check-cartelas/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('Checking cartelas table...');
    
    // 1. Check if table exists
    const [tables] = await db.query(
      "SHOW TABLES LIKE 'cartelas'"
    ) as any[];
    
    const tableExists = tables.length > 0;
    
    if (!tableExists) {
      return NextResponse.json({
        success: true,
        tableExists: false,
        message: 'cartelas table does not exist',
        action: 'CREATE_TABLE_NEEDED'
      });
    }
    
    // 2. Check table structure
    const [structure] = await db.query(
      'DESCRIBE cartelas'
    ) as any[];
    
    // 3. Check row count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM cartelas'
    ) as any[];
    const total = countResult[0]?.total || 0;
    
    // 4. Sample some data
    let sampleData = [];
    if (total > 0) {
      const [samples] = await db.query(
        'SELECT id, card_number, is_used, game_id FROM cartelas ORDER BY card_number LIMIT 5'
      ) as any[];
      sampleData = samples;
    }
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      totalCards: total,
      tableStructure: structure,
      sampleData: sampleData,
      action: total === 0 ? 'POPULATE_DATA_NEEDED' : 'OK'
    });
    
  } catch (error: any) {
    console.error('Check cartelas error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      tableExists: 'UNKNOWN'
    });
  }
}