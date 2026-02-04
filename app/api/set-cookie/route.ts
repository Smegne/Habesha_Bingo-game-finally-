import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const response = NextResponse.json({ success: true });
    
    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Set cookie error:', error);
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 });
  }
}

// Clean up cookies on logout
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Clear the auth cookie
  response.cookies.delete('auth_token');
  
  return response;
}