'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinPod } from '@/lib/pods';

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [codeChars, setCodeChars] = useState<string[]>(['', '', '', '', '', '']);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from ?code= query param
  useEffect(() => {
    const prefill = searchParams.get('code');
    if (prefill) {
      const chars = prefill.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).split('');
      while (chars.length < 6) chars.push('');
      setCodeChars(chars);
    }
  }, [searchParams]);

  function handleCodeInput(value: string) {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const chars = clean.split('');
    while (chars.length < 6) chars.push('');
    setCodeChars(chars);
  }

  async function handleJoin() {
    const fullCode = codeChars.join('');
    if (fullCode.length < 6) { setError('Enter the full 6-character code'); return; }
    setJoining(true);
    setError(null);

    const { data: pod, error: joinErr } = await joinPod(fullCode);
    if (joinErr || !pod) {
      setError(joinErr ?? 'Failed to join pod');
      setJoining(false);
      return;
    }

    // Navigate to a waiting/gridview page
    router.push(`/singleview?podId=${pod.id}`);
  }

  // Build display array with dash separator: [0,1,2, '-', 3,4,5]
  const displayCode: (string | null)[] = [
    codeChars[0], codeChars[1], codeChars[2], null, codeChars[3], codeChars[4], codeChars[5]
  ];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Young+Serif&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

    html, body {
      height: 100%;
      overflow: hidden;
      font-family: 'Instrument Sans', sans-serif;
      background: #F5EFE2;
    }

    .app {
      width: 100%;
      height: 100%;
      max-width: 430px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 52px 12px 12px;
      background: rgba(245,239,226,0.85);
      backdrop-filter: blur(14px) saturate(120%);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      border-bottom: 1px solid rgba(43,33,24,0.08);
      flex-shrink: 0;
    }

    .header-back {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #2B2118;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .header-back:active { transform: scale(0.85); }

    .header-title {
      flex: 1;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.01em;
      color: #2B2118;
    }

    /* ── Content ── */
    .content {
      flex: 1;
      overflow: auto;
      padding: 8px 20px 120px;
    }

    /* ── Scanner Viewport ── */
    .scanner-viewport {
      position: relative;
      aspect-ratio: 1 / 1;
      background: linear-gradient(180deg, #1A140E 0%, #0A0604 100%);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 2px 0 rgba(43,33,24,0.05), 0 18px 36px -12px rgba(43,33,24,0.22);
      margin-top: 8px;
    }

    /* Frame corners */
    .corner {
      position: absolute;
      width: 40px;
      height: 40px;
    }

    .corner-tl { top: 18px; left: 18px; border-top: 3px solid #B06B2C; border-left: 3px solid #B06B2C; border-top-left-radius: 12px; }
    .corner-tr { top: 18px; right: 18px; border-top: 3px solid #B06B2C; border-right: 3px solid #B06B2C; border-top-right-radius: 12px; }
    .corner-bl { bottom: 18px; left: 18px; border-bottom: 3px solid #B06B2C; border-left: 3px solid #B06B2C; border-bottom-left-radius: 12px; }
    .corner-br { bottom: 18px; right: 18px; border-bottom: 3px solid #B06B2C; border-right: 3px solid #B06B2C; border-bottom-right-radius: 12px; }

    /* Scan line */
    .scan-line {
      position: absolute;
      left: 30px;
      right: 30px;
      top: 50%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #B06B2C, transparent);
      box-shadow: 0 0 12px rgba(176,107,44,0.6);
      animation: scanPulse 2.5s ease-in-out infinite;
    }

    @keyframes scanPulse {
      0%, 100% { top: 35%; opacity: 0.4; }
      50% { top: 60%; opacity: 1; }
    }

    /* Camera grid */
    .camera-grid {
      position: absolute;
      inset: 30px;
      background-image:
        linear-gradient(rgba(245,239,226,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(245,239,226,0.04) 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.6;
    }

    .scanner-label {
      position: absolute;
      bottom: 18px;
      left: 0;
      right: 0;
      text-align: center;
      color: rgba(245,239,226,0.75);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    /* ── Or Enter Code Divider ── */
    .or-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 22px 0 14px;
    }

    .or-divider-line {
      flex: 1;
      height: 1px;
      background: rgba(43,33,24,0.14);
    }

    .or-divider-text {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: #8A7E6F;
      text-transform: uppercase;
    }

    /* ── Code Input ── */
    .code-row {
      display: flex;
      gap: 6px;
      justify-content: center;
    }

    .code-char {
      width: 36px;
      height: 48px;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.14);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Young Serif', serif;
      font-size: 22px;
      color: #2B2118;
      font-variant-numeric: tabular-nums;
    }

    .code-char.filled {
      border: 1.5px solid #B06B2C;
    }

    .code-dash {
      align-self: center;
      font-family: 'Young Serif', serif;
      font-size: 28px;
      color: #8A7E6F;
    }

    /* ── Sticky CTA ── */
    .cta-wrap {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 14px 16px 32px;
      background: linear-gradient(to top, #F5EFE2 60%, rgba(245,239,226,0));
      z-index: 5;
    }

    .join-btn {
      width: 100%;
      border: none;
      cursor: pointer;
      background: #2F5D3A;
      color: #F5EFE2;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      font-size: 16px;
      padding: 16px 20px;
      border-radius: 20px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      transition: all 0.2s ease;
      display: block;
      text-align: center;
      text-decoration: none;
    }

    .join-btn:active { transform: scale(0.97); }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        {/* Header */}
        <div className="header">
          <Link href="/landing" className="header-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="header-title">Join a pod</div>
        </div>

        {/* Content */}
        <div className="content">
          {/* Scanner Viewport */}
          <div className="scanner-viewport">
            <div className="corner corner-tl" />
            <div className="corner corner-tr" />
            <div className="corner corner-bl" />
            <div className="corner corner-br" />
            <div className="scan-line" />
            <div className="camera-grid" />
            <div className="scanner-label">Point camera at QR code</div>
          </div>

          {/* Or Enter Code */}
          <div className="or-divider">
            <div className="or-divider-line" />
            <span className="or-divider-text">or enter code</span>
            <div className="or-divider-line" />
          </div>

          {/* Code Input */}
          {error && <div style={{ color: '#B0593E', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{error}</div>}
          <div className="code-row" onClick={() => inputRef.current?.focus()}>
            {displayCode.map((c, i) => c === null ? (
              <div key={i} className="code-dash">—</div>
            ) : (
              <div key={i} className={`code-char ${c ? 'filled' : ''}`}>{c}</div>
            ))}
          </div>
          {/* Hidden input to capture keyboard */}
          <input
            ref={inputRef}
            type="text"
            value={codeChars.join('')}
            onChange={(e) => handleCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            autoFocus
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            maxLength={6}
            autoCapitalize="characters"
          />
        </div>

        {/* Sticky Join Button */}
        <div className="cta-wrap">
          <button
            className="join-btn"
            onClick={handleJoin}
            disabled={joining || codeChars.join('').length < 6}
            style={{ opacity: (joining || codeChars.join('').length < 6) ? 0.5 : 1 }}
          >
            {joining ? 'Joining...' : 'Join Pod'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
