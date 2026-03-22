'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatMMSS } from '../lib/test/utils/formatting';

type SimSettings = {
  stations: number;
  perStationSec: number;
  betweenSec: number;
};

type RunPhase = {
  kind: 'between' | 'work';
  station: number;
  endsAt: number;
};

type SpeakOpts = {
  /** 1 = normal; slightly lower can help short cues like “Begin”. */
  rate?: number;
};

/** Prefer neural / premium / common high-quality English voices when the user leaves Voice on “Automatic”. */
function scoreEnglishVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  if (!lang.startsWith('en')) return -1;

  let s = 0;
  const n = v.name.toLowerCase();

  if (n.includes('google')) s += 55;
  if (n.includes('neural')) s += 45;
  if (n.includes('premium')) s += 44;
  if (n.includes('enhanced')) s += 40;
  if (n.includes('natural')) s += 28;
  if (n.includes('samantha')) s += 36;
  if (n.includes('allison')) s += 34;
  if (n.includes('ava')) s += 32;
  if (n.includes('daniel')) s += 30;
  if (n.includes('siri')) s += 24;
  if (
    n.includes('microsoft') &&
    (n.includes('aria') || n.includes('jenny') || n.includes('ryan') || n.includes('guy'))
  ) {
    s += 34;
  }
  if (v.default) s += 3;

  if (n.includes('zarvox') || n.includes('fred') || n.includes('whisper')) s -= 25;

  return s;
}

function pickBestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const sc = scoreEnglishVoice(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  if (best) return best;
  return voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? voices[0] ?? null;
}

function resolveVoice(
  voices: SpeechSynthesisVoice[],
  voiceUri: string | null
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (voiceUri) {
    const found = voices.find((v) => v.voiceURI === voiceUri);
    if (found) return found;
  }
  return pickBestEnglishVoice(voices);
}

function uniqueVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return Array.from(new Map(list.map((v) => [v.voiceURI, v])).values());
}

function isEnglishVoice(v: SpeechSynthesisVoice): boolean {
  const lang = v.lang.toLowerCase().replace(/_/g, '-');
  return lang === 'en' || lang.startsWith('en-');
}

