'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { listSubtypes, SUBTYPE_BY_ID } from '../lib/engine/registry';
import type { AttemptDraft, Question } from '../lib/engine/types';
import RailroadWork, { RailroadStep } from '../components/RailroadWork';
import LengthEstimation from '../components/LengthEstimation';
import CommonObjectEstimation from '../components/CommonObjectEstimation';

/**
 * Convert a digit to superscript
 */
function toSuperscript(digit: string): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺'
  };
  return digit.split('').map(char => superscripts[char] || char).join('');
}

/**
 * Format a number with thousands separators (commas)
 */
function formatWithCommas(value: number): string {
  // Handle decimal numbers by splitting at decimal point
  const parts = value.toString().split('.');
  // Add commas to integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Format a number in scientific notation (e.g., 6830 -> "6.83 × 10³")
 * Always formats in normalized scientific notation (mantissa between 1 and 10)
 * Uses superscript for the exponent
 */
function formatScientificNotation(value: number): string {
  if (value === 0) return '0 × 10⁰';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  // Calculate exponent
  const exp = Math.floor(Math.log10(absValue));
  const mantissa = absValue / Math.pow(10, exp);
  
  // Round mantissa to 2-3 significant figures
  // For numbers >= 1, use 2 decimal places; for < 1, use 3
  let roundedMantissa: number;
  if (mantissa >= 1) {
    roundedMantissa = Math.round(mantissa * 100) / 100;
  } else {
    roundedMantissa = Math.round(mantissa * 1000) / 1000;
  }
  
  // Normalize if rounding pushed mantissa to 10 or above
  if (roundedMantissa >= 10) {
    roundedMantissa /= 10;
    const expStr = String(exp + 1);
    return `${sign}${roundedMantissa} × 10${toSuperscript(expStr)}`;
  }
  
  // Normalize if mantissa is below 1 (shouldn't happen, but safety check)
  if (roundedMantissa < 1 && roundedMantissa > 0) {
    roundedMantissa *= 10;
    const expStr = String(exp - 1);
    return `${sign}${roundedMantissa} × 10${toSuperscript(expStr)}`;
  }
  
  const expStr = String(exp);
  return `${sign}${roundedMantissa} × 10${toSuperscript(expStr)}`;
}

/**
 * Parse correctAnswerDisplay (e.g., "6830 L") and return both regular and scientific notation formats
 * Adds commas to the regular number and uses superscript in scientific notation
 */
function formatCorrectAnswerWithScientific(correctAnswerDisplay: string): React.ReactNode {
  // Extract number and unit
  const match = correctAnswerDisplay.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!match) return correctAnswerDisplay; // Fallback if parsing fails
  
  const numberStr = match[1];
  const unit = match[2] || '';
  
  const number = parseFloat(numberStr);
  if (isNaN(number)) return correctAnswerDisplay;
  
  // Format regular number with commas
  const regularFormatted = formatWithCommas(number);
  const regularDisplay = `${regularFormatted}${unit ? ' ' + unit : ''}`;
  
  // Format scientific notation with superscripts
  const sciNotation = formatScientificNotation(number);
  const sciDisplay = `${sciNotation}${unit ? ' ' + unit : ''}`;
  
  // Return with "or" as plain text (not bold)
  return (
    <>
      {regularDisplay} <span style={{ fontWeight: 'normal' }}>or</span> {sciDisplay}
    </>
  );
}

