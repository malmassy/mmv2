'use client';

import React, { useCallback, useMemo } from 'react';

export type RailroadStep = {
  id: string;
  top: string;    // numerator
  bottom: string; // denominator
};

type Props = {
  steps: RailroadStep[];
  onChange: (next: RailroadStep[]) => void;
  showUnitsHint?: boolean;
};

function newStep(): RailroadStep {
  return { id: crypto.randomUUID(), top: '', bottom: '' };
}

/**
 * Convert a number to superscript
 */
function toSuperscript(num: number): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺'
  };
  return String(num).split('').map(char => superscripts[char] || char).join('');
}

/**
 * --- Unit parsing rules (MVP but useful) ---
 * We parse the "unit part" of a cell like:
 *   "100 cm" => units: cm
 *   "1 m"    => units: m
 *   "m/s"    => units: m and s^-1
 *   "m^2"    => units: m^2
 *   "m s^-1" => units: m and s^-1
 *
 * We treat each unit token as a string (e.g. "cm", "m", "s", "kg", "µL").
 * We do not try to understand compound units like "N" beyond treating it as a unit symbol.
 */

type UnitOcc = {
  unit: string;    // e.g. "m", "s", "cm"
  exp: number;     // exponent (can be negative if parsed from "/")
};

function stripLeadingNumberAndSpaces(raw: string) {
  // Removes leading numeric portion (supports sci notation) so "100 cm" -> "cm"
  // Also supports: "2.3 x 10^4 g", "2.3x10^-4 g", "2.3×10^-4 g"
  // If student types only units like "m/s", keep it.
  const s = raw.trim();
  if (!s) return '';

  // Normalize common unicode and whitespace
  const n = s
    .replace(/×/g, 'x')     // × -> x
    .replace(/−/g, '-')     // unicode minus -> hyphen
    .replace(/\s+/g, ' ')   // collapse spaces
    .trim();

  // 1) Match a leading number in standard or "e" scientific notation:
  //    2.3e-4 g  |  12 g  |  .25 g  |  1/2 g
  const basic = n.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|\d+\/\d+)\s*(.*)$/i);
  if (!basic) return s;

  let rest = (basic[2] ?? '').trim();

  // 2) If rest begins with an "x 10^..." (scientific notation written out),
  //    treat it as part of the numeric portion and strip it too.
  //    Examples:
  //      "x 10^4 g"
  //      "x10^-4 g"
  //      "x 10^-4 g"
  //      "x 10^(-4) g"
  //
  // After stripping, rest should start with units.
  const sciSuffix = rest.match(/^x\s*10\s*\^?\s*\(?\s*[+-]?\d+\s*\)?\s*(.*)$/i);
  if (sciSuffix) {
    rest = (sciSuffix[1] ?? '').trim();
  }

  return rest;
}


function parseUnitToken(tok: string): UnitOcc[] {
  // tok like "m", "m^2", "s^-1"
  // return list (usually 1 item)
  const t = tok.trim();
  if (!t) return [];

  const m = t.match(/^([a-zA-Zµ°]+)(?:\^?([+-]?\d+))?$/);
  if (!m) return []; // ignore weird tokens
  const unit = m[1];
  const exp = m[2] ? Number(m[2]) : 1;
  if (!Number.isFinite(exp) || exp === 0) return [];
  return [{ unit, exp }];
}

function parseUnits(rawCell: string): UnitOcc[] {
  // parse the unit portion, supporting "/"
  // "m/s^2" => m, s^-2
  const unitPart = stripLeadingNumberAndSpaces(rawCell);
  if (!unitPart) return [];

  // normalize separators
  let s = unitPart
    .replace(/·/g, ' ')
    .replace(/\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // split by "/" keeping order: numerator then denominators
  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];

  const out: UnitOcc[] = [];

  // numerator side (positive)
  for (const tok of parts[0].split(' ').filter(Boolean)) {
    out.push(...parseUnitToken(tok));
  }

  // denominator side (negative exponent)
  for (let i = 1; i < parts.length; i++) {
    for (const tok of parts[i].split(' ').filter(Boolean)) {
      const occ = parseUnitToken(tok);
      for (const o of occ) out.push({ unit: o.unit, exp: -o.exp });
    }
  }

  return out;
}

