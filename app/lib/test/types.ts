// Test result types

import type { Question, GradeResult } from '../engine/types';
import type { TestSetupConfig } from '../../test/test-config';

/**
 * Represents a single answer to a question
 */
export type TestAnswer = {
  questionId: string;
  submittedAnswer: string;
  timeSpentMs?: number;
  phase: 'estimation' | 'conversion' | 'measurement';
  questionIndex: number;
};

/**
 * Complete test result
 */
export type TestResult = {
  id?: string; // Optional identifier
  testId?: string; // Optional test identifier
  config: TestSetupConfig;
  questions: Question[];
  answers: TestAnswer[];
  gradeResults: Record<string, GradeResult>;
  score: {
    correct: number;
    total: number;
  };
  startedAt: number;
  submittedAt: number;
  totalTimeSpentMs: number;
  pausedTimeMs: number;
  phases: {
    estimation?: {
      questionIndices: number[];
      timePerQuestionSeconds: number;
      calibrationCompleted: boolean;
    };
    conversion?: {
      timeSeconds: number;
    };
    measurement?: {};
  };
};

/**
 * Test session state (client-side only, not stored in DB)
 */
export type TestSessionState = {
  startedAt: number;
  questions: Question[];
  answers: Record<string, string>; // questionId -> raw input
  submitted: boolean;
  score: { correct: number; total: number } | null;
  showResults: boolean;
  gradeById: Record<string, GradeResult>;
  testId?: string;
  savedCode?: string;
  currentPhase: 'estimation' | 'conversion' | 'measurement' | 'results';
  pausedTimeMs: number;
  estimationState?: {
    currentQuestionIndex: number;
    expiredQuestionIndices: Set<number>;
    calibrationCompleted: boolean;
    showCalibrationPrompt: boolean;
  };
};

/**
 * Test attempt for a single question (for analytics)
 */
export type QuestionAttempt = {
  questionId: string;
  subtype: string;
  parentType: 'estimation' | 'conversion' | 'measurement';
  submittedAnswer: string;
  isCorrect: boolean;
  score: number; // 0..1
  timeSpentMs: number;
  phase: 'estimation' | 'conversion' | 'measurement';
  createdAt: number;
};
