// app/lib/engine/subtypes/measurement/length.ts
import type { GradeOptions, Question, QuestionSubtype } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { parseMetricUnit, parseQuantityLoose } from '../../utils/units';
import { countSigFigs } from '../../utils/answerFormat';
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
    // Range: 1 cm to 20 cm (reasonable for screen-based estimation)
    const minLengthCm = 1;
    const maxLengthCm = 20;
    const lengthCm = randInt(minLengthCm, maxLengthCm);
    
    // All answers are in centimeters, rounded to nearest cm (no decimals)
    const correctAnswer = lengthCm;
    const targetUnit = 'cm';
    const correctAnswerDisplay = `${correctAnswer} ${targetUnit}`;

    const id = makeId();
    const prompt = `Estimate the length of the object shown on screen. Answer in centimeters (cm), rounded to the nearest centimeter.`;

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
    if (!parsed || !Number.isFinite(parsed.value)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Could not parse your answer. Please enter a number with units (e.g., "5 cm").',
        correctAnswerDisplay,
      };
    }

    // Enforce significant figures if required (always enforced for measurement)
    if (opts.enforceSigFigs) {
      const requiredSigFigs = countSigFigs(correctAnswerDisplay);
      if (requiredSigFigs !== null) {
        const gotSigFigs = countSigFigs(submittedAnswer);
        
        if (gotSigFigs === null) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Significant figures are required. Your answer should have ${requiredSigFigs} significant figure${requiredSigFigs !== 1 ? 's' : ''}.`,
            correctAnswerDisplay,
          };
        }
        
        if (gotSigFigs !== requiredSigFigs) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Incorrect number of significant figures. Expected ${requiredSigFigs}, but got ${gotSigFigs}.`,
            correctAnswerDisplay,
          };
        }
      }
    }

    // Check units (always enforced for measurement)
    const parsedQuantity = parseQuantityLoose(submittedAnswer);
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

    // Tolerance: ±1 cm (since answers are rounded to nearest cm)
    const tolerance = 1.0;
    const isWithinTolerance = withinTolerance(parsed.value, correctAnswer, { abs: tolerance });

    if (isWithinTolerance) {
      return {
        isCorrect: true,
        score: 1,
        feedback: 'Correct!',
        correctAnswerDisplay,
      };
    } else {
      return {
        isCorrect: false,
        score: 0,
        feedback: `Not quite. The correct length is ${correctAnswerDisplay}.`,
        correctAnswerDisplay,
      };
    }
  },
};