// Shared KeepsakeCard + helpers used by /review, /memory-card, and the
// inline Open Memory Card modal on /recent-games.
"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameCard, CommanderCardData } from "@/lib/game-card";

// In-memory cache for Scryfall art lookups by commander name (lowercased).
const _artCache = new Map<string, string | null>();

async function fetchArtForName(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (_artCache.has(key)) return _artCache.get(key) ?? null;
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) { _artCache.set(key, null); return null; }
    const card = await res.json();
    const art = card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop || null;
    _artCache.set(key, art);
    return art;
  } catch {
    _artCache.set(key, null);
    return null;
  }
}

/**
 * Hook: takes the commanders array straight from the card and returns a copy
 * with art_url backfilled from Scryfall for any rows whose art_url was null
 * but commander_name is present. Returns the same array reference until a
 * lookup actually succeeds.
 */
function useCommandersWithArt(input: CommanderCardData[]): CommanderCardData[] {
  const [extraArt, setExtraArt] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = input.filter(
      (c) => !c.art_url && c.commander_name && c.commander_name !== `P${c.seat_number ?? "?"}`
    );
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const c of missing) {
        const key = c.commander_name.toLowerCase();
        if (extraArt[key]) continue;
        const art = await fetchArtForName(c.commander_name);
        if (cancelled) return;
        if (art) updates[key] = art;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setExtraArt((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.map((c) => `${c.commander_name}|${c.art_url ?? ""}`).join(",")]);

  return useMemo(
    () =>
      input.map((c) => {
        if (c.art_url) return c;
        const key = c.commander_name?.toLowerCase() ?? "";
        const cached = extraArt[key];
        if (cached) return { ...c, art_url: cached };
        return c;
      }),
    [input, extraArt]
  );
}

export const KEEPSAKE_BADGE_LABELS: Record<string, string> = {
  brilliance: "Brilliance",
  rivalry: "Rivalry",
  allegiance: "Allegiance",
  fun: "Fun",
  flavor: "Flavour",
};

function AuraMark({ size = 22, color = "#2B2118" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color} />
      <defs>
        <clipPath id={`keepsake-aura-${size}`}>
          <ellipse cx="32" cy="32" rx="22" ry="26" />
        </clipPath>
      </defs>
      <g clipPath={`url(#keepsake-aura-${size})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color} />
        <polygon points="40,60 33,4 34,4 56,60" fill={color} />
      </g>
    </svg>
  );
}

function CrownIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

export function KeepsakeCard({ card }: { card: GameCard }) {
  const rawCommanders = (card.commanders ?? []) as CommanderCardData[];
  const commanders = useCommandersWithArt(rawCommanders);
  const dateStr = card.game_date ?? "";
  return (
    <div style={{ padding: 4, background: "linear-gradient(135deg, #E2B858 0%, #C99B2F 22%, #8C5A28 50%, #C99B2F 78%, #E2B858 100%)", borderRadius: 24, boxShadow: "0 30px 60px -20px rgba(10,6,4,0.55), 0 12px 24px -8px rgba(43,33,24,0.35), 0 1px 0 rgba(255,255,255,0.35) inset" }}>
      <div style={{ background: "#0A0604", backgroundImage: "radial-gradient(ellipse at 50% 15%, rgba(201,155,47,0.34), transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 50%), linear-gradient(180deg, #140C07 0%, #0A0604 45%, #050302 100%)", borderRadius: 20, padding: "12px 12px 14px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(201,155,47,0.35), inset 0 0 30px rgba(0,0,0,0.5)" }}>
        <svg width="520" height="520" viewBox="0 0 320 320" style={{ position: "absolute", top: "15%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.22, pointerEvents: "none", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)", maskImage: "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)" }}>
          <g stroke="#E2B858" strokeWidth="0.8" fill="none">
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              const r1 = 40, r2 = 170, cx = 160, cy = 160;
              return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} />;
            })}
            <circle cx="160" cy="160" r="40" />
            <circle cx="160" cy="160" r="60" strokeDasharray="1 3" />
            <circle cx="160" cy="160" r="110" strokeDasharray="1 4" />
            <circle cx="160" cy="160" r="170" />
          </g>
        </svg>

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(201,155,47,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <AuraMark size={16} color="#E2B858" />
            <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, letterSpacing: "-0.01em", color: "#E2B858", lineHeight: 1 }}>Aura</span>
          </div>
          <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(226,184,88,0.6)" }}>{dateStr}{card.game_time ? ` · ${card.game_time}` : ""}</span>
        </div>

        <div style={{ position: "relative", marginBottom: 12, textAlign: "center", fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.34em", textTransform: "uppercase", color: "rgba(226,184,88,0.85)", textShadow: "0 0 12px rgba(201,155,47,0.45)" }}>
          ✦ &nbsp; Every Game Has a Story &nbsp; ✦
        </div>

        <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(201,155,47,0.3)" }}>
          {commanders.map((c, i) => {
            const badge = c.brewed_badge;
            const isWinner = c.is_winner;
            return (
              <div key={c.deck_id ?? `seat-${c.seat_number ?? i}`} style={{ position: "relative", display: "flex", alignItems: "stretch", height: 72, background: "#0A0604", overflow: "hidden", borderBottom: i < commanders.length - 1 ? "1px solid rgba(201,155,47,0.22)" : "none" }}>
                <div style={{ position: "relative", width: "65%", flexShrink: 0, overflow: "hidden" }}>
                  {c.art_url ? (
                    <img src={c.art_url} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "50% 12%", transform: "scale(1.15)" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a140e", color: "#E2B858", fontSize: 28, fontFamily: "'Young Serif', Georgia, serif" }}>{(c.commander_name ?? "?").charAt(0)}</div>
                  )}
                  <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 80, background: "linear-gradient(90deg, transparent 0%, rgba(10,6,4,0.55) 55%, #0A0604 100%)", pointerEvents: "none" }} />
                  {isWinner && (
                    <div style={{ position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: 999, background: "rgba(10,6,4,0.72)", border: "1px solid rgba(226,184,88,0.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E2B858" }}>
                      <CrownIcon size={12} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 1 }}>
                  <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 500, color: "#F5EFE2", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8 }}>{c.archetype}</div>
                  <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, lineHeight: 1.15, color: "#F5EFE2" }}>{c.commander_name}</div>
                  {badge && badge !== "none" && (
                    <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 8, fontWeight: 300, color: "rgba(245,239,226,0.55)", marginTop: 2 }}>
                      Brewed for <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 10, color: "#F5EFE2", marginLeft: 2 }}>{KEEPSAKE_BADGE_LABELS[badge] ?? badge}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {card.narrative && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(201,155,47,0.25)", position: "relative", textAlign: "center", fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 13, lineHeight: 1.45, color: "#F5EFE2", padding: "12px 4px 0", textWrap: "pretty" as any }}>
            <span style={{ color: "rgba(245,239,226,0.7)" }}>{card.narrative}</span>
          </div>
        )}
      </div>
    </div>
  );
}
