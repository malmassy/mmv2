// app/lib/engine/subtypes/conversion/litersToM3.ts
import type { QuestionSubtype, Question, GradeOptions } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { parseQuantityLoose } from '../../utils/units';
import { looksLikeScientificNotation, countSigFigs } from '../../utils/answerFormat';
import { makeId } from '../../utils/id';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

// Quantize to at most 3 decimals, and use the display string as the source of truth
function quantizeMax3Decimals(x: number) {
  // up to 3 decimals, but avoid trailing junk like "1.230"
  const fixed = x.toFixed(3);
  const trimmed = fixed.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
  const value = Number(trimmed);
  return { value, display: trimmed };
}

function roundStable(x: number) {
  return Number(x.toPrecision(12));
}
function formatNice(x: number) {
  return Number(x.toPrecision(12)).toString();
}

type LitVariant = {
  label: string;      // e.g. 'L', 'cL', 'mL'
  factorToL: number;  // multiply by this to convert to liters
};

const LITERS: LitVariant[] = [
  { label: 'mL', factorToL: 1e-3 },
  { label: 'cL', factorToL: 1e-2 },
  { label: 'dL', factorToL: 1e-1 },
  { label: 'L', factorToL: 1 },
  { label: 'kL', factorToL: 1e3 },
];

function hasM3Unit(raw: string): boolean {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  return /m\^?3$/.test(s) || /m³$/.test(raw.trim());
}

export const litersToM3: QuestionSubtype = {
  id: 'conversion.litersToM3',
  parentType: 'conversion',
  label: 'Liters ↔ cubic meters',
  conversionType: 'ratio',

  generate: () => {
    const from = pick(LITERS);
    const direction = Math.random() < 0.5 ? 'L_TO_M3' : 'M3_TO_L';

    if (direction === 'L_TO_M3') {
      // Generate a clean displayed value with <= 3 decimals
      const raw = randInt(10, 900) / randInt(1, 7);
      const qv = quantizeMax3Decimals(raw);
      const value = qv.value;
      const valueDisplay = qv.display;

      const requiredSigFigs = countSigFigs(valueDisplay) ?? 3;

      // Compute from the quantized value (the one shown to the student)
      const liters = value * from.factorToL;
      const correct_m3 = roundStable(liters * 1e-3);

      const q: Question = {
        id: `conversion.litersToM3.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.litersToM3',
        prompt: `Convert ${valueDisplay} ${from.label} to m³.`,
        meta: { direction, value, valueDisplay, from: from.label, correct: correct_m3, requiredSigFigs },
        createdAtMs: Date.now(),
      };
      return q;
    } else {
      // m³ → L (also limit to <= 3 decimals in the prompt)
      const raw = randInt(1, 900) / randInt(10, 70);
      const qv = quantizeMax3Decimals(raw);
      const value_m3 = qv.value;
      const valueDisplay = qv.display;

      const requiredSigFigs = countSigFigs(valueDisplay) ?? 3;

      const correct_L = roundStable(value_m3 * 1000);

      const q: Question = {
        id: `conversion.litersToM3.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.litersToM3',
        prompt: `Convert ${valueDisplay} m³ to liters (L).`,
        meta: { direction, value_m3, valueDisplay, correct: correct_L, requiredSigFigs },
        createdAtMs: Date.now(),
      };
      return q;
    }
  },

  grade: (q, submittedAnswer, opts: GradeOptions = {}) => {
    if (opts.requireScientificNotation && !looksLikeScientificNotation(submittedAnswer)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Please answer in scientific notation (e.g., 1.2e-3 or 1.2 × 10^-3).',
      };
    }

    if (opts.enforceSigFigs) {
      const required = q.meta.requiredSigFigs as number | undefined;
      if (required) {
        const got = countSigFigs(submittedAnswer);
        if (got === null) {
          return {
            isCorrect: false,
            score: 0,
            feedback:
              'Sig figs are being enforced, but I could not determine the sig figs in your answer. Try 2.17e-1 or 2.17 × 10^-1.',
          };
        }
        if (got !== required) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Sig figs: expected ${required}, but your answer has ${got}.`,
          };
        }
      }
    }

    const n = parseNumberLoose(submittedAnswer);
    const correct = q.meta.correct as number;

    if (n === null) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'I could not parse your answer as a number.',
        correctAnswerDisplay: formatNice(correct),
      };
    }

    // Unit support:
    // - If they include m3/m^3/m³, accept for m³ answers
    // - If they include L/mL/cL/dL/kL, accept for liter answers
    const direction = q.meta.direction as string;

    if (direction === 'L_TO_M3') {
      // expected cubic meters
      if (/[a-zA-Zµ³^]/.test(submittedAnswer)) {
        if (!hasM3Unit(submittedAnswer)) {
          // If they included some unit text but it's not m^3-ish, nudge them
          // (Still allow unitless numeric answers)
          // We won't hard-fail here to avoid false negatives.
        }
      }
    } else {
      // expected liters (L family)
      const parsed = parseQuantityLoose(submittedAnswer, n);
      if (parsed.unitRaw && parsed.baseUnit && parsed.baseUnit !== 'L') {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units look off. This question asks for liters (L).`,
          correctAnswerDisplay: `${formatNice(correct)} L`,
        };
      }
    }

    const ok = withinTolerance(n, correct, { rel: 1e-9, abs: 1e-10 });
    return {
      isCorrect: ok,
      score: ok ? 1 : 0,
      feedback: ok ? 'Correct!' : `Not quite. Correct value is ${formatNice(correct)}.`,
      correctAnswerDisplay: direction === 'L_TO_M3' ? `${formatNice(correct)} m³` : `${formatNice(correct)} L`,
    };
  },
};
