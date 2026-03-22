// app/lib/engine/subtypes/estimation/commonObjects.ts
import type { GradeOptions, GradeResult, Question, QuestionSubtype } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { parseMetricUnit, parseQuantityLoose } from '../../utils/units';
import { makeId } from '../../utils/id';
import { getRandomImageQuestion } from './imageQuestions';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

// US Coin data (approximate real-world values)
type CoinType = 'penny' | 'nickel' | 'dime' | 'quarter';

type CoinData = {
  name: string;
  diameter: number; // cm
  thickness: number; // cm
  mass: number; // g
  circumference: number; // cm (calculated)
  area: number; // cm² (calculated)
};

const COINS: Record<CoinType, CoinData> = {
  penny: {
    name: 'Penny',
    diameter: 1.905, // cm
    thickness: 0.152, // cm
    mass: 2.5, // g
    circumference: Math.PI * 1.905, // ~5.984 cm
    area: Math.PI * (1.905 / 2) ** 2, // ~2.850 cm²
  },
  nickel: {
    name: 'Nickel',
    diameter: 2.121, // cm
    thickness: 0.195, // cm
    mass: 5.0, // g
    circumference: Math.PI * 2.121, // ~6.664 cm
    area: Math.PI * (2.121 / 2) ** 2, // ~3.533 cm²
  },
  dime: {
    name: 'Dime',
    diameter: 1.791, // cm
    thickness: 0.135, // cm
    mass: 2.268, // g
    circumference: Math.PI * 1.791, // ~5.626 cm
    area: Math.PI * (1.791 / 2) ** 2, // ~2.520 cm²
  },
  quarter: {
    name: 'Quarter',
    diameter: 2.426, // cm
    thickness: 0.175, // cm
    mass: 5.67, // g
    circumference: Math.PI * 2.426, // ~7.622 cm
    area: Math.PI * (2.426 / 2) ** 2, // ~4.622 cm²
  },
};

// Battery data (approximate real-world values)
type BatteryType = 'AA' | 'AAA' | 'C' | 'D';

type BatteryData = {
  name: string;
  length: number; // cm
  diameter: number; // cm
  circumference: number; // cm (calculated)
  area: number; // cm² (calculated - cross-sectional area)
  volume: number; // cm³ (calculated)
};

const BATTERIES: Record<BatteryType, BatteryData> = {
  AA: {
    name: 'AA battery',
    length: 5.05, // cm
    diameter: 1.45, // cm
    circumference: Math.PI * 1.45, // ~4.555 cm
    area: Math.PI * (1.45 / 2) ** 2, // ~1.651 cm²
    volume: Math.PI * (1.45 / 2) ** 2 * 5.05, // ~8.339 cm³
  },
  AAA: {
    name: 'AAA battery',
    length: 4.45, // cm
    diameter: 1.05, // cm
    circumference: Math.PI * 1.05, // ~3.299 cm
    area: Math.PI * (1.05 / 2) ** 2, // ~0.866 cm²
    volume: Math.PI * (1.05 / 2) ** 2 * 4.45, // ~3.853 cm³
  },
  C: {
    name: 'C battery',
    length: 5.00, // cm
    diameter: 2.62, // cm
    circumference: Math.PI * 2.62, // ~8.230 cm
    area: Math.PI * (2.62 / 2) ** 2, // ~5.390 cm²
    volume: Math.PI * (2.62 / 2) ** 2 * 5.00, // ~26.952 cm³
  },
  D: {
    name: 'D battery',
    length: 6.15, // cm
    diameter: 3.42, // cm
    circumference: Math.PI * 3.42, // ~10.743 cm
    area: Math.PI * (3.42 / 2) ** 2, // ~9.187 cm²
    volume: Math.PI * (3.42 / 2) ** 2 * 6.15, // ~56.500 cm³
  },
};

