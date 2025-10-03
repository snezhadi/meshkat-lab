import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionData = request.cookies.get('admin-session')?.value;

    if (!sessionData) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    try {
      const session = JSON.parse(sessionData);
      // For simplicity, we'll just check if the session data exists
      // In a more robust system, you'd validate the token format and expiration
      return NextResponse.json(
        { 
          authenticated: true,
          user: {
            username: session.username,
            permissions: session.permissions
          }
        },
        { status: 200 }
      );
    } catch (parseError) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
