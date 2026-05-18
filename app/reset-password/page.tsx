'use client';
// ============================================================
// RESET PASSWORD PAGE
// Route: /reset-password
// Supabase sends users here after they click the reset link.
// The SDK auto-exchanges the recovery token on load, then we
// show a form to set a new password.
// ============================================================
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const T = {
  parchment:   '#F5EFE2',
  parchmentCard: '#FAF5EA',
  ink:         '#2B2118',
  ink2:        '#5C5043',
  ink3:        '#8A7E6F',
  forest:      '#2F5D3A',
  rivalry:     '#9E2B2B',
  line:        'rgba(43,33,24,0.10)',
  lineStrong:  'rgba(43,33,24,0.22)',
  fontUI:      "'Instrument Sans', sans-serif",
  fontDisplay: "'Young Serif', Georgia, serif",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady]       = useState(false);  // recovery session confirmed
  const [invalid, setInvalid]   = useState(false);  // link expired / invalid
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  // Wait for Supabase to exchange the recovery token from the URL hash.
  // onAuthStateChange fires PASSWORD_RECOVERY when the token is valid.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if there's already an active recovery session
    // (in case the event fired before our listener attached)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If no recovery event after 5s, the link is probably expired/invalid
    const timeout = setTimeout(() => {
      setInvalid(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Once ready, cancel the invalid timeout
  useEffect(() => {
    if (ready) setInvalid(false);
  }, [ready]);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords don\'t match'); return; }

    setSaving(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setDone(true);
      setTimeout(() => router.push('/landing'), 2200);
    }
  };

  return (
    <div style={{
      width: '100%', maxWidth: 430, minHeight: '100dvh', margin: '0 auto',
      background: T.parchment,
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,155,47,0.09), transparent 55%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.fontUI,
      padding: '32px 24px',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="36" r="2.4" fill={T.forest}/>
          <defs><clipPath id="rp-clip"><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath></defs>
          <g clipPath="url(#rp-clip)">
            <polygon points="8,60 30,4 31,4 24,60" fill={T.forest}/>
            <polygon points="40,60 33,4 34,4 56,60" fill={T.forest}/>
          </g>
        </svg>
        <span style={{ fontFamily: T.fontDisplay, fontSize: 26, color: '#B06B2C', letterSpacing: '-0.02em' }}>Aura</span>
      </div>

      <div style={{
        width: '100%',
        background: T.parchmentCard,
        border: `1px solid ${T.lineStrong}`,
        borderRadius: 24,
        padding: '28px 24px',
        boxShadow: '0 20px 50px -20px rgba(43,33,24,0.20)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* ── Done state ── */}
        {done && (
          <>
            <div style={{ textAlign: 'center', fontSize: 36 }}>✓</div>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.ink, textAlign: 'center', letterSpacing: '-0.01em' }}>
              Password updated
            </div>
            <div style={{ fontSize: 14, color: T.ink2, textAlign: 'center', lineHeight: 1.5 }}>
              Taking you back to sign in…
            </div>
          </>
        )}

        {/* ── Invalid / expired link ── */}
        {!done && invalid && !ready && (
          <>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.ink, letterSpacing: '-0.01em' }}>
              Link expired
            </div>
            <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.5 }}>
              This password reset link has expired or already been used. Request a new one from the sign-in screen.
            </div>
            <button onClick={() => router.push('/landing')} style={{
              width: '100%', border: 'none', cursor: 'pointer',
              background: T.forest, color: T.parchment,
              fontFamily: T.fontUI, fontWeight: 600, fontSize: 15,
              padding: '14px 20px', borderRadius: 16,
            }}>Back to sign in</button>
          </>
        )}

        {/* ── Loading state (waiting for token exchange) ── */}
        {!done && !invalid && !ready && (
          <div style={{ textAlign: 'center', color: T.ink3, fontSize: 14, padding: '12px 0' }}>
            Verifying link…
          </div>
        )}

        {/* ── Main form ── */}
        {!done && ready && (
          <>
            <div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 24, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                Set new password
              </div>
              <div style={{ fontSize: 13, color: T.ink2, marginTop: 6 }}>
                Choose something you'll remember.
              </div>
            </div>

            {/* New password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.ink3 }}>
                New password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoFocus
                  style={{
                    width: '100%', border: `1px solid ${T.lineStrong}`,
                    background: T.parchment, borderRadius: 14,
                    padding: '13px 44px 13px 14px',
                    fontFamily: T.fontUI, fontSize: 15, color: T.ink,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.ink3, padding: 0, fontSize: 13, fontWeight: 600,
                  }}
                >{showPw ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            {/* Confirm password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.ink3 }}>
                Confirm password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Repeat password"
                style={{
                  width: '100%', border: `1px solid ${T.lineStrong}`,
                  background: T.parchment, borderRadius: 14,
                  padding: '13px 14px',
                  fontFamily: T.fontUI, fontSize: 15, color: T.ink,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ fontSize: 13, color: T.rivalry, fontWeight: 600 }}>{error}</div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', border: 'none', cursor: saving ? 'default' : 'pointer',
                background: saving ? '#7A9E83' : T.forest, color: T.parchment,
                fontFamily: T.fontUI, fontWeight: 600, fontSize: 16,
                padding: '15px 20px', borderRadius: 16,
                transition: 'background 200ms',
              }}
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
