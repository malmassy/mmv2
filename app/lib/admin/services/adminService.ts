// Admin service for admin-only operations

import { prisma } from '../../db/prisma';
import { getTestStatistics, getQuestionDifficultyStats, getRecentTestResults } from '../../test/services/analytics';
import { prismaToTestResult } from '../../test/db/mapper';

/**
 * Get all test results (admin only)
 */
export async function getAllTestResults(limit?: number, offset?: number) {
  const results = await prisma.testResult.findMany({
    take: limit,
    skip: offset,
    orderBy: {
      submittedAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      questionAttempts: true,
    },
  });

  return results.map(result => ({
    ...prismaToTestResult(result),
    user: result.user ? {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    } : null,
  }));
}

/**
 * Get test results for a specific user (admin only)
 */
export async function getUserTestResults(userId: string) {
  const results = await prisma.testResult.findMany({
    where: { userId },
    orderBy: {
      submittedAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      questionAttempts: true,
    },
  });

  return results.map(result => ({
    ...prismaToTestResult(result),
    user: result.user ? {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    } : null,
  }));
}

/**
 * Delete a test result (admin only)
 */
export async function deleteTestResult(testResultId: string) {
  await prisma.testResult.delete({
    where: { id: testResultId },
  });
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: {
          testResults: true,
        },
      },
    },
  });

  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
    testResultCount: user._count.testResults,
  }));
}

/**
 * Set user admin status (admin only)
 */
export async function setUserAdminStatus(userId: string, isAdmin: boolean) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isAdmin },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };
}

/**
 * Get comprehensive admin dashboard stats
 */
export async function getAdminDashboardStats() {
  const [
    totalUsers,
    totalAdmins,
    totalTests,
    totalQuestions,
    stats,
    questionStats,
    recentTests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.testResult.count(),
    prisma.questionAttempt.count(),
    getTestStatistics(),
    getQuestionDifficultyStats(),
    getRecentTestResults(10),
  ]);

  return {
    users: {
      total: totalUsers,
      admins: totalAdmins,
      regular: totalUsers - totalAdmins,
    },
    tests: {
      total: totalTests,
      totalQuestions,
      averageScore: stats.averageScore,
      averageTimeMs: stats.averageTimeMs,
    },
    questionStats,
    recentTests: recentTests.map(result => prismaToTestResult(result)),
  };
}
