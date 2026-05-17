"use client";

import { useState, useEffect } from "react";

// ─── Theme colors interface ─────────────────────────────────────────────────
// Gridviews pass DARK/LIGHT_THEME objects; singleview passes CSS variable refs.
export interface PopupTheme {
  copper: string;
  gold: string;
  ink: string;
  ink2: string;
  ink3: string;
  forest: string;
  bgCard: string;
  bgDeep: string;
  line: string;
  lineStrong: string;
  parchment: string;       // text on green button
  backdropBg: string;      // scrim behind popup
  borderAccent: string;    // eliminated X button border
}

// ─── Torn edge (shared) ─────────────────────────────────────────────────────
export function TornEdge({ bgCard }: { bgCard: string }) {
  const teeth = 24;
  const w = 430;
  const h = 14;
  let d = `M 0 ${h}`;
  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * w;
    const tipY = 2 + Math.random() * 3;
    const valleyY = h - 1 - Math.random() * 2;
    d += ` L ${x} ${i % 2 === 0 ? tipY : valleyY}`;
  }
  d += ` L ${w} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", width: "100%", marginBottom: -1 }} aria-hidden="true">
      <path d={d} fill={bgCard} />
    </svg>
  );
}

// ─── Delayed entrance hook ──────────────────────────────────────────────────
// Returns false initially, then true after `ms` so the popup can slide in.
function useDelayedEntrance(ms = 1000) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return visible;
}

// ─── Animated dots hook ─────────────────────────────────────────────────────
function useSummoningDots(active: boolean) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    if (!active) { setDots(""); return; }
    const id = setInterval(() => setDots(d => (d.length >= 3 ? "" : d + ".")), 500);
    return () => clearInterval(id);
  }, [active]);
  return dots;
}

// ─── Victory Popup (winner — last one standing) ─────────────────────────────
// No X button, no backdrop dismiss. "Revive Last Player" or "Summoning…".
export function VictoryPopup({
  onRevive, onReview, summoning = false, reviewAccepted = false, theme,
}: {
  onRevive: () => void;
  onReview: () => void;
  summoning?: boolean;
  reviewAccepted?: boolean;
  theme: PopupTheme;
}) {
  const dots = useSummoningDots(summoning);
  const visible = useDelayedEntrance(1000);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", fontFamily: "var(--font-ui)", pointerEvents: visible ? "auto" : "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: theme.backdropBg,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
      }} />
      <div style={{
        marginTop: "auto", position: "relative", maxWidth: 430, width: "100%", alignSelf: "center",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        <TornEdge bgCard={theme.bgCard} />
        <div style={{ position: "relative", background: theme.bgCard, padding: "8px 22px 32px" }}>
          {/* Crown + heading */}
          <div style={{ textAlign: "center", marginTop: 6, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <svg width={32} height={32} viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                  <linearGradient id="vict-crown-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#E2B858" />
                    <stop offset="100%" stopColor="#C99B2F" />
                  </linearGradient>
                </defs>
                <path d="M10 48 L16 22 L24 36 L32 16 L40 36 L48 22 L54 48 Z" fill="url(#vict-crown-grad)" stroke="#8C5A28" strokeWidth="1.5" strokeLinejoin="round" />
                <rect x="10" y="48" width="44" height="6" rx="1" fill="#C99B2F" stroke="#8C5A28" strokeWidth="1.5" />
                <circle cx="16" cy="22" r="2.5" fill="#F0E8D8" />
                <circle cx="32" cy="16" r="2.8" fill="#F0E8D8" />
                <circle cx="48" cy="22" r="2.5" fill="#F0E8D8" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.copper, marginBottom: 6 }}>
              Last One Standing
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 26, letterSpacing: "-0.02em", color: theme.ink, lineHeight: 1.1 }}>
              Victory is yours
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: theme.ink3, lineHeight: 1.4 }}>
              All opponents have been defeated. Head to review to celebrate the win and rate the game.
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={onReview} style={{
              width: "100%", cursor: "pointer",
              background: theme.forest, color: theme.parchment,
              border: "none", borderRadius: 20, padding: "14px 18px",
              fontSize: 15, fontWeight: 600,
              boxShadow: "0 2px 0 rgba(0,0,0,.30), 0 18px 36px -12px rgba(0,0,0,.50)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={theme.parchment} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
              </svg>
              Go to Review
            </button>
            {!reviewAccepted && (
              <button onClick={summoning ? undefined : onRevive} style={{
                width: "100%", cursor: summoning ? "default" : "pointer",
                background: theme.bgDeep, color: theme.ink2,
                border: `1px solid ${theme.lineStrong}`,
                borderRadius: 20, padding: "14px 18px",
                fontSize: 15, fontWeight: 600,
                opacity: summoning ? 0.8 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {summoning
                  ? <span style={{ minWidth: 120, textAlign: "center" }}>Summoning{dots}</span>
                  : "Revive Last Player"}
              </button>
            )}
          </div>

          {/* Helper text */}
          {!reviewAccepted && !summoning && (
            <div style={{ textAlign: "center", fontSize: 11, color: theme.ink3, marginTop: 14, lineHeight: 1.4 }}>
              Revive Last Player brings the most recent defeated opponent back at 1 life.
            </div>
          )}
          {summoning && (
            <div style={{ textAlign: "center", fontSize: 11, color: theme.ink3, marginTop: 14, lineHeight: 1.4 }}>
              Waiting for the other player to return to the game.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Eliminated Popup (you died) ────────────────────────────────────────────
// No dismiss — player must choose Review or Revive.
export function EliminatedPopup({
  onDismiss, onRevive, onReview, summoning = false, reviewAccepted = false, theme,
}: {
  onDismiss: () => void;
  onRevive: () => void;
  onReview: () => void;
  summoning?: boolean;
  reviewAccepted?: boolean;
  theme: PopupTheme;
}) {
  const dots = useSummoningDots(summoning);
  const visible = useDelayedEntrance(1000);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", fontFamily: "var(--font-ui)", pointerEvents: visible ? "auto" : "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: theme.backdropBg,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
      }} />
      <div style={{
        marginTop: "auto", position: "relative", maxWidth: 430, width: "100%", alignSelf: "center",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        <TornEdge bgCard={theme.bgCard} />
        <div style={{ position: "relative", background: theme.bgCard, padding: "8px 22px 32px" }}>
          {/* Hourglass + heading */}
          <div style={{ textAlign: "center", marginTop: 6, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="36" r="2.4" fill={theme.copper} />
                <defs><clipPath id="elim-clip"><ellipse cx="32" cy="32" rx="22" ry="26" /></clipPath></defs>
                <g clipPath="url(#elim-clip)">
                  <polygon points="8,60 30,4 31,4 24,60" fill={theme.copper} />
                  <polygon points="40,60 33,4 34,4 56,60" fill={theme.copper} />
                </g>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.copper, marginBottom: 6 }}>
              Out of the Game
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 26, letterSpacing: "-0.02em", color: theme.ink, lineHeight: 1.1 }}>
              You have been eliminated
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: theme.ink3, lineHeight: 1.4 }}>
              Head to review to rate the game.
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={onReview} style={{
              width: "100%", cursor: "pointer",
              background: theme.forest, color: theme.parchment,
              border: "none", borderRadius: 20, padding: "14px 18px",
              fontSize: 15, fontWeight: 600,
              boxShadow: "0 2px 0 rgba(0,0,0,.30), 0 18px 36px -12px rgba(0,0,0,.50)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={theme.parchment} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
              </svg>
              Go to Review
            </button>
            {!reviewAccepted && (
              <button onClick={summoning ? undefined : onRevive} style={{
                width: "100%", cursor: summoning ? "default" : "pointer",
                background: theme.bgDeep, color: theme.ink2,
                border: `1px solid ${theme.lineStrong}`,
                borderRadius: 20, padding: "14px 18px",
                fontSize: 15, fontWeight: 600,
                opacity: summoning ? 0.8 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {summoning
                  ? <span style={{ minWidth: 120, textAlign: "center" }}>Summoning{dots}</span>
                  : "Revive"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
