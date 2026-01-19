// Database schema types for test results
// This will be used when implementing the actual database

/**
 * Database representation of a test result
 */
export type TestResultRow = {
  id: string;
  test_id?: string;
  config: string; // JSON string of TestSetupConfig
  questions: string; // JSON string of Question[]
  answers: string; // JSON string of TestAnswer[]
  grade_results: string; // JSON string of Record<string, GradeResult>
  score_correct: number;
  score_total: number;
  started_at: Date;
  submitted_at: Date;
  total_time_spent_ms: number;
  paused_time_ms: number;
  phases: string; // JSON string of phases
  created_at: Date;
  updated_at: Date;
};

/**
 * Database representation of a question attempt (for analytics)
 */
export type QuestionAttemptRow = {
  id: string;
  test_result_id: string;
  question_id: string;
  subtype: string;
  parent_type: 'estimation' | 'conversion' | 'measurement';
  submitted_answer: string;
  is_correct: boolean;
  score: number;
  time_spent_ms: number;
  phase: 'estimation' | 'conversion' | 'measurement';
  created_at: Date;
};

/**
 * Database representation of test statistics (aggregated)
 */
export type TestStatisticsRow = {
  test_id?: string;
  total_tests: number;
  average_score: number;
  total_questions: number;
  correct_questions: number;
  average_time_ms: number;
  created_at: Date;
};
