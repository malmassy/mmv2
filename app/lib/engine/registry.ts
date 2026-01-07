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

export function listSubtypes() {
  return SUBTYPES;
}
