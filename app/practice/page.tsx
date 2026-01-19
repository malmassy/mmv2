'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { listSubtypes, SUBTYPE_BY_ID } from '../lib/engine/registry';
import type { AttemptDraft, Question } from '../lib/engine/types';
import RailroadWork, { RailroadStep } from '../components/RailroadWork';
import LengthEstimation from '../components/LengthEstimation';
import CommonObjectEstimation from '../components/CommonObjectEstimation';
import BasicConversionWidget from '../components/BasicConversionWidget';
import DensityConversionWidget from '../components/DensityConversionWidget';
import HowToSolveModal from '../components/HowToSolveModal';

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
  const [enforceSigFigs, setEnforceSigFigs] = useState(defaultSubtypeId === 'conversion.basic');
  const [enforceUnits, setEnforceUnits] = useState(true);
  const [estimationVarianceBand, setEstimationVarianceBand] = useState<'regionals' | 'states' | 'nationals'>('states');

  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{
    feedback: string;
    isCorrect: boolean;
    correct?: string;
  } | null>(null);
  const [showHowToSolve, setShowHowToSolve] = useState(false);

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

  // Set default options for basic conversions
  useEffect(() => {
    if (subtypeId === 'conversion.basic') {
      setEnforceSigFigs(true);
      setEnforceUnits(true);
    }
  }, [subtypeId]);

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
    <button 
      onClick={() => setShowHowToSolve(true)}
      style={{
        padding: '8px 16px',
        fontSize: '14px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #ccc',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      How to Solve
    </button>
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
          
          <BasicConversionWidget question={question} />
          <DensityConversionWidget question={question} />

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

      <HowToSolveModal 
        isOpen={showHowToSolve}
        onClose={() => setShowHowToSolve(false)}
        subtypeId={subtypeId}
      />
    </main>
  );
}