export default function PracticePage() {
  const subtypes = useMemo(() => listSubtypes(), []);
  const defaultSubtypeId = subtypes[0]?.id ?? 'conversion.basic';

  const [subtypeId, setSubtypeId] = useState(defaultSubtypeId);

  const [question, setQuestion] = useState<Question | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);

  const [workSteps, setWorkSteps] = useState<RailroadStep[]>([]);

  const [requireScientificNotation, setRequireScientificNotation] = useState(false);
  const [enforceSigFigs, setEnforceSigFigs] = useState(false);
  const [enforceUnits, setEnforceUnits] = useState(true);
  const [estimationVarianceBand, setEstimationVarianceBand] = useState<'regionals' | 'states' | 'nationals'>('states');

  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{
    feedback: string;
    isCorrect: boolean;
    correct?: string;
  } | null>(null);

  // Algorithm input values (for basic conversion)
  const [algorithmInputPrefixExp, setAlgorithmInputPrefixExp] = useState<string>('');
  const [algorithmOutputPrefixExp, setAlgorithmOutputPrefixExp] = useState<string>('');
  const [algorithmPower, setAlgorithmPower] = useState<string>('');
  const [algorithmValueExp, setAlgorithmValueExp] = useState<string>('');
  
  // Algorithm input values (for density conversion)
  const [densityInputNumPrefixExp, setDensityInputNumPrefixExp] = useState<string>('');
  const [densityOutputNumPrefixExp, setDensityOutputNumPrefixExp] = useState<string>('');
  const [densityInputDenPrefixExp, setDensityInputDenPrefixExp] = useState<string>('');
  const [densityOutputDenPrefixExp, setDensityOutputDenPrefixExp] = useState<string>('');
  const [densityNumPower, setDensityNumPower] = useState<string>('');
  const [densityDenPower, setDensityDenPower] = useState<string>('');
  const [densityValueExp, setDensityValueExp] = useState<string>('');

  // Ensure we only auto-generate once on mount
  const didInitRef = useRef(false);

  function newQuestion(nextSubtypeId?: string) {
    const sid = nextSubtypeId ?? subtypeId;
    const subtype = SUBTYPE_BY_ID[sid];
    
    if (!subtype) {
      console.error('[PracticePage] Subtype not found:', sid, {
        available: Object.keys(SUBTYPE_BY_ID),
        subtypes: subtypes.length,
      });
      return;
    }
    
    try {
      const q = subtype.generate();
      setQuestion(q);
      setAnswer('');
      setResult(null);
      setWorkSteps([]);
      setQuestionStartTime(Date.now());
      
    // Reset algorithm inputs when new question is generated
    if (q.subtype === 'conversion.basic' && q.meta) {
      setAlgorithmInputPrefixExp('');
      setAlgorithmOutputPrefixExp('');
      setAlgorithmPower('');
      setAlgorithmValueExp('');
    }
    if (q.subtype === 'conversion.density' && q.meta) {
      setDensityInputNumPrefixExp('');
      setDensityOutputNumPrefixExp('');
      setDensityInputDenPrefixExp('');
      setDensityOutputDenPrefixExp('');
      setDensityNumPower('');
      setDensityDenPower('');
      setDensityValueExp('');
    }
    } catch (error) {
      console.error('[PracticePage] Error generating question:', error);
    }
  }

  function handleSubmit() {
    if (!question || questionStartTime === null) return;

    const subtype = SUBTYPE_BY_ID[question.subtype];

    if (!subtype) {
      console.error('Unknown subtype:', question.subtype, {
        known: Object.keys(SUBTYPE_BY_ID),
        question,
      });
      return;
    }

    const grade = subtype.grade(question, answer, {
      requireScientificNotation,
      enforceSigFigs,
      enforceUnits,
      estimationVarianceBand,
    });

    const timeSpentMs = Date.now() - questionStartTime;

    setResult({
      feedback: grade.feedback,
      isCorrect: grade.isCorrect,
      correct: grade.correctAnswerDisplay,
    });

    const attempt: AttemptDraft = {
      questionId: question.id,
      subtype: question.subtype,
      submittedAnswer: answer,
      timeSpentMs,
      isCorrect: grade.isCorrect,
      // workSteps is for display only, not stored in AttemptDraft
    };

    console.log('ATTEMPT', attempt);
  }

  useEffect(() => {
    if (didInitRef.current) return;
    if (subtypes.length === 0) {
      console.warn('[PracticePage] Subtypes not loaded yet, waiting...', {
        subtypesCount: subtypes.length,
        SUBTYPE_BY_ID_keys: Object.keys(SUBTYPE_BY_ID),
      });
      return;
    }
    if (!defaultSubtypeId || !SUBTYPE_BY_ID[defaultSubtypeId]) {
      console.error('[PracticePage] Invalid defaultSubtypeId:', defaultSubtypeId, {
        available: Object.keys(SUBTYPE_BY_ID),
      });
      return;
    }
    didInitRef.current = true;
    newQuestion(defaultSubtypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtypes, defaultSubtypeId]);

  // ---------- Railroad display logic ----------
  // Prefer an explicit subtype flag if you add it (recommended):
  //   conversionType: 'offset' | 'ratio'
  // Fallback to an ID heuristic so Celsius/Kelvin never shows railroad even before you add the flag.
  const shouldShowRailroad = useMemo(() => {
    const sid = question?.subtype ?? subtypeId;
    const st: any = SUBTYPE_BY_ID[sid];

    // Explicit metadata wins
    if (st && typeof st === 'object' && st.conversionType) {
      return st.conversionType !== 'offset';
    }

    // Heuristic fallback for temperature offset conversions (C ↔ K)
    const s = String(sid).toLowerCase();
    const looksLikeCK =
      (s.includes('temp') || s.includes('temperature') || s.includes('celsius') || s.includes('kelvin')) &&
      (s.includes('c') || s.includes('k'));

    if (looksLikeCK) return false;

    return true;
  }, [question?.subtype, subtypeId]);
  // -------------------------------------------

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Metric Mastery Practice</h1>

<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
  {/* Left stack: Subtype above New Question */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <label>
      Subtype:{' '}
      <select
        value={subtypeId}
        onChange={(e) => {
          const next = e.target.value;
          setSubtypeId(next);
          newQuestion(next);
        }}
      >
        {subtypes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.parentType.toUpperCase()} — {s.label}
          </option>
        ))}
      </select>
    </label>

    <button onClick={() => newQuestion()}>New Question</button>
  </div>

  {/* Right: Grading Options */}
  <div className="controlsCard">
    <div className="controlsTitle">Grading Options</div>

    {/* Only show Sig Figs option for non-estimation subtypes */}
    {question?.parentType !== 'estimation' && (
      <label className="controlRow">
        <input
          type="checkbox"
          checked={enforceSigFigs}
          onChange={(e) => setEnforceSigFigs(e.target.checked)}
        />
        <span>Enforce Sig Figs</span>
      </label>
    )}

    <label className="controlRow">
      <input
        type="checkbox"
        checked={enforceUnits}
        onChange={(e) => setEnforceUnits(e.target.checked)}
      />
      <span>Enforce Units</span>
    </label>

    {/* Variance band selector for estimation types */}
    {question?.parentType === 'estimation' && (
      <label className="controlRow" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <span>Variance Band:</span>
        <select
          value={estimationVarianceBand}
          onChange={(e) => setEstimationVarianceBand(e.target.value as 'regionals' | 'states' | 'nationals')}
          style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}
        >
          <option value="regionals">Regionals (15/30/45)</option>
          <option value="states">States (10/20/30)</option>
          <option value="nationals">Nationals (5/10/15)</option>
        </select>
      </label>
    )}
  </div>
