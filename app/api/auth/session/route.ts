import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionData = request.cookies.get('admin-session')?.value;

    if (!sessionData) {
      console.log('No session cookie found');
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const session = JSON.parse(sessionData);
      
      // Basic validation
      if (!session.username || !session.permissions) {
        console.log('Invalid session data structure');
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      // Check if session is not too old (24 hours)
      const sessionAge = Date.now() - parseInt(session.token.split('-')[0]);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (sessionAge > maxAge) {
        console.log('Session expired');
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      console.log('Session valid for user:', session.username);
      return NextResponse.json(
        {
          authenticated: true,
          user: {
            username: session.username,
            permissions: session.permissions,
          },
        },
        { status: 200 }
      );
    } catch (parseError) {
      console.log('Session parse error:', parseError);
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
