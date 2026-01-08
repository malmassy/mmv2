'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Metric Mastery</h1>
      <p style={{ opacity: 0.85, marginTop: 0, marginBottom: 32 }}>
        Choose a mode to get started.
      </p>

      <section style={{ display: 'grid', gap: 16 }}>
        <div
          style={{
            borderRadius: 16,
            padding: 24,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Select Mode</div>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/test"
              style={{
                padding: '16px 24px',
                borderRadius: 999,
                fontWeight: 800,
                cursor: 'pointer',
                minWidth: 140,
                fontSize: 16,
                textDecoration: 'none',
                textAlign: 'center',
                display: 'inline-block',

                /* Match time selector selected style */
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                transition: 'all 120ms ease-out',
              }}
            >
              Test Mode
            </Link>

            <Link
              href="/practice"
              style={{
                padding: '16px 24px',
                borderRadius: 999,
                fontWeight: 800,
                cursor: 'pointer',
                minWidth: 140,
                fontSize: 16,
                textDecoration: 'none',
                textAlign: 'center',
                display: 'inline-block',

                /* Match time selector selected style */
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                transition: 'all 120ms ease-out',
              }}
            >
              Practice Mode
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