</div>


      {/* Question and Answer Section */}
      <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ marginBottom: 12, fontWeight: 600 }}>Question</div>

        {!question ? (
          <div style={{ opacity: 0.7 }}>Loading question…</div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>{question.prompt}</div>

            {/* Estimation Components */}
            {question.subtype === 'estimation.length' && question.meta.lengthCm && (
              <div style={{ marginBottom: 16 }}>
                <LengthEstimation lengthCm={question.meta.lengthCm} />
              </div>
            )}
            {question.subtype === 'estimation.commonObjects' && question.meta.objectCategory && (
              <div style={{ marginBottom: 16 }}>
                <CommonObjectEstimation
                  objectCategory={question.meta.objectCategory}
                  objectType={question.meta.objectType}
                  objectName={question.meta.objectName}
                  measurementType={question.meta.measurementType}
                  measurementLabel={question.meta.measurementLabel}
                  coinDiameter={question.meta.coinDiameter}
                  coinThickness={question.meta.coinThickness}
                  batteryLength={question.meta.batteryLength}
                  batteryDiameter={question.meta.batteryDiameter}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                style={{ flex: 1, padding: 8 }}
              />
              <button onClick={handleSubmit}>Submit</button>
            </div>

            {result && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700 }}>{result.isCorrect ? '✅ Correct' : '❌ Not quite'}</div>
                <div>{result.feedback}</div>
                {!result.isCorrect && result.correct && (
                  <div style={{ marginTop: 6, opacity: 0.8 }}>
                    Correct: <span style={{ fontWeight: 800 }}>{formatCorrectAnswerWithScientific(result.correct)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* How to Solve Section */}
      {question && question?.parentType !== 'estimation' && (question?.subtype === 'conversion.basic' || question?.subtype === 'conversion.density' || shouldShowRailroad) && (
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>How to Solve</div>
          
          {question?.subtype === 'conversion.density' && question.meta && (() => {
  // Parse input values
  const inputNumPrefixExp = densityInputNumPrefixExp.trim() === '' ? null : Number(densityInputNumPrefixExp);
  const outputNumPrefixExp = densityOutputNumPrefixExp.trim() === '' ? null : Number(densityOutputNumPrefixExp);
  const inputDenPrefixExp = densityInputDenPrefixExp.trim() === '' ? null : Number(densityInputDenPrefixExp);
  const outputDenPrefixExp = densityOutputDenPrefixExp.trim() === '' ? null : Number(densityOutputDenPrefixExp);
  const numPower = densityNumPower.trim() === '' ? null : Number(densityNumPower);
  const denPower = densityDenPower.trim() === '' ? null : Number(densityDenPower);
  const valueExp = densityValueExp.trim() === '' ? null : Number(densityValueExp);
  
  // Check each input against correct value
  const inputNumPrefixExpCorrect = inputNumPrefixExp !== null && Number.isFinite(inputNumPrefixExp) && Math.abs(inputNumPrefixExp - (question.meta.inputNumPrefixExp ?? 0)) < 0.001;
  const outputNumPrefixExpCorrect = outputNumPrefixExp !== null && Number.isFinite(outputNumPrefixExp) && Math.abs(outputNumPrefixExp - (question.meta.outputNumPrefixExp ?? 0)) < 0.001;
  const inputDenPrefixExpCorrect = inputDenPrefixExp !== null && Number.isFinite(inputDenPrefixExp) && Math.abs(inputDenPrefixExp - (question.meta.inputDenPrefixExp ?? 0)) < 0.001;
  const outputDenPrefixExpCorrect = outputDenPrefixExp !== null && Number.isFinite(outputDenPrefixExp) && Math.abs(outputDenPrefixExp - (question.meta.outputDenPrefixExp ?? 0)) < 0.001;
  const numPowerCorrect = numPower !== null && Number.isFinite(numPower) && Math.abs(numPower - (question.meta.numPower ?? 1)) < 0.001;
  const denPowerCorrect = denPower !== null && Number.isFinite(denPower) && Math.abs(denPower - (question.meta.denPower ?? 1)) < 0.001;
  const valueExpCorrect = valueExp !== null && Number.isFinite(valueExp) && Math.abs(valueExp - (question.meta.questionValueExponent ?? 0)) < 0.001;
  
  // Calculate exponent if all values are provided
  // Formula: (Input Num Prefix Exp - Output Num Prefix Exp) × Den Power + Question Value Exp - (Input Den Prefix Exp - Output Den Prefix Exp)
  let calculatedExponent: number | null = null;
  if (inputNumPrefixExp !== null && outputNumPrefixExp !== null && inputDenPrefixExp !== null && outputDenPrefixExp !== null && denPower !== null && valueExp !== null) {
    if (Number.isFinite(inputNumPrefixExp) && Number.isFinite(outputNumPrefixExp) && Number.isFinite(inputDenPrefixExp) && Number.isFinite(outputDenPrefixExp) && Number.isFinite(denPower) && Number.isFinite(valueExp)) {
      calculatedExponent = (inputNumPrefixExp - outputNumPrefixExp) * denPower + valueExp - (inputDenPrefixExp - outputDenPrefixExp);
    }
  }
  
  // Check if calculated exponent matches the correct one
  const isCorrect = calculatedExponent !== null && question.meta.finalExponent !== null && Math.abs(calculatedExponent - question.meta.finalExponent) < 0.001;
  
  // Helper function to get input background color
  const getInputBgColor = (hasValue: boolean, isCorrect: boolean) => {
    if (!hasValue) return '#fff';
    return isCorrect ? '#d4edda' : '#f8d7da'; // Light green for correct, light red for wrong
  };
  
  return (
    <div style={{ marginBottom: 12, padding: 14, border: '1px solid #ddd', borderRadius: 8, background: '#f9f9f9' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Recommended: Algorithm</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 8 }}>
          Density conversions can always be solved using:
        </div>
        <div style={{ 
          fontFamily: 'monospace', 
          background: '#fff', 
          padding: '10px 12px', 
          borderRadius: 6,
          border: '1px solid #ccc',
          marginBottom: 8
        }}>
          Exponent = ([Input Numerator Prefix Exponent] - [Output Numerator Prefix Exponent]) × [Squared or Cubed (Denominator)] + [Question Value Exponent] - ([Input Denominator Prefix Exponent] - [Output Denominator Prefix Exponent])
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>For this question:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '8px 12px', alignItems: 'center', fontSize: 13 }}>
            <label style={{ fontFamily: 'monospace' }}>Input Numerator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityInputNumPrefixExp}
              onChange={(e) => setDensityInputNumPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${inputNumPrefixExpCorrect ? '#28a745' : inputNumPrefixExp !== null && !inputNumPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(inputNumPrefixExp !== null, inputNumPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Output Numerator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityOutputNumPrefixExp}
              onChange={(e) => setDensityOutputNumPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${outputNumPrefixExpCorrect ? '#28a745' : outputNumPrefixExp !== null && !outputNumPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(outputNumPrefixExp !== null, outputNumPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Input Denominator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityInputDenPrefixExp}
              onChange={(e) => setDensityInputDenPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${inputDenPrefixExpCorrect ? '#28a745' : inputDenPrefixExp !== null && !inputDenPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(inputDenPrefixExp !== null, inputDenPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Output Denominator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityOutputDenPrefixExp}
              onChange={(e) => setDensityOutputDenPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${outputDenPrefixExpCorrect ? '#28a745' : outputDenPrefixExp !== null && !outputDenPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(outputDenPrefixExp !== null, outputDenPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Squared or Cubed (Numerator):</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityNumPower}
              onChange={(e) => setDensityNumPower(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${numPowerCorrect ? '#28a745' : numPower !== null && !numPowerCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(numPower !== null, numPowerCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Squared or Cubed (Denominator):</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityDenPower}
              onChange={(e) => setDensityDenPower(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${denPowerCorrect ? '#28a745' : denPower !== null && !denPowerCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(denPower !== null, denPowerCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Question Value Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityValueExp}
              onChange={(e) => setDensityValueExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${valueExpCorrect ? '#28a745' : valueExp !== null && !valueExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(valueExp !== null, valueExpCorrect),
              }}
            />
          </div>
          
          {/* Formula that fills in as you go */}
          <div style={{ marginTop: 16, padding: '12px', background: '#fff', borderRadius: 6, border: '1px solid #ccc' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>
              Answer Exponent = ({densityInputNumPrefixExp || ' '} - {densityOutputNumPrefixExp || ' '}) × {densityDenPower || ' '} + {densityValueExp || ' '} - ({densityInputDenPrefixExp || ' '} - {densityOutputDenPrefixExp || ' '}) = {calculatedExponent !== null ? calculatedExponent.toFixed(1) : ' '}
            </div>
            {calculatedExponent !== null && question.meta.finalExponent !== null && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {isCorrect ? (
                  <span style={{ fontWeight: 700, color: '#4CAF50' }}>
                    ✓ Correct! Expected: {question.meta.finalExponent}
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, color: '#f44336' }}>
                    ✗ Not quite. Expected: {question.meta.finalExponent}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})()}

          {question?.subtype === 'conversion.basic' && question.meta && (() => {
  // Parse input values
  const inputPrefixExp = algorithmInputPrefixExp.trim() === '' ? null : Number(algorithmInputPrefixExp);
  const outputPrefixExp = algorithmOutputPrefixExp.trim() === '' ? null : Number(algorithmOutputPrefixExp);
  const power = algorithmPower.trim() === '' ? null : Number(algorithmPower);
  const valueExp = algorithmValueExp.trim() === '' ? null : Number(algorithmValueExp);
  
  // Check each input against correct value
  const inputPrefixExpCorrect = inputPrefixExp !== null && Number.isFinite(inputPrefixExp) && Math.abs(inputPrefixExp - question.meta.fromPrefixExponent) < 0.001;
  const outputPrefixExpCorrect = outputPrefixExp !== null && Number.isFinite(outputPrefixExp) && Math.abs(outputPrefixExp - question.meta.toPrefixExponent) < 0.001;
  const powerCorrect = power !== null && Number.isFinite(power) && Math.abs(power - question.meta.power) < 0.001;
  const valueExpCorrect = valueExp !== null && Number.isFinite(valueExp) && Math.abs(valueExp - question.meta.questionValueExponent) < 0.001;
  
  // Calculate exponent if all values are provided
  let calculatedExponent: number | null = null;
  if (inputPrefixExp !== null && outputPrefixExp !== null && power !== null && valueExp !== null) {
    if (Number.isFinite(inputPrefixExp) && Number.isFinite(outputPrefixExp) && Number.isFinite(power) && Number.isFinite(valueExp)) {
      calculatedExponent = (inputPrefixExp - outputPrefixExp) * power + valueExp;
    }
  }
  
  // Check if calculated exponent matches the correct one
  const isCorrect = calculatedExponent !== null && Math.abs(calculatedExponent - question.meta.finalExponent) < 0.001;
  
  // Helper function to get input background color
  const getInputBgColor = (hasValue: boolean, isCorrect: boolean) => {
    if (!hasValue) return '#fff';
    return isCorrect ? '#d4edda' : '#f8d7da'; // Light green for correct, light red for wrong
  };
  
  return (
    <div style={{ marginBottom: 12, padding: 14, border: '1px solid #ddd', borderRadius: 8, background: '#f9f9f9' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Recommended: Algorithm</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 8 }}>
          Basic conversions can always be solved using:
        </div>
        <div style={{ 
          fontFamily: 'monospace', 
          background: '#fff', 
          padding: '10px 12px', 
          borderRadius: 6,
          border: '1px solid #ccc',
          marginBottom: 8
        }}>
          Exponent = ([Input Prefix Exponent] - [Output Prefix Exponent]) × [Squared or Cubed Units] + [Question Value Exponent]
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>For this question:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '8px 12px', alignItems: 'center', fontSize: 13 }}>
            <label style={{ fontFamily: 'monospace' }}>Input Prefix Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmInputPrefixExp}
              onChange={(e) => setAlgorithmInputPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${inputPrefixExpCorrect ? '#28a745' : inputPrefixExp !== null && !inputPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(inputPrefixExp !== null, inputPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Output Prefix Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmOutputPrefixExp}
              onChange={(e) => setAlgorithmOutputPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${outputPrefixExpCorrect ? '#28a745' : outputPrefixExp !== null && !outputPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(outputPrefixExp !== null, outputPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Squared or Cubed Units:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmPower}
              onChange={(e) => setAlgorithmPower(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${powerCorrect ? '#28a745' : power !== null && !powerCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(power !== null, powerCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Question Value Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmValueExp}
              onChange={(e) => setAlgorithmValueExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${valueExpCorrect ? '#28a745' : valueExp !== null && !valueExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(valueExp !== null, valueExpCorrect),
              }}
            />
          </div>
          
          {/* Formula that fills in as you go */}
          <div style={{ marginTop: 16, padding: '12px', background: '#fff', borderRadius: 6, border: '1px solid #ccc' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>
              Answer Exponent = ({algorithmInputPrefixExp || ' '} - {algorithmOutputPrefixExp || ' '}) × {algorithmPower || ' '} + {algorithmValueExp || ' '} = {calculatedExponent !== null ? calculatedExponent.toFixed(1) : ' '}
            </div>
            {calculatedExponent !== null && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {isCorrect ? (
                  <span style={{ fontWeight: 700, color: '#4CAF50' }}>
                    ✓ Correct! Expected: {question.meta.finalExponent}
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, color: '#f44336' }}>
                    ✗ Not quite. Expected: {question.meta.finalExponent}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})()}

          {(question?.subtype === 'conversion.density' || shouldShowRailroad) && (
            <div style={{ marginBottom: 12, padding: 14, border: '1px solid #ddd', borderRadius: 8, background: '#f9f9f9' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Alternate: Railroad Conversion</div>
              <RailroadWork
                steps={workSteps}
                onChange={setWorkSteps}
                showUnitsHint={true}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
