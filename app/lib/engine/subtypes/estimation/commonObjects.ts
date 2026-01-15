// app/lib/engine/subtypes/estimation/commonObjects.ts
import type { GradeOptions, Question, QuestionSubtype } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { parseMetricUnit, parseQuantityLoose } from '../../utils/units';
import { makeId } from '../../utils/id';

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
  diameter: number; // mm
  thickness: number; // mm
  mass: number; // g
  circumference: number; // mm (calculated)
  area: number; // mm² (calculated)
};

const COINS: Record<CoinType, CoinData> = {
  penny: {
    name: 'Penny',
    diameter: 19.05, // mm
    thickness: 1.52, // mm
    mass: 2.5, // g
    circumference: Math.PI * 19.05, // ~59.84 mm
    area: Math.PI * (19.05 / 2) ** 2, // ~285.02 mm²
  },
  nickel: {
    name: 'Nickel',
    diameter: 21.21, // mm
    thickness: 1.95, // mm
    mass: 5.0, // g
    circumference: Math.PI * 21.21, // ~66.64 mm
    area: Math.PI * (21.21 / 2) ** 2, // ~353.34 mm²
  },
  dime: {
    name: 'Dime',
    diameter: 17.91, // mm
    thickness: 1.35, // mm
    mass: 2.268, // g
    circumference: Math.PI * 17.91, // ~56.26 mm
    area: Math.PI * (17.91 / 2) ** 2, // ~251.96 mm²
  },
  quarter: {
    name: 'Quarter',
    diameter: 24.26, // mm
    thickness: 1.75, // mm
    mass: 5.67, // g
    circumference: Math.PI * 24.26, // ~76.22 mm
    area: Math.PI * (24.26 / 2) ** 2, // ~462.23 mm²
  },
};

// Battery data (approximate real-world values)
type BatteryType = 'AA' | 'AAA' | 'C' | 'D';

type BatteryData = {
  name: string;
  length: number; // mm
  diameter: number; // mm
  circumference: number; // mm (calculated)
  area: number; // mm² (calculated - cross-sectional area)
  volume: number; // mm³ (calculated)
};

const BATTERIES: Record<BatteryType, BatteryData> = {
  AA: {
    name: 'AA battery',
    length: 50.5, // mm
    diameter: 14.5, // mm
    circumference: Math.PI * 14.5, // ~45.55 mm
    area: Math.PI * (14.5 / 2) ** 2, // ~165.13 mm²
    volume: Math.PI * (14.5 / 2) ** 2 * 50.5, // ~8339 mm³
  },
  AAA: {
    name: 'AAA battery',
    length: 44.5, // mm
    diameter: 10.5, // mm
    circumference: Math.PI * 10.5, // ~32.99 mm
    area: Math.PI * (10.5 / 2) ** 2, // ~86.59 mm²
    volume: Math.PI * (10.5 / 2) ** 2 * 44.5, // ~3853 mm³
  },
  C: {
    name: 'C battery',
    length: 50.0, // mm
    diameter: 26.2, // mm
    circumference: Math.PI * 26.2, // ~82.30 mm
    area: Math.PI * (26.2 / 2) ** 2, // ~539.05 mm²
    volume: Math.PI * (26.2 / 2) ** 2 * 50.0, // ~26952 mm³
  },
  D: {
    name: 'D battery',
    length: 61.5, // mm
    diameter: 34.2, // mm
    circumference: Math.PI * 34.2, // ~107.43 mm
    area: Math.PI * (34.2 / 2) ** 2, // ~918.68 mm²
    volume: Math.PI * (34.2 / 2) ** 2 * 61.5, // ~56500 mm³
  },
};

type MeasurementType = 'diameter' | 'circumference' | 'area' | 'thickness' | 'mass' | 'length' | 'volume';

type ObjectType = 'coin' | 'battery';
type ObjectData = CoinData | BatteryData;

const COIN_MEASUREMENT_TYPES: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'diameter', label: 'diameter', unit: 'mm' },
  { type: 'circumference', label: 'circumference', unit: 'mm' },
  { type: 'area', label: 'area', unit: 'mm²' },
  { type: 'thickness', label: 'thickness', unit: 'mm' },
  { type: 'mass', label: 'mass', unit: 'g' },
];

const BATTERY_MEASUREMENT_TYPES: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'length', label: 'length', unit: 'mm' },
  { type: 'diameter', label: 'diameter', unit: 'mm' },
  { type: 'circumference', label: 'circumference', unit: 'mm' },
  { type: 'area', label: 'cross-sectional area', unit: 'mm²' },
  { type: 'volume', label: 'volume', unit: 'mm³' },
];

export const commonObjects: QuestionSubtype = {
  id: 'estimation.commonObjects',
  parentType: 'estimation',
  label: 'Estimation - Common Objects',

  generate(): Question {
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
    if (measurement.type === 'mass' || measurement.type === 'thickness') {
      // Mass and thickness: round to 2 decimal places
      roundedAnswer = Math.round(correctAnswer * 100) / 100;
    } else if (measurement.type === 'volume') {
      // Volume: round to nearest integer (mm³ are large numbers)
      roundedAnswer = Math.round(correctAnswer);
    } else if (measurement.type === 'diameter' || measurement.type === 'length') {
      // Diameter and length: round to 1 decimal place
      roundedAnswer = Math.round(correctAnswer * 10) / 10;
    } else {
      // Circumference and area: round to 1 decimal place
      roundedAnswer = Math.round(correctAnswer * 10) / 10;
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
        feedback: 'Could not parse your answer. Please enter a number with units (e.g., "19.1 mm").',
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
      score: points > 0 ? 1 : 0,
      feedback,
      correctAnswerDisplay,
    };
  },
};
