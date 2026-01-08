import type { QuestionSubtype, Question, GradeOptions } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { looksLikeScientificNotation, countSigFigs } from '../../utils/answerFormat';
import { makeId } from '../../utils/id';
import { roundToSigFigsEven } from '../../utils/precision';
import { PREFIXES, PREFIX_EXPONENTS, BASE_UNITS } from '../../utils/prefixes';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
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

// Format unit with power (e.g., "cm³" or "m²")
function formatUnitWithPower(prefix: string, baseUnit: string, power: number): string {
  const unit = `${prefix}${baseUnit}`;
  if (power === 2) return `${unit}²`;
  if (power === 3) return `${unit}³`;
  return unit;
}

function normalizeUnit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/³/g, '^3')
    .replace(/\/+/g, '/');
}


// Parse density unit like "g/cm³" or "kg/m^3" to extract prefix exponents and powers
function parseDensityUnitPrefixes(unit: string): { numPrefixExp: number; denPrefixExp: number; numPower: number; denPower: number } | null {
  const s = normalizeUnit(unit); // e.g., "g/cm^3"
  const parts = s.split('/');
  if (parts.length !== 2) return null;
  
  const [numPart, denPart] = parts;
  
  // Extract power from numerator (usually 1 for density, but support squared/cubed)
  let numUnit = numPart;
  let numPower = 1;
  if (numPart.includes('^3') || numPart.endsWith('3') || numPart.includes('³')) {
    numPower = 3;
    numUnit = numPart.replace(/³/g, '').replace(/\^?3$/, '');
  } else if (numPart.includes('^2') || numPart.endsWith('2') || numPart.includes('²')) {
    numPower = 2;
    numUnit = numPart.replace(/²/g, '').replace(/\^?2$/, '');
  }
  
  // Extract power from denominator (e.g., "cm^3" -> power = 3, unit = "cm")
  let denUnit = denPart;
  let denPower = 1;
  if (denPart.includes('^3') || denPart.endsWith('3') || denPart.includes('³')) {
    denPower = 3;
    denUnit = denPart.replace(/³/g, '').replace(/\^?3$/, '');
  } else if (denPart.includes('^2') || denPart.endsWith('2') || denPart.includes('²')) {
    denPower = 2;
    denUnit = denPart.replace(/²/g, '').replace(/\^?2$/, '');
  }
  
  // Extract numerator prefix - match prefixes in order (longer first)
  // Sort prefixes by symbol length descending, then try to match
  const sortedPrefixes = [...PREFIXES].sort((a, b) => (b.symbol?.length ?? 0) - (a.symbol?.length ?? 0));
  
  let numPrefixExp = 0;
  let numPrefixSymbol = '';
  for (const prefix of sortedPrefixes) {
    const prefixLower = prefix.symbol.toLowerCase();
    if (prefixLower && numUnit.toLowerCase().startsWith(prefixLower)) {
      // Check if it's followed by 'g' (the base unit for mass)
      const remaining = numUnit.slice(prefix.symbol.length).toLowerCase();
      if (remaining.startsWith('g')) {
        numPrefixSymbol = prefix.symbol;
        numPrefixExp = prefix.exponent;
        break;
      }
    }
  }
  // If no prefix matched, check for base unit 'g'
  if (!numPrefixSymbol && numUnit.toLowerCase().startsWith('g')) {
    numPrefixSymbol = '';
    numPrefixExp = 0;
  }
  
  // Extract denominator prefix - match prefixes in order (longer first)
  let denPrefixExp = 0;
  let denPrefixSymbol = '';
  for (const prefix of sortedPrefixes) {
    const prefixLower = prefix.symbol.toLowerCase();
    if (prefixLower && denUnit.toLowerCase().startsWith(prefixLower)) {
      // Check if it's followed by 'm' (the base unit for length/volume)
      const remaining = denUnit.slice(prefix.symbol.length).toLowerCase();
      if (remaining.startsWith('m')) {
        denPrefixSymbol = prefix.symbol;
        denPrefixExp = prefix.exponent;
        break;
      }
    }
  }
  // If no prefix matched, check for base unit 'm'
  if (!denPrefixSymbol && denUnit.toLowerCase().startsWith('m')) {
    denPrefixSymbol = '';
    denPrefixExp = 0;
  }
  
  return { numPrefixExp, denPrefixExp, numPower, denPower };
}

