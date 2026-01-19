# Test Module Refactor

This module contains the refactored test system, prepared for database integration.

## Structure

### Types (`types.ts`)
- `TestResult`: Complete test result ready for database storage
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

#### `formatting.ts`
Shared formatting functions:
- `formatMMSS`: Time formatting
- `formatCorrectAnswerWithScientific`: Answer display formatting
- `toSuperscript`, `formatWithCommas`, `formatScientificNotation`: Number formatting

### Database

#### `schema.ts`
Database schema types:
- `TestResultRow`: Database representation of test results
- `QuestionAttemptRow`: Database representation of question attempts
- `TestStatisticsRow`: Aggregated statistics

#### `mapper.ts`
Conversion between domain types and database types:
- `testResultToRow` / `rowToTestResult`
- `questionAttemptToRow` / `rowToQuestionAttempt`

## API Routes

### `/api/tests`
- `POST`: Save a test result
- `GET`: Retrieve a test result by ID

## Usage

### In Components
```typescript
import { gradeTest, generateTestQuestions } from '@/app/lib/test';
import { formatMMSS } from '@/app/lib/test/utils/formatting';
```

### Saving to Database
```typescript
import { createTestResult } from '@/app/lib/test';
import { testResultToRow } from '@/app/lib/test/db/mapper';

const testResult = createTestResult(...);
const row = testResultToRow(testResult);
// Save row to database
```

## Next Steps

1. Implement actual database connection (PostgreSQL, MySQL, etc.)
2. Add authentication/user tracking
3. Implement analytics endpoints
4. Add test result retrieval and display
5. Add statistics aggregation
