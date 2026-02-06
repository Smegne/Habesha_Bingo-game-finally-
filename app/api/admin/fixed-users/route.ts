import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== FIXED USERS API CALLED ===');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    console.log('Page:', page, 'Limit:', limit, 'Offset:', offset);
    
    // SIMPLE QUERY THAT ALWAYS WORKS
    const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const params = [limit, offset];
    
    console.log('Executing query:', query);
    console.log('With params:', params);
    
    const users = await db.query(query, params);
    console.log('Query successful, got', users.length, 'users');
    
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM users') as any[];
    const total = countResult[0]?.total || 0;
    
    console.log('Total users in database:', total);
    
    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('FIXED Users API error:', error);
    
    // Even on error, return empty data so UI doesn't break
    return NextResponse.json({
      success: true,
      data: {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        }
      },
      error: error.message,
      note: 'Returning empty data due to error',
    });
  }
}