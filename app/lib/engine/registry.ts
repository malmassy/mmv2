import type { QuestionSubtype } from './types';

import { basic } from './subtypes/conversion/basic';
import { density } from './subtypes/conversion/density';
import { litersToM3 } from './subtypes/conversion/litersToM3';
import { celsiusKelvin } from './subtypes/conversion/celsiusKelvin';
import { velocity } from './subtypes/conversion/velocity';

export const SUBTYPES: QuestionSubtype[] = [
  basic,
  density,
  litersToM3,
  celsiusKelvin,
  velocity,
];

export const SUBTYPE_BY_ID = Object.fromEntries(
  SUBTYPES.map((s) => [s.id, s]),
) as Record<string, QuestionSubtype>;

// Validate that all subtypes have required properties
if (typeof window === 'undefined') {
  // Server-side: validate during build
  for (const subtype of SUBTYPES) {
    if (!subtype.id || !subtype.generate || !subtype.grade) {
      console.error('[Registry] Invalid subtype:', subtype);
    }
  }
}

export function listSubtypes() {
  return SUBTYPES;
}
