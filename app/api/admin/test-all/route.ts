import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST ALL APIS ===');
    
    const results: any = {};
    
    // Test 1: Users
    try {
      const users = await db.query('SELECT COUNT(*) as count FROM users') as any[];
      results.users = { 
        success: true, 
        count: users[0]?.count || 0 
      };
    } catch (error: any) {
      results.users = { success: false, error: error.message };
    }
    
    // Test 2: Deposits
    try {
      const deposits = await db.query('SELECT COUNT(*) as count FROM deposits') as any[];
      results.deposits = { 
        success: true, 
        count: deposits[0]?.count || 0 
      };
    } catch (error: any) {
      results.deposits = { success: false, error: error.message };
    }
    
    // Test 3: Withdrawals
    try {
      const withdrawals = await db.query('SELECT COUNT(*) as count FROM withdrawals') as any[];
      results.withdrawals = { 
        success: true, 
        count: withdrawals[0]?.count || 0 
      };
    } catch (error: any) {
      results.withdrawals = { success: false, error: error.message };
    }
    
    // Test 4: Sample data
    try {
      const sampleUsers = await db.query('SELECT id, username, role FROM users LIMIT 3') as any[];
      results.sampleData = {
        users: sampleUsers
      };
    } catch (error: any) {
      results.sampleData = { error: error.message };
    }
    
    return NextResponse.json({
      success: true,
      message: 'All tests completed',
      results,
      summary: {
        totalUsers: results.users.success ? results.users.count : 'Error',
        totalDeposits: results.deposits.success ? results.deposits.count : 'Error',
        totalWithdrawals: results.withdrawals.success ? results.withdrawals.count : 'Error',
      }
    });
    
  } catch (error: any) {
    console.error('Test all error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}