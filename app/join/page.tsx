'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinPod } from '@/lib/pods';
import { useAuth } from '@/lib/auth-context';

/* ── BarcodeDetector type shim (native API, not in TS lib) ──────────────── */
interface DetectedBarcode { rawValue: string; }
declare class BarcodeDetector {
  constructor(opts: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
  static getSupportedFormats?: () => Promise<string[]>;
}

/* ── Extract 6-char pod code from any QR value ──────────────────────────── */
function extractCode(raw: string): string | null {
  // URL like …/join?code=ABC123
  try {
    const u = new URL(raw);
    const c = u.searchParams.get('code');
    if (c && /^[A-Z0-9]{6}$/i.test(c.trim())) return c.trim().toUpperCase();
  } catch { /* not a URL */ }
  // Plain 6-char alphanumeric
  const trimmed = raw.trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(trimmed)) return trimmed;
  // Embedded in longer string
  const m = trimmed.match(/\b([A-Z0-9]{6})\b/);
  return m ? m[1] : null;
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, isGuest, signIn, signInAsGuest, signUp } = useAuth();
  const [codeChars, setCodeChars] = useState<string[]>(['', '', '', '', '', '']);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Auth gate state
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authView, setAuthView] = useState<'choose' | 'login' | 'signup'>('choose');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [camStatus, setCamStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'>('idle');
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Pre-fill from ?code= query param
  useEffect(() => {
    const prefill = searchParams.get('code');
    if (prefill) {
      const chars = prefill.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).split('');
      while (chars.length < 6) chars.push('');
      setCodeChars(chars);
    }
  }, [searchParams]);

  /* ── Camera lifecycle ─────────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      // Check API availability
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamStatus('unavailable');
        return;
      }

      setCamStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamStatus('active');

        // Start scanning loop
        startScanning();
      } catch (err: any) {
        if (cancelled) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCamStatus('denied');
        } else {
          setCamStatus('unavailable');
        }
      }
    }

    startCamera();
    return () => { cancelled = true; stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── QR scanning loop ─────────────────────────────────────────────────── */
  const startScanning = useCallback(() => {
    // Try native BarcodeDetector first
    let detector: BarcodeDetector | null = null;
    try {
      if (typeof BarcodeDetector !== 'undefined') {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch { /* not available */ }

    const scan = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        if (detector) {
          const barcodes = await detector.detect(canvas);
          for (const bc of barcodes) {
            const code = extractCode(bc.rawValue);
            if (code) { handleScannedCode(code); return; }
          }
        }
      } catch { /* detector failed, keep trying */ }
    };

    scanTimerRef.current = window.setInterval(scan, 350);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScannedCode(code: string) {
    if (scannedCode) return; // already got one
    setScannedCode(code);
    const chars = code.split('');
    while (chars.length < 6) chars.push('');
    setCodeChars(chars);
    // Stop scanning once we have a code
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
  }

  function handleCodeInput(value: string) {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const chars = clean.split('');
    while (chars.length < 6) chars.push('');
    setCodeChars(chars);
    setScannedCode(null); // Allow re-scanning if user edits
  }

  async function proceedToJoin() {
    const fullCode = codeChars.join('');
    setJoining(true);
    setError(null);

    const { data: pod, error: joinErr } = await joinPod(fullCode);
    if (joinErr || !pod) {
      setError(joinErr ?? 'Failed to join pod');
      setJoining(false);
      return;
    }

    stopCamera();
    router.push(`/singleview?podId=${pod.id}`);
  }

  async function handleJoin() {
    const fullCode = codeChars.join('');
    if (fullCode.length < 6) { setError('Enter the full 6-character code'); return; }

    // If user is already logged in (full or guest), go straight to join
    if (user) {
      await proceedToJoin();
      return;
    }

    // Not logged in — show auth gate popup
    setShowAuthGate(true);
    setAuthView('choose');
    setAuthError('');
    setAuthEmail('');
    setAuthPassword('');
  }

  async function handleGuestJoin() {
    setAuthSubmitting(true);
    setAuthError('');
    const { error: guestErr } = await signInAsGuest();
    if (guestErr) {
      setAuthError(guestErr);
      setAuthSubmitting(false);
      return;
    }
    setShowAuthGate(false);
    setAuthSubmitting(false);
    await proceedToJoin();
  }

  async function handleAuthLogin() {
    if (!authEmail || !authPassword) { setAuthError('Please fill in all fields'); return; }
    setAuthSubmitting(true);
    setAuthError('');
    const { error: loginErr } = await signIn(authEmail, authPassword);
    if (loginErr) {
      setAuthError(loginErr);
      setAuthSubmitting(false);
      return;
    }
    setShowAuthGate(false);
    setAuthSubmitting(false);
    // Small delay for auth state to propagate
    setTimeout(() => proceedToJoin(), 300);
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
      gap: 10px;
      padding: 12px 12px 12px 8px;
      background: rgba(245,239,226,0.88);
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
      font-size: 19px;
      letter-spacing: -0.01em;
      color: #2B2118;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .scanner-viewport video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Frame corners */
    .corner {
      position: absolute;
      width: 40px;
      height: 40px;
      z-index: 2;
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
      z-index: 2;
    }

    @keyframes scanPulse {
      0%, 100% { top: 35%; opacity: 0.4; }
      50% { top: 60%; opacity: 1; }
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
      z-index: 2;
    }

    .scanner-status {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      z-index: 1;
      color: rgba(245,239,226,0.6);
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      padding: 20px;
    }

    .scanner-status-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: rgba(245,239,226,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Success flash */
    .scanner-success {
      position: absolute;
      inset: 0;
      background: rgba(47,93,58,0.35);
      border: 3px solid #2F5D3A;
      border-radius: 24px;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: flashIn 0.3s ease;
    }

    @keyframes flashIn { from { opacity: 0; } to { opacity: 1; } }

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
          <button onClick={() => router.back()} className="header-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="header-title" style={{ margin: 0 }}>Join a pod</h1>
        </div>

        {/* Content */}
        <div className="content">
          {/* Scanner Viewport */}
          <div className="scanner-viewport">
            {/* Live camera feed */}
            <video ref={videoRef} playsInline muted />
            {/* Hidden canvas for QR detection */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Overlays on top of camera */}
            {camStatus === 'active' && !scannedCode && (
              <>
                <div className="corner corner-tl" />
                <div className="corner corner-tr" />
                <div className="corner corner-bl" />
                <div className="corner corner-br" />
                <div className="scan-line" />
                <div className="scanner-label">Point camera at QR code</div>
              </>
            )}

            {/* Success flash when code detected */}
            {scannedCode && (
              <div className="scanner-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F5EFE2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {/* Status messages when camera isn't active */}
            {camStatus === 'idle' && (
              <div className="scanner-status">
                <div className="scanner-status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                Starting camera…
              </div>
            )}

            {camStatus === 'requesting' && (
              <div className="scanner-status">
                <div className="scanner-status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                Allow camera access to scan
              </div>
            )}

            {camStatus === 'denied' && (
              <div className="scanner-status">
                <div className="scanner-status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v9"/>
                  </svg>
                </div>
                Camera access denied<br/>
                <span style={{ fontSize: 11, opacity: 0.7 }}>Use the code input below instead</span>
              </div>
            )}

            {camStatus === 'unavailable' && (
              <div className="scanner-status">
                <div className="scanner-status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                Camera not available<br/>
                <span style={{ fontSize: 11, opacity: 0.7 }}>Enter the pod code manually</span>
              </div>
            )}
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

      {/* Auth gate popup — shown when user is not logged in */}
      {showAuthGate && (
        <div onClick={() => !authSubmitting && setShowAuthGate(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, fontFamily: "'Instrument Sans', sans-serif",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 380,
            background: '#FAF5EA',
            borderRadius: 24,
            padding: '24px 20px',
            boxShadow: '0 30px 60px -16px rgba(43,33,24,0.45)',
            border: '1px solid rgba(43,33,24,0.14)',
            animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
          }}>
            {authView === 'choose' && (<>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
                  fontWeight: 700, color: '#B06B2C', marginBottom: 6,
                }}>Join this pod</div>
                <div style={{
                  fontFamily: "'Young Serif', serif", fontSize: 22, color: '#2B2118', lineHeight: 1.15,
                }}>How do you want to play?</div>
                <div style={{ fontSize: 13, color: '#5C5043', marginTop: 6 }}>
                  Log in to track your AURA, or jump in as a guest.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setAuthView('login')} style={{
                  width: '100%', padding: '16px 18px',
                  background: '#2F5D3A', color: '#F5EFE2',
                  border: 'none', borderRadius: 20, cursor: 'pointer',
                  fontSize: 15, fontWeight: 600,
                  fontFamily: "'Instrument Sans', sans-serif",
                  boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                }}>Log in</button>
                <button onClick={handleGuestJoin} disabled={authSubmitting} style={{
                  width: '100%', padding: '16px 18px',
                  background: 'transparent', color: '#2B2118',
                  border: '1.5px solid rgba(43,33,24,0.14)', borderRadius: 20, cursor: 'pointer',
                  fontSize: 15, fontWeight: 600,
                  fontFamily: "'Instrument Sans', sans-serif",
                }}>{authSubmitting ? 'Joining as guest…' : 'Play as guest'}</button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#8A7E6F', marginTop: 14, lineHeight: 1.4 }}>
                Guests can play and review. You&apos;ll be asked to create an account before your game card is saved.
              </div>
            </>)}

            {authView === 'login' && (<>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
                  fontWeight: 700, color: '#B06B2C', marginBottom: 6,
                }}>Returning player</div>
                <div style={{
                  fontFamily: "'Young Serif', serif", fontSize: 22, color: '#2B2118', lineHeight: 1.15,
                }}>Welcome back</div>
              </div>

              {authError && (
                <div style={{
                  background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)',
                  borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B',
                  textAlign: 'center', marginBottom: 10,
                }}>{authError}</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Email</span>
                  <input type="email" placeholder="you@table.cards" value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)} autoComplete="off"
                    style={{
                      width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)',
                      borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118',
                      fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                    }}/>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Password</span>
                  <input type="password" placeholder="••••••••" value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)} autoComplete="off"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAuthLogin(); }}
                    style={{
                      width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)',
                      borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118',
                      fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                    }}/>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => { setAuthView('choose'); setAuthError(''); }} style={{
                  flex: 1, padding: '14px 16px', background: 'transparent',
                  border: '1px solid rgba(43,33,24,0.14)', borderRadius: 20,
                  color: '#2B2118', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Instrument Sans', sans-serif",
                }}>Back</button>
                <button onClick={handleAuthLogin} disabled={authSubmitting} style={{
                  flex: 1.4, padding: '14px 16px',
                  background: authSubmitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
                  border: 'none', borderRadius: 20, cursor: authSubmitting ? 'default' : 'pointer',
                  fontSize: 15, fontWeight: 600,
                  fontFamily: "'Instrument Sans', sans-serif",
                  boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                }}>{authSubmitting ? 'Logging in…' : 'Log in'}</button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043', marginTop: 14 }}>
                Don&apos;t have an account?{' '}
                <button onClick={() => { setAuthView('signup'); setAuthError(''); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#2F5D3A', fontWeight: 700, fontSize: 13, padding: 0,
                  fontFamily: "'Instrument Sans', sans-serif",
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}>Sign up</button>
              </div>
            </>)}

            {authView === 'signup' && (<>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
                  fontWeight: 700, color: '#B06B2C', marginBottom: 6,
                }}>New player</div>
                <div style={{
                  fontFamily: "'Young Serif', serif", fontSize: 22, color: '#2B2118', lineHeight: 1.15,
                }}>Create account</div>
              </div>

              {authError && (
                <div style={{
                  background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)',
                  borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B',
                  textAlign: 'center', marginBottom: 10,
                }}>{authError}</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Email</span>
                  <input type="email" placeholder="you@table.cards" value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)} autoComplete="off"
                    style={{
                      width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)',
                      borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118',
                      fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                    }}/>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Password</span>
                  <input type="password" placeholder="••••••••" value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)} autoComplete="new-password"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        if (!authEmail || !authPassword) { setAuthError('Please fill in all fields'); return; }
                        if (authPassword.length < 6) { setAuthError('Password must be at least 6 characters'); return; }
                        setAuthSubmitting(true); setAuthError('');
                        const { error: signUpErr } = await signUp(authEmail, authPassword);
                        setAuthSubmitting(false);
                        if (signUpErr) { setAuthError(signUpErr); return; }
                        setShowAuthGate(false);
                        setTimeout(() => proceedToJoin(), 300);
                      }
                    }}
                    style={{
                      width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)',
                      borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118',
                      fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                    }}/>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => { setAuthView('choose'); setAuthError(''); }} style={{
                  flex: 1, padding: '14px 16px', background: 'transparent',
                  border: '1px solid rgba(43,33,24,0.14)', borderRadius: 20,
                  color: '#2B2118', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Instrument Sans', sans-serif",
                }}>Back</button>
                <button onClick={async () => {
                  if (!authEmail || !authPassword) { setAuthError('Please fill in all fields'); return; }
                  if (authPassword.length < 6) { setAuthError('Password must be at least 6 characters'); return; }
                  setAuthSubmitting(true); setAuthError('');
                  const { error: signUpErr } = await signUp(authEmail, authPassword);
                  setAuthSubmitting(false);
                  if (signUpErr) { setAuthError(signUpErr); return; }
                  setShowAuthGate(false);
                  setTimeout(() => proceedToJoin(), 300);
                }} disabled={authSubmitting} style={{
                  flex: 1.4, padding: '14px 16px',
                  background: authSubmitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
                  border: 'none', borderRadius: 20, cursor: authSubmitting ? 'default' : 'pointer',
                  fontSize: 15, fontWeight: 600,
                  fontFamily: "'Instrument Sans', sans-serif",
                  boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                }}>{authSubmitting ? 'Creating…' : 'Create & join'}</button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043', marginTop: 14 }}>
                Already have an account?{' '}
                <button onClick={() => { setAuthView('login'); setAuthError(''); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#2F5D3A', fontWeight: 700, fontSize: 13, padding: 0,
                  fontFamily: "'Instrument Sans', sans-serif",
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}>Log in</button>
              </div>
            </>)}
          </div>
        </div>
      )}
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
