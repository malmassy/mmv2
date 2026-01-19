// API route for user operations

import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, getUserByEmail, getUserById, updateUserName } from '../../lib/test/services/userService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users - Find or create a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await findOrCreateUser(email, name);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[API] Error creating/finding user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/find user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users - Get user by email or ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (!email && !id) {
      return NextResponse.json(
        { success: false, error: 'Email or ID is required' },
        { status: 400 }
      );
    }

    const user = email 
      ? await getUserByEmail(email)
      : await getUserById(id!);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[API] Error retrieving user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users - Update user name
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const user = await updateUserName(id, name);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[API] Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
