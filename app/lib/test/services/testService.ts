// Test service layer for business logic

import type { Question, GradeResult, GradeOptions } from '../../engine/types';
import type { TestSetupConfig } from '../../../test/test-config';
import type { TestResult, TestAnswer, QuestionAttempt } from '../types';
import { SUBTYPE_BY_ID } from '../../engine/registry';

/**
 * Grade all questions in a test
 */
export function gradeTest(
  questions: Question[],
  answers: Record<string, string>,
  options: GradeOptions = {}
): {
  gradeById: Record<string, GradeResult>;
  score: { correct: number; total: number };
} {
  const gradeOpts: GradeOptions = {
    enforceSigFigs: true,
    enforceUnits: true,
    ...options,
  };

  const byId: Record<string, GradeResult> = {};
  let totalPoints = 0;

  for (const q of questions) {
    const raw = (answers[q.id] ?? '').trim();
    const st = SUBTYPE_BY_ID[q.subtype];
    if (!st) {
      console.error(`[testService] Unknown subtype: ${q.subtype}`);
      continue;
    }
    
    const res = st.grade(q, raw, gradeOpts);
    byId[q.id] = res;
    
    // For estimation questions, use points (score * 5, where score is 0-1)
    // For other questions, use isCorrect (0 or 1)
    if (q.parentType === 'estimation') {
      totalPoints += res.score * 5; // Convert normalized score back to points (0-5)
    } else {
      totalPoints += res.isCorrect ? 1 : 0;
    }
  }

  // Calculate total possible points
  // Estimation questions: count * 5 points each
  // Other questions: count * 1 point each
  const estimationCount = questions.filter(q => q.parentType === 'estimation').length;
  const otherCount = questions.length - estimationCount;
  const totalPossible = estimationCount * 5 + otherCount;

  return {
    gradeById: byId,
    score: { correct: totalPoints, total: totalPossible },
  };
}

/**
 * Convert answers to TestAnswer format with phase information
 */
export function convertAnswersToTestAnswers(
  questions: Question[],
  answers: Record<string, string>,
  phase: 'estimation' | 'conversion' | 'measurement',
  timeSpentMs?: Record<string, number>
): TestAnswer[] {
  const testAnswers: TestAnswer[] = [];
  
  questions.forEach((q, index) => {
    if (q.parentType === phase) {
      testAnswers.push({
        questionId: q.id,
        submittedAnswer: answers[q.id] || '',
        timeSpentMs: timeSpentMs?.[q.id],
        phase,
        questionIndex: index,
      });
    }
  });
  
  return testAnswers;
}

/**
 * Create a TestResult from session data
 */
export function createTestResult(
  config: TestSetupConfig,
  questions: Question[],
  answers: Record<string, string>,
  gradeResults: Record<string, GradeResult>,
  startedAt: number,
  submittedAt: number,
  totalTimeSpentMs: number,
  pausedTimeMs: number,
  estimationState?: {
    currentQuestionIndex: number;
    expiredQuestionIndices: Set<number>;
    calibrationCompleted: boolean;
  }
): TestResult {
  const score = {
    correct: Object.values(gradeResults).filter(r => r.isCorrect).length,
    total: questions.length,
  };

  // Group questions by phase
  const estimationQuestions = questions.filter(q => q.parentType === 'estimation');
  const conversionQuestions = questions.filter(q => q.parentType === 'conversion');
  const measurementQuestions = questions.filter(q => q.parentType === 'measurement');

  // Convert answers to TestAnswer format
  const testAnswers: TestAnswer[] = [];
  
  estimationQuestions.forEach((q, idx) => {
    testAnswers.push({
      questionId: q.id,
      submittedAnswer: answers[q.id] || '',
      phase: 'estimation',
      questionIndex: idx,
    });
  });
  
  conversionQuestions.forEach((q, idx) => {
    testAnswers.push({
      questionId: q.id,
      submittedAnswer: answers[q.id] || '',
      phase: 'conversion',
      questionIndex: idx,
    });
  });
  
  measurementQuestions.forEach((q, idx) => {
    testAnswers.push({
      questionId: q.id,
      submittedAnswer: answers[q.id] || '',
      phase: 'measurement',
      questionIndex: idx,
    });
  });

  return {
    config,
    questions,
    answers: testAnswers,
    gradeResults,
    score,
    startedAt,
    submittedAt,
    totalTimeSpentMs,
    pausedTimeMs,
    phases: {
      ...(estimationQuestions.length > 0 && {
        estimation: {
          questionIndices: estimationQuestions.map((_, idx) => idx),
          timePerQuestionSeconds: config.estimation?.timePerQuestionSeconds || 60,
          calibrationCompleted: estimationState?.calibrationCompleted || false,
        },
      }),
      ...(conversionQuestions.length > 0 && {
        conversion: {
          timeSeconds: config.timeSeconds,
        },
      }),
      ...(measurementQuestions.length > 0 && {
        measurement: {},
      }),
    },
  };
}

/**
 * Convert TestResult to QuestionAttempt array for analytics
 */
export function testResultToAttempts(
  result: TestResult,
  timeSpentByQuestion?: Record<string, number>
): QuestionAttempt[] {
  return result.answers.map(answer => {
    const question = result.questions.find(q => q.id === answer.questionId);
    if (!question) {
      throw new Error(`Question not found: ${answer.questionId}`);
    }
    
    const gradeResult = result.gradeResults[answer.questionId];
    
    return {
      questionId: answer.questionId,
      subtype: question.subtype,
      parentType: question.parentType,
      submittedAnswer: answer.submittedAnswer,
      isCorrect: gradeResult.isCorrect,
      score: gradeResult.score,
      timeSpentMs: answer.timeSpentMs || timeSpentByQuestion?.[answer.questionId] || 0,
      phase: answer.phase,
      createdAt: result.submittedAt,
    };
  });
}
