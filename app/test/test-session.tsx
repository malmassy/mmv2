'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listSubtypes, SUBTYPE_BY_ID } from '../lib/engine/registry';
import type { GradeOptions, GradeResult, Question } from '../lib/engine/types';
import type { TestSetupConfig } from './test-config';
import LengthEstimation from '../components/LengthEstimation';
import CommonObjectEstimation from '../components/CommonObjectEstimation';
import { getCalibration } from '../lib/engine/utils/screenCalibration';

const DEFAULT_TEST_SECONDS = 10 * 60;
const DEFAULT_TEST_QUESTION_COUNT = 5;
const MAX_TEST_QUESTION_COUNT = 5;
const STORAGE_KEY = 'metricmastery_test_v1';
const SAVED_TESTS_KEY = 'metricmastery_saved_tests_v1';
const MAX_PER_SUBTYPE = 2;

type Props = {
  config: TestSetupConfig;
};

type AnswerState = Record<string, string>; // questionId -> raw input

type StoredTestState = {
  startedAt: number;
  questions: Question[];
  answers: AnswerState;
  submitted: boolean;
  score: { correct: number; total: number } | null;
  showResults: boolean;
  gradeById: Record<string, GradeResult>;
  testId?: string;
  savedCode?: string;
};

type SavedTest = {
  code: string;
  testId?: string;
  config: TestSetupConfig;
  questions: Question[];
  answers: AnswerState;
  score: { correct: number; total: number };
  gradeById: Record<string, GradeResult>;
  savedAt: number;
};

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a short alphanumeric code (6-8 characters) for saving tests
 */
function generateTestCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