type TokenRender = {
  unit: string;
  exp: number; // can be >1 or negative (but we render sign separately by location)
  // For strikethrough assignment we expand exp into repeated tokens when small
};

type CellTokens = {
  expanded: string[]; // e.g. ["m","m"] for m^2; negative exps handled by where they appear (top/bottom already)
  compact: { unit: string; exp: number }[]; // for display if too large
};

function expandOccs(occs: UnitOcc[], maxExpand = 6): CellTokens {
  // Expand exponents to individual tokens if abs(exp) small; otherwise keep compact
  const expanded: string[] = [];
  const compactMap = new Map<string, number>();

  for (const { unit, exp } of occs) {
    compactMap.set(unit, (compactMap.get(unit) ?? 0) + exp);
  }

  const compact: { unit: string; exp: number }[] = [];
  for (const [unit, exp] of compactMap.entries()) {
    if (exp !== 0) compact.push({ unit, exp });
  }
  compact.sort((a, b) => a.unit.localeCompare(b.unit));

  // Expanded view tries to show only positive exps (the sign is implicit from numerator/denominator location)
  // For cancellation marking, we expand using abs(exp) but caller provides context.
  for (const { unit, exp } of occs) {
    const n = Math.abs(exp);
    if (n <= maxExpand) {
      for (let i = 0; i < n; i++) expanded.push(unit);
    } else {
      // too big: don't expand—handled by compact view
    }
  }

  return { expanded, compact };
}

type SideToken = {
  unit: string;
  // sign: +1 numerator, -1 denominator
  sign: 1 | -1;
  // where to strike: index among same-unit occurrences on that sign
  idx: number;
};

function buildSideTokens(steps: RailroadStep[]): { top: SideToken[]; bottom: SideToken[] } {
  // We treat units in top cell as numerator (+), bottom as denominator (-)
  // Within each cell, if user wrote "m/s" we interpret it as m (+) and s (-)
  const topTokens: SideToken[] = [];
  const bottomTokens: SideToken[] = [];

  // counters per unit per sign for stable indexing
  const counterPos = new Map<string, number>();
  const counterNeg = new Map<string, number>();

  const pushToken = (unit: string, sign: 1 | -1, intoTop: boolean) => {
    const counter = sign === 1 ? counterPos : counterNeg;
    const idx = counter.get(unit) ?? 0;
    counter.set(unit, idx + 1);
    const t: SideToken = { unit, sign, idx };
    if (intoTop) topTokens.push(t);
    else bottomTokens.push(t);
  };

  for (const step of steps) {
    // TOP cell
    const topOccs = parseUnits(step.top);
    for (const occ of topOccs) {
      const n = Math.abs(occ.exp);
      if (n > 6) continue; // if huge, skip individual striking; compact view still shows remaining on right
      const sign: 1 | -1 = occ.exp >= 0 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        // if sign is +, it contributes to numerator; if -, it contributes to denominator
        pushToken(occ.unit, sign, sign === 1); // + goes to topTokens, - goes to bottomTokens
      }
    }

    // BOTTOM cell
    const botOccs = parseUnits(step.bottom);
    for (const occ of botOccs) {
      const n = Math.abs(occ.exp);
      if (n > 6) continue;
      // bottom cell is denominator, so its "natural" sign is negative, but parseUnits can include "/"
      // We interpret occ.exp >=0 as denominator contribution; occ.exp <0 as numerator contribution.
      const sign: 1 | -1 = occ.exp >= 0 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        pushToken(occ.unit, sign, sign === 1);
      }
    }
  }

  return { top: topTokens, bottom: bottomTokens };
}

