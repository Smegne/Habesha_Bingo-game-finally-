// app/api/auth/debug/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('🔍 Debug: Checking database...');
    
    // 1. Test database connection (fixed query)
    const connectionTest = await db.query('SELECT 1 as test, DATABASE() as db, USER() as user');
    console.log('✅ Database connection:', connectionTest);
    
    // 2. Check users table - get ALL columns
    const tableInfo = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Users table has', Array.isArray(tableInfo) ? tableInfo.length : 'unknown', 'columns');
    
    // 3. Count total users - FIXED
    const countResult = await db.query('SELECT COUNT(*) as total_users FROM users');
    const totalUsers = Array.isArray(countResult) && countResult[0] ? countResult[0].total_users : 0;
    console.log('👥 Total users count:', totalUsers);
    
    // 4. Get first 5 users - FIXED
    const users = await db.query(`
      SELECT id, telegram_id, username, first_name, email 
      FROM users 
      LIMIT 5
    `);
    
    console.log('👤 Users found:', Array.isArray(users) ? users.length : 'unknown');
    
    // 5. Try specific user - FIXED
    const testUserId = '71df2eea-0028-11f1-9cdc-98e7f4364d07';
    const specificUser = await db.query(
      'SELECT id, telegram_id, username, first_name FROM users WHERE id = ?',
      [testUserId]
    );
    
    const foundUser = Array.isArray(specificUser) && specificUser.length > 0 ? specificUser[0] : null;
    console.log('🔎 Specific user found:', foundUser ? 'YES' : 'NO');
    
    return NextResponse.json({
      success: true,
      debug: {
        database: 'Connected',
        connectionTest: Array.isArray(connectionTest) ? connectionTest[0] : connectionTest,
        tableColumns: Array.isArray(tableInfo) ? tableInfo : tableInfo,
        totalUsers: totalUsers,
        sampleUsers: Array.isArray(users) ? users : users,
        testUserQuery: {
          userId: testUserId,
          found: !!foundUser,
          user: foundUser
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}