// Admin API routes for test management

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '../../../lib/admin/middleware';
import { getAllTestResults, getUserTestResults, deleteTestResult } from '../../../lib/admin/services/adminService';

/**
 * GET /api/admin/tests - Get all test results
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await requireAdmin(request);

  if (!isAdmin) {
    return unauthorizedResponse(error || 'Admin access required');
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const results = userId
      ? await getUserTestResults(userId)
      : await getAllTestResults(limit, offset);

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('[Admin API] Error getting test results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get test results' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tests - Delete a test result
 */
export async function DELETE(request: NextRequest) {
  const { isAdmin, error } = await requireAdmin(request);

  if (!isAdmin) {
    return unauthorizedResponse(error || 'Admin access required');
  }

  try {
    const { searchParams } = new URL(request.url);
    const testResultId = searchParams.get('id');

    if (!testResultId) {
      return NextResponse.json(
        { success: false, error: 'Test result ID required' },
        { status: 400 }
      );
    }

    await deleteTestResult(testResultId);

    return NextResponse.json({
      success: true,
      message: 'Test result deleted',
    });
  } catch (error) {
    console.error('[Admin API] Error deleting test result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete test result' },
      { status: 500 }
    );
  }
}
