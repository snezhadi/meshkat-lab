import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getAppConfig } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Get admin auth config
    const hdrs = await headers();
    const origin = hdrs.get('origin') || 'http://localhost:3000';
    const config = await getAppConfig(origin);

    if (!config.adminUsers || config.adminUsers.length === 0) {
      return NextResponse.json({ error: 'Authentication not configured' }, { status: 500 });
    }

    // Find user by username
    const user = config.adminUsers.find((u) => u.username === username);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session token (simple approach using timestamp + random)
    const sessionToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store user info in session data
    const sessionData = {
      token: sessionToken,
      username: user.username,
      permissions: user.permissions,
    };

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: { username: user.username, permissions: user.permissions },
      },
      { status: 200 }
    );

    // Set session cookie with user data (expires in 24 hours)
    response.cookies.set('admin-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
