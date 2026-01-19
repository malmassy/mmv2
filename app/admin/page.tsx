'use client';

import { useEffect, useState } from 'react';
import { formatMMSS } from '../lib/test/utils/formatting';

type DashboardStats = {
  users: {
    total: number;
    admins: number;
    regular: number;
  };
  tests: {
    total: number;
    totalQuestions: number;
    averageScore: number;
    averageTimeMs: number;
  };
  questionStats: Array<{
    subtype: string;
    parentType: string;
    totalAttempts: number;
    averageScore: number;
    successRate: number;
  }>;
  recentTests: any[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // In a real app, you'd get this from a session/auth system
    // For now, prompt for email
    const email = prompt('Enter your admin email:');
    if (email) {
      setUserEmail(email);
      loadDashboardStats(email);
    }
  }, []);

  async function loadDashboardStats(email: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin', {
        headers: {
          'x-user-email': email,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load dashboard');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div>Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          padding: 16,
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: 8,
          color: '#ff4444',
        }}>
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={() => loadDashboardStats(userEmail)}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Admin Dashboard</h1>
      <p style={{ opacity: 0.8, marginBottom: 32 }}>System overview and analytics</p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{
          padding: 20,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Total Users</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{stats.users.total}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {stats.users.admins} admin{stats.users.admins !== 1 ? 's' : ''}, {stats.users.regular} regular
          </div>
        </div>

        <div style={{
          padding: 20,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Total Tests</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{stats.tests.total}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {stats.tests.totalQuestions} questions answered
          </div>
        </div>

        <div style={{
          padding: 20,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Average Score</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>
            {(stats.tests.averageScore * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            Average time: {formatMMSS(Math.floor(stats.tests.averageTimeMs / 1000))}
          </div>
        </div>
      </div>

      {/* Question Statistics */}
      <div style={{
        padding: 20,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        marginBottom: 32,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Question Difficulty by Type</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {stats.questionStats.map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: 12,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{stat.subtype}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{stat.parentType}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>
                  {(stat.successRate * 100).toFixed(1)}% success
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {stat.totalAttempts} attempts
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tests */}
      <div style={{
        padding: 20,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Recent Tests</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {stats.recentTests.slice(0, 10).map((test, idx) => (
            <div
              key={test.id || idx}
              style={{
                padding: 12,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  Test {test.id?.substring(0, 8)}...
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {new Date(test.submittedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>
                  {test.score.correct} / {test.score.total}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {((test.score.correct / test.score.total) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