function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  opts?: SpeakOpts
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts?.rate ?? 1;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** Warning line without canceling other queued speech (queue after current). */
function speakQueued(
  text: string,
  voice: SpeechSynthesisVoice | null,
  opts?: SpeakOpts
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts?.rate ?? 1;
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

const cardStyle: CSSProperties = {
  borderRadius: 16,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
};

const pillButton: CSSProperties = {
  padding: '16px 24px',
  borderRadius: 999,
  fontWeight: 800,
  cursor: 'pointer',
  minWidth: 140,
  fontSize: 16,
  border: '2px solid #ffffff',
  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
  transition: 'all 120ms ease-out',
};

export default function SimulationPage() {
  const [view, setView] = useState<'setup' | 'ready' | 'running' | 'done'>('setup');
  const [settings, setSettings] = useState<SimSettings>({
    stations: 15,
    perStationSec: 45,
    betweenSec: 10,
  });
  const [error, setError] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  /** Empty string = automatic (pick best English). */
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');

  const [remainingMs, setRemainingMs] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [runMeta, setRunMeta] = useState<{
    station: number;
    kind: 'between' | 'work';
  } | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const sortedVoices = useMemo(() => {
    return [...availableVoices].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableVoices]);

  const resolvedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  resolvedVoiceRef.current = resolveVoice(
    availableVoices,
    selectedVoiceUri ? selectedVoiceUri : null
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const refresh = () =>
      setAvailableVoices(
        uniqueVoices(synth.getVoices()).filter(isEnglishVoice)
      );
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    return () => synth.removeEventListener('voiceschanged', refresh);
  }, []);

  useEffect(() => {
    if (
      selectedVoiceUri &&
      !availableVoices.some((v) => v.voiceURI === selectedVoiceUri)
    ) {
      setSelectedVoiceUri('');
    }
  }, [availableVoices, selectedVoiceUri]);

  const runRef = useRef<RunPhase | null>(null);
  const fifteenSpokenRef = useRef(false);
  const handlingEndRef = useRef(false);
  const isPausedRef = useRef(false);
  const pausedRemainingMsRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);

  const submitSetup = () => {
    setError('');
    const { stations, perStationSec, betweenSec } = settings;
    if (!Number.isInteger(stations) || stations < 1 || stations > 99) {
      setError('Number of stations must be between 1 and 99.');
      return;
    }
    if (!Number.isFinite(perStationSec) || perStationSec < 1 || perStationSec > 3600) {
      setError('Time per station must be between 1 and 3600 seconds.');
      return;
    }
    if (!Number.isFinite(betweenSec) || betweenSec < 1 || betweenSec > 600) {
      setError('Time between stations must be between 1 and 600 seconds.');
      return;
    }
    setView('ready');
  };

  const beginFromReady = useCallback(async () => {
    isPausedRef.current = false;
    setIsPaused(false);
    setView('running');
    runRef.current = null;
    setRunMeta(null);
    fifteenSpokenRef.current = false;
    handlingEndRef.current = true;
    setPhaseLabel('Starting…');

    const { betweenSec } = settingsRef.current;
    await speak(
      'Move to station 1. Do not look at the question until I say go.',
      resolvedVoiceRef.current
    );

    runRef.current = {
      kind: 'between',
      station: 1,
      endsAt: Date.now() + betweenSec * 1000,
    };
    fifteenSpokenRef.current = false;
    setRunMeta({ kind: 'between', station: 1 });
    setPhaseLabel('Travel time — do not look at the question yet');
    handlingEndRef.current = false;
  }, []);

  useEffect(() => {
    if (view !== 'running') return;

    const tick = () => {
      const run = runRef.current;
      if (!run || handlingEndRef.current) return;

      if (isPausedRef.current) {
        setRemainingMs(pausedRemainingMsRef.current);
        return;
      }

      const now = Date.now();
      const rem = Math.max(0, run.endsAt - now);
      setRemainingMs(rem);

      const minWork = settingsRef.current.perStationSec;
      if (
        run.kind === 'work' &&
        minWork >= 15 &&
        !fifteenSpokenRef.current &&
        rem > 0 &&
        rem <= 15_000
      ) {
        fifteenSpokenRef.current = true;
        speakQueued(
          `15 seconds remaining on Station ${run.station}.`,
          resolvedVoiceRef.current
        );
      }

      if (rem <= 0) {
        handlingEndRef.current = true;
        const { stations, perStationSec, betweenSec } = settingsRef.current;
        const current = run;

        void (async () => {
          try {
            if (current.kind === 'between') {
              await speak(`Begin Station ${current.station}.`, resolvedVoiceRef.current, {
                rate: 0.88,
              });
              runRef.current = {
                kind: 'work',
                station: current.station,
                endsAt: Date.now() + perStationSec * 1000,
              };
              fifteenSpokenRef.current = false;
              setRunMeta({ kind: 'work', station: current.station });
              setPhaseLabel(`Station ${current.station} — work time`);
            } else {
              if (current.station < stations) {
                await speak(
                  `Move to station ${current.station + 1}.`,
                  resolvedVoiceRef.current
                );
                runRef.current = {
                  kind: 'between',
                  station: current.station + 1,
                  endsAt: Date.now() + betweenSec * 1000,
                };
                fifteenSpokenRef.current = false;
                setRunMeta({
                  kind: 'between',
                  station: current.station + 1,
                });
                setPhaseLabel('Travel time — do not look at the question yet');
              } else {
                runRef.current = null;
                setRunMeta(null);
                isPausedRef.current = false;
                setIsPaused(false);
                setView('done');
                setPhaseLabel('');
                setRemainingMs(0);
              }
            }
          } finally {
            handlingEndRef.current = false;
          }
        })();
      }
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [view]);

  const resetToSetup = () => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    runRef.current = null;
    handlingEndRef.current = false;
    fifteenSpokenRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    setRunMeta(null);
    setView('setup');
    setPhaseLabel('');
    setRemainingMs(0);
  };

  const togglePause = useCallback(() => {
    if (view !== 'running' || !runRef.current || handlingEndRef.current) return;
    if (!isPausedRef.current) {
      const rem = Math.max(0, runRef.current.endsAt - Date.now());
      if (rem <= 0) return;
      pausedRemainingMsRef.current = rem;
      isPausedRef.current = true;
      setIsPaused(true);
      setRemainingMs(rem);
    } else {
      runRef.current.endsAt = Date.now() + pausedRemainingMsRef.current;
      isPausedRef.current = false;
      setIsPaused(false);
    }
  }, [view]);

  const pauseControlEnabled = view === 'running' && runMeta !== null;

  const inputStyle: CSSProperties = {
    width: '100%',
    maxWidth: 200,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(0,0,0,0.2)',
    color: '#ffffff',
    fontSize: 16,
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h1 style={{ margin: 0 }}>Station timer</h1>
        <button
          type="button"
          onClick={togglePause}
          disabled={!pauseControlEnabled}
          style={{
            ...pillButton,
            minWidth: 120,
            padding: '12px 20px',
            fontSize: 15,
            backgroundColor: pauseControlEnabled
              ? isPaused
                ? '#ffffff'
                : 'rgba(255,255,255,0.14)'
              : 'rgba(255,255,255,0.06)',
            color: pauseControlEnabled ? (isPaused ? '#000000' : '#ffffff') : 'rgba(255,255,255,0.35)',
            border: pauseControlEnabled
              ? isPaused
                ? '2px solid #ffffff'
                : '2px solid rgba(255,255,255,0.35)'
              : '2px solid rgba(255,255,255,0.12)',
            boxShadow: isPaused && pauseControlEnabled ? '0 4px 12px rgba(0,0,0,0.35)' : 'none',
            cursor: pauseControlEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          {pauseControlEnabled && isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <p style={{ opacity: 0.85, marginTop: 0, marginBottom: 24 }}>
        Simulate rotation timing with spoken cues. Voices come from your browser: Chrome often
        includes higher-quality options (e.g. Google US English). Pick a voice below if the default
        mispronounces words like ‘Begin’.
      </p>

      {view === 'setup' && (
        <section style={{ display: 'grid', gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Configure simulation</div>
            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Number of stations</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={settings.stations}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, stations: parseInt(e.target.value, 10) || 1 }))
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Time per station (seconds)</span>
                <input
                  type="number"
                  min={1}
                  max={3600}
                  value={settings.perStationSec}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      perStationSec: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Time between stations (seconds)</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={settings.betweenSec}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      betweenSec: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  style={inputStyle}
                />
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Voice</span>
                  <select
                    value={selectedVoiceUri}
                    onChange={(e) => setSelectedVoiceUri(e.target.value)}
                    style={{ ...inputStyle, maxWidth: '100%' }}
                  >
                    <option value="">Automatic (best English match from list)</option>
                    {sortedVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const v = resolveVoice(
                        availableVoices,
                        selectedVoiceUri ? selectedVoiceUri : null
                      );
                      void speak('Begin Station 1.', v, { rate: 0.88 });
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                    }}
                  >
                    {`Test ‘Begin Station 1’`}
                  </button>
                  {availableVoices.length === 0 ? (
                    <span style={{ fontSize: 13, opacity: 0.75 }}>
                      Loading voices… If the list stays empty, try Chrome or Edge.
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div style={{ color: '#ffb4b4', fontWeight: 650 }}>{error}</div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={submitSetup}
              style={{
                ...pillButton,
                backgroundColor: '#ffffff',
                color: '#000000',
                textDecoration: 'none',
              }}
            >
              Continue
            </button>
            <Link
              href="/"
              style={{
                ...pillButton,
                backgroundColor: '#aaaaaa',
                color: '#ffffff',
                border: '2px solid rgba(255,255,255,0.35)',
                boxShadow: 'none',
                textAlign: 'center',
                display: 'inline-block',
                textDecoration: 'none',
              }}
            >
              Home
            </Link>
          </div>
        </section>
      )}

      {view === 'ready' && (
        <section style={{ display: 'grid', gap: 20 }}>
          <div style={cardStyle}>
            <p style={{ fontSize: 18, lineHeight: 1.5, margin: 0 }}>
              Move to your first station, and press start when ready.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={beginFromReady}
              style={{
                ...pillButton,
                backgroundColor: '#ffffff',
                color: '#000000',
              }}
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => setView('setup')}
              style={{
                ...pillButton,
                backgroundColor: '#aaaaaa',
                color: '#ffffff',
                border: '2px solid rgba(255,255,255,0.35)',
                boxShadow: 'none',
              }}
            >
              Back
            </button>
          </div>
        </section>
      )}

      {(view === 'running' || view === 'done') && (
        <section style={{ display: 'grid', gap: 20 }}>
          {view === 'running' && (
            <div
              className="test-timer-bar"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
            >
              <div className="test-timer-meta">
                <div className="test-timer-title">{phaseLabel}</div>
                <div className="test-timer-subtitle">
                  {runMeta ? (
                    <>
                      Station {runMeta.station} of {settings.stations} —{' '}
                      {runMeta.kind === 'between' ? 'between stations' : 'timed work'}
                      {isPaused ? ' — timer paused' : ''}
                    </>
                  ) : (
                    'Preparing audio…'
                  )}
                </div>
              </div>
              <div
                className={`test-timer-clock ${
                  remainingMs <= 10_000 ? 'danger' : remainingMs <= 30_000 ? 'warning' : ''
                }`}
                style={{ fontSize: 48, alignSelf: 'center' }}
              >
                {runMeta ? formatMMSS(Math.ceil(remainingMs / 1000)) : '—:—'}
              </div>
            </div>
          )}

          {view === 'done' && (
            <div style={cardStyle}>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Finished</div>
              <p style={{ margin: 0, opacity: 0.9 }}>
                All {settings.stations} station{settings.stations === 1 ? '' : 's'} completed.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={resetToSetup}
            style={{
              ...pillButton,
              backgroundColor: '#aaaaaa',
              color: '#ffffff',
              border: '2px solid rgba(255,255,255,0.35)',
              boxShadow: 'none',
              alignSelf: 'flex-start',
            }}
          >
            New simulation
          </button>
        </section>
      )}
    </main>
  );
}
