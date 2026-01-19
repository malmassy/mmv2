// Admin API routes for user management

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '../../../lib/admin/middleware';
import { getAllUsers, setUserAdminStatus } from '../../../lib/admin/services/adminService';

/**
 * GET /api/admin/users - Get all users
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await requireAdmin(request);

  if (!isAdmin) {
    return unauthorizedResponse(error || 'Admin access required');
  }

  try {
    const users = await getAllUsers();
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('[Admin API] Error getting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get users' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users - Update user admin status
 */
export async function PATCH(request: NextRequest) {
  const { isAdmin, error } = await requireAdmin(request);

  if (!isAdmin) {
    return unauthorizedResponse(error || 'Admin access required');
  }

  try {
    const body = await request.json();
    const { userId, isAdmin: newAdminStatus } = body;

    if (!userId || typeof newAdminStatus !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'User ID and admin status required' },
        { status: 400 }
      );
    }

    const user = await setUserAdminStatus(userId, newAdminStatus);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[Admin API] Error updating user admin status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user admin status' },
      { status: 500 }
    );
  }
}
