// app/lib/engine/subtypes/conversion/basic.ts
import type { GradeOptions, Question, QuestionSubtype } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { looksLikeScientificNotation, countSigFigs, normalizeUnit } from '../../utils/answerFormat';
import { parseMetricUnit, parseQuantityLoose } from '../../utils/units';
import { makeId } from '../../utils/id';

type UnitDef = { name: string; label: string };
import { PREFIXES } from '../../utils/prefixes';

type PrefixDef = { symbol: string; factor: number };

const BASE_UNITS_LIST: UnitDef[] = [
  { name: 'm', label: 'meters' },
  { name: 'g', label: 'grams' },
  { name: 'L', label: 'liters' },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function quantizeForDisplay(x: number) {
  const abs = Math.abs(x);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const display = x.toFixed(decimals);
  const value = Number(display);
  return { value, display, decimals };
}

function roundStable(x: number) {
  return Number(x.toPrecision(12));
}

function formatNice(x: number) {
  return Number(x.toPrecision(12)).toString();
}

function powStable(base: number, exp: number) {
  // exp will be 1/2/3, but keep it explicit and stable.
  if (exp === 1) return base;
  if (exp === 2) return base * base;
  if (exp === 3) return base * base * base;
  return Math.pow(base, exp);
}

function toSuperscript(power: number) {
  if (power === 2) return '²';
  if (power === 3) return '³';
  return '';
}

function formatUnitWithPower(unitNoPower: string, power: number) {
  return `${unitNoPower}${toSuperscript(power)}`;
}

function stripAndParsePower(raw: string): { unitNoPower: string; power: number } {
  // Supports: cm², cm³, cm^2, cm^3, cm2, cm3 (at the very end)
  const s = (raw ?? '').trim();

  // Unicode superscripts
  if (s.endsWith('²')) return { unitNoPower: s.slice(0, -1), power: 2 };
  if (s.endsWith('³')) return { unitNoPower: s.slice(0, -1), power: 3 };

  // Caret form
  const caret = s.match(/^(.*)\^([23])$/);
  if (caret) return { unitNoPower: caret[1], power: Number(caret[2]) };

  // Trailing digit form (only 2 or 3)
  const digit = s.match(/^(.*?)([23])$/);
  if (digit) return { unitNoPower: digit[1], power: Number(digit[2]) };

  return { unitNoPower: s, power: 1 };
}

type MetricUnitPowInfo = {
  baseUnit: string;
  factorToBasePow: number; // (factorToBase_linear) ^ power
  power: number;
};

function parseMetricUnitWithPower(unitStr: string): MetricUnitPowInfo | null {
  const { unitNoPower, power } = stripAndParsePower(unitStr);
  const info = parseMetricUnit(unitNoPower);
  if (!info) return null;
  return {
    baseUnit: info.baseUnit,
    factorToBasePow: powStable(info.factorToBase, power),
    power,
  };
}

export const basic: QuestionSubtype = {
  id: 'conversion.basic',
  parentType: 'conversion',
  label: 'Basic metric conversion',
  conversionType: 'ratio',

  generate: () => {
    const unit = pick(BASE_UNITS_LIST);

    // Only meters get squared/cubed here (area/volume). Others stay linear.
    const power = unit.name === 'm' ? pick([1, 2, 3]) : 1;

    let fromP = pick(PREFIXES);
    let toP = pick(PREFIXES);
    while (fromP.symbol === toP.symbol) toP = pick(PREFIXES);

    const fromUnitNoPow = `${fromP.symbol}${unit.name}`; // e.g., cm
    const toUnitNoPow = `${toP.symbol}${unit.name}`; // e.g., m

    const fromUnitDisplay = formatUnitWithPower(fromUnitNoPow, power); // e.g., cm²
    const toUnitDisplay = formatUnitWithPower(toUnitNoPow, power); // e.g., m²

    const magnitude = randInt(12, 950);
    const raw = magnitude / randInt(1, 5);

    const qv = quantizeForDisplay(raw);
    const valueFrom = qv.value;
    const valueFromDisplay = qv.display;

    // Conversion: valueFrom * (from/to)^power
    const ratio = fromP.factor / toP.factor;
    const correctRaw = valueFrom * powStable(ratio, power);
    const correct = roundStable(correctRaw);

    const requiredSigFigs = countSigFigs(valueFromDisplay) ?? 3;

    // Calculate exponents for the algorithm widget
    // Question value exponent: the exponent when valueFrom is written in scientific notation
    // e.g., 5.2 → 0, 520 → 2, 0.052 → -2
    const questionValueExponent = valueFrom === 0 ? 0 : Math.floor(Math.log10(Math.abs(valueFrom)));
    // Final exponent: the exponent when correct answer is written in scientific notation
    const finalExponent = correct === 0 ? 0 : Math.floor(Math.log10(Math.abs(correct)));

    const q: Question = {
      id: `conversion.basic.${makeId('q')}`,
      parentType: 'conversion',
      subtype: 'conversion.basic',
      prompt: `Convert ${valueFromDisplay} ${fromUnitDisplay} to ${toUnitDisplay}.`,
      meta: {
        valueFrom,
        valueFromDisplay,
        fromUnit: fromUnitDisplay, // now includes ²/³ when needed
        toUnit: toUnitDisplay, // now includes ²/³ when needed
        correct,
        requiredSigFigs,
        power,
        fromPrefixExponent: fromP.exponent,
        toPrefixExponent: toP.exponent,
        questionValueExponent,
        finalExponent,
      },
      createdAtMs: Date.now(),
    };

    return q;
  },

  grade: (q, submittedAnswer, opts: GradeOptions = {}) => {
    // 1) Optional format enforcement
    if (opts.requireScientificNotation && !looksLikeScientificNotation(submittedAnswer)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Please answer in scientific notation (e.g., 1.2e3 or 1.2 × 10^3).',
        correctAnswerDisplay: `${formatNice(q.meta.correct as number)} ${q.meta.toUnit as string}`,
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
              'Sig figs are being enforced, but I could not determine the sig figs in your answer. Try standard or scientific notation like 2.17e-1.',
            correctAnswerDisplay: `${formatNice(q.meta.correct as number)} ${q.meta.toUnit as string}`,
          };
        }

        if (got !== required) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Sig figs: expected ${required}, but your answer has ${got}.`,
            correctAnswerDisplay: `${formatNice(q.meta.correct as number)} ${q.meta.toUnit as string}`,
          };
        }
      }
    }

    // 2) Parse numeric portion
    const n = parseNumberLoose(submittedAnswer);
    if (n === null) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'I could not parse your answer as a number (try 12.3, 1.23e4, or 1.23 × 10^4).',
        correctAnswerDisplay: `${formatNice(q.meta.correct as number)} ${q.meta.toUnit as string}`,
      };
    }

    const targetUnit = q.meta.toUnit as string;
    const correct = q.meta.correct as number;
    const correctNice = formatNice(correct);

    const targetInfo = parseMetricUnitWithPower(targetUnit);
    if (!targetInfo) {
      // Should never happen, but don't crash grading.
      const ok = withinTolerance(n, correct, { rel: 1e-9, abs: 1e-10 });
      return {
        isCorrect: ok,
        score: ok ? 1 : 0,
        feedback: ok ? 'Correct!' : `Not quite. Correct value is ${correctNice} ${targetUnit}.`,
        correctAnswerDisplay: `${correctNice} ${targetUnit}`,
      };
    }

    // 3) Unit check: if enforceUnits is true, require units. Otherwise, do soft check if units are provided.
    // We still use parseQuantityLoose to detect whether the student included units,
    // but we DO NOT trust its valueInBase for squared/cubed units—so we recompute.
    const parsed = parseQuantityLoose(submittedAnswer, n);

    if (opts.enforceUnits) {
      // Strict unit enforcement: require units
      if (!parsed.unitRaw || parsed.unitRaw.trim() === '') {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units are required. This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${correctNice} ${targetUnit}`,
        };
      }
    }

    // 4) If units are provided and recognized, convert student answer into the TARGET unit.
    //    If no units provided, assume numeric is already in the target unit.
    let submittedInTarget = n;

    if (parsed.unitRaw) {
      const studentInfo = parseMetricUnitWithPower(parsed.unitRaw);
      if (!studentInfo) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `I couldn't understand the unit "${parsed.unitRaw}". This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${correctNice} ${targetUnit}`,
        };
      }

      // Base unit must match (e.g., both meters-based), and power must match (² vs ³ vs linear).
      if (studentInfo.baseUnit !== targetInfo.baseUnit || studentInfo.power !== targetInfo.power) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units look off. This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${correctNice} ${targetUnit}`,
        };
      }

      // Convert: student value → base^power → target unit
      const valueInBasePow = n * studentInfo.factorToBasePow;
      submittedInTarget = valueInBasePow / targetInfo.factorToBasePow;

      // When enforceUnits is true, also check that units match exactly (normalized)
      if (opts.enforceUnits) {
        const normalizedStudentUnit = normalizeUnit(parsed.unitRaw);
        const normalizedTargetUnit = normalizeUnit(targetUnit);
        if (normalizedStudentUnit !== normalizedTargetUnit) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Units must match exactly. This question asks for ${targetUnit}, but you provided ${parsed.unitRaw}.`,
            correctAnswerDisplay: `${correctNice} ${targetUnit}`,
          };
        }
      }
    } else if (opts.enforceUnits) {
      // If enforceUnits is true and no units were provided, we should have caught this above,
      // but add this as a safety check
      return {
        isCorrect: false,
        score: 0,
        feedback: `Units are required. This question asks for ${targetUnit}.`,
        correctAnswerDisplay: `${correctNice} ${targetUnit}`,
      };
    }

    // 5) Grade numeric equivalence
    const ok = withinTolerance(submittedInTarget, correct, { rel: 1e-9, abs: 1e-10 });

    return {
      isCorrect: ok,
      score: ok ? 1 : 0,
      feedback: ok ? 'Correct!' : `Not quite. Correct value is ${correctNice} ${targetUnit}.`,
      correctAnswerDisplay: `${correctNice} ${targetUnit}`,
    };
  },
};
