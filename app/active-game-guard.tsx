'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

/**
 * Global guard that checks for active games after login.
 * Shows a popup on any page (except the game pages themselves)
 * prompting the user to rejoin or abandon.
 */
export function ActiveGameGuard() {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [activeGame, setActiveGame] = useState<{
    gameId: string; podId: string; podSize: number; state: string; commanderName: string | null; hasWinner: boolean;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [slideUp, setSlideUp] = useState(false);

  // Pages where the user is INSIDE the game — don't show the popup there
  const gamePages = ['/gridview-2p', '/gridview-3p', '/gridview-4p', '/gridview-5p', '/singleview', '/review'];
  const isOnGamePage = gamePages.some(p => pathname?.startsWith(p));

  // Check for active game whenever auth state settles
  useEffect(() => {
    if (loading || !isLoggedIn || !user?.id || isOnGamePage) {
      setShowModal(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { getActiveGameForUser } = await import('../lib/games');
      const { data } = await getActiveGameForUser();
      if (!cancelled) {
        if (data) {
          setActiveGame(data);
          setShowModal(true);
          setTimeout(() => setSlideUp(true), 30);
        } else {
          setActiveGame(null);
          setShowModal(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, loading, user?.id, pathname]);

  const handleRejoin = () => {
    if (!activeGame) return;
    setSlideUp(false);
    setTimeout(() => {
      setShowModal(false);
      // Only go to review if the game ended AND there's a winner
      if (activeGame.state === 'in_questionnaire' && activeGame.hasWinner) {
        router.push(`/review?podId=${activeGame.podId}&gameId=${activeGame.gameId}`);
      } else {
        // Active game or in_questionnaire without winner → go to singleview to keep playing
        router.push(`/singleview?podId=${activeGame.podId}&gameId=${activeGame.gameId}`);
      }
    }, 300);
  };

  const handleAbandon = async () => {
    if (!activeGame || !user) return;
    setAbandoning(true);
    try {
      const { abandonGame } = await import('../lib/game-triggers');
      await abandonGame(activeGame.gameId, user.id);
    } catch (e) {
      console.error('Failed to abandon game:', e);
    }
    setAbandoning(false);
    setActiveGame(null);
    setSlideUp(false);
    setTimeout(() => setShowModal(false), 300);
  };

  const handleClose = () => {
    setSlideUp(false);
    setTimeout(() => setShowModal(false), 300);
  };

  if (!showModal || !activeGame) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Instrument Sans', 'Inter', sans-serif",
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
        <TornEdgeMini />

        <div style={{
          position: 'relative',
          background: '#FAF5EA',
          padding: '8px 22px 32px',
        }}>
          {/* Close button */}
          <button onClick={handleClose} aria-label="Close" style={{
            position: 'absolute', top: 14, right: 16,
            width: 32, height: 32, borderRadius: 999,
            border: '1px solid rgba(43,33,24,0.08)',
            background: '#EDE4D0',
            color: '#5C5043', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, fontSize: 15, fontWeight: 700, lineHeight: 1,
          }}>
            ×
          </button>

          {/* Header */}
          <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
            {/* Aura mark */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="36" r="2.4" fill="#B06B2C"/>
                <defs><clipPath id="ag-clip"><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath></defs>
                <g clipPath="url(#ag-clip)">
                  <polygon points="8,60 30,4 31,4 24,60" fill="#B06B2C"/>
                  <polygon points="40,60 33,4 34,4 56,60" fill="#B06B2C"/>
                </g>
              </svg>
            </div>
            <div style={{
              fontWeight: 700, fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6,
            }}>Game In Progress</div>
            <div style={{
              fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400,
              fontSize: 26, letterSpacing: '-0.02em',
              color: '#2B2118', lineHeight: 1.1,
            }}>You have an active game</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#5C5043', lineHeight: 1.4 }}>
              {activeGame.commanderName
                ? `You're playing ${activeGame.commanderName} in a ${activeGame.podSize}-player pod.`
                : `You're in a ${activeGame.podSize}-player pod.`
              }
              {activeGame.state === 'in_questionnaire' && activeGame.hasWinner
                ? ' The game has ended — time to review.'
                : ' The game is still going.'
              }
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleRejoin} style={{
              width: '100%', cursor: 'pointer',
              background: '#2F5D3A', color: '#F5EFE2',
              border: 'none', borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F5EFE2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
              </svg>
              {activeGame.state === 'in_questionnaire' && activeGame.hasWinner ? 'Go to Review' : 'Rejoin Game'}
            </button>

            <button onClick={handleAbandon} disabled={abandoning} style={{
              width: '100%', cursor: abandoning ? 'default' : 'pointer',
              background: abandoning ? '#8A7E6F' : '#F5EFE2',
              color: abandoning ? '#F5EFE2' : '#9E2B2B',
              border: '1px solid rgba(158,43,43,0.2)',
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {abandoning ? 'Abandoning...' : 'Abandon Game'}
            </button>
          </div>

          <div style={{
            textAlign: 'center', fontSize: 11, color: '#8A7E6F',
            marginTop: 14, lineHeight: 1.4,
          }}>
            Abandoning will end this game permanently.
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline torn-paper edge matching landing page design */
function TornEdgeMini() {
  const teeth = 24;
  const w = 430;
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%', marginBottom: -1 }} aria-hidden="true">
      <path d={d} fill="#FAF5EA" />
    </svg>
  );
}
