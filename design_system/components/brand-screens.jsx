// Brand screens — Splash and Onboarding/Sign-in
// These are where the Aura mark lives prominently in the product.

// ─── SplashScreen ──────────────────────────────────────────────
// First-run launch screen. Full-bleed parchment, centered lockup,
// a whisper-faint compass-rose ornament radiating from the mark.
function SplashScreen({ variant = 'default' }) {
  const isDark = variant === 'dark';
  const bg = isDark ? 'var(--ink)' : 'var(--parchment)';
  const fg = isDark ? 'var(--parchment)' : 'var(--forest)';
  const sub = isDark ? 'rgba(245,239,226,0.6)' : 'var(--fg-subtle)';
  const accent = isDark ? 'var(--copper)' : 'var(--copper)';

  return (
    <div style={{
      position: 'relative', height: '100%',
      background: bg,
      backgroundImage: isDark
        ? 'radial-gradient(circle at 50% 42%, rgba(201,155,47,0.12), transparent 55%)'
        : 'radial-gradient(circle at 50% 42%, rgba(201,155,47,0.08), transparent 55%)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32,
      fontFamily: 'var(--font-ui)',
    }}>
      {/* Ornamental rays behind mark */}
      <svg width="320" height="320" viewBox="0 0 320 320" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, calc(-50% - 40px))',
        opacity: 0.18,
      }}>
        <g stroke={accent} strokeWidth="0.6" fill="none">
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const r1 = 70, r2 = 150;
            const cx = 160, cy = 160;
            const x1 = cx + Math.cos(a) * r1;
            const y1 = cy + Math.sin(a) * r1;
            const x2 = cx + Math.cos(a) * r2;
            const y2 = cy + Math.sin(a) * r2;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>;
          })}
          <circle cx="160" cy="160" r="70"/>
          <circle cx="160" cy="160" r="110" strokeDasharray="1 4"/>
          <circle cx="160" cy="160" r="150"/>
        </g>
      </svg>

      {/* Mark + wordmark */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        marginTop: -40,
      }}>
        <AuraMark size={96} color={fg}/>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 56, letterSpacing: '-0.02em', color: fg, lineHeight: 1,
        }}>Aura</div>
        <div style={{
          fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: sub, fontWeight: 600, marginTop: 2,
        }}>Commander · Reviewed</div>
      </div>

      {/* Tiny footer tag */}
      <div style={{
        position: 'absolute', bottom: 44, left: 0, right: 0,
        textAlign: 'center', fontSize: 11, color: sub,
        letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600,
      }}>
        Every game has a story
      </div>
    </div>
  );
}

// ─── OnboardingScreen ──────────────────────────────────────────
// Sign-in / welcome. Mark sits at top, a short value-prop above
// two primary CTAs (continue with Apple / create account).
function OnboardingScreen({ variant = 'default' }) {
  return (
    <div style={{
      position: 'relative', height: '100%',
      background: 'var(--parchment)',
      backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(201,155,47,0.08), transparent 45%)',
      display: 'flex', flexDirection: 'column',
      padding: '44px 24px 32px',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* Top: mark + wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <AuraMark size={44} color="var(--forest)"/>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 34, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1,
        }}>Aura</div>
      </div>

      {/* Middle: three value-prop lines with category glyphs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '24px 8px' }}>
        <ValueRow
          glyph="brilliance" color="var(--cat-brilliance)" soft="var(--cat-brilliance-soft)"
          title="Name the moments that mattered"
          body="Smartest play, boldest move, most flavorful deck."
        />
        <ValueRow
          glyph="allegiance" color="var(--cat-allegiance)" soft="var(--cat-allegiance-soft)"
          title="Agree with your pod"
          body="A five-minute review, together, right after the game ends."
        />
        <ValueRow
          glyph="fun" color="var(--cat-fun)" soft="var(--cat-fun-soft)"
          title="Keep the memory card"
          body="A wax-sealed record of every game, earned trait by trait."
        />
      </div>

      {/* Bottom: CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{
          width: '100%', border: 'none', cursor: 'pointer',
          background: 'var(--ink)', color: 'var(--parchment)',
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 15,
          padding: '16px 20px', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: 'var(--shadow-rest)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>
        <button style={{
          width: '100%', border: '1px solid var(--line-strong)', cursor: 'pointer',
          background: 'var(--parchment-card)', color: 'var(--ink)',
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 15,
          padding: '16px 20px', borderRadius: 14,
        }}>
          Create an account
        </button>
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 13, color: 'var(--fg-subtle)' }}>
          Have an invite? <span style={{ color: 'var(--forest)', fontWeight: 600 }}>Join a pod</span>
        </div>
      </div>
    </div>
  );
}

function ValueRow({ glyph, color, soft, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 999, flexShrink: 0,
        background: soft, color, border: `1.5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <BadgeGlyph name={glyph} size={24} stroke={color}/>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400,
          color: 'var(--ink)', lineHeight: 1.2, letterSpacing: '-0.01em',
        }}>{title}</div>
        <div style={{
          fontSize: 13, color: 'var(--fg-subtle)', marginTop: 3, lineHeight: 1.4,
        }}>{body}</div>
      </div>
    </div>
  );
}

Object.assign(window, { SplashScreen, OnboardingScreen });
