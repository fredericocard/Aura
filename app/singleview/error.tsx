'use client';

import { useEffect } from 'react';

export default function SingleviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[singleview error]', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0604',
      color: '#F0E8D8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      gap: 16,
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: '#E2B858',
      }}>
        Something went wrong
      </div>
      <div style={{
        background: '#150E08',
        border: '1px solid rgba(226,184,88,0.2)',
        borderRadius: 12,
        padding: 14,
        maxWidth: 420,
        fontSize: 12,
        lineHeight: 1.5,
        color: '#C5B9A5',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {error.message || 'Unknown error'}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={reset} style={{
          padding: '10px 18px',
          background: '#B06B2C',
          color: '#F0E8D8',
          border: 'none',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}>Try again</button>
        <button onClick={() => { window.location.href = '/'; }} style={{
          padding: '10px 18px',
          background: 'transparent',
          color: '#C5B9A5',
          border: '1px solid rgba(226,184,88,0.3)',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}>Go home</button>
      </div>
    </div>
  );
}
