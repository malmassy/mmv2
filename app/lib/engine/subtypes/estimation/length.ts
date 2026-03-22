// app/lib/engine/subtypes/estimation/length.ts
import type { GradeOptions, GradeResult, Question, QuestionSubtype } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { parseMetricUnit, parseQuantityLoose } from '../../utils/units';
import { makeId } from '../../utils/id';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/**
 * Generate a length measurement question.
 * The ruler will show an object positioned at a specific length.
 * Resolution/precision is determined by the smallest markings on the ruler.
 */
export const length: QuestionSubtype = {
  id: 'estimation.length',
  parentType: 'estimation',
  label: 'Estimation - Length',

  generate(): Question {
    // Generate a length value in centimeters (accurate to the centimeter)
    // Range: 1 cm to 30 cm (reasonable for screen-based estimation)
    const minLengthCm = 1;
    const maxLengthCm = 30;
    const lengthCm = randInt(minLengthCm, maxLengthCm);
    
    // All answers are in centimeters, rounded to nearest cm (no decimals)
    const correctAnswer = lengthCm;
    const targetUnit = 'cm';
    const correctAnswerDisplay = `${correctAnswer} ${targetUnit}`;

    const id = makeId();
    const prompt = `Estimate the length of the object shown on screen. Answer in centimeters (cm).`;

    return {
      id,
      parentType: 'estimation',
      subtype: 'estimation.length',
      prompt,
      meta: {
        lengthCm: correctAnswer,
        targetUnit,
        correctAnswer,
        correctAnswerDisplay,
      },
      createdAtMs: Date.now(),
      expectedUnit: targetUnit,
    };
  },

  grade(q: Question, submittedAnswer: string, opts: GradeOptions = {}): GradeResult {
    const { correctAnswer, targetUnit, correctAnswerDisplay } = q.meta as {
      correctAnswer: number;
      targetUnit: string;
      correctAnswerDisplay: string;
    };

    const parsed = parseNumberLoose(submittedAnswer);
    if (parsed === null || !Number.isFinite(parsed)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Could not parse your answer. Please enter a number with units (e.g., "5 cm").',
        correctAnswerDisplay,
      };
    }

    // Estimation types never enforce sig figs
    // (enforceSigFigs option is hidden for estimation types in the UI)

    // Check units (always enforced for estimation)
    const parsedQuantity = parseQuantityLoose(submittedAnswer, parsed);
    if (opts.enforceUnits) {
      if (!parsedQuantity.unitRaw) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Your answer must include units. Expected unit: ${targetUnit}`,
          correctAnswerDisplay,
        };
      }

      const submittedUnitInfo = parseMetricUnit(parsedQuantity.unitRaw);
      if (!submittedUnitInfo) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `I couldn't understand the unit "${parsedQuantity.unitRaw}". Expected unit: ${targetUnit}`,
          correctAnswerDisplay,
        };
      }

      if (submittedUnitInfo.baseUnit !== 'm') {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Unit mismatch. Expected ${targetUnit} (length unit), but got ${parsedQuantity.unitRaw}.`,
          correctAnswerDisplay,
        };
      }

      const submittedUnit = parsedQuantity.unitRaw.toLowerCase();
      const expectedUnitLower = targetUnit.toLowerCase();
      
      if (submittedUnit !== expectedUnitLower) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Unit mismatch. Expected ${targetUnit}, but got ${parsedQuantity.unitRaw}.`,
          correctAnswerDisplay,
        };
      }
    }

    // Calculate percentage variance
    const variancePercent = Math.abs((parsed - correctAnswer) / correctAnswer) * 100;

    // Variance bands and points for each level
    const varianceBands = {
      regionals: { high: 15, medium: 30, low: 45 },
      states: { high: 10, medium: 20, low: 30 },
      nationals: { high: 5, medium: 10, low: 15 },
    };

    const band = opts.estimationVarianceBand || 'states';
    const bands = varianceBands[band];

    // Determine points based on variance bands
    let points = 0;
    let pointsText = '';
    
    if (variancePercent <= bands.high) {
      points = 5;
      pointsText = '5 points';
    } else if (variancePercent <= bands.medium) {
      points = 3;
      pointsText = '3 points';
    } else if (variancePercent <= bands.low) {
      points = 1;
      pointsText = '1 point';
    } else {
      points = 0;
      pointsText = '0 points';
    }

    // Build feedback message
    const varianceDisplay = variancePercent.toFixed(1);
    const feedback = `Actual: ${correctAnswerDisplay}; Variance: ${varianceDisplay}%; Points: ${points}`;

    return {
      isCorrect: points > 0,
      score: points / 5, // Store points as normalized score (0-5 becomes 0-1)
      feedback,
      correctAnswerDisplay,
    };
  },
};