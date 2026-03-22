'use client';

import { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listSubtypes } from '../lib/engine/registry';
import type { TestSetupConfig } from './test-config';
import TestSession from './test-session';

const DEFAULT_TEST_SECONDS = 10 * 60; // 10 minutes default

type CountsBySubtypeId = Record<string, number | null>;

function base64UrlEncode(str: string) {
  // btoa expects latin1; encode as utf-8 first
  const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const b64 = btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(encoded: string): string {
  // Decode base64url to string
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (b64.length % 4) {
    b64 += '=';
  }
  try {
    const binary = atob(b64);
    // Convert binary string to UTF-8
    return decodeURIComponent(
      Array.from(binary, (char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  } catch {
    return '';
  }
}

function TestSetupPage() {
  const router = useRouter();
  const subtypes = useMemo(() => listSubtypes(), []);

  const [countsBySubtypeId, setCountsBySubtypeId] = useState<CountsBySubtypeId>(() => {
    const init: CountsBySubtypeId = {};
    for (const s of subtypes) init[s.id] = null; // null = Random/default
    return init;
  });

  const [testId, setTestId] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Toggle states for each question type
  const [conversionEnabled, setConversionEnabled] = useState<boolean>(true);
  const [estimationEnabled, setEstimationEnabled] = useState<boolean>(true);
  
  // Conversion settings
  const [minutes, setMinutes] = useState<number>(10);
  
  // Estimation settings
  const [estimationQuestionCount, setEstimationQuestionCount] = useState<number>(1);
  const [estimationTimePerQuestionSeconds, setEstimationTimePerQuestionSeconds] = useState<number>(60);

  // Calculate total questions configured
  const totalQuestions = useMemo(() => {
    let total = 0;
    for (const count of Object.values(countsBySubtypeId)) {
      if (count !== null && count > 0) {
        total += count;
      }
    }
    return total;
  }, [countsBySubtypeId]);

  function setRandom(subtypeId: string) {
    setCountsBySubtypeId((prev) => ({ ...prev, [subtypeId]: null }));
  }

  function setCount(subtypeId: string, raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      // empty -> Random
      setRandom(subtypeId);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return; // ignore invalid keystrokes
    
    // Calculate current total excluding this subtype
    let currentTotal = 0;
    for (const [id, count] of Object.entries(countsBySubtypeId)) {
      if (id !== subtypeId && count !== null && count > 0) {
        currentTotal += count;
      }
    }
    
    // Cap at maximum 5 questions total
    const MAX_QUESTIONS = 5;
    const maxAllowed = Math.max(0, MAX_QUESTIONS - currentTotal);
    const capped = Math.min(n, maxAllowed);
    
    setCountsBySubtypeId((prev) => ({ ...prev, [subtypeId]: capped }));
  }

  function start() {
  setError('');

  console.log('[TestSetup] Start clicked', { conversionEnabled, estimationEnabled, minutes, testId });

  // Validate conversion if enabled
  if (conversionEnabled) {
    const MAX_QUESTIONS = 5;
    if (totalQuestions > MAX_QUESTIONS) {
      setError(`Maximum ${MAX_QUESTIONS} questions allowed. Currently configured: ${totalQuestions}`);
      console.warn('[TestSetup] Too many questions:', totalQuestions);
      return;
    }
  }

  // Validate time (always validate if conversion is enabled)
  if (conversionEnabled) {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) {
      setError('Time must be a positive number of minutes.');
      console.warn('[TestSetup] Invalid minutes:', minutes);
      return;
    }
  }

  const timeSeconds = conversionEnabled ? Math.round(minutes * 60) : DEFAULT_TEST_SECONDS;

  const cleanedTestId = testId.trim();
  if (cleanedTestId && !/^[A-Za-z0-9_-]{1,32}$/.test(cleanedTestId)) {
    setError('Test ID can use letters, numbers, underscore, hyphen (max 32 chars).');
    console.warn('[TestSetup] Invalid testId:', cleanedTestId);
    return;
  }

  const cfg = {
    countsBySubtypeId: conversionEnabled ? countsBySubtypeId : {},
    timeSeconds: conversionEnabled ? timeSeconds : DEFAULT_TEST_SECONDS,
    testId: cleanedTestId || undefined,
    estimation: estimationEnabled ? {
      enabled: true,
      questionCount: estimationQuestionCount,
      timePerQuestionSeconds: estimationTimePerQuestionSeconds,
    } : undefined,
  };

  // base64url encode
  const encoded = base64UrlEncode(JSON.stringify(cfg));
  const url = `/test?cfg=${encoded}`;

  console.log('[TestSetup] Navigating to:', url);

  // Try router first, but use a hard nav fallback
  try {
    router.push(url);

    // If for some reason router doesn't update, force it after a tick
    // Check if pathname ends with /test (accounting for basePath like /mmv2/test)
    setTimeout(() => {
      const pathname = window.location.pathname;
      const search = window.location.search;
      // Check if we're on the test page - pathname should end with /test
      // and search should contain the cfg parameter if navigating with it
      if (!pathname.endsWith('/test') || (url.includes('cfg=') && !search.includes('cfg='))) {
        console.warn('[TestSetup] router.push did not navigate; forcing location.href');
        window.location.href = url;
      }
    }, 250);
  } catch (e) {
    console.error('[TestSetup] router.push failed; forcing location.href', e);
    window.location.href = url;
  }
}


  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Test Setup</h1>
      <p style={{ opacity: 0.85, marginTop: 0 }}>
        Choose how many of each conversion subtype to include (or leave as Random), set a time limit, and optionally enter a Test ID.
      </p>

      <section style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Predetermined Test ID (optional)</div>
          <input
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="e.g., SO-INVITE-013"
            style={{ width: '100%', maxWidth: 420 }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Not used yet, but we'll pass it into the test session for later scoring / sharing.
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: estimationEnabled ? 16 : 0 }}>
            <label 
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                setEstimationEnabled(!estimationEnabled);
              }}
            >
              <input
                type="checkbox"
                checked={estimationEnabled}
                onChange={(e) => setEstimationEnabled(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: estimationEnabled ? '#4CAF50' : '#cccccc',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: 2,
                    left: estimationEnabled ? 26 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </label>
            <span style={{ fontWeight: 700 }}>Estimation Section</span>
          </div>

          {estimationEnabled && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Time per Question</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[30, 60, 90, 120].map((sec) => {
                    const selected = estimationTimePerQuestionSeconds === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setEstimationTimePerQuestionSeconds(sec)}
                        aria-pressed={selected}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 999,
                          fontWeight: 700,
                          cursor: 'pointer',
                          minWidth: 70,
                          backgroundColor: selected ? '#ffffff' : '#aaaaaa',
                          color: selected ? '#000000' : '#ffffff',
                          border: selected
                            ? '2px solid #ffffff'
                            : '2px solid rgba(255,255,255,0.35)',
                          boxShadow: selected
                            ? '0 4px 12px rgba(0,0,0,0.35)'
                            : 'none',
                          transition: 'all 120ms ease-out',
                          fontSize: 13,
                        }}
                      >
                        {selected ? '✓ ' : ''}
                        {sec}s
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
                  <span>Number of Questions:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={estimationQuestionCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 10) {
                        setEstimationQuestionCount(val);
                      }
                    }}
                    style={{
                      width: 80,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#ffffff',
                      fontSize: 14,
                    }}
                  />
                </label>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            borderRadius: 12,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: conversionEnabled ? 16 : 0 }}>
            <label 
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                setConversionEnabled(!conversionEnabled);
              }}
            >
              <input
                type="checkbox"
                checked={conversionEnabled}
                onChange={(e) => setConversionEnabled(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: conversionEnabled ? '#4CAF50' : '#cccccc',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: 2,
                    left: conversionEnabled ? 26 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </label>
            <span style={{ fontWeight: 700 }}>Conversion Subtypes</span>
          </div>

          {conversionEnabled && (
            <>
              {/* Time Allotted - part of Conversion section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Time Allotted</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  {[5, 8, 10, 15].map((m) => {
                    const selected = minutes === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinutes(m)}
                        aria-pressed={selected}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 999,
                          fontWeight: 800,
                          cursor: 'pointer',
                          minWidth: 84,
                          backgroundColor: selected ? '#ffffff' : '#aaaaaa',
                          color: selected ? '#000000' : '#ffffff',
                          border: selected
                            ? '2px solid #ffffff'
                            : '2px solid rgba(255,255,255,0.35)',
                          boxShadow: selected
                            ? '0 4px 12px rgba(0,0,0,0.35)'
                            : 'none',
                          transition: 'all 120ms ease-out',
                        }}
                      >
                        {selected ? '✓ ' : ''}
                        {m} min
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Total time: {minutes * 60} seconds
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {subtypes.filter(s => s.parentType === 'conversion').map((s) => {
                  const v = countsBySubtypeId[s.id];
                  const isRandom = v === null;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 160px',
                        gap: 12,
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(0,0,0,0.12)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 650 }}>{s.parentType.toUpperCase()} — {s.label}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Subtype ID: {s.id}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRandom(s.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.18)',
                          background: isRandom ? 'rgba(255,255,255,0.10)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        aria-pressed={isRandom}
                      >
                        Random
                      </button>

                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 12, opacity: 0.75 }}>Count</span>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step={1}
                          value={isRandom ? '' : v}
                          onChange={(e) => setCount(s.id, e.target.value)}
                          placeholder="(random)"
                          style={{ width: 110 }}
                          title={!isRandom && v && totalQuestions >= 5 ? `Maximum 5 questions total (currently ${totalQuestions})` : undefined}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                Leaving a subtype as <b>Random</b> means the test generator can pick it as needed.
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, fontWeight: 600, color: totalQuestions >= 5 ? '#ff9800' : undefined }}>
                Total questions: {totalQuestions} / 5
              </div>
            </>
          )}
        </div>


        {error ? (
          <div style={{ color: '#ffb4b4', fontWeight: 650 }}>{error}</div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={start}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              fontWeight: 800,
              cursor: 'pointer',
              minWidth: 84,

              /* Match time selector selected style */
              backgroundColor: '#ffffff',
              color: '#000000',
              border: '2px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              transition: 'all 120ms ease-out',
            }}
          >
            Start Test
          </button>

          <button
            type="button"
            onClick={() => router.push('/practice')}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              fontWeight: 800,
              cursor: 'pointer',
              minWidth: 84,

              /* Match time selector unselected style */
              backgroundColor: '#aaaaaa',
              color: '#ffffff',
              border: '2px solid rgba(255,255,255,0.35)',
              boxShadow: 'none',
              transition: 'all 120ms ease-out',
            }}
          >
            Back to Practice
          </button>
        </div>
      </section>
    </main>
  );
}

function TestPageContent() {
  const searchParams = useSearchParams();
  const cfgParam = searchParams.get('cfg');

  // If cfg parameter exists, decode it and render TestSession
  if (cfgParam) {
    // Decode the config
    const decoded = base64UrlDecode(cfgParam);
    let config: TestSetupConfig | null = null;
    
    try {
      config = JSON.parse(decoded) as TestSetupConfig;
    } catch (e) {
      console.error('[TestPage] Failed to parse config:', e);
      // Fall through to show setup page with error
    }

    if (config) {
      return <TestSession config={config} />;
    }
  }

  // No cfg parameter or failed to parse - show setup page
  return <TestSetupPage />;
}

export default function TestPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <TestPageContent />
    </Suspense>
  );
}
