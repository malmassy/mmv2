'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { listSubtypes, SUBTYPE_BY_ID } from '../lib/engine/registry';
import type { AttemptDraft, Question } from '../lib/engine/types';
import RailroadWork, { RailroadStep } from '../components/RailroadWork';

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

  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{
    feedback: string;
    isCorrect: boolean;
    correct?: string;
  } | null>(null);

  // Algorithm input values (for basic conversion only)
  const [algorithmInputPrefixExp, setAlgorithmInputPrefixExp] = useState<string>('');
  const [algorithmOutputPrefixExp, setAlgorithmOutputPrefixExp] = useState<string>('');
  const [algorithmPower, setAlgorithmPower] = useState<string>('');
  const [algorithmValueExp, setAlgorithmValueExp] = useState<string>('');

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
    <main style={{ padding: '2rem', maxWidth: 900 }}>
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

    <label className="controlRow">
      <input
        type="checkbox"
        checked={enforceSigFigs}
        onChange={(e) => setEnforceSigFigs(e.target.checked)}
      />
      <span>Enforce Sig Figs</span>
    </label>

    <label className="controlRow">
      <input
        type="checkbox"
        checked={enforceUnits}
        onChange={(e) => setEnforceUnits(e.target.checked)}
      />
      <span>Enforce Units</span>
    </label>
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
                  <div style={{ marginTop: 6, opacity: 0.8 }}>Correct: {result.correct}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* How to Solve Section */}
      {question && (question?.subtype === 'conversion.basic' || shouldShowRailroad) && (
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>How to Solve</div>
          
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

          {shouldShowRailroad && (
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
