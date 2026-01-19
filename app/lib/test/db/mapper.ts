// Database mapper functions to convert between domain types and Prisma types

import type { TestResult, QuestionAttempt } from '../types';
import type { Prisma } from '@prisma/client';

/**
 * Convert TestResult to Prisma create input
 */
export function testResultToPrismaInput(
  result: TestResult
): Prisma.TestResultCreateInput {
  return {
    userId: result.userId,
    testId: result.testId,
    config: JSON.stringify(result.config),
    questions: JSON.stringify(result.questions),
    answers: JSON.stringify(result.answers),
    gradeResults: JSON.stringify(result.gradeResults),
    scoreCorrect: result.score.correct,
    scoreTotal: result.score.total,
    startedAt: new Date(result.startedAt),
    submittedAt: new Date(result.submittedAt),
    totalTimeSpentMs: result.totalTimeSpentMs,
    pausedTimeMs: result.pausedTimeMs,
    phases: JSON.stringify(result.phases),
    questionAttempts: {
      create: result.answers.map(answer => {
        const question = result.questions.find(q => q.id === answer.questionId);
        const gradeResult = result.gradeResults[answer.questionId];
        
        if (!question || !gradeResult) {
          throw new Error(`Missing question or grade result for ${answer.questionId}`);
        }
        
        return {
          questionId: answer.questionId,
          subtype: question.subtype,
          parentType: question.parentType,
          submittedAnswer: answer.submittedAnswer,
          isCorrect: gradeResult.isCorrect,
          score: gradeResult.score,
          timeSpentMs: answer.timeSpentMs || 0,
          phase: answer.phase,
        };
      }),
    },
  };
}

/**
 * Convert Prisma TestResult to domain TestResult
 */
export function prismaToTestResult(prismaResult: {
  id: string;
  userId: string | null;
  testId: string | null;
  config: string;
  questions: string;
  answers: string;
  gradeResults: string;
  scoreCorrect: number;
  scoreTotal: number;
  startedAt: Date;
  submittedAt: Date;
  totalTimeSpentMs: number;
  pausedTimeMs: number;
  phases: string;
}): TestResult {
  return {
    id: prismaResult.id,
    userId: prismaResult.userId || undefined,
    testId: prismaResult.testId || undefined,
    config: JSON.parse(prismaResult.config),
    questions: JSON.parse(prismaResult.questions),
    answers: JSON.parse(prismaResult.answers),
    gradeResults: JSON.parse(prismaResult.gradeResults),
    score: {
      correct: prismaResult.scoreCorrect,
      total: prismaResult.scoreTotal,
    },
    startedAt: prismaResult.startedAt.getTime(),
    submittedAt: prismaResult.submittedAt.getTime(),
    totalTimeSpentMs: prismaResult.totalTimeSpentMs,
    pausedTimeMs: prismaResult.pausedTimeMs,
    phases: JSON.parse(prismaResult.phases),
  };
}

/**
 * Legacy functions for backward compatibility (using Prisma types)
 */
export function testResultToRow(result: TestResult): Omit<Prisma.TestResultCreateInput, 'questionAttempts'> {
  return {
    userId: result.userId,
    testId: result.testId,
    config: JSON.stringify(result.config),
    questions: JSON.stringify(result.questions),
    answers: JSON.stringify(result.answers),
    gradeResults: JSON.stringify(result.gradeResults),
    scoreCorrect: result.score.correct,
    scoreTotal: result.score.total,
    startedAt: new Date(result.startedAt),
    submittedAt: new Date(result.submittedAt),
    totalTimeSpentMs: result.totalTimeSpentMs,
    pausedTimeMs: result.pausedTimeMs,
    phases: JSON.stringify(result.phases),
  };
}

export function rowToTestResult(row: {
  id: string;
  testId: string | null;
  config: string;
  questions: string;
  answers: string;
  gradeResults: string;
  scoreCorrect: number;
  scoreTotal: number;
  startedAt: Date;
  submittedAt: Date;
  totalTimeSpentMs: number;
  pausedTimeMs: number;
  phases: string;
}): TestResult {
  return prismaToTestResult(row);
}
