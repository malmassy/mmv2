// Test question generation service

import type { Question } from '../../engine/types';
import type { TestSetupConfig } from '../../../test/test-config';
import { listSubtypes, SUBTYPE_BY_ID } from '../../engine/registry';

const DEFAULT_TEST_QUESTION_COUNT = 5;
const MAX_TEST_QUESTION_COUNT = 5;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate questions for a test based on configuration
 */
export function generateTestQuestions(config: TestSetupConfig): {
  estimation: Question[];
  conversion: Question[];
  measurement: Question[];
} {
  const subtypes = listSubtypes();
  
  const estimationQs: Question[] = [];
  const conversionQs: Question[] = [];
  const measurementQs: Question[] = [];
  
  // Filter subtypes by parentType
  const conversionSubtypes = subtypes.filter(s => s.parentType === 'conversion');
  const estimationSubtypes = subtypes.filter(s => s.parentType === 'estimation');
  const measurementSubtypes = subtypes.filter(s => s.parentType === 'measurement');

  // Generate conversion questions
  const counts: Record<string, number> = {};
  let totalNeeded = 0;
  const subtypeTargets: Array<{ id: string; count: number }> = [];
  
  for (const [subtypeId, count] of Object.entries(config.countsBySubtypeId)) {
    const st = SUBTYPE_BY_ID[subtypeId];
    if (st && st.parentType === 'conversion' && count !== null && count > 0) {
      subtypeTargets.push({ id: subtypeId, count });
      totalNeeded += count;
    }
  }

  if (totalNeeded === 0) {
    totalNeeded = DEFAULT_TEST_QUESTION_COUNT;
  }

  if (totalNeeded > MAX_TEST_QUESTION_COUNT) {
    const scaleFactor = MAX_TEST_QUESTION_COUNT / totalNeeded;
    let cappedTotal = 0;
    
    for (const target of subtypeTargets) {
      target.count = Math.floor(target.count * scaleFactor);
      cappedTotal += target.count;
    }
    
    let remaining = MAX_TEST_QUESTION_COUNT - cappedTotal;
    let index = 0;
    while (remaining > 0 && index < subtypeTargets.length) {
      const originalCount = config.countsBySubtypeId[subtypeTargets[index].id];
      if (originalCount !== null && originalCount > 0) {
        subtypeTargets[index].count += 1;
        cappedTotal += 1;
        remaining -= 1;
      }
      index = (index + 1) % subtypeTargets.length;
    }
    
    totalNeeded = MAX_TEST_QUESTION_COUNT;
  }

  // Generate conversion questions
  for (const { id: subtypeId, count } of subtypeTargets) {
    if (conversionQs.length >= MAX_TEST_QUESTION_COUNT) break;
    
    const st = SUBTYPE_BY_ID[subtypeId];
    if (!st) continue;
    
    try {
      for (let i = 0; i < count && conversionQs.length < MAX_TEST_QUESTION_COUNT; i++) {
        const q = st.generate();
        conversionQs.push(q);
        counts[subtypeId] = (counts[subtypeId] ?? 0) + 1;
      }
    } catch (error) {
      console.error('[testGenerator] Error generating conversion question:', subtypeId, error);
    }
  }

  // Fill remaining slots with random conversion subtypes
  const actualTotalNeeded = Math.min(totalNeeded, MAX_TEST_QUESTION_COUNT);
  let attempts = 0;
  
  while (conversionQs.length < actualTotalNeeded && attempts < 500) {
    attempts++;
    
    const availableSubtypes = conversionSubtypes.filter((s) => {
      const targetCount = config.countsBySubtypeId[s.id];
      if (targetCount === null) return true;
      const currentCount = counts[s.id] ?? 0;
      return currentCount < targetCount;
    });

    if (availableSubtypes.length === 0) break;

    const chosen = availableSubtypes[randInt(0, availableSubtypes.length - 1)];
    const st = SUBTYPE_BY_ID[chosen.id];
    if (!st) continue;

    try {
      const q = st.generate();
      conversionQs.push(q);
      counts[chosen.id] = (counts[chosen.id] ?? 0) + 1;
    } catch (error) {
      console.error('[testGenerator] Error generating conversion question:', chosen.id, error);
    }
  }

  // Generate estimation questions if enabled
  if (config.estimation?.enabled && estimationSubtypes.length > 0) {
    const estimationCount = config.estimation.questionCount || 1;
    for (let i = 0; i < estimationCount; i++) {
      const chosen = estimationSubtypes[randInt(0, estimationSubtypes.length - 1)];
      const st = SUBTYPE_BY_ID[chosen.id];
      if (st) {
        try {
          const q = st.generate();
          estimationQs.push(q);
        } catch (error) {
          console.error('[testGenerator] Error generating estimation question:', chosen.id, error);
        }
      }
    }
  }

  // Generate measurement questions (if needed in future)
  // Similar pattern to estimation questions

  return {
    estimation: estimationQs,
    conversion: conversionQs,
    measurement: measurementQs,
  };
}
