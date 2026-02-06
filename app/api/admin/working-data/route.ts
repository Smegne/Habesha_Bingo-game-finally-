// app/api/admin/working-data/route.ts - UPDATED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== WORKING-DATA GET ===');
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'deposits';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;
    
    console.log(`Type: ${type}, Page: ${page}, Limit: ${limit}, Status: ${status}`);
    
    let data: any[] = [];
    let total = 0;
    
    switch (type) {
      case 'deposits':
        try {
          // Build base query
          let baseQuery = `
            SELECT 
              d.*,
              u.username,
              u.first_name,
              u.telegram_id,
              u.balance as user_balance
            FROM deposits d
            LEFT JOIN users u ON d.user_id = u.id
          `;
          
          // Add WHERE clause if status filter is provided
          if (status && status !== 'all') {
            baseQuery += ` WHERE d.status = '${status}'`;
          }
          
          baseQuery += ' ORDER BY d.created_at DESC';
          
          // Get total count first
          let countQuery = 'SELECT COUNT(*) as count FROM deposits d';
          if (status && status !== 'all') {
            countQuery += ` WHERE d.status = '${status}'`;
          }
          
          const countResult = await db.query(countQuery) as any[];
          total = countResult[0]?.count || 0;
          
          // Add pagination using string concatenation
          const query = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
          console.log('Final query:', query);
          
          const rows = await db.query(query) as any[];
          console.log(`Fetched ${rows.length} rows`);
          
          // Transform data to match your exact schema
          data = rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            amount: parseFloat(row.amount),
            method: row.method,
            status: row.status,
            transaction_ref: row.transaction_ref,
            screenshot_url: row.screenshot_url,
            approved_by: row.approved_by,
            approved_at: row.approved_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            username: row.username,
            first_name: row.first_name,
            telegram_id: row.telegram_id,
            user_balance: parseFloat(row.user_balance || '0')
          }));
          
        } catch (dbError: any) {
          console.error('Database error:', dbError);
          data = [];
          total = 0;
        }
        break;
        
      case 'users':
        try {
          const query = `SELECT * FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
          const rows = await db.query(query) as any[];
          data = rows;
          
          const countResult = await db.query('SELECT COUNT(*) as count FROM users') as any[];
          total = countResult[0]?.count || 0;
        } catch (error) {
          console.error('Users query error:', error);
          data = [];
          total = 0;
        }
        break;
        
      case 'withdrawals':
        try {
          // Build base query for withdrawals
          let baseQuery = `
            SELECT 
              w.*,
              u.username,
              u.first_name,
              u.telegram_id,
              u.balance as user_balance
            FROM withdrawals w
            LEFT JOIN users u ON w.user_id = u.id
          `;
          
          // Add WHERE clause if status filter is provided
          if (status && status !== 'all') {
            baseQuery += ` WHERE w.status = '${status}'`;
          }
          
          baseQuery += ' ORDER BY w.created_at DESC';
          
          // Get total count first
          let countQuery = 'SELECT COUNT(*) as count FROM withdrawals w';
          if (status && status !== 'all') {
            countQuery += ` WHERE w.status = '${status}'`;
          }
          
          const countResult = await db.query(countQuery) as any[];
          total = countResult[0]?.count || 0;
          
          // Add pagination using string concatenation
          const query = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
          console.log('Final withdrawals query:', query);
          
          const rows = await db.query(query) as any[];
          console.log(`Fetched ${rows.length} withdrawal rows`);
          
          data = rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            amount: parseFloat(row.amount),
            method: row.method,
            status: row.status,
            account_number: row.account_number,
            account_name: row.account_name,
            bank_name: row.bank_name,
            approved_by: row.approved_by,
            approved_at: row.approved_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            username: row.username,
            first_name: row.first_name,
            telegram_id: row.telegram_id,
            user_balance: parseFloat(row.user_balance || '0')
          }));
          
        } catch (dbError: any) {
          console.error('Withdrawals database error:', dbError);
          data = [];
          total = 0;
        }
        break;
        
      default:
        data = [];
        total = 0;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        [type]: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error in working-data GET:', error);
    
    return NextResponse.json({
      success: true,
      data: {
        deposits: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      }
    });
  }
}

// FIXED POST function - Using db.transaction()
export async function POST(request: NextRequest) {
  console.log('=== WORKING-DATA POST ===');
  
  try {
    const body = await request.json();
    const { action, type, ids } = body;
    
    console.log('Request:', { action, type, ids });
    
    if (!action || !type || !ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Use the transaction method from db object
    const result = await db.transaction(async (connection) => {
      let successCount = 0;
      const processedResults = [];
      
      // Get the current admin user ID (you should get this from auth/session)
      // For now, get the first admin user
      const adminUsers = await connection.query(
        "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1"
      ) as any[];
      
      const adminUserId = adminUsers[0]?.[0]?.id || 'ab2fcb49-ff92-11f0-b998-98e7f4364d07';
      
      for (const depositId of ids) {
        try {
          console.log(`Processing ${action} for ${depositId}`);
          
          if (type === 'deposits') {
            if (action === 'approve') {
              // Get deposit details
              const [depositRows] = await connection.query(
                'SELECT user_id, amount FROM deposits WHERE id = ? AND status = ?',
                [depositId, 'pending']
              ) as any[];
              
              if (depositRows.length === 0) {
                processedResults.push({
                  id: depositId,
                  success: false,
                  error: 'Not found or not pending'
                });
                continue;
              }
              
              const deposit = depositRows[0];
              
              // Update deposit status
              const [updateResult] = await connection.query(
                `UPDATE deposits 
                 SET status = 'approved', 
                     approved_by = ?, 
                     approved_at = NOW(),
                     updated_at = NOW()
                 WHERE id = ?`,
                [adminUserId, depositId]
              ) as any;
              
              // Update user balance
              await connection.query(
                `UPDATE users 
                 SET balance = balance + ?, 
                     updated_at = NOW()
                 WHERE id = ?`,
                [deposit.amount, deposit.user_id]
              );
              
              successCount++;
              processedResults.push({
                id: depositId,
                success: true,
                user_id: deposit.user_id,
                amount: deposit.amount
              });
              
            } else if (action === 'reject') {
              // Reject deposit
              const [updateResult] = await connection.query(
                `UPDATE deposits 
                 SET status = 'rejected', 
                     updated_at = NOW()
                 WHERE id = ?`,
                [depositId]
              ) as any;
              
              successCount++;
              processedResults.push({
                id: depositId,
                success: true
              });
            }
            
          } else if (type === 'withdrawals') {
            if (action === 'approve') {
              // Get withdrawal details
              const [withdrawalRows] = await connection.query(
                'SELECT user_id, amount FROM withdrawals WHERE id = ? AND status = ?',
                [depositId, 'pending']
              ) as any[];
              
              if (withdrawalRows.length === 0) {
                processedResults.push({
                  id: depositId,
                  success: false,
                  error: 'Not found or not pending'
                });
                continue;
              }
              
              const withdrawal = withdrawalRows[0];
              
              // Update withdrawal status
              const [updateResult] = await connection.query(
                `UPDATE withdrawals 
                 SET status = 'approved', 
                     approved_by = ?, 
                     approved_at = NOW(),
                     updated_at = NOW()
                 WHERE id = ?`,
                [adminUserId, depositId]
              ) as any;
              
              successCount++;
              processedResults.push({
                id: depositId,
                success: true,
                user_id: withdrawal.user_id,
                amount: withdrawal.amount
              });
              
            } else if (action === 'reject') {
              // Reject withdrawal and refund balance
              const [withdrawalRows] = await connection.query(
                'SELECT user_id, amount FROM withdrawals WHERE id = ? AND status = ?',
                [depositId, 'pending']
              ) as any[];
              
              if (withdrawalRows.length === 0) {
                processedResults.push({
                  id: depositId,
                  success: false,
                  error: 'Not found or not pending'
                });
                continue;
              }
              
              const withdrawal = withdrawalRows[0];
              
              // Update withdrawal status to rejected
              await connection.query(
                `UPDATE withdrawals 
                 SET status = 'rejected', 
                     updated_at = NOW()
                 WHERE id = ?`,
                [depositId]
              );
              
              // Refund the user's balance
              await connection.query(
                `UPDATE users 
                 SET balance = balance + ?, 
                     updated_at = NOW()
                 WHERE id = ?`,
                [withdrawal.amount, withdrawal.user_id]
              );
              
              successCount++;
              processedResults.push({
                id: depositId,
                success: true,
                user_id: withdrawal.user_id,
                amount: withdrawal.amount,
                refunded: true
              });
            }
          }
          
        } catch (itemError: any) {
          console.error(`Error processing ${type} ${depositId}:`, itemError);
          processedResults.push({
            id: depositId,
            success: false,
            error: itemError.message
          });
        }
      }
      
      const message = action === 'approve' 
        ? `${successCount} ${type}(s) approved successfully`
        : `${successCount} ${type}(s) ${action === 'reject' ? 'rejected' : 'processed'} successfully`;
      
      return {
        success: successCount > 0,
        message,
        stats: {
          total: ids.length,
          successful: successCount,
          failed: ids.length - successCount
        },
        results: processedResults
      };
    });
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('POST error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Operation failed',
      error: error.message,
      code: error.code,
      sqlState: error.sqlState
    }, { status: 500 });
  }
}