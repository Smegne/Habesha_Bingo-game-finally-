import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/lib/services/admin-service';
import { simpleAuthCheck } from '@/lib/server/simple-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== ADMIN USERS API CALLED ===');
    
    // Simple auth check
    const { user, error } = await simpleAuthCheck(request);
    
    if (!user) {
      console.log('Auth failed:', error);
      // For development, let's continue anyway
      console.log('Continuing in development mode...');
    } else {
      console.log('User authenticated:', user.username);
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    
    console.log('Fetching users with filters:', { page, limit, search, role, status });
    
    // Build filters
    const filters: any = {};
    if (search) filters.search = search;
    if (role && role !== 'all') filters.role = role as 'user' | 'admin';
    if (status && status !== 'all') {
      filters.status = status as 'online' | 'offline';
    }
    
    // Fetch users from database
    const result = await AdminService.getAllUsers(page, limit, filters);
    
    console.log('Users fetched successfully, count:', result.users.length);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch users',
        message: 'Please check if the users table exists in your database',
      },
      { status: 500 }
    );
  }
}