function computeNetExponents(steps: RailroadStep[]) {
  // Build net exponent map over all tokens (compact, supports big exps)
  const net = new Map<string, number>();

  const add = (unit: string, exp: number) => {
    net.set(unit, (net.get(unit) ?? 0) + exp);
  };

  for (const step of steps) {
    // top cell contributions: +exp (and "/" inside is already negative exp)
    for (const occ of parseUnits(step.top)) add(occ.unit, occ.exp);

    // bottom cell contributions: denominator => subtract exp, but parseUnits can have negative from "/"
    for (const occ of parseUnits(step.bottom)) {
      // bottom cell acts like dividing by (occ), so exp subtracts
      add(occ.unit, -occ.exp);
    }
  }

  // remove zeros
  for (const [u, e] of Array.from(net.entries())) {
    if (e === 0) net.delete(u);
  }

  return net;
}

function computeCancellationSets(steps: RailroadStep[]) {
  // Determine how many cancellations per unit between numerator and denominator.
  // We do it on compact net counts from the whole expression:
  // cancellations = min(totalPos, totalNeg)
  // totalPos = sum of positive exponent contributions; totalNeg = sum of negative exponent contributions (absolute)
  const pos = new Map<string, number>();
  const neg = new Map<string, number>();

  const bump = (m: Map<string, number>, u: string, n: number) => m.set(u, (m.get(u) ?? 0) + n);

  // Build pos/neg counts using full exponents (not expanded)
  for (const step of steps) {
    for (const occ of parseUnits(step.top)) {
      if (occ.exp > 0) bump(pos, occ.unit, occ.exp);
      else if (occ.exp < 0) bump(neg, occ.unit, -occ.exp);
    }
    for (const occ of parseUnits(step.bottom)) {
      // dividing by denominator flips sign
      const exp = -occ.exp;
      if (exp > 0) bump(pos, occ.unit, exp);
      else if (exp < 0) bump(neg, occ.unit, -exp);
    }
  }

  const cancelled = new Map<string, number>();
  for (const [u, p] of pos.entries()) {
    const n = neg.get(u) ?? 0;
    const c = Math.min(p, n);
    if (c > 0) cancelled.set(u, c);
  }

  return cancelled;
}

function formatUnitMap(net: Map<string, number>) {
  const num: string[] = [];
  const den: string[] = [];

  const entries = Array.from(net.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [u, e] of entries) {
    const abs = Math.abs(e);
    const piece = abs === 1 ? u : `${u}${toSuperscript(abs)}`;
    if (e > 0) num.push(piece);
    else den.push(piece);
  }

  if (num.length === 0 && den.length === 0) return 'unitless';
  if (den.length === 0) return num.join(' · ');
  if (num.length === 0) return `1 / (${den.join(' · ')})`;
  return `${num.join(' · ')} / (${den.join(' · ')})`;
}

