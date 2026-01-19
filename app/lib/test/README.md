# Test Module

This module contains the test system for generating, grading, and managing test questions.

## Structure

### Types (`types.ts`)
- `TestResult`: Complete test result
- `TestAnswer`: Single answer to a question
- `TestSessionState`: Client-side only state
- `QuestionAttempt`: Individual question attempt for analytics

### Services

#### `testService.ts`
Business logic for:
- Grading tests (`gradeTest`)
- Converting answers to test format (`convertAnswersToTestAnswers`)
- Creating test results (`createTestResult`)
- Converting to attempts for analytics (`testResultToAttempts`)

#### `testGenerator.ts`
Question generation:
- `generateTestQuestions`: Generates questions based on config, separated by phase

### Utilities

#### `formatting.tsx`
Shared formatting functions:
- `formatMMSS`: Time formatting
- `formatCorrectAnswerWithScientific`: Answer display formatting
- `toSuperscript`, `formatWithCommas`, `formatScientificNotation`: Number formatting

## Usage

### In Components
```typescript
import { gradeTest, generateTestQuestions } from '@/app/lib/test';
import { formatMMSS } from '@/app/lib/test/utils/formatting';
```

### Creating Test Results
```typescript
import { createTestResult } from '@/app/lib/test';

const testResult = createTestResult(
  config,
  questions,
  answers,
  gradeResults,
  startedAt,
  submittedAt,
  totalTimeSpentMs,
  pausedTimeMs
);
```