// Calculate question value exponent (exponent when value is in scientific notation)
function calculateValueExponent(value: number): number {
  if (value === 0) return 0;
  return Math.floor(Math.log10(Math.abs(value)));
}

function detectDensityUnit(raw: string): string | null {
  const s = normalizeUnit(raw);
  
  // Match pattern: [prefix]g / [prefix]m^3 or [prefix]g / [prefix]m3
  // Try to match any combination of prefixes with g/m³ format
  const densityPattern = /^([a-zA-Zµ]*?)g\/([a-zA-Zµ]*?)m\^?3$/i;
  const match = s.match(densityPattern);
  
  if (match) {
    const numPrefix = match[1].toLowerCase();
    const denPrefix = match[2].toLowerCase();
    
    // Verify prefixes are valid
    const numPrefixValid = numPrefix === '' || PREFIXES.some(p => p.symbol.toLowerCase() === numPrefix);
    const denPrefixValid = denPrefix === '' || PREFIXES.some(p => p.symbol.toLowerCase() === denPrefix);
    
    if (numPrefixValid && denPrefixValid) {
      // Return in normalized format
      const numPart = numPrefix ? `${numPrefix}g` : 'g';
      const denPart = denPrefix ? `${denPrefix}m^3` : 'm^3';
      return `${numPart}/${denPart}`;
    }
  }
  
  return null;
}