export default function RailroadWork({ steps, onChange, showUnitsHint }: Props) {
  const addStep = useCallback(() => {
    onChange([...(steps.length ? steps : []), newStep()]);
  }, [steps, onChange]);

  const removeStep = useCallback(
    (id: string) => onChange(steps.filter((s) => s.id !== id)),
    [steps, onChange]
  );

  const update = useCallback(
    (id: string, field: 'top' | 'bottom', value: string) => {
      onChange(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    },
    [steps, onChange]
  );

  const clearAll = useCallback(() => onChange([]), [onChange]);

  const hasSteps = steps.length > 0;

  const cancelled = useMemo(() => computeCancellationSets(steps), [steps]);
  const net = useMemo(() => computeNetExponents(steps), [steps]);

  // For strikethrough assignment: we cancel left-to-right in a simple greedy way.
  const struckSets = useMemo(() => {
    // How many of each unit should be struck on numerator and denominator sides?
    // Split cancellations across sides equally by definition: strike c on both sides (c occurrences each side).
    const strikePos = new Map<string, number>();
    const strikeNeg = new Map<string, number>();
    for (const [u, c] of cancelled.entries()) {
      strikePos.set(u, c);
      strikeNeg.set(u, c);
    }
    return { strikePos, strikeNeg };
  }, [cancelled]);

  // Helper to decide if a particular expanded token occurrence should be struck
  const shouldStrike = useCallback(
    (unit: string, sign: 1 | -1, occurrenceIndex: number) => {
      const m = sign === 1 ? struckSets.strikePos : struckSets.strikeNeg;
      const limit = m.get(unit) ?? 0;
      return occurrenceIndex < limit;
    },
    [struckSets]
  );

  // For each step/cell, produce expanded tokens and strike flags
  const rendered = useMemo(() => {
    // We need stable occurrence indexing across the whole chain so strikes are consistent.
    // We'll count occurrences per unit per sign in reading order.
    const posCount = new Map<string, number>();
    const negCount = new Map<string, number>();

    const nextIdx = (unit: string, sign: 1 | -1) => {
      const m = sign === 1 ? posCount : negCount;
      const idx = m.get(unit) ?? 0;
      m.set(unit, idx + 1);
      return idx;
    };

    const perStep = steps.map((step) => {
      // Parse top cell units into occurrences with signs based on "/" inside cell
      const topOccs = parseUnits(step.top);
      const topExpanded: { unit: string; strike: boolean; rawExp: number }[] = [];
      for (const occ of topOccs) {
        const n = Math.abs(occ.exp);
        if (n > 6) {
          topExpanded.push({ unit: `${occ.unit}${toSuperscript(occ.exp)}`, strike: false, rawExp: occ.exp });
          continue;
        }
        const sign: 1 | -1 = occ.exp >= 0 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const idx = nextIdx(occ.unit, sign);
          topExpanded.push({ unit: occ.unit, strike: shouldStrike(occ.unit, sign, idx), rawExp: occ.exp });
        }
      }

      // Parse bottom cell: dividing by it flips sign
      const botOccs = parseUnits(step.bottom);
      const botExpanded: { unit: string; strike: boolean; rawExp: number }[] = [];
      for (const occ of botOccs) {
        const n = Math.abs(occ.exp);
        const flippedExp = -occ.exp; // because bottom is divisor
        if (n > 6) {
          botExpanded.push({ unit: `${occ.unit}${toSuperscript(flippedExp)}`, strike: false, rawExp: flippedExp });
          continue;
        }
        const sign: 1 | -1 = flippedExp >= 0 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const idx = nextIdx(occ.unit, sign);
          botExpanded.push({ unit: occ.unit, strike: shouldStrike(occ.unit, sign, idx), rawExp: flippedExp });
        }
      }

      return { step, topExpanded, botExpanded };
    });

    return perStep;
  }, [steps, shouldStrike]);

  // Helper to format expanded units compactly (e.g., ["m","m","m"] -> "m³")
  // Groups consecutive units with the same unit name and strike status
  const formatUnitsCompactly = useCallback((expanded: { unit: string; strike: boolean; rawExp: number }[]) => {
    if (expanded.length === 0) return [];
    
    const result: { text: string; strike: boolean }[] = [];
    let currentUnit: string | null = null;
    let currentStrike: boolean | null = null;
    let currentRawExp: number | null = null;
    let count = 0;
    
    for (const item of expanded) {
      // Check if this item continues the current group
      // Group by unit name, strike status, and rawExp (original exponent)
      const isSameGroup = item.unit === currentUnit && 
                          item.strike === currentStrike && 
                          item.rawExp === currentRawExp;
      
      if (isSameGroup) {
        count++;
      } else {
        // Output previous group
        if (currentUnit !== null && count > 0) {
          const displayText = count === 1 ? currentUnit : `${currentUnit}${toSuperscript(count)}`;
          result.push({ text: displayText, strike: currentStrike ?? false });
        }
        // Start new group
        currentUnit = item.unit;
        currentStrike = item.strike;
        currentRawExp = item.rawExp;
        count = 1;
      }
    }
    
    // Output final group
    if (currentUnit !== null && count > 0) {
      const displayText = count === 1 ? currentUnit : `${currentUnit}${toSuperscript(count)}`;
      result.push({ text: displayText, strike: currentStrike ?? false });
    }
    
    return result;
  }, []);

  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Optional: Show your work (Railroad Conversions)</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={addStep}>Add step</button>
          <button type="button" onClick={clearAll} disabled={!hasSteps}>Clear</button>
        </div>
      </div>

      {showUnitsHint && (
        <div style={{ marginBottom: 10, opacity: 0.75, fontSize: 13 }}>
          Tip: include units like 100 cm / 1 m or 1 cm / 10<sup>-2</sup> m.
        </div>
      )}

      {!hasSteps ? (
        <div style={{ opacity: 0.7, fontSize: 14 }}>
          Click <b>Add step</b> to create your first conversion factor.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
          {/* Steps */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 6,
              flex: 1,
            }}
          >
            {rendered.map(({ step, topExpanded, botExpanded }, idx) => (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div
                    aria-hidden
                    style={{
                      width: 1,
                      background: '#aaa',
                      margin: '0 6px',
                      opacity: 0.8,
                    }}
                  />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                  <input
                    value={step.top}
                    onChange={(e) => update(step.id, 'top', e.target.value)}
                    placeholder="numerator (top)"
                    style={{
                      padding: 8,
                      border: '1px solid #ccc',
                      borderRadius: 8,
                      fontFamily: 'inherit',
                    }}
                  />

                  {/* Parsed units (top) with strike-through */}
                  <div style={{ marginTop: 6, minHeight: 18, fontSize: 13, opacity: 0.95 }}>
                    {topExpanded.length === 0 ? (
                      <span style={{ opacity: 0.5 }}>units: —</span>
                    ) : (
                      <span>
                        units:{' '}
                        {formatUnitsCompactly(topExpanded).map((t, i) => (
                          <span key={i} style={{ marginRight: 6 }}>
                            <span style={{ textDecoration: t.strike ? 'line-through' : 'none' }}>
                              {t.text}
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>

                  <div style={{ height: 1, background: '#333', margin: '8px 0', opacity: 0.8 }} />

                  <input
                    value={step.bottom}
                    onChange={(e) => update(step.id, 'bottom', e.target.value)}
                    placeholder="denominator (bottom)"
                    style={{
                      padding: 8,
                      border: '1px solid #ccc',
                      borderRadius: 8,
                      fontFamily: 'inherit',
                    }}
                  />

                  {/* Parsed units (bottom) with strike-through */}
                  <div style={{ marginTop: 6, minHeight: 18, fontSize: 13, opacity: 0.95 }}>
                    {botExpanded.length === 0 ? (
                      <span style={{ opacity: 0.5 }}>units: —</span>
                    ) : (
                      <span>
                        units:{' '}
                        {formatUnitsCompactly(botExpanded).map((t, i) => (
                          <span key={i} style={{ marginRight: 6 }}>
                            <span style={{ textDecoration: t.strike ? 'line-through' : 'none' }}>
                              {t.text}
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => removeStep(step.id)} style={{ opacity: 0.85 }}>
                      Remove
                    </button>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Remaining units panel */}
          <aside
            style={{
              width: 260,
              border: '1px solid #ddd',
              borderRadius: 10,
              padding: 12,
              background: '#fafafa',
              height: 'fit-content',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Remaining units</div>
            <div
            style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 15,
                fontWeight: 600,
                color: '#111',          // 👈 darker text
                lineHeight: 1.4,
            }}
            >
            {formatUnitMap(net)}
            </div>


            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
              Units that cancel are struck through in the step previews.
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
