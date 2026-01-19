// Analytics service for test results

import { prisma } from '../../db/prisma';

/**
 * Get statistics for a specific test ID
 */
export async function getTestStatistics(testId?: string) {
  const where = testId ? { testId } : {};
  
  const [totalTests, correctAnswers, totalAnswers, avgTime] = await Promise.all([
    prisma.testResult.count({ where }),
    prisma.questionAttempt.count({
      where: {
        testResult: where,
        isCorrect: true,
      },
    }),
    prisma.questionAttempt.count({
      where: {
        testResult: where,
      },
    }),
    prisma.testResult.aggregate({
      where,
      _avg: {
        totalTimeSpentMs: true,
      },
    }),
  ]);
  
  return {
    totalTests,
    totalQuestions: totalAnswers,
    correctQuestions: correctAnswers,
    averageScore: totalAnswers > 0 ? correctAnswers / totalAnswers : 0,
    averageTimeMs: avgTime._avg.totalTimeSpentMs || 0,
  };
}

/**
 * Get question difficulty stats by subtype
 */
export async function getQuestionDifficultyStats() {
  const stats = await prisma.questionAttempt.groupBy({
    by: ['subtype', 'parentType'],
    _count: {
      id: true,
    },
    _avg: {
      score: true,
      isCorrect: true,
    },
  });
  
  return stats.map(stat => ({
    subtype: stat.subtype,
    parentType: stat.parentType,
    totalAttempts: stat._count.id,
    averageScore: stat._avg.score || 0,
    successRate: stat._avg.isCorrect || 0,
  }));
}

/**
 * Get recent test results
 */
export async function getRecentTestResults(limit: number = 10) {
  const results = await prisma.testResult.findMany({
    take: limit,
    orderBy: {
      submittedAt: 'desc',
    },
    include: {
      questionAttempts: true,
    },
  });
  
  return results;
}
