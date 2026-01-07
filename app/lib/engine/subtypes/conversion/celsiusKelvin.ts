import type { QuestionSubtype, Question, GradeOptions } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { looksLikeScientificNotation } from '../../utils/answerFormat';
import { countDecimalPlaces, roundToDecimalPlacesEven } from '../../utils/precision';
import { makeId } from '../../utils/id';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Keep prompts readable; temps often appear with 0–2 decimals
function quantizeTempForPrompt(x: number) {
  const abs = Math.abs(x);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const display = x.toFixed(decimals);
  const value = Number(display); // grade from exactly what we show
  return { value, display };
}

function roundStable(x: number) {
  return Number(x.toPrecision(12));
}

function formatFixed(x: number, dp: number) {
  // show exactly dp decimals (important for teaching rounding rules)
  return x.toFixed(dp);
}

function normalizeTempUnit(raw: string): 'C' | 'K' | null {
  const s = raw.toLowerCase().replace(/\s+/g, '');
  if (s === 'c' || s === '°c' || s === 'celsius') return 'C';
  if (s === 'k' || s === 'kelvin') return 'K';
  return null;
}

export const celsiusKelvin: QuestionSubtype = {
  id: 'conversion.celsiusKelvin',
  parentType: 'conversion',
  label: 'Celsius ↔ Kelvin',
  conversionType: 'offset',

  generate: () => {
    const direction = Math.random() < 0.5 ? 'C_TO_K' : 'K_TO_C';

    if (direction === 'C_TO_K') {
      // Celsius can be negative
      const raw = randInt(-50, 200) / randInt(1, 5);
      const qv = quantizeTempForPrompt(raw);

      // Addition/subtraction rule: limit by decimal places of the given value
      const requiredDecimalPlaces = countDecimalPlaces(qv.display) ?? 0;

      // 273.15 is exact, so it does not limit precision
      const correctRaw = qv.value + 273.15;
      const correctRounded = roundToDecimalPlacesEven(correctRaw, requiredDecimalPlaces);

      const q: Question = {
        id: `conversion.celsiusKelvin.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.celsiusKelvin',
        prompt: `Convert ${qv.display}°C to Kelvins (K).`,
        meta: {
          direction,
          givenDisplay: qv.display,
          givenValue: qv.value,
          requiredDecimalPlaces,
          correct: roundStable(correctRounded),
        },
        createdAtMs: Date.now(),
      };

      return q;
    } else {
      // Kelvin must be >= 0
      const raw = randInt(200, 500) / randInt(1, 5);
      const qv = quantizeTempForPrompt(raw);

      const requiredDecimalPlaces = countDecimalPlaces(qv.display) ?? 0;

      const correctRaw = qv.value - 273.15;
      const correctRounded = roundToDecimalPlacesEven(correctRaw, requiredDecimalPlaces);

      const q: Question = {
        id: `conversion.celsiusKelvin.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.celsiusKelvin',
        prompt: `Convert ${qv.display} K to degrees Celsius (°C).`,
        meta: {
          direction,
          givenDisplay: qv.display,
          givenValue: qv.value,
          requiredDecimalPlaces,
          correct: roundStable(correctRounded),
        },
        createdAtMs: Date.now(),
      };

      return q;
    }
  },

  grade: (q, submittedAnswer, opts: GradeOptions = {}) => {
    // Optional: still allow "require sci notation" to work as a general session constraint
    if (opts.requireScientificNotation && !looksLikeScientificNotation(submittedAnswer)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Please answer in scientific notation (e.g., 2.949e2).',
      };
    }

    const n = parseNumberLoose(submittedAnswer);
    const correct = q.meta.correct as number;
    const requiredDecimalPlaces = Number(q.meta.requiredDecimalPlaces ?? 0);


    if (n === null) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'I could not parse your answer as a number.',
        correctAnswerDisplay:
          q.meta.direction === 'C_TO_K'
            ? `${formatFixed(correct, requiredDecimalPlaces)} K`
            : `${formatFixed(correct, requiredDecimalPlaces)} °C`,
      };
    }

    // Soft unit sanity check (only if they included a recognizable unit)
    const unitMatch = submittedAnswer.match(/[a-zA-Z°]+$/);
    if (unitMatch) {
      const unit = normalizeTempUnit(unitMatch[0]);
      const expectedUnit = q.meta.direction === 'C_TO_K' ? 'K' : 'C';
      if (unit && unit !== expectedUnit) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units look off. This question asks for ${expectedUnit}.`,
          correctAnswerDisplay:
            q.meta.direction === 'C_TO_K'
              ? `${formatFixed(correct, requiredDecimalPlaces)} K`
              : `${formatFixed(correct, requiredDecimalPlaces)} °C`,
        };
      }
    }

    // HERE is the seamless part:
    // If "enforceSigFigs" is ON, Celsius/Kelvin uses decimal places (add/sub rule).
    if (opts.enforceSigFigs) {
      const gotDp = countDecimalPlaces(submittedAnswer);
      if (gotDp === null) {
        return {
          isCorrect: false,
          score: 0,
          feedback:
            'Rounding is being enforced, but I could not determine decimal places in your answer.',
        };
      }
      if (gotDp !== requiredDecimalPlaces) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Rounding: expected ${requiredDecimalPlaces} decimal place(s), but your answer has ${gotDp}.`,
          correctAnswerDisplay:
            q.meta.direction === 'C_TO_K'
              ? `${formatFixed(correct, requiredDecimalPlaces)} K`
              : `${formatFixed(correct, requiredDecimalPlaces)} °C`,
        };
      }
    }

    // Grade numeric value (we already rounded correct to required decimal places)
    const ok = withinTolerance(n, correct, { abs: 1e-6 });

    return {
      isCorrect: ok,
      score: ok ? 1 : 0,
      feedback: ok ? 'Correct!' : `Not quite. Correct value is ${formatFixed(correct, requiredDecimalPlaces)}.`,
      correctAnswerDisplay:
        q.meta.direction === 'C_TO_K'
          ? `${formatFixed(correct, requiredDecimalPlaces)} K`
          : `${formatFixed(correct, requiredDecimalPlaces)} °C`,
    };
  },
};
