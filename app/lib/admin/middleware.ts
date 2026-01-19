// Admin middleware for route protection

import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '../test/services/userService';

/**
 * Check if a user is an admin
 * This should be called from API routes or server components
 */
export async function requireAdmin(request: NextRequest): Promise<{
  isAdmin: boolean;
  user: { id: string; email: string; name?: string; isAdmin: boolean } | null;
  error?: string;
}> {
  // Get user email from headers or session
  // For now, we'll use a simple header-based approach
  // In production, you'd use proper session/auth tokens
  const userEmail = request.headers.get('x-user-email');
  
  if (!userEmail) {
    return {
      isAdmin: false,
      user: null,
      error: 'User email required',
    };
  }

  try {
    const user = await getUserByEmail(userEmail);
    
    if (!user) {
      return {
        isAdmin: false,
        user: null,
        error: 'User not found',
      };
    }

    if (!user.isAdmin) {
      return {
        isAdmin: false,
        user,
        error: 'Admin access required',
      };
    }

    return {
      isAdmin: true,
      user,
    };
  } catch (error) {
    console.error('[Admin Middleware] Error checking admin:', error);
    return {
      isAdmin: false,
      user: null,
      error: 'Error checking admin status',
    };
  }
}

/**
 * Create a response for unauthorized admin access
 */
export function unauthorizedResponse(message: string = 'Admin access required') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}
