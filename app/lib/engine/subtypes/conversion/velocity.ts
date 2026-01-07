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

// Limit prompt numbers to <= 2 decimals and use that exact value for grading
function quantizeForPrompt(x: number) {
  const fixed = x.toFixed(2);
  const trimmed = fixed.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
  return { value: Number(trimmed), display: trimmed };
}

function normalizeVelocityUnits(s: string) {
  return s
    .replace(/\s+/g, '')
    .replace(/·/g, '*')
    .replace(/−/g, '-') // unicode minus
    .toLowerCase();
}

function detectVelocityUnit(raw: string): 'm/s' | 'km/h' | null {
  const s = normalizeVelocityUnits(raw);
  // common forms
  if (s.includes('m/s') || s.includes('ms-1') || s.includes('m*s-1') || s.includes('m*s^-1')) return 'm/s';
  if (s.includes('km/h') || s.includes('kmph') || s.includes('kph')) return 'km/h';
  return null;
}

export const velocity: QuestionSubtype = {
  id: 'conversion.velocity',
  parentType: 'conversion',
  label: 'Velocity unit conversion (m/s ↔ km/h)',
  conversionType: 'ratio',

  generate: () => {
    const direction = Math.random() < 0.5 ? 'MS_TO_KMH' : 'KMH_TO_MS';

    if (direction === 'MS_TO_KMH') {
      // m/s typical range
      const raw = randInt(2, 400) / randInt(1, 8);
      const qv = quantizeForPrompt(raw);

      const requiredSigFigs = countSigFigs(qv.display) ?? 3;

      // exact factor: 1 m/s = 3.6 km/h
      const correctRaw = qv.value * 3.6;
      const correctRounded = roundToSigFigs(correctRaw, requiredSigFigs);

      const q: Question = {
        id: `conversion.velocity.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.velocity',
        prompt: `Convert ${qv.display} m/s to km/h.`,
        meta: {
          direction,
          givenDisplay: qv.display,
          givenValue: qv.value,
          requiredSigFigs,
          correct: roundStable(correctRounded),
        },
        createdAtMs: Date.now(),
      };
      return q;
    } else {
      // km/h typical range
      const raw = randInt(5, 900) / randInt(1, 8);
      const qv = quantizeForPrompt(raw);

      const requiredSigFigs = countSigFigs(qv.display) ?? 3;

      // exact factor: 1 km/h = 1/3.6 m/s
      const correctRaw = qv.value / 3.6;
      const correctRounded = roundToSigFigs(correctRaw, requiredSigFigs);

      const q: Question = {
        id: `conversion.velocity.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.velocity',
        prompt: `Convert ${qv.display} km/h to m/s.`,
        meta: {
          direction,
          givenDisplay: qv.display,
          givenValue: qv.value,
          requiredSigFigs, 
          correct: roundStable(correctRounded),
        },
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
        feedback: 'Please answer in scientific notation (e.g., 3.60e1).',
      };
    }

    const n = parseNumberLoose(submittedAnswer);
    const correct = q.meta.correct as number;
    const requiredSigFigs = q.meta.requiredSigFigs as number;

    if (n === null) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'I could not parse your answer as a number.',
        correctAnswerDisplay:
          (q.meta.direction === 'MS_TO_KMH') ? `${formatNice(correct)} km/h` : `${formatNice(correct)} m/s`,
      };
    }

    // Soft unit sanity check (only if user included something unit-like)
    const unitMatch = submittedAnswer.match(/[a-zA-Z/·*^-]+$/);
    if (unitMatch) {
      const detected = detectVelocityUnit(unitMatch[0]);
      const expected = (q.meta.direction === 'MS_TO_KMH') ? 'km/h' : 'm/s';
      if (detected && detected !== expected) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units look off. This question asks for ${expected}.`,
          correctAnswerDisplay: expected === 'km/h' ? `${formatNice(correct)} km/h` : `${formatNice(correct)} m/s`,
        };
      }
    }

    // Sig figs enforcement for mult/div by an exact factor (3.6 exact)
    if (opts.enforceSigFigs) {
      const got = countSigFigs(submittedAnswer);
      if (got === null) {
        return {
          isCorrect: false,
          score: 0,
          feedback: 'Sig figs are being enforced, but I could not determine sig figs in your answer.',
          correctAnswerDisplay:
            (q.meta.direction === 'MS_TO_KMH') ? `${formatNice(correct)} km/h` : `${formatNice(correct)} m/s`,
        };
      }
      if (got !== requiredSigFigs) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Sig figs: expected ${requiredSigFigs}, but your answer has ${got}.`,
          correctAnswerDisplay:
            (q.meta.direction === 'MS_TO_KMH') ? `${formatNice(correct)} km/h` : `${formatNice(correct)} m/s`,
        };
      }
    }

    const ok = withinTolerance(n, correct, { rel: 1e-6, abs: 1e-9 });

    const unitOut = (q.meta.direction === 'MS_TO_KMH') ? 'km/h' : 'm/s';
    return {
      isCorrect: ok,
      score: ok ? 1 : 0,
      feedback: ok ? 'Correct!' : `Not quite. Correct value is ${formatNice(correct)} ${unitOut}.`,
      correctAnswerDisplay: `${formatNice(correct)} ${unitOut}`,
    };
  },
};
