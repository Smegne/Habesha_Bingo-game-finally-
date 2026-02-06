import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { AdminService } from '@/lib/services/admin-service';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await authMiddleware(request);
    
    if (!auth.user || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    
    console.log('Fetching deposits with filters:', { page, limit, status });
    
    // Build filters
    const filters: any = {};
    if (status && status !== 'all') {
      filters.status = status as 'pending' | 'approved' | 'rejected';
    }
    
    // Fetch deposits from database
    const result = await AdminService.getDeposits(page, limit, filters);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Deposits API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch deposits',
        success: false 
      },
      { status: 500 }
    );
  }
}