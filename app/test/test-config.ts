// app/lib/engine/testConfig.ts

export type SubtypeCounts = Record<string, number | null>; 
// number = fixed count, null = random/default for that subtype

export type TestSetupConfig = {
  countsBySubtypeId: SubtypeCounts;
  timeSeconds: number;        // total time allotted (for conversion questions)
  testId?: string;            // optional, for later
  estimation?: {
    enabled: boolean;
    questionCount: number;
    timePerQuestionSeconds: number;  // time per question for estimation
  };
};

export const DEFAULT_TEST_SECONDS = 15 * 60; // 15 minutes

export function encodeConfig(cfg: TestSetupConfig): string {
  // URL-safe base64 of JSON
  const json = JSON.stringify(cfg);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeConfig(encoded: string): TestSetupConfig | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed as TestSetupConfig;
  } catch {
    return null;
  }
}
