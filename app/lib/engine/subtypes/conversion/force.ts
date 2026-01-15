// app/lib/engine/subtypes/conversion/force.ts
import type { GradeOptions, Question, QuestionSubtype } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { looksLikeScientificNotation, countSigFigs } from '../../utils/answerFormat';
import { parseMetricUnit, parseQuantityLoose } from '../../utils/units';
import { makeId } from '../../utils/id';
import { PREFIXES, PREFIX_BY_SYMBOL } from '../../utils/prefixes';
import { roundToSigFigsEven } from '../../utils/precision';

function roundToSigFigs(x: number, sig: number) {
  return roundToSigFigsEven(x, sig);
}

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

// Normalize unit string for comparison
function normalizeUnit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/·/g, '')
    .replace(/\*/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
}

// Parse force unit: N, kN, mN, or compound like g·km/h², kg·m/s²
// Returns: { factorToN: number, format: string } | null
// Factor converts the unit to Newtons (base N)
type ForceUnitInfo = {
  factorToN: number; // Conversion factor to N
  format: string; // Normalized format for comparison
};

function parseForceUnit(unit: string): ForceUnitInfo | null {
  const s = normalizeUnit(unit);
  
  // Check for simple N unit first (N, kN, mN, etc.)
  if (s.endsWith('n') && !s.includes('/') && !s.includes('·') && !s.includes('*')) {
    const prefixPart = s.slice(0, -1);
    
    // For case-sensitive prefixes (Q/q, R/r), extract prefix from original unit (before normalization)
    const originalUnit = unit.trim();
    const originalPrefix = originalUnit.slice(0, -1);
    
    // Find the prefix in PREFIXES array using case-sensitive matching
    let prefixInfo: { factor: number } | null = null;
    if (prefixPart === '') {
      prefixInfo = { factor: 1 };
    } else {
      // Find prefix that matches both the normalized form (for lookup) and the original case
      const found = PREFIXES.find(p => 
        p.symbol.toLowerCase() === prefixPart && 
        p.symbol === originalPrefix
      );
      
      if (found) {
        prefixInfo = { factor: found.factor };
      } else {
        // Fallback: if no case-sensitive match, try case-insensitive lookup
        // This handles cases where the original unit was already lowercase or case doesn't matter
        prefixInfo = PREFIX_BY_SYMBOL[prefixPart] || null;
      }
    }
    
    if (prefixInfo) {
      return {
        factorToN: prefixInfo.factor,
        format: s,
      };
    }
  }
  
  // Check for compound units: mass·length/time²
  // Patterns: g·m/s², kg·km/h², g·cm/s², etc.
  // Support: massUnit·lengthUnit/timeUnit² or massUnit lengthUnit/timeUnit^2
  
  // Try to match pattern: massUnit·lengthUnit/timeUnit² (after normalization: massUnitlengthUnit/timeUnit^2)
  // normalizeUnit removes · and * separators, so "g·km/h²" becomes "gkm/h^2"
  // Patterns: g·m/s² → gkm/h^2, kg·km/h² → kgkm/h^2, g*km/h^2 → gkm/h^2
  // After normalizeUnit, ² becomes ^2, so we look for ^2 or 2 at the end
  const compoundPattern = /^([a-zµ]*g)([a-zµ]*m)\/([a-zµ]*[sh])\^?2$/;
  const match = s.match(compoundPattern);
  
  if (match) {
    const [, massUnit, lengthUnit, timeUnit] = match;
    
    // Parse mass prefix (g or kg)
    let massPrefix = '';
    let massBase = '';
    if (massUnit === 'g') {
      massPrefix = '';
      massBase = 'g';
    } else if (massUnit === 'kg') {
      massPrefix = 'k';
      massBase = 'g';
    } else if (massUnit.endsWith('g')) {
      massPrefix = massUnit.slice(0, -1);
      massBase = 'g';
    } else {
      return null;
    }
    
    // Parse length prefix (m, km, cm, etc.)
    let lengthPrefix = '';
    if (lengthUnit === 'm') {
      lengthPrefix = '';
    } else if (lengthUnit.endsWith('m')) {
      lengthPrefix = lengthUnit.slice(0, -1);
    } else {
      return null;
    }
    
    // Parse time prefix (s or h)
    let timeUnitBase = '';
    if (timeUnit === 's') {
      timeUnitBase = 's';
    } else if (timeUnit === 'h') {
      timeUnitBase = 'h';
    } else if (timeUnit.endsWith('s')) {
      timeUnitBase = 's';
      // Could have prefix like ms, but for time we'll assume base s or h
      return null; // Don't support prefixed time units for now
    } else if (timeUnit.endsWith('h')) {
      timeUnitBase = 'h';
    } else {
      return null;
    }
    
    // Get prefix factors
    const massPrefixInfo = PREFIX_BY_SYMBOL[massPrefix] || { factor: 1 };
    const lengthPrefixInfo = PREFIX_BY_SYMBOL[lengthPrefix] || { factor: 1 };
    
    // Convert to N = kg·m/s²
    // Factor from this unit to N:
    // Example: g·km/h² = (10⁻³ kg) × (10³ m) / (3600² s²) = (1 kg·m) / (1.296×10⁷ s²) = 1/(1.296×10⁷) N
    
    // Mass conversion: if base is g, convert to kg (factor 10⁻³)
    let massInKg = massPrefixInfo.factor;
    if (massBase === 'g') {
      massInKg *= 1e-3; // g to kg
    }
    // If already kg (k prefix), it's already in kg
    
    // Length conversion: convert to meters
    const lengthInM = lengthPrefixInfo.factor;
    
    // Time conversion: convert to seconds (time is squared)
    let timeInS = 1;
    if (timeUnitBase === 'h') {
      timeInS = 3600; // 1 h = 3600 s
      // Since time is squared: h² = (3600 s)² = 1.296×10⁷ s²
      timeInS = timeInS * timeInS; // h² to s²
    }
    // If s, then s² = 1
    
    // Combined: (massInKg × lengthInM) / timeInS² gives the conversion factor to N
    // factorToN means: 1 unit of this = factorToN × N
    const factorToN = (massInKg * lengthInM) / timeInS;
    
    return {
      factorToN,
      format: s,
    };
  }
  
  return null;
}