export default function TestSession({ config }: Props) {
  const subtypes = useMemo(() => listSubtypes(), []);
  const testSeconds = config.timeSeconds ?? DEFAULT_TEST_SECONDS;

  // Separate questions by phase
  const [estimationQuestions, setEstimationQuestions] = useState<Question[]>([]);
  const [conversionQuestions, setConversionQuestions] = useState<Question[]>([]);
  const [measurementQuestions, setMeasurementQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  const [showResults, setShowResults] = useState(false);
  const [gradeById, setGradeById] = useState<Record<string, GradeResult>>({});

  // Test phase: 'estimation' | 'conversion' | 'measurement' | 'results'
  const [currentPhase, setCurrentPhase] = useState<'estimation' | 'conversion' | 'measurement' | 'results'>('estimation');
  
  // Calibration state for estimation phase
  const [estimationCalibrated, setEstimationCalibrated] = useState(false);
  const [showCalibrationPrompt, setShowCalibrationPrompt] = useState(false);

  // Timer for conversion questions (total time)
  const [secondsLeft, setSecondsLeft] = useState(testSeconds);
  const startedAtRef = useRef<number | null>(null);
  const autoSubmittedRef = useRef(false);
  
  // Estimation question state
  const [estimationQuestionTimer, setEstimationQuestionTimer] = useState(0);
  const estimationQuestionStartedRef = useRef<number | null>(null);
  const [currentEstimationQuestionIndex, setCurrentEstimationQuestionIndex] = useState(0);
  const [expiredEstimationQuestionIndices, setExpiredEstimationQuestionIndices] = useState<Set<number>>(new Set());
  
  // Pause functionality
  const [isPaused, setIsPaused] = useState(false);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedTimeRef = useRef<number>(0); // Total time spent paused in seconds
  
  // Save test functionality
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Combined questions list for compatibility
  const questions = useMemo(() => [...estimationQuestions, ...conversionQuestions, ...measurementQuestions], [estimationQuestions, conversionQuestions, measurementQuestions]);

  // Determine which phase should be active based on available questions
  const enabledPhases = useMemo(() => {
    const phases: Array<'estimation' | 'conversion' | 'measurement'> = [];
    if (estimationQuestions.length > 0) phases.push('estimation');
    if (conversionQuestions.length > 0) phases.push('conversion');
    if (measurementQuestions.length > 0) phases.push('measurement');
    return phases;
  }, [estimationQuestions.length, conversionQuestions.length, measurementQuestions.length]);

  // Get current phase questions
  const currentPhaseQuestions = useMemo(() => {
    if (currentPhase === 'estimation') return estimationQuestions;
    if (currentPhase === 'conversion') return conversionQuestions;
    if (currentPhase === 'measurement') return measurementQuestions;
    return [];
  }, [currentPhase, estimationQuestions, conversionQuestions, measurementQuestions]);

  // Create/restore session
  useEffect(() => {
    // When a new config is provided via URL, always generate a new test
    // Clear any existing localStorage to ensure fresh start
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    // Ensure subtypes are loaded before generating questions
    if (subtypes.length === 0) {
      console.warn('[TestSession] No subtypes available yet, waiting...', {
        subtypesCount: subtypes.length,
        SUBTYPE_BY_ID_keys: Object.keys(SUBTYPE_BY_ID),
      });
      return;
    }
    
    // New session - always generate based on config
    const startedAt = Date.now();
    startedAtRef.current = startedAt;

    // Separate questions by phase
    const estimationQs: Question[] = [];
    const conversionQs: Question[] = [];
    const measurementQs: Question[] = [];
    
    // Filter subtypes by parentType
    const conversionSubtypes = subtypes.filter(s => s.parentType === 'conversion');
    const estimationSubtypes = subtypes.filter(s => s.parentType === 'estimation');
    const measurementSubtypes = subtypes.filter(s => s.parentType === 'measurement');

    // Generate conversion questions (exclude estimation subtypes)
    const counts: Record<string, number> = {};
    let totalNeeded = 0;
    const subtypeTargets: Array<{ id: string; count: number }> = [];
    
    for (const [subtypeId, count] of Object.entries(config.countsBySubtypeId)) {
      const st = SUBTYPE_BY_ID[subtypeId];
      // Only include conversion subtypes
      if (st && st.parentType === 'conversion' && count !== null && count > 0) {
        subtypeTargets.push({ id: subtypeId, count });
        totalNeeded += count;
      }
    }

    // If no specific counts, use default behavior
    if (totalNeeded === 0) {
      totalNeeded = DEFAULT_TEST_QUESTION_COUNT;
    }

    // Cap total questions at maximum
    if (totalNeeded > MAX_TEST_QUESTION_COUNT) {
      const scaleFactor = MAX_TEST_QUESTION_COUNT / totalNeeded;
      let cappedTotal = 0;
      
      for (const target of subtypeTargets) {
        target.count = Math.floor(target.count * scaleFactor);
        cappedTotal += target.count;
      }
      
      let remaining = MAX_TEST_QUESTION_COUNT - cappedTotal;
      let index = 0;
      while (remaining > 0 && index < subtypeTargets.length) {
        const originalCount = config.countsBySubtypeId[subtypeTargets[index].id];
        if (originalCount !== null && originalCount > 0) {
          subtypeTargets[index].count += 1;
          cappedTotal += 1;
          remaining -= 1;
        }
        index = (index + 1) % subtypeTargets.length;
      }
      
      totalNeeded = MAX_TEST_QUESTION_COUNT;
    }

    // Generate conversion questions
    for (const { id: subtypeId, count } of subtypeTargets) {
      if (conversionQs.length >= MAX_TEST_QUESTION_COUNT) break;
      
      const st = SUBTYPE_BY_ID[subtypeId];
      if (!st) continue;
      
      try {
        for (let i = 0; i < count && conversionQs.length < MAX_TEST_QUESTION_COUNT; i++) {
          const q = st.generate();
          conversionQs.push(q);
          counts[subtypeId] = (counts[subtypeId] ?? 0) + 1;
        }
      } catch (error) {
        console.error('[TestSession] Error generating conversion question:', subtypeId, error);
      }
    }

    // Fill remaining slots with random conversion subtypes
    const actualTotalNeeded = Math.min(totalNeeded, MAX_TEST_QUESTION_COUNT);
    let attempts = 0;
    
    while (conversionQs.length < actualTotalNeeded && attempts < 500) {
      attempts++;
      
      const availableSubtypes = conversionSubtypes.filter((s) => {
        const targetCount = config.countsBySubtypeId[s.id];
        if (targetCount === null) return true;
        const currentCount = counts[s.id] ?? 0;
        return currentCount < targetCount;
      });

      if (availableSubtypes.length === 0) break;

      const chosen = availableSubtypes[randInt(0, availableSubtypes.length - 1)];
      const st = SUBTYPE_BY_ID[chosen.id];
      if (!st) continue;

      try {
        const q = st.generate();
        conversionQs.push(q);
        counts[chosen.id] = (counts[chosen.id] ?? 0) + 1;
      } catch (error) {
        console.error('[TestSession] Error generating conversion question:', chosen.id, error);
      }
    }

    // Generate estimation questions if enabled
    if (config.estimation?.enabled && estimationSubtypes.length > 0) {
      const estimationCount = config.estimation.questionCount || 1;
      for (let i = 0; i < estimationCount; i++) {
        const chosen = estimationSubtypes[randInt(0, estimationSubtypes.length - 1)];
        const st = SUBTYPE_BY_ID[chosen.id];
        if (st) {
          try {
            const q = st.generate();
            estimationQs.push(q);
          } catch (error) {
            console.error('[TestSession] Error generating estimation question:', chosen.id, error);
          }
        }
      }
    }

    if (conversionQs.length === 0 && estimationQs.length === 0 && measurementQs.length === 0) {
      console.error('[TestSession] Failed to generate any questions!');
      return;
    }

    console.log('[TestSession] Generated', estimationQs.length, 'estimation,', conversionQs.length, 'conversion, and', measurementQs.length, 'measurement questions');

    const state: StoredTestState = {
      startedAt,
      questions: [...estimationQs, ...conversionQs, ...measurementQs],
      answers: {},
      submitted: false,
      score: null,
      showResults: false,
      gradeById: {},
    };

    setEstimationQuestions(estimationQs);
    setConversionQuestions(conversionQs);
    setMeasurementQuestions(measurementQs);
    
    // Initialize first phase
    if (estimationQs.length > 0) {
      setCurrentPhase('estimation');
      estimationQuestionStartedRef.current = null; // Will be started by the timer useEffect after calibration
      setCurrentEstimationQuestionIndex(0);
      setExpiredEstimationQuestionIndices(new Set());
      // Always show calibration prompt first for estimation phase
      setShowCalibrationPrompt(true);
      setEstimationCalibrated(false);
    } else if (conversionQs.length > 0) {
      setCurrentPhase('conversion');
    } else if (measurementQs.length > 0) {
      setCurrentPhase('measurement');
    } else {
      setCurrentPhase('results');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [subtypes, config]);

  // Persist on change
  useEffect(() => {
    if (!startedAtRef.current) return;

    const state: StoredTestState = {
      startedAt: startedAtRef.current,
      questions,
      answers,
      submitted,
      score,
      showResults,
      gradeById,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [questions, answers, submitted, score, showResults, gradeById]);

  // Timer ticking + auto-submit for conversion questions (only during conversion phase)
  useEffect(() => {
    if (!startedAtRef.current) return;
    if (submitted) return;
    if (isPaused) return; // Don't tick when paused
    if (currentPhase !== 'conversion') return; // Only run during conversion phase
    if (conversionQuestions.length === 0) return; // Only run if there are conversion questions

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - (startedAtRef.current || now)) / 1000);
      // Subtract total paused time from elapsed time
      const activeElapsed = elapsed - totalPausedTimeRef.current;
      const left = testSeconds - activeElapsed;

      setSecondsLeft(left);

      if (left <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleSubmit(true);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, testSeconds, isPaused, conversionQuestions.length, currentPhase]);

  // Timer for estimation questions (only during estimation phase, after calibration)
  useEffect(() => {
    if (submitted) return;
    if (isPaused) return;
    if (currentPhase !== 'estimation') return; // Only run during estimation phase
    if (showCalibrationPrompt) return; // Don't start timer until calibration is complete
    if (estimationQuestions.length === 0) return;
    
    const timePerQuestion = config.estimation?.timePerQuestionSeconds || 60;
    
    // Initialize timer when calibration is complete and questions are shown
    if (estimationQuestionStartedRef.current === null) {
      estimationQuestionStartedRef.current = Date.now();
      setEstimationQuestionTimer(timePerQuestion);
      // Don't return - continue to set up the tick interval
    }

    const tick = () => {
      if (!estimationQuestionStartedRef.current) return;
      
      const now = Date.now();
      const elapsed = Math.floor((now - estimationQuestionStartedRef.current) / 1000);
      const left = timePerQuestion - elapsed;
      
      setEstimationQuestionTimer(Math.max(0, left));

      // Auto-advance when time expires
      if (left <= 0) {
        // Mark current question as expired
        setExpiredEstimationQuestionIndices(prev => {
          const newSet = new Set(prev);
          newSet.add(currentEstimationQuestionIndex);
          return newSet;
        });
        
        // Move to next question if available
        if (currentEstimationQuestionIndex < estimationQuestions.length - 1) {
          const nextIndex = currentEstimationQuestionIndex + 1;
          setCurrentEstimationQuestionIndex(nextIndex);
          estimationQuestionStartedRef.current = Date.now();
          setEstimationQuestionTimer(timePerQuestion);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [submitted, isPaused, estimationQuestions.length, config.estimation, currentPhase, showCalibrationPrompt, currentEstimationQuestionIndex]);

  // Function to advance to next estimation question manually
  function handleNextEstimationQuestion() {
    if (currentPhase !== 'estimation') return;
    if (currentEstimationQuestionIndex >= estimationQuestions.length - 1) return;
    
    // Mark current question as expired
    setExpiredEstimationQuestionIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(currentEstimationQuestionIndex);
      return newSet;
    });
    
    // Move to next question
    const nextIndex = currentEstimationQuestionIndex + 1;
    setCurrentEstimationQuestionIndex(nextIndex);
    estimationQuestionStartedRef.current = Date.now();
    const timePerQuestion = config.estimation?.timePerQuestionSeconds || 60;
    setEstimationQuestionTimer(timePerQuestion);
  }

  // Function to advance to next phase
  function handleNextPhase() {
    if (currentPhase === 'estimation') {
      if (enabledPhases.includes('conversion')) {
        setCurrentPhase('conversion');
        // Start conversion timer
        if (!startedAtRef.current) {
          startedAtRef.current = Date.now();
        }
      } else if (enabledPhases.includes('measurement')) {
        setCurrentPhase('measurement');
      } else {
        setCurrentPhase('results');
      }
    } else if (currentPhase === 'conversion') {
      if (enabledPhases.includes('measurement')) {
        setCurrentPhase('measurement');
      } else {
        setCurrentPhase('results');
      }
    } else if (currentPhase === 'measurement') {
      setCurrentPhase('results');
    }
  }

  // Determine if we can advance to next phase
  const canAdvancePhase = useMemo(() => {
    if (currentPhase === 'estimation') {
      // Can advance after calibration is complete (questions are shown, timer running)
      return !showCalibrationPrompt && estimationQuestions.length > 0;
    }
    // For conversion and measurement, user can advance manually (or auto-submit when time expires)
    return currentPhase !== 'results';
  }, [currentPhase, showCalibrationPrompt, estimationQuestions.length]);

  function setAnswer(questionId: string, value: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit(_isAuto = false) {
    if (submitted) return;

    const gradeOpts: GradeOptions = {
      enforceSigFigs: true,
      enforceUnits: true,
    };

    const byId: Record<string, GradeResult> = {};
    let correct = 0;

    for (const q of questions) {
      const raw = (answers[q.id] ?? '').trim();
      const st = SUBTYPE_BY_ID[q.subtype];
      const res = st.grade(q, raw, gradeOpts);

      byId[q.id] = res;
      if (res.isCorrect) correct++;
    }

    setGradeById(byId);
    setSubmitted(true);
    setScore({ correct, total: questions.length });
    setSecondsLeft(0);

    // Open results by default after submit
    setShowResults(true);
  }

  function handlePause() {
    if (isPaused) {
      // Resuming: add the pause duration to total paused time
      if (pausedAtRef.current) {
        const pauseDuration = Math.floor((Date.now() - pausedAtRef.current) / 1000);
        totalPausedTimeRef.current += pauseDuration;
        pausedAtRef.current = null;
      }
      setIsPaused(false);
    } else {
      // Pausing: record when we paused
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  }

  function handleSaveTest() {
    if (!submitted || !score) return;

    // Generate a unique code
    let code = generateTestCode();
    
    // Ensure code is unique (check existing saved tests)
    const existing = localStorage.getItem(SAVED_TESTS_KEY);
    const savedTests: Record<string, SavedTest> = existing ? JSON.parse(existing) : {};
    
    // Regenerate if code already exists (very unlikely with 6 chars, but safety check)
    while (savedTests[code]) {
      code = generateTestCode();
    }

    // Create saved test object
    const savedTest: SavedTest = {
      code,
      testId: config.testId,
      config,
      questions,
      answers,
      score,
      gradeById,
      savedAt: Date.now(),
    };

    // Save to localStorage
    savedTests[code] = savedTest;
    localStorage.setItem(SAVED_TESTS_KEY, JSON.stringify(savedTests));

    // Update state
    setSavedCode(code);
    setShowSaveSuccess(true);

    // Also update the current test state to remember it's saved
    const currentState = localStorage.getItem(STORAGE_KEY);
    if (currentState) {
      try {
        const parsed = JSON.parse(currentState) as StoredTestState;
        parsed.savedCode = code;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignore errors
      }
    }
  }

  function handleCopyCode() {
    if (savedCode) {
      navigator.clipboard.writeText(savedCode).then(() => {
        // Could show a brief "Copied!" message
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = savedCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    }
  }

  function restartTest() {
    // If test is in progress (not submitted), show confirmation
    if (!submitted) {
      if (!confirm('Are you sure you want to start a new test? All progress on this test will be lost.')) {
        return;
      }
    }
    
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/test';
  }

  // Determine which timer to use for styling
  const activeTimer = currentPhase === 'estimation' && !showCalibrationPrompt
    ? estimationQuestionTimer 
    : secondsLeft;
  
  const clockClass =
    !submitted && activeTimer <= 60
      ? 'test-timer-clock danger'
      : !submitted && activeTimer <= 120
        ? 'test-timer-clock warning'
        : 'test-timer-clock';

  if (!questions.length) return <div style={{ padding: 16 }}>Loading test…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      {/* Sticky timer bar */}
      <div className="test-timer-bar">
        <div className="test-timer-meta">
          <div className="test-timer-title">Test Mode</div>
          <div className="test-timer-subtitle">
            {questions.length} question{questions.length !== 1 ? 's' : ''} • answer in any order • {
              currentPhase === 'estimation' && config.estimation?.timePerQuestionSeconds
                ? `${config.estimation.timePerQuestionSeconds} seconds per station`
                : `${Math.floor(testSeconds / 60)} minute${Math.floor(testSeconds / 60) !== 1 ? 's' : ''}`
            }
          </div>
        </div>

        <div className={clockClass} aria-label="Time remaining" title="Time remaining">
          {submitted ? '0:00' : isPaused ? 'PAUSED' : 
            currentPhase === 'estimation' && !showCalibrationPrompt
              ? formatMMSS(estimationQuestionTimer) 
              : currentPhase === 'conversion'
              ? formatMMSS(secondsLeft)
              : '--:--'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Next Question button (for estimation phase) */}
          {currentPhase === 'estimation' && !submitted && !showCalibrationPrompt && 
           currentEstimationQuestionIndex < estimationQuestions.length - 1 && (
            <button 
              className="test-restart-btn" 
              onClick={handleNextEstimationQuestion}
              style={{ 
                backgroundColor: '#4CAF50',
                color: '#ffffff',
                border: 'none',
              }}
            >
              Next Question
            </button>
          )}
          
          {/* Next Part button (to advance to next phase) */}
          {canAdvancePhase && !submitted && (
            <button 
              className="test-restart-btn" 
              onClick={handleNextPhase}
              style={{ 
                backgroundColor: '#2E7D32',
                color: '#ffffff',
                border: 'none',
              }}
            >
              Next Part
            </button>
          )}

          {!submitted && (
            <button 
              className="test-restart-btn" 
              onClick={handlePause}
              style={{ 
                backgroundColor: isPaused ? '#66BB6A' : '#4CAF50',
                color: '#ffffff',
                border: 'none',
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          <button className="test-submit-btn" onClick={() => handleSubmit(false)} disabled={submitted || isPaused}>
            Submit
          </button>

          {submitted && (
            <button className="test-restart-btn" onClick={() => setShowResults((v) => !v)}>
              {showResults ? 'Hide Results' : 'View Results'}
            </button>
          )}

          <button className="test-restart-btn" onClick={restartTest}>
            New Test
          </button>
        </div>
      </div>

      {/* Score banner */}
      {submitted && score && (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              Score: {score.correct} / {score.total}
            </div>
            {!savedCode && (
              <button
                onClick={handleSaveTest}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.10)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Save Test
              </button>
            )}
          </div>
          
          {/* Save success message */}
          {showSaveSuccess && savedCode && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(76, 175, 80, 0.15)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#4CAF50' }}>
                ✓ Test saved successfully!
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ opacity: 0.9 }}>Test Code:</span>
                <code
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: '#4CAF50',
                  }}
                >
                  {savedCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Copy
                </button>
              </div>
              {config.testId && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                  Test ID: {config.testId}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !submitted && (
        <div
          style={{
            border: '2px solid #ff9800',
            borderRadius: 16,
            padding: 32,
            marginBottom: 16,
            background: 'rgba(255, 152, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 8, color: '#ff9800' }}>
            ⏸ Test Paused
          </div>
          <div style={{ opacity: 0.9, fontSize: 16 }}>
            The timer has been paused. Your answers are saved. Click <strong>Resume</strong> to continue.
          </div>
        </div>
      )}

      {/* Phase indicator */}
      {!submitted && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: 12, 
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 16,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 16,
          textTransform: 'uppercase',
        }}>
          {currentPhase === 'estimation' ? 'Estimation' : 
           currentPhase === 'conversion' ? 'Conversion' : 
           currentPhase === 'measurement' ? 'Measurement' : 
           'Results'}
        </div>
      )}

      {/* Calibration prompt for estimation phase - shown without questions */}
      {currentPhase === 'estimation' && showCalibrationPrompt && !submitted && (
        <div style={{
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: 14,
          padding: 24,
          background: 'rgba(255,255,255,0.05)',
          marginBottom: 16,
        }}>
          <LengthEstimation 
            lengthCm={10} 
            onCalibrationComplete={() => {
              setEstimationCalibrated(true);
              setShowCalibrationPrompt(false);
              // Start the timer when calibration is complete
              if (estimationQuestionStartedRef.current === null && estimationQuestions.length > 0) {
                const timePerQuestion = config.estimation?.timePerQuestionSeconds || 60;
                estimationQuestionStartedRef.current = Date.now();
                setEstimationQuestionTimer(timePerQuestion);
              }
            }} 
          />
        </div>
      )}

      {/* Current phase questions (or all questions when showing results) */}
      {(!isPaused || submitted) && !(currentPhase === 'estimation' && showCalibrationPrompt) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(() => {
            // When showing results, display all questions grouped by phase
            if (submitted && showResults) {
              const phaseGroups: Array<{ phase: 'estimation' | 'conversion' | 'measurement'; questions: Question[] }> = [];
              if (estimationQuestions.length > 0) {
                phaseGroups.push({ phase: 'estimation', questions: estimationQuestions });
              }
              if (conversionQuestions.length > 0) {
                phaseGroups.push({ phase: 'conversion', questions: conversionQuestions });
              }
              if (measurementQuestions.length > 0) {
                phaseGroups.push({ phase: 'measurement', questions: measurementQuestions });
              }

              return phaseGroups.map((group, groupIdx) => (
                <div key={group.phase} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {groupIdx > 0 && (
                    <div style={{ 
                      padding: '12px 16px', 
                      borderRadius: 12, 
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 16,
                      textTransform: 'uppercase',
                      marginTop: groupIdx > 0 ? 8 : 0,
                    }}>
                      {group.phase === 'estimation' ? 'Estimation' : 
                       group.phase === 'conversion' ? 'Conversion' : 
                       'Measurement'}
                    </div>
                  )}
                  {group.questions.map((q, idx) => {
                    const res = gradeById[q.id];
                    const globalIndex = questions.findIndex(q2 => q2.id === q.id);

                    return (
                      <div
                        key={q.id}
                        id={`q-${q.id}`}
                        style={{
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 14,
                          padding: 12,
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ fontWeight: 900 }}>
                            Question {globalIndex + 1}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>
                            {(answers[q.id] ?? '').trim() ? 'Answered' : 'Not answered'}
                          </div>
                        </div>

                        <div style={{ marginTop: 8, opacity: 0.95, lineHeight: 1.35 }}>{q.prompt}</div>

                        <div style={{ marginTop: 10 }}>
                          <input
                            value={answers[q.id] ?? ''}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            disabled={submitted}
                            placeholder="Enter your answer…"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.14)',
                              background: 'rgba(0,0,0,0.25)',
                              color: 'white',
                              outline: 'none',
                            }}
                          />
                        </div>

                        {/* Results (after submit + toggled on) */}
                        {res && (
                          <div className={`test-result ${res.isCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 900 }}>{res.isCorrect ? 'Correct' : 'Incorrect'}</div>

                            {res.correctAnswerDisplay && (
                              <div style={{ marginTop: 4 }}>
                                <span style={{ opacity: 0.8 }}>Correct answer: </span>
                                <span style={{ fontWeight: 800 }}>
                                  {formatCorrectAnswerWithScientific(res.correctAnswerDisplay)}
                                </span>
                              </div>
                            )}

                            {res.feedback && <div style={{ marginTop: 6, opacity: 0.92 }}>{res.feedback}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            } else {
              // Normal mode: show current phase questions
              return currentPhaseQuestions.map((q, idx) => {
                const res = gradeById[q.id];
                // For estimation questions, only show image for current question and not if expired
                const shouldShowImage = !submitted && 
                                       currentPhase === 'estimation' && 
                                       idx === currentEstimationQuestionIndex && 
                                       !expiredEstimationQuestionIndices.has(idx);

                return (
                  <div
                    key={q.id}
                    id={`q-${q.id}`}
                    style={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 14,
                      padding: 12,
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {/* Image display above question (for estimation questions) - only for current question */}
                    {shouldShowImage && (
                      <div style={{ marginBottom: 16 }}>
                        {q.subtype === 'estimation.length' && q.meta.lengthCm && (
                          <LengthEstimation lengthCm={q.meta.lengthCm as number} />
                        )}
                        {q.subtype === 'estimation.commonObjects' && q.meta.objectCategory && (
                          <CommonObjectEstimation
                            objectCategory={q.meta.objectCategory as 'coin' | 'battery'}
                            objectType={q.meta.objectType as any}
                            objectName={q.meta.objectName as string}
                            measurementType={q.meta.measurementType as any}
                            measurementLabel={q.meta.measurementLabel as string}
                            coinDiameter={q.meta.coinDiameter as number | undefined}
                            coinThickness={q.meta.coinThickness as number | undefined}
                            batteryLength={q.meta.batteryLength as number | undefined}
                            batteryDiameter={q.meta.batteryDiameter as number | undefined}
                          />
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 900 }}>Question {idx + 1}</div>
                      <div style={{ opacity: 0.75, fontSize: 13 }}>
                        {(answers[q.id] ?? '').trim() ? 'Answered' : 'Not answered'}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.95, lineHeight: 1.35 }}>{q.prompt}</div>

                    <div style={{ marginTop: 10 }}>
                      <input
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        disabled={submitted}
                        placeholder="Enter your answer…"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(0,0,0,0.25)',
                          color: 'white',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Results (after submit + toggled on) */}
                    {submitted && showResults && res && (
                      <div className={`test-result ${res.isCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 900 }}>{res.isCorrect ? 'Correct' : 'Incorrect'}</div>

                        {res.correctAnswerDisplay && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ opacity: 0.8 }}>Correct answer: </span>
                            <span style={{ fontWeight: 800 }}>
                              {formatCorrectAnswerWithScientific(res.correctAnswerDisplay)}
                            </span>
                          </div>
                        )}

                        {res.feedback && <div style={{ marginTop: 6, opacity: 0.92 }}>{res.feedback}</div>}
                      </div>
                    )}
                  </div>
                );
              });
            }
          })()}
        </div>
      )}


      <div style={{ height: 24 }} />
    </div>
  );
}
