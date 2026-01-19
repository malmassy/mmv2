// API route for test operations
// This will be used for saving/retrieving test results from database

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/db/prisma';
import type { TestResult } from '../../lib/test/types';
import { testResultToPrismaInput, prismaToTestResult } from '../../lib/test/db/mapper';

/**
 * POST /api/tests - Save a test result
 */
export async function POST(request: NextRequest) {
  try {
    const testResult: TestResult = await request.json();
    
    const prismaInput = testResultToPrismaInput(testResult);
    const saved = await prisma.testResult.create({
      data: prismaInput,
      include: {
        questionAttempts: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      id: saved.id,
      testResult: prismaToTestResult(saved),
    });
  } catch (error) {
    console.error('[API] Error saving test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save test', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tests/:id - Get a test result by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Test ID required' },
        { status: 400 }
      );
    }
    
    const result = await prisma.testResult.findUnique({
      where: { id },
      include: {
        questionAttempts: true,
      },
    });
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      testResult: prismaToTestResult(result),
    });
  } catch (error) {
    console.error('[API] Error retrieving test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve test', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
