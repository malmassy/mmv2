import type { QuestionSubtype, Question, GradeOptions } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { looksLikeScientificNotation, countSigFigs } from '../../utils/answerFormat';
import { makeId } from '../../utils/id';
import { roundToSigFigsEven } from '../../utils/precision';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundStable(x: number) {
  return Number(x.toPrecision(12));
}

function formatNice(x: number) {
  return Number(x.toPrecision(12)).toString();
}

function roundToSigFigs(x: number, sig: number) {
  return roundToSigFigsEven(x, sig);
}

// Limit prompt numbers to <= 3 decimals (and grade from exactly what we show)
function quantizeMax3Decimals(x: number) {
  const fixed = x.toFixed(3);
  const trimmed = fixed.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
  return { value: Number(trimmed), display: trimmed };
}

type DensityVariant = {
  from: string;
  to: string;
  // multiply by factor to go from -> to
  factor: number;
};

// Exact relationships:
// 1 g/cm^3 = 1000 kg/m^3 (since 1 g = 1e-3 kg and 1 cm^3 = 1e-6 m^3 => (1e-3)/(1e-6)=1e3)
// 1 g/cm^3 = 1e6 mg/cm^3
// 1 g/cm^3 = 1e-3 kg/cm^3
// 1 g/cm^3 = 1e6 g/m^3
// 1 kg/m^3 = 1e-3 g/cm^3
// 1 kg/m^3 = 1e6 mg/m^3
// 1 mg/cm^3 = 1000 kg/m^3
const VARIANTS: DensityVariant[] = [
  { from: 'g/cm³', to: 'kg/m³', factor: 1000 },
  { from: 'kg/m³', to: 'g/cm³', factor: 1 / 1000 },
  { from: 'g/cm³', to: 'mg/cm³', factor: 1e6 },
  { from: 'mg/cm³', to: 'g/cm³', factor: 1e-6 },
  { from: 'g/cm³', to: 'kg/cm³', factor: 1e-3 },
  { from: 'kg/cm³', to: 'g/cm³', factor: 1e3 },
  { from: 'g/cm³', to: 'g/m³', factor: 1e6 },
  { from: 'g/m³', to: 'g/cm³', factor: 1e-6 },
  { from: 'kg/m³', to: 'mg/m³', factor: 1e6 },
  { from: 'mg/m³', to: 'kg/m³', factor: 1e-6 },
  { from: 'mg/cm³', to: 'kg/m³', factor: 1000 },
  { from: 'kg/m³', to: 'mg/cm³', factor: 1 / 1000 },
  { from: 'kg/cm³', to: 'g/m³', factor: 1e9 },
  { from: 'g/m³', to: 'kg/cm³', factor: 1e-9 },
];

function normalizeUnit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/³/g, '^3')
    .replace(/\/+/g, '/');
}

function detectDensityUnit(raw: string): string | null {
  const s = normalizeUnit(raw);
  // accept a few common ways students type these
  if (s.includes('g/cm^3') || s.includes('g/cm3')) return 'g/cm^3';
  if (s.includes('kg/m^3') || s.includes('kg/m3')) return 'kg/m^3';
  if (s.includes('mg/cm^3') || s.includes('mg/cm3')) return 'mg/cm^3';
  if (s.includes('mg/m^3') || s.includes('mg/m3')) return 'mg/m^3';
  if (s.includes('kg/cm^3') || s.includes('kg/cm3')) return 'kg/cm^3';
  if (s.includes('g/m^3') || s.includes('g/m3')) return 'g/m^3';
  return null;
}

export const density: QuestionSubtype = {
  id: 'conversion.density',
  parentType: 'conversion',
  label: 'Density unit conversion (e.g., g/cm³ ↔ kg/m³)',
  conversionType: 'ratio',

  generate: () => {
    const v = VARIANTS[randInt(0, VARIANTS.length - 1)];

    // Choose realistic-ish densities depending on unit
    // g/cm^3: ~0.2 to 25
    // kg/m^3: ~200 to 25000
    // mg/cm^3: ~200 to 25000
    // mg/m^3: ~200000 to 25000000
    // kg/cm^3: ~0.0002 to 0.025
    // g/m^3: ~200000 to 25000000
    let raw: number;
    if (v.from === 'kg/m^3' || v.from === 'mg/cm^3') {
      raw = randInt(200, 25000) / randInt(1, 10);
    } else if (v.from === 'mg/m^3' || v.from === 'g/m^3') {
      raw = randInt(200000, 25000000) / randInt(1, 10);
    } else if (v.from === 'kg/cm^3') {
      raw = randInt(2, 250) / randInt(10000, 100000); // gives ~0.0002 to 0.025
    } else {
      // g/cm^3, etc.
      raw = randInt(2, 250) / randInt(1, 10);
    }

    const qv = quantizeMax3Decimals(raw);
    const requiredSigFigs = countSigFigs(qv.display) ?? 3;

    const correctRaw = qv.value * v.factor; // exact factor
    const correctRounded = roundToSigFigs(correctRaw, requiredSigFigs);

    const q: Question = {
      id: `conversion.density.${makeId('q')}`,
      parentType: 'conversion',
      subtype: 'conversion.density',
      prompt: `Convert ${qv.display} ${v.from} to ${v.to}.`,
      meta: {
        from: v.from,
        to: v.to,
        givenDisplay: qv.display,
        givenValue: qv.value,
        factor: v.factor,
        requiredSigFigs,
        correct: roundStable(correctRounded),
      },
      createdAtMs: Date.now(),
    };

    return q;
  },

  grade: (q, submittedAnswer, opts: GradeOptions = {}) => {
    if (opts.requireScientificNotation && !looksLikeScientificNotation(submittedAnswer)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Please answer in scientific notation (e.g., 1.23e4).',
      };
    }

    const n = parseNumberLoose(submittedAnswer);
    const correct = q.meta.correct as number;
    const requiredSigFigs = q.meta.requiredSigFigs as number;
    const targetUnit = q.meta.to as string;

    if (n === null) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'I could not parse your answer as a number.',
        correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
      };
    }

    // Soft unit sanity check (only if they typed unit-ish text)
    const unitMatch = submittedAnswer.match(/[a-zA-Z/³²^0-9]+$/);
    if (unitMatch) {
      const detected = detectDensityUnit(unitMatch[0]);
      // Normalize both detected and target for comparison
      const normalizedDetected = detected ? normalizeUnit(detected) : null;
      const normalizedTarget = normalizeUnit(targetUnit);
      
      if (normalizedDetected && normalizedDetected !== normalizedTarget) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units look off. This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
        };
      }
    }

    if (opts.enforceSigFigs) {
      const got = countSigFigs(submittedAnswer);
      if (got === null) {
        return {
          isCorrect: false,
          score: 0,
          feedback: 'Sig figs are being enforced, but I could not determine sig figs in your answer.',
          correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
        };
      }
      if (got !== requiredSigFigs) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Sig figs: expected ${requiredSigFigs}, but your answer has ${got}.`,
          correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
        };
      }
    }

    const ok = withinTolerance(n, correct, { rel: 1e-6, abs: 1e-9 });

    return {
      isCorrect: ok,
      score: ok ? 1 : 0,
      feedback: ok ? 'Correct!' : `Not quite. Correct value is ${formatNice(correct)} ${targetUnit}.`,
      correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
    };
  },
};