export const force: QuestionSubtype = {
  id: 'conversion.force',
  parentType: 'conversion',
  label: 'Force conversion',
  conversionType: 'ratio',

  generate: () => {
    // Generate either:
    // 1. Simple N conversions (N, kN, mN, etc.) - 50% of the time
    // 2. Compound unit conversions (N ↔ g·km/h², etc.) - 50% of the time
    
    const useCompound = Math.random() < 0.5;
    
    let fromUnit: string;
    let toUnit: string;
    let conversionFactor: number;
    
    if (useCompound) {
      // Compound unit conversion: N to/from compound units like g·km/h²
      const fromN = Math.random() < 0.5; // 50% chance: N to compound, or compound to N
      
      // Pick a compound unit
      const massPrefixes = ['', 'k']; // g or kg
      const lengthPrefixes = ['', 'k', 'c', 'm']; // m, km, cm, mm
      const timeUnits = ['s', 'h']; // s or h
      
      const massP = pick(massPrefixes);
      const lengthP = pick(lengthPrefixes);
      const timeU = pick(timeUnits);
      
      const massUnit = massP === '' ? 'g' : 'kg';
      const lengthUnit = lengthP === '' ? 'm' : `${lengthP}m`;
      const compoundUnit = `${massUnit}·${lengthUnit}/${timeU}²`;
      
      if (fromN) {
        // N to compound unit
        const fromP = pick(PREFIXES);
        fromUnit = `${fromP.symbol}N`;
        toUnit = compoundUnit;
        
        const fromInfo = parseForceUnit(fromUnit);
        const toInfo = parseForceUnit(toUnit);
        
        if (!fromInfo || !toInfo) {
          // Fallback to simple conversion
          let toP = pick(PREFIXES);
          while (fromP.symbol === toP.symbol) toP = pick(PREFIXES);
          fromUnit = `${fromP.symbol}N`;
          toUnit = `${toP.symbol}N`;
          conversionFactor = fromP.factor / toP.factor;
        } else {
          // fromInfo.factorToN converts from fromUnit to N
          // toInfo.factorToN converts from toUnit to N
          // So: fromUnit = fromInfo.factorToN × N, toUnit = toInfo.factorToN × N
          // Therefore: fromUnit / toUnit = fromInfo.factorToN / toInfo.factorToN
          conversionFactor = fromInfo.factorToN / toInfo.factorToN;
        }
      } else {
        // Compound unit to N
        fromUnit = compoundUnit;
        const toP = pick(PREFIXES);
        toUnit = `${toP.symbol}N`;
        
        const fromInfo = parseForceUnit(fromUnit);
        const toInfo = parseForceUnit(toUnit);
        
        if (!fromInfo || !toInfo) {
          // Fallback to simple conversion
          let fromP = pick(PREFIXES);
          while (fromP.symbol === toP.symbol) fromP = pick(PREFIXES);
          fromUnit = `${fromP.symbol}N`;
          toUnit = `${toP.symbol}N`;
          conversionFactor = fromP.factor / toP.factor;
        } else {
          conversionFactor = fromInfo.factorToN / toInfo.factorToN;
        }
      }
    } else {
      // Simple N conversion
      let fromP = pick(PREFIXES);
      let toP = pick(PREFIXES);
      while (fromP.symbol === toP.symbol) toP = pick(PREFIXES);
      
      fromUnit = `${fromP.symbol}N`;
      toUnit = `${toP.symbol}N`;
      conversionFactor = fromP.factor / toP.factor;
    }

    // Generate a value
    const magnitude = randInt(12, 950);
    const raw = magnitude / randInt(1, 5);

    const qv = quantizeForDisplay(raw);
    const valueFrom = qv.value;
    const valueFromDisplay = qv.display;

    const correctRaw = valueFrom * conversionFactor;
    const requiredSigFigs = countSigFigs(valueFromDisplay) ?? 3;
    const correctRounded = roundToSigFigs(correctRaw, requiredSigFigs);
    const correct = roundStable(correctRounded);

    const q: Question = {
      id: `conversion.force.${makeId('q')}`,
      parentType: 'conversion',
      subtype: 'conversion.force',
      prompt: `Convert ${valueFromDisplay} ${fromUnit} to ${toUnit}.`,
      meta: {
        valueFrom,
        valueFromDisplay,
        fromUnit,
        toUnit,
        correct,
        requiredSigFigs,
      },
      createdAtMs: Date.now(),
      expectedUnit: toUnit,
    };

    return q;
  },

  grade: (q, submittedAnswer, opts: GradeOptions = {}) => {
    const targetUnit = q.meta.toUnit as string;
    const correct = q.meta.correct as number;
    const correctNice = formatNice(correct);

    // 1) Optional format enforcement
    if (opts.requireScientificNotation && !looksLikeScientificNotation(submittedAnswer)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Please answer in scientific notation (e.g., 1.2e3 or 1.2 × 10^3).',
        correctAnswerDisplay: `${correctNice} ${targetUnit}`,
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
            correctAnswerDisplay: `${correctNice} ${targetUnit}`,
          };
        }

        if (got !== required) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Sig figs: expected ${required}, but your answer has ${got}.`,
            correctAnswerDisplay: `${correctNice} ${targetUnit}`,
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
        correctAnswerDisplay: `${correctNice} ${targetUnit}`,
      };
    }

    // 3) Parse unit
    const parsed = parseQuantityLoose(submittedAnswer, n);

    if (opts.enforceUnits) {
      if (!parsed.unitRaw) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units are required. This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${correctNice} ${targetUnit}`,
        };
      }

      // Parse the submitted unit
      const studentInfo = parseForceUnit(parsed.unitRaw);
      const targetInfo = parseForceUnit(targetUnit);
      
      if (!studentInfo || !targetInfo) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `I couldn't understand the unit "${parsed.unitRaw}". This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${correctNice} ${targetUnit}`,
        };
      }

      // Units must match (same format after normalization)
      if (studentInfo.format !== targetInfo.format) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Unit mismatch. Expected ${targetUnit}, but got ${parsed.unitRaw}.`,
          correctAnswerDisplay: `${correctNice} ${targetUnit}`,
        };
      }
    }

    // 4) Convert student answer to target unit
    let submittedInTarget = n;

    if (parsed.unitRaw) {
      const studentInfo = parseForceUnit(parsed.unitRaw);
      const targetInfo = parseForceUnit(targetUnit);
      
      if (studentInfo && targetInfo) {
        // Convert: student value → N → target unit
        const valueInN = n * studentInfo.factorToN;
        submittedInTarget = valueInN / targetInfo.factorToN;
      }
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
