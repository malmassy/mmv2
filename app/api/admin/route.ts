// Admin API routes

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '../../lib/admin/middleware';
import { getAdminDashboardStats } from '../../lib/admin/services/adminService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin - Get admin dashboard stats
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await requireAdmin(request);

  if (!isAdmin) {
    return unauthorizedResponse(error || 'Admin access required');
  }

  try {
    const stats = await getAdminDashboardStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Admin API] Error getting dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
