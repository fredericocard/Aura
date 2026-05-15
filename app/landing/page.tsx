// ============================================
// LANDING PAGE — Splash + Home Screen
// Route: / (root)
// ============================================
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

/* ── LIcon — inline Lucide icons ── */
function LIcon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const d: Record<string, React.ReactNode> = {
    plus: <><line x1="12" y1="6" x2="12" y2="18" /><line x1="6" y1="12" x2="18" y2="12" /></>,
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></>,
    info: <><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    mail: <><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><polyline points="3,6 12,13 21,6" /></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>,
  };
  return <svg {...p}>{d[name] || null}</svg>;
}

/* ── AuraMark — real logo from design system ── */
function AuraMark({ size = 22, color = '#2F5D3A' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs>
        <clipPath id={`aura-clip-${size}`}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
      </defs>
      <g clipPath={`url(#aura-clip-${size})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

/* ── SunCircle — soft radiating circle ornament ── */
function SunCircle({ size = 360, opacity = 0.14 }: { size?: number; opacity?: number }) {
  const cx = 180, cy = 180;
  return (
    <svg width={size} height={size} viewBox="0 0 360 360" aria-hidden="true" style={{ opacity, width: size }}>
      <g stroke="rgba(43,33,24,0.35)" strokeWidth="0.7" fill="none">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 55, r2 = 170;
          return <line key={i}
            x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} />;
        })}
        <circle cx={cx} cy={cy} r="55" />
        <circle cx={cx} cy={cy} r="100" strokeDasharray="1.5 4" />
        <circle cx={cx} cy={cy} r="140" strokeDasharray="1 5" />
        <circle cx={cx} cy={cy} r="170" />
      </g>
    </svg>
  );
}

/* ── TornEdge — hand-torn paper top of login sheet ── */
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

/* ── ActionTile — primary (forest) or secondary (parchment) ── */
function ActionTile({ variant = 'primary', icon, label, sub, onClick }: { variant?: 'primary' | 'secondary'; icon: string; label: string; sub: string; onClick?: () => void }) {
  const isPrimary = variant === 'primary';
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, cursor: 'pointer',
      background: isPrimary ? '#2F5D3A' : '#FAF5EA',
      color: isPrimary ? '#F5EFE2' : '#2B2118',
      border: isPrimary ? 'none' : '1px solid rgba(43,33,24,0.14)',
      borderRadius: 20,
      padding: '18px 16px 16px',
      boxShadow: isPrimary
        ? '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)'
        : '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
      fontFamily: "'Instrument Sans', sans-serif",
      textAlign: 'left',
      minHeight: 100,
    }}>
      <LIcon name={icon} size={20} width={1.75}
        stroke={isPrimary ? 'rgba(245,239,226,0.85)' : '#B06B2C'} />
      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.005em' }}>{label}</div>
        <div style={{
          fontSize: 12, marginTop: 4, fontWeight: 500,
          color: isPrimary ? 'rgba(245,239,226,0.65)' : '#8A7E6F',
          letterSpacing: '0.04em',
        }}>{sub}</div>
      </div>
    </button>
  );
}

/* ── UtilityItem — hairline row buttons ── */
function UtilityItem({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, cursor: 'pointer',
      background: 'transparent', border: 'none',
      padding: '14px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      color: '#5C5043', fontFamily: "'Instrument Sans', sans-serif",
      fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
    }}>
      <LIcon name={icon} size={15} width={1.75} />
      <span>{label}</span>
    </button>
  );
}

/* ── SheetMasthead — shared header for all login views ── */
function SheetMasthead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <AuraMark size={28} color="#B06B2C" />
      </div>
      <div style={{
        fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700,
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: '#B06B2C', marginBottom: 6,
      }}>{eyebrow}</div>
      <div style={{
        fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400,
        fontSize: 28, letterSpacing: '-0.02em',
        color: '#2B2118', lineHeight: 1.05,
      }}>{title}</div>
      {subtitle &&
        <div style={{ marginTop: 6, fontSize: 13, color: '#5C5043' }}>{subtitle}</div>
      }
    </div>
  );
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

/* ── FieldInput — form fields for sign up / sign in ── */
function FieldInput({ label, type = 'text', placeholder, value, onChange, autoComplete }: { label: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: '#8A7E6F',
      }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && showPw ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete ?? 'off'}
          style={{
            width: '100%',
            background: '#F5EFE2',
            border: '1px solid rgba(43,33,24,0.14)',
            borderRadius: 12, padding: '12px 14px',
            paddingRight: isPassword ? 48 : 14,
            fontSize: 15, color: '#2B2118',
            fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {isPassword && (
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPw(!showPw); }} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2B2118" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {showPw
                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
            </svg>
          </button>
        )}
      </div>
    </label>
  );
}

/* ── ErrorBanner ── */
function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{
      background: 'rgba(158,43,43,0.08)',
      border: '1px solid rgba(158,43,43,0.2)',
      borderRadius: 12,
      padding: '10px 14px',
      fontSize: 13,
      color: '#9E2B2B',
      textAlign: 'center',
    }}>{message}</div>
  );
}

/* ── SSOView — initial login sheet ── */
function SSOView({ setView, onLogin, redirectTo }: { setView: (v: string) => void; onLogin: () => void; redirectTo?: string }) {
  const handleGoogleSSO = async () => {
    const { supabase } = await import('../../lib/supabase');
    const dest = redirectTo || '/create';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin + '/landing?next=' + encodeURIComponent(dest) : undefined,
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetMasthead eyebrow="The Threshold" title="Step into the pod" subtitle="Log in to keep your record." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SSOButton provider="google" onClick={handleGoogleSSO} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.14)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8A7E6F', letterSpacing: '0.18em', textTransform: 'uppercase' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.14)' }} />
      </div>
      <button onClick={() => setView('signup')} style={{
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
        Already have an account?{' '}
        <button onClick={() => setView('signin')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#2F5D3A', fontWeight: 700, fontSize: 13,
          fontFamily: "'Instrument Sans', sans-serif", padding: 0,
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}>Log in</button>
      </div>
    </div>
  );
}

/* ── SignUpView ── */
function SignUpView({ setView }: { setView: (v: string) => void }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (email !== confirmEmail) { setError('Emails do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setSubmitting(true);
    const { error: authError } = await signUp(email, password);
    setSubmitting(false);

    if (authError) {
      setError(authError);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SheetMasthead eyebrow="Almost there" title="Check your email" subtitle="We sent a confirmation link. Click it to activate your account, then come back and log in." />
        <button onClick={() => setView('signin')} style={{
          background: '#2F5D3A', color: '#F5EFE2',
          border: 'none', borderRadius: 20,
          padding: '14px 18px', cursor: 'pointer',
          fontSize: 15, fontWeight: 600, marginTop: 4,
          boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
          fontFamily: "'Instrument Sans', sans-serif",
        }}>Go to Log in</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetMasthead eyebrow="New player" title="Create account" subtitle="Join your first pod." />
      <ErrorBanner message={error} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <FieldInput label="Email" type="email" placeholder="you@table.cards" value={email} onChange={setEmail} autoComplete="off" />
        <FieldInput label="Confirm email" type="email" placeholder="you@table.cards" value={confirmEmail} onChange={setConfirmEmail} autoComplete="off" />
        <FieldInput label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} autoComplete="new-password" />
      </div>
      <button onClick={handleSignUp} disabled={submitting} style={{
        background: submitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
        border: 'none', borderRadius: 20,
        padding: '14px 18px', cursor: submitting ? 'default' : 'pointer',
        fontSize: 15, fontWeight: 600, marginTop: 4,
        boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
        fontFamily: "'Instrument Sans', sans-serif",
      }}>{submitting ? 'Creating...' : 'Create account'}</button>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043' }}>
        Already have an account?{' '}
        <button onClick={() => setView('signin')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#2F5D3A', fontWeight: 700, fontSize: 13,
          fontFamily: "'Instrument Sans', sans-serif", padding: 0,
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}>Log in</button>
      </div>
    </div>
  );
}

/* ── SignInView ── */
function SignInView({ setView }: { setView: (v: string) => void }) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }

    setSubmitting(true);
    const { error: authError } = await signIn(email, password);
    setSubmitting(false);

    if (authError) {
      setError(authError);
    }
    // Auth state change will be picked up by the context automatically
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetMasthead eyebrow="Returning" title="Welcome back" subtitle="The pod's been waiting." />
      <ErrorBanner message={error} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <FieldInput label="Email" type="email" placeholder="you@table.cards" value={email} onChange={setEmail} autoComplete="off" />
        <FieldInput label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} autoComplete="off" />
      </div>
      <button onClick={handleSignIn} disabled={submitting} style={{
        background: submitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
        border: 'none', borderRadius: 20,
        padding: '14px 18px', cursor: submitting ? 'default' : 'pointer',
        fontSize: 15, fontWeight: 600, marginTop: 4,
        boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
        fontFamily: "'Instrument Sans', sans-serif",
      }}>{submitting ? 'Logging in...' : 'Log in'}</button>
      {resetSent ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#2F5D3A', fontWeight: 600 }}>Reset link sent — check your email.</div>
      ) : (
        <button onClick={async () => {
          if (!email) { setError('Enter your email first'); return; }
          const { error: resetErr } = await resetPassword(email);
          if (resetErr) { setError(resetErr); } else { setResetSent(true); setError(''); }
        }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#8A7E6F', fontWeight: 600, fontSize: 13,
          fontFamily: "'Instrument Sans', sans-serif", padding: 0,
          textAlign: 'center', width: '100%',
        }}>Forgot password?</button>
      )}
      <div style={{ textAlign: 'center', fontSize: 13, color: '#5C5043' }}>
        Don&apos;t have an account?{' '}
        <button onClick={() => setView('signup')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#2F5D3A', fontWeight: 700, fontSize: 13,
          fontFamily: "'Instrument Sans', sans-serif", padding: 0,
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}>Sign up</button>
      </div>
    </div>
  );
}

/* ── LoginSheet — bottom sheet with torn-paper edge ── */
function LoginSheet({ onClose, redirect }: { onClose: () => void; redirect?: string }) {
  const [view, setView] = useState('sso');
  const [slideUp, setSlideUp] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setTimeout(() => setSlideUp(true), 30);
  }, []);

  // Auto-close when user successfully logs in
  useEffect(() => {
    if (isLoggedIn) {
      handleClose();
    }
  }, [isLoggedIn]);

  const handleClose = () => {
    setSlideUp(false);
    setTimeout(onClose, 300);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(43,33,24,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: slideUp ? 1 : 0,
        transition: 'opacity 300ms cubic-bezier(.22,.61,.36,1)',
      }} />

      {/* Sheet */}
      <div style={{
        marginTop: 'auto', position: 'relative',
        maxWidth: 430, width: '100%', alignSelf: 'center',
        transform: slideUp ? 'translateY(0)' : 'translateY(100%)',
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
          <button onClick={handleClose} aria-label="Close" style={{
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

          {view === 'sso' && <SSOView setView={setView} onLogin={() => {}} redirectTo={redirect} />}
          {view === 'signup' && <SignUpView setView={setView} />}
          {view === 'signin' && <SignInView setView={setView} />}
        </div>
      </div>
    </div>
  );
}

/* ── Landing Page ── */
export default function HomePage() {
  /* Ink-bloom splash animation states */
  const [inkRise, setInkRise] = useState(false);
  const [dotIn, setDotIn] = useState(false);
  const [glowIn, setGlowIn] = useState(false);
  const [wordIn, setWordIn] = useState(false);
  const [subIn, setSubIn] = useState(false);
  const [footIn, setFootIn] = useState(false);

  const [phase, setPhase] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [loginRedirect, setLoginRedirect] = useState('/create');
  const router = useRouter();
  const { isLoggedIn, isGuest, user, signOut, loading } = useAuth();

  useEffect(() => {
    const timers = [
      /* Ink bloom sequence */
      setTimeout(() => setInkRise(true), 60),
      setTimeout(() => setGlowIn(true), 1200),
      setTimeout(() => setDotIn(true), 1400),
      setTimeout(() => setWordIn(true), 1900),
      setTimeout(() => setSubIn(true), 2300),
      setTimeout(() => setFootIn(true), 2500),
      /* Morph + landing reveal */
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4100),
      setTimeout(() => setPhase(5), 4700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-open login when ?login=1 is in URL (used by other pages routing to landing for auth)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1' && !isLoggedIn) {
      setShowLogin(true);
    }
  }, [isLoggedIn]);

  // After any login (email/password, Google OAuth), redirect to saved destination
  useEffect(() => {
    if (!isLoggedIn || loading) return;

    // 0. If user was doing Google SSO from the join page, redirect back there
    const joinCode = sessionStorage.getItem('joinPodCode');
    if (joinCode) {
      sessionStorage.removeItem('joinPodCode');
      window.location.href = '/join?code=' + joinCode;
      return;
    }

    // 1. Check sessionStorage (survives OAuth page reload, same-origin same-tab)
    const saved = sessionStorage.getItem('loginRedirect');
    if (saved) {
      sessionStorage.removeItem('loginRedirect');
      setShowLogin(false);
      window.location.href = saved;
      return;
    }

    // 2. Check ?next= param (set in OAuth redirectTo URL)
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next) {
      window.location.href = next;
      return;
    }

    // 3. Email/password login while login sheet is open
    if (showLogin) {
      setShowLogin(false);
      router.push(loginRedirect);
    }
  }, [isLoggedIn, loading, showLogin, loginRedirect, router]);

  const ease = 'cubic-bezier(.22,.61,.36,1)';
  const morph = phase >= 3;

  return (
    <div style={{
      width: '100%', maxWidth: 430, height: '100dvh', margin: '0 auto',
      position: 'relative', display: 'flex', flexDirection: 'column',
      background: '#F5EFE2',
      backgroundImage:
        'radial-gradient(ellipse at 50% 18%, rgba(201,155,47,0.10), transparent 55%), ' +
        'radial-gradient(ellipse at 50% 95%, rgba(47,93,58,0.07), transparent 50%)',
      fontFamily: "'Instrument Sans', sans-serif",
      overflow: 'hidden',
      padding: '60px 22px 22px',
    }}>

      {/* ── SPLASH LOCKUP — InkBloom mark + wordmark ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        zIndex: 10,
        top: morph ? 60 : '50%',
        transform: morph ? 'translateY(0)' : 'translateY(-50%)',
        transition: `top 1.1s ${ease}, transform 1.1s ${ease}`,
        pointerEvents: 'none',
      }}>
        {/* Mark container — shrinks on morph */}
        <div style={{
          position: 'relative',
          width: morph ? 40 : 120,
          height: morph ? 40 : 120,
          transition: `width 1.1s ${ease}, height 1.1s ${ease}`,
        }}>
          {/* Ink glow */}
          <div style={{
            position: 'absolute', inset: -30, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(47,93,58,0.22), transparent 65%)',
            filter: 'blur(8px)',
            opacity: glowIn && !morph ? 0.7 : 0,
            transition: `opacity ${morph ? '600ms' : '800ms'} ${ease}`,
          }}/>
          {/* Ghost V shapes (faint watermark) */}
          <svg width="100%" height="100%" viewBox="0 0 64 64"
               style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <clipPath id="lp-ghost"><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
            </defs>
            <g clipPath="url(#lp-ghost)">
              <polygon points="8,60 30,4 31,4 24,60" fill="rgba(47,93,58,0.10)"/>
              <polygon points="40,60 33,4 34,4 56,60" fill="rgba(47,93,58,0.10)"/>
            </g>
          </svg>
          {/* Ink-fill V shapes + dot */}
          <svg width="100%" height="100%" viewBox="0 0 64 64"
               style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <clipPath id="lp-fill"><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
            </defs>
            <g clipPath="url(#lp-fill)" style={{
              transformOrigin: '50% 100%',
              transform: inkRise ? 'scaleY(1)' : 'scaleY(0)',
              opacity: inkRise ? 1 : 0.4,
              transition: `transform 1.7s ${ease}, opacity 1.7s ${ease}`,
            }}>
              <polygon points="8,60 30,4 31,4 24,60" fill="#2F5D3A"/>
              <polygon points="40,60 33,4 34,4 56,60" fill="#2F5D3A"/>
            </g>
            <circle cx="32" cy="36" r="2.4" fill="#2F5D3A" style={{
              transformOrigin: '32px 36px',
              transform: dotIn ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0)',
              opacity: dotIn ? 1 : 0,
              transition: `transform 0.5s ${ease}, opacity 0.5s ${ease}`,
            }}/>
          </svg>
        </div>

        {/* Wordmark "Aura" — fades out on morph */}
        <div style={{
          fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400,
          fontSize: 52, letterSpacing: '-0.02em',
          lineHeight: 1, color: '#B06B2C',
          marginTop: 18,
          opacity: wordIn && !morph ? 1 : 0,
          transform: wordIn ? 'translateY(0)' : 'translateY(6px)',
          transition: `opacity ${morph ? '600ms' : '800ms'} ${ease}, transform 800ms ${ease}`,
        }}>Aura</div>

        {/* Subtitle */}
        <div style={{
          fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
          color: '#8A7E6F', fontWeight: 600, marginTop: 8,
          opacity: subIn && !morph ? 1 : 0,
          transform: subIn ? 'translateY(0)' : 'translateY(6px)',
          transition: `opacity ${morph ? '500ms' : '600ms'} ${ease}, transform 600ms ${ease}`,
        }}>Commander · Reviewed</div>
      </div>

      {/* Splash footer — "Every game has a story" */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        textAlign: 'center', fontSize: 11,
        color: '#8A7E6F',
        letterSpacing: '0.18em', textTransform: 'uppercase' as const, fontWeight: 600,
        fontFamily: "'Instrument Sans', sans-serif",
        zIndex: 10, pointerEvents: 'none',
        opacity: footIn && !morph ? 1 : 0,
        transform: footIn ? 'translateY(0)' : 'translateY(6px)',
        transition: `opacity ${morph ? '500ms' : '600ms'} ${ease}, transform 600ms ${ease}`,
      }}>Every game has a story</div>

      {/* ── UPPER BAND ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 14, position: 'relative', zIndex: 2,
      }}>
        <div style={{ height: 40 }} />
        <div style={{
          fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400,
          fontSize: 54, letterSpacing: '-0.02em',
          lineHeight: 1, color: '#B06B2C',
          opacity: phase >= 4 ? 1 : 0,
          transition: `opacity 600ms ${ease} 80ms`,
        }}>Aura</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, width: 200, marginTop: -2,
          opacity: phase >= 4 ? 1 : 0,
          transition: `opacity 600ms ${ease}`,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.18)' }} />
          <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: '#2F5D3A' }} />
          <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.18)' }} />
        </div>
        <div style={{
          fontFamily: "'Young Serif', Georgia, serif",
          fontStyle: 'italic', fontWeight: 400,
          fontSize: 15, color: '#5C5043',
          textAlign: 'center', lineHeight: 1.4,
          maxWidth: 280, marginTop: 4,
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? 'translateY(0)' : 'translateY(6px)',
          transition: `opacity 600ms ${ease} 150ms, transform 600ms ${ease} 150ms`,
        }}>
          Your Commander Journey Remembered
        </div>
      </div>

      {/* ── MIDDLE BAND ── */}
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '4px 0 4px',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) scale(${morph ? 1 : 0.5})`,
          opacity: morph ? 0.16 : 0,
          transition: `opacity 1400ms ${ease}, transform 1400ms ${ease}`,
        }}>
          <SunCircle size={340} opacity={1} />
        </div>
        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center',
          maxWidth: 220,
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? 'translateY(0)' : 'translateY(6px)',
          transition: `opacity 600ms ${ease} 300ms, transform 600ms ${ease} 300ms`,
        }}>
          <div style={{
            fontFamily: "'Young Serif', Georgia, serif",
            fontSize: 28, lineHeight: 1.15,
            color: '#2B2118', letterSpacing: '-0.02em',
            textAlign: 'left', maxWidth: 260,
          }}>
            Play your style. Earn badges. Grow your Commander&apos;s{' '}
            <span style={{ color: '#B06B2C' }}>Aura.</span>
          </div>
        </div>
      </div>

      {/* ── LOWER BAND ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        opacity: phase >= 5 ? 1 : 0,
        transform: phase >= 5 ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 500ms ${ease}, transform 500ms ${ease}`,
      }}>
        <div style={{
          background: '#EDE4D0',
          borderRadius: 22,
          padding: 8,
          boxShadow: 'inset 0 1px 0 rgba(43,33,24,0.06), inset 0 -1px 0 rgba(255,255,255,0.4)',
          display: 'flex', gap: 8,
        }}>
          <ActionTile variant="primary" icon="plus" label="Create a Pod" sub="BEGIN YOUR GAME" onClick={() => {
            if (isLoggedIn) {
              router.push('/create');
            } else {
              setLoginRedirect('/create');
              sessionStorage.setItem('loginRedirect', '/create');
              setShowLogin(true);
            }
          }} />
          <ActionTile variant="secondary" icon="scan" label="Join a Pod" sub="SCAN TO ENTER" onClick={() => router.push('/join')} />
        </div>
        <div style={{
          marginTop: 8,
          display: 'flex',
          borderTop: '1px solid rgba(43,33,24,0.14)',
        }}>
          <UtilityItem icon="compass" label="New here?" onClick={() => router.push('/howtoplay')} />
          <div style={{ width: 1, background: 'rgba(43,33,24,0.14)' }} />
          <UtilityItem icon="user" label={isLoggedIn ? 'Profile' : 'Sign in'} onClick={() => {
            if (isLoggedIn) {
              router.push('/profile');
            } else {
              setLoginRedirect('/profile');
              sessionStorage.setItem('loginRedirect', '/profile');
              setShowLogin(true);
            }
          }} />
        </div>
      </div>

      {/* Login sheet */}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} redirect={loginRedirect} />}
    </div>
  );
}