type MeasurementType = 'diameter' | 'circumference' | 'area' | 'thickness' | 'mass' | 'length' | 'volume';

type ObjectType = 'coin' | 'battery';
type ObjectData = CoinData | BatteryData;

const COIN_MEASUREMENT_TYPES: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'diameter', label: 'diameter', unit: 'cm' },
  { type: 'circumference', label: 'circumference', unit: 'cm' },
  { type: 'area', label: 'area', unit: 'cm²' },
  { type: 'thickness', label: 'thickness', unit: 'cm' },
  { type: 'mass', label: 'mass', unit: 'g' },
];

const BATTERY_MEASUREMENT_TYPES: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'length', label: 'length', unit: 'cm' },
  { type: 'diameter', label: 'diameter', unit: 'cm' },
  { type: 'circumference', label: 'circumference', unit: 'cm' },
  { type: 'area', label: 'cross-sectional area', unit: 'cm²' },
  { type: 'volume', label: 'volume', unit: 'cm³' },
];

export const commonObjects: QuestionSubtype = {
  id: 'estimation.commonObjects',
  parentType: 'estimation',
  label: 'Estimation - Common Objects',

  generate(): Question {
    // Check if we should use an image-based question (10% chance, or can be made configurable)
    const useImageQuestion = Math.random() < 0.1; // 10% chance to use image question
    const imageQuestion = useImageQuestion ? getRandomImageQuestion() : null;
    
    if (imageQuestion) {
      // Return image-based question
      const id = makeId();
      
      // Get coin data if it's a coin question
      let coinData: any = {};
      if (imageQuestion.objectCategory === 'coin' && imageQuestion.objectType) {
        const coin = COINS[imageQuestion.objectType as keyof typeof COINS];
        if (coin) {
          coinData = {
            coinDiameter: coin.diameter,
            coinThickness: coin.thickness,
          };
        }
      }
      
      // Get battery data if it's a battery question
      let batteryData: any = {};
      if (imageQuestion.objectCategory === 'battery' && imageQuestion.objectType) {
        const battery = BATTERIES[imageQuestion.objectType as keyof typeof BATTERIES];
        if (battery) {
          batteryData = {
            batteryLength: battery.length,
            batteryDiameter: battery.diameter,
          };
        }
      }
      
      return {
        id,
        parentType: 'estimation',
        subtype: 'estimation.commonObjects',
        prompt: imageQuestion.prompt,
        meta: {
          objectCategory: imageQuestion.objectCategory,
          objectType: imageQuestion.objectType || '',
          objectName: imageQuestion.objectName,
          measurementType: imageQuestion.measurementType,
          measurementLabel: imageQuestion.measurementLabel,
          correctAnswer: imageQuestion.correctAnswer,
          targetUnit: imageQuestion.targetUnit,
          correctAnswerDisplay: imageQuestion.correctAnswerDisplay,
          imagePath: imageQuestion.imagePath,
          ...coinData,
          ...batteryData,
        },
        createdAtMs: Date.now(),
        expectedUnit: imageQuestion.targetUnit,
      };
    }

    // Randomly choose between coin and battery
    const objectCategory = pick(['coin', 'battery'] as ObjectType[]);
    
    let correctAnswer: number;
    let targetUnit: string;
    let objectType: string;
    let objectName: string;
    let measurement: { type: MeasurementType; label: string; unit: string };
    let displayData: any;

    if (objectCategory === 'coin') {
      const coinType = pick(Object.keys(COINS) as CoinType[]);
      const coin = COINS[coinType];
      measurement = pick(COIN_MEASUREMENT_TYPES);
      objectType = coinType;
      objectName = coin.name;

      switch (measurement.type) {
        case 'diameter':
          correctAnswer = coin.diameter;
          break;
        case 'circumference':
          correctAnswer = coin.circumference;
          break;
        case 'area':
          correctAnswer = coin.area;
          break;
        case 'thickness':
          correctAnswer = coin.thickness;
          break;
        case 'mass':
          correctAnswer = coin.mass;
          break;
        default:
          correctAnswer = coin.diameter;
      }

      displayData = {
        coinDiameter: coin.diameter,
        coinThickness: coin.thickness,
      };
    } else {
      const batteryType = pick(Object.keys(BATTERIES) as BatteryType[]);
      const battery = BATTERIES[batteryType];
      measurement = pick(BATTERY_MEASUREMENT_TYPES);
      objectType = batteryType;
      objectName = battery.name;

      switch (measurement.type) {
        case 'length':
          correctAnswer = battery.length;
          break;
        case 'diameter':
          correctAnswer = battery.diameter;
          break;
        case 'circumference':
          correctAnswer = battery.circumference;
          break;
        case 'area':
          correctAnswer = battery.area;
          break;
        case 'volume':
          correctAnswer = battery.volume;
          break;
        default:
          correctAnswer = battery.length;
      }

      displayData = {
        batteryLength: battery.length,
        batteryDiameter: battery.diameter,
      };
    }

    targetUnit = measurement.unit;

    // Round to appropriate precision based on measurement type
    let roundedAnswer: number;
    if (measurement.type === 'mass') {
      // Mass: round to 2 decimal places
      roundedAnswer = Math.round(correctAnswer * 100) / 100;
    } else if (measurement.type === 'thickness') {
      // Thickness: round to 3 decimal places (cm values are smaller)
      roundedAnswer = Math.round(correctAnswer * 1000) / 1000;
    } else if (measurement.type === 'volume') {
      // Volume: round to 2 decimal places (cm³ values)
      roundedAnswer = Math.round(correctAnswer * 100) / 100;
    } else if (measurement.type === 'diameter' || measurement.type === 'length') {
      // Diameter and length: round to 2 decimal places
      roundedAnswer = Math.round(correctAnswer * 100) / 100;
    } else {
      // Circumference and area: round to 2 decimal places
      roundedAnswer = Math.round(correctAnswer * 100) / 100;
    }

    const correctAnswerDisplay = `${roundedAnswer} ${targetUnit}`;

    const id = makeId();
    const prompt = `Estimate the ${measurement.label} of the ${objectName.toLowerCase()} shown on screen. Answer in ${targetUnit}.`;

    return {
      id,
      parentType: 'estimation',
      subtype: 'estimation.commonObjects',
      prompt,
      meta: {
        objectCategory,
        objectType,
        objectName,
        measurementType: measurement.type,
        measurementLabel: measurement.label,
        correctAnswer: roundedAnswer,
        targetUnit,
        correctAnswerDisplay,
        ...displayData,
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
        feedback: 'Could not parse your answer. Please enter a number with units (e.g., "1.91 cm").',
        correctAnswerDisplay,
      };
    }

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

      // Normalize units for comparison (handle ² vs ^2, etc.)
      const normalizeUnitForComparison = (unit: string): string => {
        return unit
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/²/g, '^2')
          .replace(/³/g, '^3');
      };

      const submittedUnit = normalizeUnitForComparison(parsedQuantity.unitRaw);
      const expectedUnit = normalizeUnitForComparison(targetUnit);
      
      if (submittedUnit !== expectedUnit) {
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

    // Variance bands and points for each level (same as length)
    const varianceBands = {
      regionals: { high: 15, medium: 30, low: 45 },
      states: { high: 10, medium: 20, low: 30 },
      nationals: { high: 5, medium: 10, low: 15 },
    };

    const band = opts.estimationVarianceBand || 'states';
    const bands = varianceBands[band];

    // Determine points based on variance bands
    let points = 0;
    
    if (variancePercent <= bands.high) {
      points = 5;
    } else if (variancePercent <= bands.medium) {
      points = 3;
    } else if (variancePercent <= bands.low) {
      points = 1;
    } else {
      points = 0;
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