export const density: QuestionSubtype = {
  id: 'conversion.density',
  parentType: 'conversion',
  label: 'Density unit conversion (e.g., g/cm³ ↔ kg/m³)',
  conversionType: 'ratio',

  generate: () => {
    // Randomly pick prefixes for numerator (mass) and denominator (volume)
    // Mass base unit is always 'g' (grams)
    // Volume base unit is always 'm' (meters, cubed)
    const numPrefix = pick(PREFIXES); // numerator prefix (for grams)
    const denPrefix = pick(PREFIXES); // denominator prefix (for meters)
    
    // Ensure from and to prefixes are different
    let toNumPrefix = pick(PREFIXES);
    while (toNumPrefix.symbol === numPrefix.symbol) {
      toNumPrefix = pick(PREFIXES);
    }
    let toDenPrefix = pick(PREFIXES);
    while (toDenPrefix.symbol === denPrefix.symbol) {
      toDenPrefix = pick(PREFIXES);
    }
    
    // For density, numerator is always linear (power 1), denominator is always cubed (power 3)
    const numPower = 1;
    const denPower = 3;
    
    // Build unit strings
    const fromUnit = formatUnitWithPower(numPrefix.symbol, 'g', numPower) + '/' + formatUnitWithPower(denPrefix.symbol, 'm', denPower);
    const toUnit = formatUnitWithPower(toNumPrefix.symbol, 'g', numPower) + '/' + formatUnitWithPower(toDenPrefix.symbol, 'm', denPower);
    
    // Calculate conversion factor
    // From: (numPrefix / denPrefix^3) to: (toNumPrefix / toDenPrefix^3)
    // Factor = (numPrefix.factor / (denPrefix.factor^3)) / (toNumPrefix.factor / (toDenPrefix.factor^3))
    // Factor = (numPrefix.factor * toDenPrefix.factor^3) / (toNumPrefix.factor * denPrefix.factor^3)
    const denPrefixFactorPow = Math.pow(denPrefix.factor, denPower);
    const toDenPrefixFactorPow = Math.pow(toDenPrefix.factor, denPower);
    const factor = (numPrefix.factor * toDenPrefixFactorPow) / (toNumPrefix.factor * denPrefixFactorPow);

    // Choose realistic density value based on the from unit
    // Adjust range based on the from prefix to keep values reasonable
    let raw: number;
    const fromNumExp = numPrefix.exponent;
    const fromDenExp = denPrefix.exponent;
    // Effective exponent = numExp - (denExp * 3)
    const effectiveExp = fromNumExp - (fromDenExp * 3);
    
    if (effectiveExp >= 3) {
      // Large numbers (e.g., mg/m³)
      raw = randInt(200000, 25000000) / randInt(1, 10);
    } else if (effectiveExp >= 0) {
      // Medium numbers (e.g., kg/m³, g/cm³, mg/cm³)
      raw = randInt(200, 25000) / randInt(1, 10);
    } else if (effectiveExp >= -3) {
      // Small numbers (e.g., g/cm³ when expressed differently)
      raw = randInt(2, 250) / randInt(1, 10);
    } else {
      // Very small numbers (e.g., kg/cm³)
      raw = randInt(2, 250) / randInt(10000, 100000);
    }

    const qv = quantizeMax3Decimals(raw);
    const requiredSigFigs = countSigFigs(qv.display) ?? 3;

    const correctRaw = qv.value * factor;
    const correctRounded = roundToSigFigs(correctRaw, requiredSigFigs);

    // Calculate prefix exponents for algorithm
    const fromPrefixes = parseDensityUnitPrefixes(fromUnit);
    const toPrefixes = parseDensityUnitPrefixes(toUnit);
    const questionValueExp = calculateValueExponent(qv.value);
    
    // Calculate final exponent using the density algorithm formula:
    // (Input Num Prefix Exp - Output Num Prefix Exp) × Den Power + Question Value Exp - (Input Den Prefix Exp - Output Den Prefix Exp)
    // Note: The formula uses denominator power (which is typically 3 for density) multiplied by the numerator prefix difference
    let finalExponent: number | null = null;
    if (fromPrefixes && toPrefixes) {
      // Use denominator power in the formula (denominator is cubed for density)
      finalExponent = (fromPrefixes.numPrefixExp - toPrefixes.numPrefixExp) * toPrefixes.denPower 
                    + questionValueExp 
                    - (fromPrefixes.denPrefixExp - toPrefixes.denPrefixExp);
    }

    const q: Question = {
      id: `conversion.density.${makeId('q')}`,
      parentType: 'conversion',
      subtype: 'conversion.density',
      prompt: `Convert ${qv.display} ${fromUnit} to ${toUnit}.`,
      meta: {
        from: fromUnit,
        to: toUnit,
        givenDisplay: qv.display,
        givenValue: qv.value,
        factor,
        requiredSigFigs,
        correct: roundStable(correctRounded),
        // Algorithm metadata
        inputNumPrefixExp: fromPrefixes?.numPrefixExp,
        outputNumPrefixExp: toPrefixes?.numPrefixExp,
        inputDenPrefixExp: fromPrefixes?.denPrefixExp,
        outputDenPrefixExp: toPrefixes?.denPrefixExp,
        numPower: fromPrefixes?.numPower,
        denPower: fromPrefixes?.denPower, // Note: both from and to should have same power structure
        questionValueExponent: questionValueExp,
        finalExponent,
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

    // Unit check: if enforceUnits is true, require units. Otherwise, do soft check if units are provided.
    const unitMatch = submittedAnswer.match(/[a-zA-Z/³²^0-9]+$/);
    const detected = unitMatch ? detectDensityUnit(unitMatch[0]) : null;
    
    if (opts.enforceUnits) {
      // Strict unit enforcement: require units and they must match
      if (!detected) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units are required. This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
        };
      }
      // Normalize both detected and target for comparison
      const normalizedDetected = normalizeUnit(detected);
      const normalizedTarget = normalizeUnit(targetUnit);
      
      if (normalizedDetected !== normalizedTarget) {
        return {
          isCorrect: false,
          score: 0,
          feedback: `Units look off. This question asks for ${targetUnit}.`,
          correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
        };
      }
    } else {
      // Soft unit sanity check (only if they typed unit-ish text)
      if (detected) {
        const normalizedDetected = normalizeUnit(detected);
        const normalizedTarget = normalizeUnit(targetUnit);
        
        if (normalizedDetected !== normalizedTarget) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Units look off. This question asks for ${targetUnit}.`,
            correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
          };
        }
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
