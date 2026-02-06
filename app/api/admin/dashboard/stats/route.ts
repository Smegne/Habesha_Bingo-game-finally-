import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { AdminService } from '@/lib/services/admin-service';

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    
    if (!auth.user || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const stats = await AdminService.getDashboardStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
    
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}