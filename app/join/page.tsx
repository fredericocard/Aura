'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinPod } from '@/lib/pods';
import { createGame } from '@/lib/games';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { searchCommanders } from '@/lib/scryfall';
import { getMyCommanders, registerCommander, type Deck } from '@/lib/commanders';
import { validateCommander } from '@/lib/scryfall';

/* ── BarcodeDetector type shim (native API, not in TS lib) ──────────────── */
interface DetectedBarcode { rawValue: string; }
declare class BarcodeDetector {
  constructor(opts: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
  static getSupportedFormats?: () => Promise<string[]>;
}

/* ── Extract 6-char pod code from any QR value ──────────────────────────── */
function extractCode(raw: string): string | null {
  try {
    const u = new URL(raw);
    const c = u.searchParams.get('code');
    if (c && /^[A-Z0-9]{6}$/i.test(c.trim())) return c.trim().toUpperCase();
  } catch { /* not a URL */ }
  const trimmed = raw.trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/\b([A-Z0-9]{6})\b/);
  return m ? m[1] : null;
}

/* ── AuraMark — logo from design system ── */
function AuraMark({ size = 22, color = '#2F5D3A' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs>
        <clipPath id={`aura-clip-join-${size}`}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
      </defs>
      <g clipPath={`url(#aura-clip-join-${size})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

/* ── TornEdge — hand-torn paper top ── */
function TornEdge({ width = 374, color = '#FAF5EA' }: { width?: number; color?: string }) {
  const teeth = 24;
  const w = width;
  const h = 14;
  const seg = w / teeth;
  let d = `M 0 ${h} `;
  for (let i = 0; i <= teeth; i++) {
    const x = i * seg;
    const jitter = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1;
    const y = i % 2 === 0 ? 2 + jitter * 3 : 6 + jitter * 4;
    d += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  d += `L ${w} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%' }} aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

/* ── LIcon — inline Lucide icons ── */
function LIcon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const d: Record<string, React.ReactNode> = {
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    mail: <><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><polyline points="3,6 12,13 21,6" /></>,
  };
  return <svg {...p}>{d[name] || null}</svg>;
}

/* ── SSOButton — Google / Apple ── */
function SSOButton({ provider, onClick }: { provider: 'google' | 'apple'; onClick?: () => void }) {
  const isApple = provider === 'apple';
  return (
    <button onClick={onClick} style={{
      width: '100%', cursor: 'pointer',
      background: isApple ? '#1A140E' : '#F5EFE2',
      color: isApple ? '#F5EFE2' : '#2B2118',
      border: isApple ? 'none' : '1px solid rgba(43,33,24,0.14)',
      borderRadius: 20,
      padding: '13px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 15, fontWeight: 600,
      fontFamily: "'Instrument Sans', sans-serif",
    }}>
      {isApple ? (
        <svg width="14" height="16" viewBox="0 0 16 18" fill="currentColor">
          <path d="M11.6 9.5c0-2 1.6-3 1.7-3-0.9-1.4-2.4-1.6-2.9-1.6-1.2-0.1-2.4 0.7-3 0.7s-1.6-0.7-2.6-0.7c-1.3 0-2.6 0.8-3.3 2-1.4 2.4-0.4 6 1 8 0.7 1 1.5 2.1 2.5 2 1 0 1.4-0.6 2.6-0.6s1.5 0.6 2.6 0.6c1.1 0 1.8-1 2.4-2 0.8-1.1 1.1-2.2 1.1-2.3-0.1 0-2.1-0.8-2.1-3.1zM9.7 3.6c0.5-0.6 0.9-1.5 0.8-2.4-0.7 0-1.6 0.5-2.2 1.1-0.5 0.5-0.9 1.4-0.8 2.3 0.9 0.1 1.7-0.4 2.2-1z" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      Continue with {isApple ? 'Apple' : 'Google'}
    </button>
  );
}

/* ── Reusable swipe-down-to-dismiss for bottom sheets ─────────────────── */
function useSheetDrag(onDismiss: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    currentY.current = Math.max(0, dy);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${currentY.current}px)`;
  }, []);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.25s cubic-bezier(.22,.61,.36,1)';
    if (currentY.current > 100) {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onDismiss, 250);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentY.current = 0;
  }, [onDismiss]);

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd };
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signIn, signInAsGuest, signUp, isLoggedIn, loading: authLoading } = useAuth();
  // Code captured by a scan or URL prefill, queued until auth state is known.
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const [codeChars, setCodeChars] = useState<string[]>(['', '', '', '', '', '']);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth gate state
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authView, setAuthView] = useState<'commander' | 'sso' | 'signin' | 'signup' | 'my-commanders' | 'add-commander'>('commander');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Commander search state (for guest join)
  const [cmdSearchQuery, setCmdSearchQuery] = useState('');
  const [cmdSearchResults, setCmdSearchResults] = useState<any[]>([]);
  const [cmdSearching, setCmdSearching] = useState(false);
  const cmdSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // My commanders state (for logged-in users)
  const [myCommanders, setMyCommanders] = useState<Deck[]>([]);
  const [loadingMyCommanders, setLoadingMyCommanders] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [camStatus, setCamStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'>('idle');
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Login sheet animation
  const [loginSlideUp, setLoginSlideUp] = useState(false);

  // Cancelling the auth gate (Cancel button, backdrop click, swipe-down)
  // returns the user to the empty join screen with the camera scanner live —
  // they cleared the code and want to scan a different pod.
  const cancelAuthGate = useCallback(() => {
    setShowAuthGate(false);
    setAuthError('');
    setAuthEmail('');
    setAuthPassword('');
    setError(null);
    setJoining(false);
    setScannedCode(null);
    setCodeChars(['', '', '', '', '', '']);
    consumedUrlCodeRef.current = false;
    // Restart the scan loop if the camera is still running.
    if (!scanTimerRef.current && streamRef.current && videoRef.current) {
      startScanning();
    }
  }, []);

  // Swipe-down dismiss for the my-commanders + add-commander sheets.
  // my-commanders → fully close the auth gate (same as Cancel).
  // add-commander → return to the my-commanders view (same as Back).
  const myCmdrDrag = useSheetDrag(cancelAuthGate);
  const addCmdrDrag = useSheetDrag(() => { setAuthView('my-commanders'); setAuthError(''); });

  // Pre-fill from ?code= query param. If the code is a complete 6-char value
  // (the user landed here via a scanned/shared deep link), auto-join and then
  // strip the param from the URL so revisits / bfcache restores start clean.
  const consumedUrlCodeRef = useRef(false);
  useEffect(() => {
    if (consumedUrlCodeRef.current) return;
    const prefill = searchParams.get('code');
    if (!prefill) return;
    const cleaned = prefill.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const chars = cleaned.split('');
    while (chars.length < 6) chars.push('');
    setCodeChars(chars);
    if (cleaned.length === 6) {
      consumedUrlCodeRef.current = true;
      // Queue rather than fire immediately — the auth context may still be
      // resolving the session on first page load.
      setPendingJoinCode(cleaned);
      // Strip ?code= so a back+forward / bfcache restore doesn't re-fire it.
      router.replace('/join', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── bfcache reset ────────────────────────────────────────────────────────
  // Mobile browsers can restore the page from bfcache when the user navigates
  // back (or pulls the back-forward stack forward), including any auth-gate
  // popup state from the previous visit. When `pageshow.persisted` is true
  // the page came from bfcache — wipe the transient UI back to its initial
  // state so the camera scanner takes over fresh again.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      setShowAuthGate(false);
      setAuthView('commander');
      setAuthError('');
      setAuthEmail('');
      setAuthPassword('');
      setError(null);
      setJoining(false);
      setScannedCode(null);
      setCodeChars(['', '', '', '', '', '']);
      consumedUrlCodeRef.current = false;
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Auto-transition to my-commanders when user logs in while auth gate is open
  useEffect(() => {
    if (isLoggedIn && showAuthGate && (authView === 'sso' || authView === 'signin' || authView === 'signup')) {
      fetchMyCommanders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  async function fetchMyCommanders() {
    setLoadingMyCommanders(true);
    const { data } = await getMyCommanders();
    setMyCommanders(data);
    setLoadingMyCommanders(false);
    setAuthView('my-commanders');
  }

  /* ── Camera lifecycle ─────────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) { setCamStatus('unavailable'); return; }
      setCamStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCamStatus('active');
        startScanning();
      } catch (err: any) {
        if (cancelled) return;
        setCamStatus(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' ? 'denied' : 'unavailable');
      }
    }
    startCamera();
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── QR scanning loop ─────────────────────────────────────────────────── */
  const startScanning = useCallback(() => {
    let detector: BarcodeDetector | null = null;
    try { if (typeof BarcodeDetector !== 'undefined') detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch { /* */ }
    const scan = async () => {
      const video = videoRef.current; const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      try {
        if (detector) {
          const barcodes = await detector.detect(canvas);
          for (const bc of barcodes) { const code = extractCode(bc.rawValue); if (code) { handleScannedCode(code); return; } }
        }
      } catch { /* */ }
    };
    scanTimerRef.current = window.setInterval(scan, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScannedCode(code: string) {
    if (scannedCode) return;
    setScannedCode(code);
    const chars = code.split(''); while (chars.length < 6) chars.push('');
    setCodeChars(chars);
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    // Queue the join; the effect below will run it once authLoading clears,
    // so logged-in users land on the my-commanders picker reliably even on
    // first page load (when useAuth is still resolving the session).
    setPendingJoinCode(code);
  }

  // Drain any queued auto-join code once the auth context has finished loading.
  useEffect(() => {
    if (!pendingJoinCode) return;
    if (authLoading) return;
    const code = pendingJoinCode;
    setPendingJoinCode(null);
    handleJoin(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJoinCode, authLoading]);

  function handleCodeInput(value: string) {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const chars = clean.split(''); while (chars.length < 6) chars.push('');
    setCodeChars(chars);
    setScannedCode(null);
  }

  /* ── Join flow ─────────────────────────────────────────────────────────── */
  async function proceedToJoin(deckId?: string) {
    const fullCode = codeChars.join('');
    setJoining(true); setError(null);
    const { data: pod, error: joinErr } = await joinPod(fullCode, deckId);
    if (joinErr || !pod) { setError(joinErr ?? 'Failed to join pod'); setJoining(false); return; }
    stopCamera();
    const supabase = createClient();
    const { data: existingGames } = await supabase
      .from('games').select('id, pod_size').eq('pod_id', pod.id)
      .in('state', ['active', 'in_questionnaire'])
      .order('created_at', { ascending: false }).limit(1) as { data: any };
    let gameId: string; let podSize: number;
    if (existingGames && existingGames.length > 0) {
      gameId = existingGames[0].id; podSize = existingGames[0].pod_size;
    } else {
      const seats = pod.max_players ?? 2;
      const { data: newGame, error: gameErr } = await createGame(pod.id, seats);
      if (gameErr || !newGame) { setError(gameErr ?? 'Failed to start the game'); setJoining(false); return; }
      gameId = newGame.id; podSize = seats;
    }
    router.push(`/gridview-${podSize}p?podId=${pod.id}&gameId=${gameId}`);
  }

  // Commander search for guest flow
  function handleCmdSearch(query: string) {
    setCmdSearchQuery(query);
    if (cmdSearchTimer.current) clearTimeout(cmdSearchTimer.current);
    if (query.length < 2) { setCmdSearchResults([]); setCmdSearching(false); return; }
    setCmdSearching(true);
    cmdSearchTimer.current = setTimeout(() => {
      searchCommanders(query)
        .then(results => { setCmdSearchResults(results); setCmdSearching(false); })
        .catch(() => { setCmdSearchResults([]); setCmdSearching(false); });
    }, 300);
  }

  // Guest selects a commander -> sign in anonymously -> register deck -> join
  async function handleGuestSelectCommander(card: any) {
    setAuthSubmitting(true); setAuthError('');
    // 1. Sign in anonymously
    const { error: guestErr } = await signInAsGuest();
    if (guestErr) { setAuthError(guestErr); setAuthSubmitting(false); return; }
    // 2. Validate the card
    const { data: validated, error: valError } = await validateCommander(card.name);
    if (valError || !validated) { setAuthError(valError || 'Could not validate commander'); setAuthSubmitting(false); return; }
    if (!validated.isValidCommander) { setAuthError(`${validated.cardName} can't be used as a commander`); setAuthSubmitting(false); return; }
    // 3. Register the commander (skipBracket) — now we have an anonymous user ID
    const { data: newDeck, error: regError } = await registerCommander(validated.cardName, 2, true);
    if (regError || !newDeck) { setAuthError(regError || 'Failed to register commander'); setAuthSubmitting(false); return; }
    // 4. Join with the deck
    setShowAuthGate(false); setAuthSubmitting(false);
    await proceedToJoin(newDeck.id);
  }

  // Logged-in user selects a commander -> join
  async function handleSelectMyCommander(deck: Deck) {
    setAuthSubmitting(true); setAuthError('');
    setShowAuthGate(false); setAuthSubmitting(false);
    await proceedToJoin(deck.id);
  }

  // Logged-in user picks a new commander from Scryfall -> register (skipBracket) -> join
  async function handleAddNewCommander(card: any) {
    setAuthSubmitting(true); setAuthError('');
    // Validate the card
    const { data: validated, error: valError } = await validateCommander(card.name);
    if (valError || !validated) { setAuthError(valError || 'Could not validate commander'); setAuthSubmitting(false); return; }
    if (!validated.isValidCommander) { setAuthError(`${validated.cardName} can't be used as a commander`); setAuthSubmitting(false); return; }
    // Register with skipBracket — bracket picker shows on profile after the game
    const { data: newDeck, error: regError } = await registerCommander(validated.cardName, 2, true);
    if (regError || !newDeck) { setAuthError(regError || 'Failed to register commander'); setAuthSubmitting(false); return; }
    setShowAuthGate(false); setAuthSubmitting(false);
    await proceedToJoin(newDeck.id);
  }

  async function handleJoin(codeOverride?: string) {
    if (joining) return;
    const fullCode = (codeOverride ?? codeChars.join('')).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (fullCode.length < 6) { setError('Enter the full 6-character code'); return; }
    // Logged in (non-anonymous): pick from their saved commanders.
    // Use the auth-context `isLoggedIn` flag (which already excludes anonymous
    // / guest sessions) so a still-loading session doesn't fall through to the
    // guest path. Set the view BEFORE opening to avoid flashing the wrong UI.
    if (isLoggedIn) {
      setAuthView('my-commanders');
      setAuthError('');
      setShowAuthGate(true);
      fetchMyCommanders();
      return;
    }
    // Not logged in → show auth gate with guest commander search
    setAuthView('commander');
    setAuthError(''); setAuthEmail(''); setAuthPassword(''); setConfirmEmail('');
    setCmdSearchQuery(''); setCmdSearchResults([]);
    setSignupSuccess(false);
    setShowAuthGate(true);
  }

  // Email/password login
  async function handleAuthLogin() {
    if (!authEmail || !authPassword) { setAuthError('Please fill in all fields'); return; }
    setAuthSubmitting(true); setAuthError('');
    const { error: loginErr } = await signIn(authEmail, authPassword);
    if (loginErr) { setAuthError(loginErr); setAuthSubmitting(false); return; }
    setAuthSubmitting(false);
    // useEffect watching isLoggedIn will transition to my-commanders
  }

  // Email/password signup
  async function handleAuthSignUp() {
    setAuthError('');
    if (!authEmail || !authPassword) { setAuthError('Please fill in all fields'); return; }
    if (authEmail !== confirmEmail) { setAuthError('Emails do not match'); return; }
    if (authPassword.length < 6) { setAuthError('Password must be at least 6 characters'); return; }
    setAuthSubmitting(true);
    const { error: signUpErr } = await signUp(authEmail, authPassword);
    setAuthSubmitting(false);
    if (signUpErr) { setAuthError(signUpErr); return; }
    setSignupSuccess(true);
  }

  // Google SSO
  async function handleGoogleSSO() {
    const { supabase } = await import('../../lib/supabase');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined'
          ? window.location.origin + '/join?code=' + codeChars.join('')
          : undefined,
      },
    });
  }

  // Show login sheet
  function openLoginSheet() {
    setAuthView('sso');
    setAuthError('');
    setAuthEmail('');
    setAuthPassword('');
    setConfirmEmail('');
    setSignupSuccess(false);
    setTimeout(() => setLoginSlideUp(true), 30);
  }

  // Close login sheet back to commander
  function closeLoginSheet() {
    setLoginSlideUp(false);
    setTimeout(() => setAuthView('commander'), 300);
  }

  const displayCode: (string | null)[] = [
    codeChars[0], codeChars[1], codeChars[2], null, codeChars[3], codeChars[4], codeChars[5]
  ];

  const isLoginView = authView === 'sso' || authView === 'signin' || authView === 'signup';
  const isAddCmdView = authView === 'add-commander';

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Young+Serif&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; overflow: hidden; font-family: 'Instrument Sans', sans-serif; background: #F5EFE2; }
    .app { width: 100%; height: 100%; max-width: 430px; margin: 0 auto; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 8px; background: rgba(245,239,226,0.88); backdrop-filter: blur(14px) saturate(120%); -webkit-backdrop-filter: blur(14px) saturate(120%); border-bottom: 1px solid rgba(43,33,24,0.08); flex-shrink: 0; }
    .header-back { width: 40px; height: 40px; border-radius: 999px; border: none; background: transparent; color: #2B2118; cursor: pointer; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s ease; }
    .header-back:active { transform: scale(0.85); }
    .header-title { flex: 1; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; color: #2B2118; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .content { flex: 1; overflow: auto; padding: 8px 20px 120px; }
    .scanner-viewport { position: relative; aspect-ratio: 1 / 1; background: linear-gradient(180deg, #1A140E 0%, #0A0604 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 2px 0 rgba(43,33,24,0.05), 0 18px 36px -12px rgba(43,33,24,0.22); margin-top: 8px; }
    .scanner-viewport video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .corner { position: absolute; width: 40px; height: 40px; z-index: 2; }
    .corner-tl { top: 18px; left: 18px; border-top: 3px solid #B06B2C; border-left: 3px solid #B06B2C; border-top-left-radius: 12px; }
    .corner-tr { top: 18px; right: 18px; border-top: 3px solid #B06B2C; border-right: 3px solid #B06B2C; border-top-right-radius: 12px; }
    .corner-bl { bottom: 18px; left: 18px; border-bottom: 3px solid #B06B2C; border-left: 3px solid #B06B2C; border-bottom-left-radius: 12px; }
    .corner-br { bottom: 18px; right: 18px; border-bottom: 3px solid #B06B2C; border-right: 3px solid #B06B2C; border-bottom-right-radius: 12px; }
    .scan-line { position: absolute; left: 30px; right: 30px; top: 50%; height: 2px; background: linear-gradient(90deg, transparent, #B06B2C, transparent); box-shadow: 0 0 12px rgba(176,107,44,0.6); animation: scanPulse 2.5s ease-in-out infinite; z-index: 2; }
    @keyframes scanPulse { 0%, 100% { top: 35%; opacity: 0.4; } 50% { top: 60%; opacity: 1; } }
    .scanner-label { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center; color: rgba(245,239,226,0.75); font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; z-index: 2; }
    .scanner-status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; z-index: 1; color: rgba(245,239,226,0.6); font-size: 13px; font-weight: 500; text-align: center; padding: 20px; }
    .scanner-status-icon { width: 48px; height: 48px; border-radius: 14px; background: rgba(245,239,226,0.08); display: flex; align-items: center; justify-content: center; }
    .scanner-success { position: absolute; inset: 0; background: rgba(47,93,58,0.35); border: 3px solid #2F5D3A; border-radius: 24px; z-index: 3; display: flex; align-items: center; justify-content: center; animation: flashIn 0.3s ease; }
    @keyframes flashIn { from { opacity: 0; } to { opacity: 1; } }
    .or-divider { display: flex; align-items: center; gap: 10px; margin: 22px 0 14px; }
    .or-divider-line { flex: 1; height: 1px; background: rgba(43,33,24,0.14); }
    .or-divider-text { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: #8A7E6F; text-transform: uppercase; }
    .code-row { display: flex; gap: 6px; justify-content: center; }
    .code-char { width: 36px; height: 48px; background: #FAF5EA; border: 1px solid rgba(43,33,24,0.14); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: 'Young Serif', serif; font-size: 22px; color: #2B2118; font-variant-numeric: tabular-nums; }
    .code-char.filled { border: 1.5px solid #B06B2C; }
    .code-dash { align-self: center; font-family: 'Young Serif', serif; font-size: 28px; color: #8A7E6F; }
    .cta-wrap { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 16px 32px; background: linear-gradient(to top, #F5EFE2 60%, rgba(245,239,226,0)); z-index: 5; }
    .join-btn { width: 100%; border: none; cursor: pointer; background: #2F5D3A; color: #F5EFE2; font-family: 'Instrument Sans', sans-serif; font-weight: 600; font-size: 16px; padding: 16px 20px; border-radius: 20px; box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12); transition: all 0.2s ease; display: block; text-align: center; text-decoration: none; }
    .join-btn:active { transform: scale(0.97); }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        <div className="header">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="header-back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="header-title" style={{ margin: 0 }}>Join a pod</h1>
        </div>

        <div className="content">
          <div className="scanner-viewport">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {camStatus === 'active' && !scannedCode && (<>
              <div className="corner corner-tl" /><div className="corner corner-tr" />
              <div className="corner corner-bl" /><div className="corner corner-br" />
              <div className="scan-line" /><div className="scanner-label">Point camera at QR code</div>
            </>)}
            {scannedCode && (<div className="scanner-success"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F5EFE2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>)}
            {camStatus === 'idle' && (<div className="scanner-status"><div className="scanner-status-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>Starting camera...</div>)}
            {camStatus === 'requesting' && (<div className="scanner-status"><div className="scanner-status-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>Allow camera access to scan</div>)}
            {camStatus === 'denied' && (<div className="scanner-status"><div className="scanner-status-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v9"/></svg></div>Camera access denied<br/><span style={{ fontSize: 11, opacity: 0.7 }}>Use the code input below instead</span></div>)}
            {camStatus === 'unavailable' && (<div className="scanner-status"><div className="scanner-status-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>Camera not available<br/><span style={{ fontSize: 11, opacity: 0.7 }}>Enter the pod code manually</span></div>)}
          </div>

          <div className="or-divider"><div className="or-divider-line" /><span className="or-divider-text">or enter code</span><div className="or-divider-line" /></div>

          {error && <div style={{ color: '#B0593E', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{error}</div>}
          <div className="code-row" onClick={() => inputRef.current?.focus()}>
            {displayCode.map((c, i) => c === null
              ? <div key={i} className="code-dash">&mdash;</div>
              : <div key={i} className={`code-char ${c ? 'filled' : ''}`}>{c}</div>
            )}
          </div>
          <input ref={inputRef} type="text" value={codeChars.join('')}
            onChange={(e) => handleCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            maxLength={6} autoCapitalize="characters" />
        </div>

        <div className="cta-wrap">
          <button className="join-btn" onClick={() => handleJoin()}
            disabled={joining || codeChars.join('').length < 6}
            style={{ opacity: (joining || codeChars.join('').length < 6) ? 0.5 : 1 }}>
            {joining ? 'Joining...' : 'Join Pod'}
          </button>
        </div>
      </div>

      {/* ── Auth gate overlay ── */}
      {showAuthGate && (
        <div onClick={() => { if (!authSubmitting) cancelAuthGate(); }} style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Instrument Sans', sans-serif",
        }}>

          {/* ── Commander Search View (guest flow) ── */}
          {authView === 'commander' && (
            <div onClick={(e) => e.stopPropagation()} style={{
              width: '100%', maxWidth: 430,
              height: '100%',
              background: '#FAF5EA', borderRadius: '24px 24px 0 0',
              padding: '14px 16px 0',
              boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid rgba(43,33,24,0.14)',
              animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
              position: 'relative',
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: '#C8BCA8', margin: '0 auto 6px' }}/>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 14px' }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#B06B2C', marginBottom: 2 }}>Join the pod</div>
                  <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 24, color: '#2B2118', letterSpacing: '-0.01em' }}>Choose a commander</div>
                </div>
                <button onClick={cancelAuthGate} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#8A7E6F', padding: 0 }}>Cancel</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A7E6F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={cmdSearchQuery} onChange={(e) => handleCmdSearch(e.target.value)}
                  placeholder="Search legendary creatures..." autoFocus
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Instrument Sans', sans-serif", fontSize: 16, color: '#2B2118' }}/>
                {cmdSearchQuery && (
                  <button onClick={() => { setCmdSearchQuery(''); setCmdSearchResults([]); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A7E6F', padding: 4, display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              {authError && (<div style={{ background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B', textAlign: 'center', marginTop: 10 }}>{authError}</div>)}

              <div style={{ flex: 1, overflowY: 'auto', marginTop: 14, paddingBottom: 20 }}>
                {cmdSearching && <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Searching...</div>}
                {!cmdSearching && cmdSearchQuery.length < 2 && (<div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Type a commander name to search</div>)}
                {!cmdSearching && cmdSearchQuery.length >= 2 && cmdSearchResults.length === 0 && (<div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>No commanders found</div>)}
                {cmdSearchResults.length > 0 && (<div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: '#8A7E6F', padding: '0 4px 8px' }}>{cmdSearchResults.length} matches</div>)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cmdSearchResults.map((r: any, i: number) => {
                    const art = r.image_uris?.art_crop ?? r.card_faces?.[0]?.image_uris?.art_crop ?? null;
                    return (
                      <button key={i} onClick={() => handleGuestSelectCommander(r)} disabled={authSubmitting} style={{
                        width: '100%', textAlign: 'left', cursor: authSubmitting ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 14,
                        background: 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif", opacity: authSubmitting ? 0.5 : 1,
                      }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(43,33,24,0.14)', background: '#F5EFE2' }}>
                          {art && <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 16, color: '#2B2118', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: '#8A7E6F', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.type_line}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Log in button — scrolls with content, hides under keyboard */}
                <div style={{ padding: '20px 0 28px' }}>
                  <button onClick={openLoginSheet} style={{
                    width: '100%', padding: '15px 18px', background: '#2F5D3A', color: '#F5EFE2',
                    border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 15, fontWeight: 600,
                    fontFamily: "'Instrument Sans', sans-serif", boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                  }}>Log in instead</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Login Sheet (matches landing page style) ── */}
          {isLoginView && (
            <div onClick={(e) => e.stopPropagation()} style={{
              width: '100%', maxWidth: 430, alignSelf: 'flex-end',
              display: 'flex', flexDirection: 'column',
              transform: loginSlideUp ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 300ms cubic-bezier(.22,.61,.36,1)',
            }}>
              {/* Torn paper top edge */}
              <div style={{ marginBottom: -1 }}>
                <TornEdge width={430} color="#FAF5EA" />
              </div>

              <div style={{
                position: 'relative',
                background: '#FAF5EA',
                padding: '8px 22px 32px',
                fontFamily: "'Instrument Sans', sans-serif",
                minHeight: 360,
              }}>
                {/* Close button */}
                <button onClick={closeLoginSheet} aria-label="Close" style={{
                  position: 'absolute', top: 14, right: 16,
                  width: 32, height: 32, borderRadius: 999,
                  border: '1px solid rgba(43,33,24,0.08)',
                  background: '#EDE4D0',
                  color: '#5C5043', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2,
                }}>
                  <LIcon name="x" size={15} width={2} />
                </button>

                {/* SSO View */}
                {authView === 'sso' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <AuraMark size={28} color="#B06B2C" />
                      </div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6 }}>The Threshold</div>
                      <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', color: '#2B2118', lineHeight: 1.05 }}>Step into the pod</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#5C5043' }}>Sign in to keep your record.</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <SSOButton provider="google" onClick={handleGoogleSSO} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.14)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#8A7E6F', letterSpacing: '0.18em', textTransform: 'uppercase' }}>or</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.14)' }} />
                    </div>
                    <button onClick={() => { setAuthView('signup'); setAuthError(''); }} style={{
                      background: '#2F5D3A', color: '#F5EFE2',
                      border: 'none', borderRadius: 20,
                      padding: '14px 18px', cursor: 'pointer',
                      fontSize: 15, fontWeight: 600,
                      boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                      fontFamily: "'Instrument Sans', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <LIcon name="mail" size={16} width={2} stroke="#F5EFE2" />
                      Sign up with email
                    </button>
                    <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043', marginTop: 4 }}>
                      {"Don't have an account? "}
                      <button onClick={() => { setAuthView('signup'); setAuthError(''); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#2F5D3A', fontWeight: 700, fontSize: 13,
                        fontFamily: "'Instrument Sans', sans-serif", padding: 0,
                        textDecoration: 'underline', textUnderlineOffset: 3,
                      }}>Sign up</button>
                    </div>
                  </div>
                )}

                {/* Sign In View */}
                {authView === 'signin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <AuraMark size={28} color="#B06B2C" />
                      </div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6 }}>Returning</div>
                      <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', color: '#2B2118', lineHeight: 1.05 }}>Welcome back</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#5C5043' }}>{"The pod's been waiting."}</div>
                    </div>
                    {authError && (<div style={{ background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B', textAlign: 'center' }}>{authError}</div>)}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Email</span>
                        <input type="email" placeholder="you@table.cards" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} autoComplete="off"
                          style={{ width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118', fontFamily: "'Instrument Sans', sans-serif", outline: 'none' }}/>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Password</span>
                        <input type="password" placeholder="--------" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} autoComplete="off"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAuthLogin(); }}
                          style={{ width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118', fontFamily: "'Instrument Sans', sans-serif", outline: 'none' }}/>
                      </label>
                    </div>
                    <button onClick={handleAuthLogin} disabled={authSubmitting} style={{
                      background: authSubmitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
                      border: 'none', borderRadius: 20,
                      padding: '14px 18px', cursor: authSubmitting ? 'default' : 'pointer',
                      fontSize: 15, fontWeight: 600, marginTop: 4,
                      boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}>{authSubmitting ? 'Logging in...' : 'Log in'}</button>
                    <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043' }}>
                      {"Don't have an account? "}
                      <button onClick={() => { setAuthView('signup'); setAuthError(''); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#2F5D3A', fontWeight: 700, fontSize: 13,
                        fontFamily: "'Instrument Sans', sans-serif", padding: 0,
                        textDecoration: 'underline', textUnderlineOffset: 3,
                      }}>Sign up</button>
                    </div>
                  </div>
                )}

                {/* Sign Up View */}
                {authView === 'signup' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <AuraMark size={28} color="#B06B2C" />
                      </div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6 }}>New player</div>
                      <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', color: '#2B2118', lineHeight: 1.05 }}>Create account</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#5C5043' }}>Join your first pod.</div>
                    </div>
                    {authError && (<div style={{ background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B', textAlign: 'center' }}>{authError}</div>)}

                    {signupSuccess ? (
                      <>
                        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 14, color: '#2B2118' }}>
                          We sent a confirmation link to your email. Click it to activate your account, then come back and log in.
                        </div>
                        <button onClick={() => { setAuthView('signin'); setAuthError(''); setSignupSuccess(false); }} style={{
                          background: '#2F5D3A', color: '#F5EFE2',
                          border: 'none', borderRadius: 20,
                          padding: '14px 18px', cursor: 'pointer',
                          fontSize: 15, fontWeight: 600, marginTop: 4,
                          boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                          fontFamily: "'Instrument Sans', sans-serif",
                        }}>Go to Log in</button>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Email</span>
                            <input type="email" placeholder="you@table.cards" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} autoComplete="off"
                              style={{ width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118', fontFamily: "'Instrument Sans', sans-serif", outline: 'none' }}/>
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Confirm email</span>
                            <input type="email" placeholder="you@table.cards" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} autoComplete="off"
                              style={{ width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118', fontFamily: "'Instrument Sans', sans-serif", outline: 'none' }}/>
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A7E6F' }}>Password</span>
                            <input type="password" placeholder="--------" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} autoComplete="new-password"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAuthSignUp(); }}
                              style={{ width: '100%', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#2B2118', fontFamily: "'Instrument Sans', sans-serif", outline: 'none' }}/>
                          </label>
                        </div>
                        <button onClick={handleAuthSignUp} disabled={authSubmitting} style={{
                          background: authSubmitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
                          border: 'none', borderRadius: 20,
                          padding: '14px 18px', cursor: authSubmitting ? 'default' : 'pointer',
                          fontSize: 15, fontWeight: 600, marginTop: 4,
                          boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
                          fontFamily: "'Instrument Sans', sans-serif",
                        }}>{authSubmitting ? 'Creating...' : 'Create account'}</button>
                        <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043' }}>
                          Already have an account?{' '}
                          <button onClick={() => { setAuthView('signin'); setAuthError(''); }} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#2F5D3A', fontWeight: 700, fontSize: 13,
                            fontFamily: "'Instrument Sans', sans-serif", padding: 0,
                            textDecoration: 'underline', textUnderlineOffset: 3,
                          }}>Log in</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── My Commanders View (after login) ── */}
          {authView === 'my-commanders' && (
            <div ref={myCmdrDrag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
              width: '100%', maxWidth: 430,
              maxHeight: '85%',
              background: '#FAF5EA', borderRadius: '24px 24px 0 0',
              padding: '14px 16px 0',
              boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid rgba(43,33,24,0.14)',
              animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
              position: 'relative',
            }}>
              <div
                onTouchStart={myCmdrDrag.onTouchStart}
                onTouchMove={myCmdrDrag.onTouchMove}
                onTouchEnd={myCmdrDrag.onTouchEnd}
                style={{ cursor: 'grab', touchAction: 'none', padding: '4px 0' }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 999, background: '#C8BCA8', margin: '0 auto' }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 14px' }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#B06B2C', marginBottom: 2 }}>Welcome back</div>
                  <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 24, color: '#2B2118', letterSpacing: '-0.01em' }}>Choose a commander</div>
                </div>
                <button onClick={cancelAuthGate} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#8A7E6F', padding: 0 }}>Cancel</button>
              </div>

              {authError && (<div style={{ background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B', textAlign: 'center', marginBottom: 10 }}>{authError}</div>)}

              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 28 }}>
                {loadingMyCommanders && <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Loading your commanders...</div>}

                {!loadingMyCommanders && myCommanders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>
                    {"You haven't added any commanders yet."}
                  </div>
                )}

                {myCommanders.length > 0 && (<div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: '#8A7E6F', padding: '0 4px 8px' }}>{myCommanders.length} commander{myCommanders.length !== 1 ? 's' : ''}</div>)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {myCommanders.map((deck) => (
                    <button key={deck.id} onClick={() => handleSelectMyCommander(deck)} disabled={authSubmitting} style={{
                      width: '100%', textAlign: 'left', cursor: authSubmitting ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 14,
                      background: 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif", opacity: authSubmitting ? 0.5 : 1,
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(43,33,24,0.14)', background: '#F5EFE2' }}>
                        {deck.commander_art_url && <img src={deck.commander_art_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 16, color: '#2B2118', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.commander_name}</div>
                        <div style={{ fontSize: 12, color: '#8A7E6F', marginTop: 2 }}>
                          {deck.bracket ? `Bracket ${deck.bracket}` : 'No bracket set'}
                          {deck.color_identity ? ` · ${deck.color_identity}` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Add new commander button */}
                {!loadingMyCommanders && (
                  <div style={{ padding: '16px 0 8px' }}>
                    <button onClick={() => { setAuthView('add-commander'); setAuthError(''); setCmdSearchQuery(''); setCmdSearchResults([]); }} style={{
                      width: '100%', padding: '14px 18px', background: 'transparent',
                      border: '1.5px dashed rgba(43,33,24,0.2)', borderRadius: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontSize: 14, fontWeight: 600, color: '#2F5D3A',
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add new commander
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Add Commander View (Scryfall search for logged-in users) ── */}
          {isAddCmdView && (
            <div ref={addCmdrDrag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
              width: '100%', maxWidth: 430,
              height: '100%',
              background: '#FAF5EA', borderRadius: '24px 24px 0 0',
              padding: '14px 16px 0',
              boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid rgba(43,33,24,0.14)',
              animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
              position: 'relative',
            }}>
              <div
                onTouchStart={addCmdrDrag.onTouchStart}
                onTouchMove={addCmdrDrag.onTouchMove}
                onTouchEnd={addCmdrDrag.onTouchEnd}
                style={{ cursor: 'grab', touchAction: 'none', padding: '4px 0' }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 999, background: '#C8BCA8', margin: '0 auto' }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 14px' }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#B06B2C', marginBottom: 2 }}>New commander</div>
                  <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 24, color: '#2B2118', letterSpacing: '-0.01em' }}>Search Scryfall</div>
                </div>
                <button onClick={() => { setAuthView('my-commanders'); setAuthError(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#8A7E6F', padding: 0 }}>Back</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F5EFE2', border: '1px solid rgba(43,33,24,0.14)', borderRadius: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A7E6F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={cmdSearchQuery} onChange={(e) => handleCmdSearch(e.target.value)}
                  placeholder="Search legendary creatures..." autoFocus
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Instrument Sans', sans-serif", fontSize: 16, color: '#2B2118' }}/>
                {cmdSearchQuery && (
                  <button onClick={() => { setCmdSearchQuery(''); setCmdSearchResults([]); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A7E6F', padding: 4, display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              {authError && (<div style={{ background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B', textAlign: 'center', marginTop: 10 }}>{authError}</div>)}

              <div style={{ flex: 1, overflowY: 'auto', marginTop: 14, paddingBottom: 20 }}>
                {cmdSearching && <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Searching...</div>}
                {!cmdSearching && cmdSearchQuery.length < 2 && (<div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Type a commander name to search</div>)}
                {!cmdSearching && cmdSearchQuery.length >= 2 && cmdSearchResults.length === 0 && (<div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>No commanders found</div>)}
                {cmdSearchResults.length > 0 && (<div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: '#8A7E6F', padding: '0 4px 8px' }}>{cmdSearchResults.length} matches</div>)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cmdSearchResults.map((r: any, i: number) => {
                    const art = r.image_uris?.art_crop ?? r.card_faces?.[0]?.image_uris?.art_crop ?? null;
                    return (
                      <button key={i} onClick={() => handleAddNewCommander(r)} disabled={authSubmitting} style={{
                        width: '100%', textAlign: 'left', cursor: authSubmitting ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 14,
                        background: 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif", opacity: authSubmitting ? 0.5 : 1,
                      }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(43,33,24,0.14)', background: '#F5EFE2' }}>
                          {art && <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 16, color: '#2B2118', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: '#8A7E6F', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.type_line}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
