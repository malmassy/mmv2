# Prisma Setup Guide

Prisma has been successfully installed and initialized for the test tracking system.

## What's Been Set Up

1. ✅ Prisma packages installed (`@prisma/client` and `prisma`)
2. ✅ Database schema created (`prisma/schema.prisma`)
3. ✅ Initial migration created and applied
4. ✅ Prisma Client generated
5. ✅ Database connection singleton created (`app/lib/db/prisma.ts`)
6. ✅ API routes updated to use Prisma
7. ✅ Database mappers updated for Prisma types

## Environment Setup

**Important:** You need to create a `.env` file in the root directory with:

```env
DATABASE_URL="file:./prisma/dev.db"
```

For production with PostgreSQL, use:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mmv2?schema=public"
```

## Database Schema

The database includes two main tables:

### `test_results`
- Stores complete test results
- Includes JSON fields for config, questions, answers, and grade results
- Tracks timing and scoring information

### `question_attempts`
- Stores individual question attempts for analytics
- Linked to test results via foreign key
- Includes indexes for efficient querying

## Available Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Push schema changes without migrations (dev only)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Usage

### Saving Test Results

The API route `/api/tests` (POST) is ready to save test results. The test session component can call it after submission.

### Retrieving Test Results

Use `/api/tests?id=<test-id>` (GET) to retrieve a test result by ID.

### Analytics

Use the analytics service in `app/lib/test/services/analytics.ts`:
- `getTestStatistics()` - Get aggregate statistics
- `getQuestionDifficultyStats()` - Get question difficulty by subtype
- `getRecentTestResults()` - Get recent test results

## Next Steps

1. Create `.env` file with `DATABASE_URL`
2. Update test session to save results on submit (see TODO in `test-session.tsx`)
3. Optionally create analytics dashboard using the analytics service
4. For production, switch to PostgreSQL by updating `prisma/schema.prisma` and running migrations

## Switching to PostgreSQL

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env` with PostgreSQL connection string

3. Run migration:
   ```bash
   npm run db:migrate
   ```

## Database Location

- **SQLite (dev)**: `prisma/dev.db`
- **PostgreSQL (prod)**: Configure via `DATABASE_URL`

The database file is already in `.gitignore` and won't be committed.
