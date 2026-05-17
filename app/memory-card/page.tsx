// ============================================
// MEMORY CARD VIEW — Open a Game Card from any past game
// Route: /memory-card?gameId=<uuid>
// Builds the card live from metadata if not yet persisted.
// ============================================
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { previewGameCard, type GameCard, type CommanderCardData } from "@/lib/game-card";

const BADGE_LABELS: Record<string, string> = {
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
        <clipPath id={`aura-mc-${size}`}>
          <ellipse cx="32" cy="32" rx="22" ry="26" />
        </clipPath>
      </defs>
      <g clipPath={`url(#aura-mc-${size})`}>
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

// In-memory cache for Scryfall art lookups.
const _mcArtCache = new Map<string, string | null>();
async function fetchMcArt(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (_mcArtCache.has(key)) return _mcArtCache.get(key) ?? null;
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) { _mcArtCache.set(key, null); return null; }
    const card = await res.json();
    const art = card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop || null;
    _mcArtCache.set(key, art);
    return art;
  } catch { _mcArtCache.set(key, null); return null; }
}

function useCommandersWithArt(input: CommanderCardData[]): CommanderCardData[] {
  const [extraArt, setExtraArt] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const missing = input.filter(c => !c.art_url && c.commander_name && c.commander_name !== `P${c.seat_number ?? '?'}`);
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const c of missing) {
        const key = c.commander_name.toLowerCase();
        if (extraArt[key]) continue;
        const art = await fetchMcArt(c.commander_name);
        if (cancelled) return;
        if (art) updates[key] = art;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setExtraArt(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [input.map(c => `${c.commander_name}|${c.art_url ?? ''}`).join(',')]);
  return useMemo(() => input.map(c => {
    if (c.art_url) return c;
    const cached = extraArt[c.commander_name?.toLowerCase() ?? ''];
    return cached ? { ...c, art_url: cached } : c;
  }), [input, extraArt]);
}

function McpNarrativeText({ text, commanders }: { text: string; commanders: any[] }) {
  const names = commanders
    .map((c: any) => c.commander_name)
    .filter((n: string) => n && !n.startsWith("P"))
    .sort((a: string, b: string) => b.length - a.length);
  if (names.length === 0) return <span style={{ color: "rgba(245,239,226,0.7)" }}>{text}</span>;
  const pattern = new RegExp(`(${names.map((n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = text.split(pattern);
  const nameSet = new Set(names);
  return (
    <span style={{ color: "rgba(245,239,226,0.7)" }}>
      {parts.map((part: string, i: number) =>
        nameSet.has(part) ? (
          <span key={i} style={{ color: "#E2B858", fontWeight: 400 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/* ── KeepsakeCard — visual game card ─────────────────── */
function KeepsakeCard({ card }: { card: GameCard }) {
  const rawCommanders = (card.commanders ?? []) as CommanderCardData[];
  const commanders = useCommandersWithArt(rawCommanders);
  const rawDate = card.game_date ?? "";
  const dateStr = (() => {
    try {
      const [y, m, d] = rawDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return rawDate; }
  })();
  return (
    <div style={{ padding: 4, background: "linear-gradient(135deg, #E2B858 0%, #C99B2F 22%, #8C5A28 50%, #C99B2F 78%, #E2B858 100%)", borderRadius: 24, boxShadow: "0 30px 60px -20px rgba(10,6,4,0.55), 0 12px 24px -8px rgba(43,33,24,0.35), 0 1px 0 rgba(255,255,255,0.35) inset" }}>
      <div style={{ background: "#0A0604", backgroundImage: "radial-gradient(ellipse at 50% 15%, rgba(201,155,47,0.34), transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 50%), linear-gradient(180deg, #140C07 0%, #0A0604 45%, #050302 100%)", borderRadius: 20, padding: "12px 12px 14px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(201,155,47,0.35), inset 0 0 30px rgba(0,0,0,0.5)" }}>
        {/* Compass rose */}
        <svg width="520" height="520" viewBox="0 0 320 320" style={{ position: "absolute", top: "15%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.22, pointerEvents: "none", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)", maskImage: "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)" }}>
          <g stroke="#E2B858" strokeWidth="0.8" fill="none">
            {Array.from({ length: 24 }).map((_: any, i: any) => {
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
          {commanders.map((c: any, i: any) => {
            const badge = c.brewed_badge;
            const isWinner = c.is_winner;
            return (
              <div key={c.deck_id ?? i} style={{ position: "relative", display: "flex", alignItems: "stretch", minHeight: 72, background: "#0A0604", overflow: "hidden", borderBottom: i < commanders.length - 1 ? "1px solid rgba(201,155,47,0.22)" : "none" }}>
                <div style={{ position: "relative", width: "55%", flexShrink: 0, overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a140e", color: "#E2B858", fontSize: 28, fontFamily: "'Young Serif', Georgia, serif" }}>{(c.commander_name ?? "?").charAt(0)}</div>
                  {c.art_url && (
                    <img src={c.art_url} alt="" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "50% 12%", transform: "scale(1.15)" }} />
                  )}
                  <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 80, background: "linear-gradient(90deg, transparent 0%, rgba(10,6,4,0.55) 55%, #0A0604 100%)", pointerEvents: "none" }} />
                  {/* Top-left circle: brewed badge glyph */}
                  {badge && badge !== "none" && (
                    <div style={{ position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: 999, background: "rgba(10,6,4,0.72)", border: "1px solid rgba(226,184,88,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ display: "inline-block", width: 13, height: 13, backgroundColor: "#E2B858", WebkitMaskImage: `url("/assets/glyphs/${badge}.png")`, maskImage: `url("/assets/glyphs/${badge}.png")`, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }} />
                    </div>
                  )}
                </div>
                {/* Crown on the divider line between image and text */}
                {isWinner && (
                  <div style={{ position: "absolute", top: "50%", left: "55%", transform: "translate(-50%, -50%)", zIndex: 2, width: 22, height: 22, borderRadius: 999, background: "rgba(10,6,4,0.85)", border: "1.5px solid rgba(226,184,88,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="#E2B858" stroke="#E2B858" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 1 }}>
                  <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 500, color: "#F5EFE2", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8 }}>{c.display_name || "Player"}</div>
                  <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, lineHeight: 1.15, color: "#F5EFE2", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{c.commander_name}</div>
                  {badge && badge !== "none" && (
                    <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 8, fontWeight: 300, color: "rgba(245,239,226,0.55)", marginTop: 2 }}>
                      Brewed for <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 10, color: "#F5EFE2", marginLeft: 2 }}>{BADGE_LABELS[badge] ?? badge}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {card.narrative && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(201,155,47,0.25)", position: "relative", textAlign: "center", fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 13, lineHeight: 1.45, color: "#F5EFE2", padding: "12px 4px 0", textWrap: "pretty" as any }}>
            <McpNarrativeText text={card.narrative} commanders={commanders} />
          </div>
        )}
      </div>
    </div>
  );
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId") ?? "";
  const [card, setCard] = useState<GameCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameId) {
      setError("No game specified");
      return;
    }
    let cancelled = false;
    previewGameCard(gameId)
      .then((c) => {
        if (cancelled) return;
        if (c) setCard(c);
        else setError("Could not load this game card");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const { downloadCard } = await import("@/lib/share-card");
    await downloadCard(cardRef.current, "aura-game-card");
  };
  const handleShare = async () => {
    if (!cardRef.current) return;
    const { shareCard } = await import("@/lib/share-card");
    await shareCard(cardRef.current);
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0A0604", color: "#F5EFE2", fontFamily: "'Instrument Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 16px 32px" }}>
      <div style={{ width: "100%", maxWidth: 430, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => router.back()} style={{ background: "transparent", border: "1px solid rgba(226,184,88,0.35)", color: "#E2B858", padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AuraMark size={20} color="#E2B858" />
          <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 18, color: "#E2B858" }}>Memory Card</span>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {error && (
        <div style={{ marginTop: 40, textAlign: "center", color: "#C5B9A5", fontSize: 14 }}>{error}</div>
      )}

      {!error && !card && (
        <div style={{ marginTop: 40, textAlign: "center", color: "#E2B858", fontSize: 14 }}>Loading your Game Card…</div>
      )}

      {card && (
        <div style={{ width: "100%", maxWidth: 430, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div ref={cardRef}>
            <KeepsakeCard card={card} />
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <button onClick={handleDownload} style={{ width: 44, height: 44, borderRadius: 999, border: "1px solid rgba(201,155,47,0.55)", background: "linear-gradient(180deg, #140C07 0%, #0A0604 100%)", color: "#E2B858", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px -4px rgba(10,6,4,0.45)" }} aria-label="Download">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </button>
            <button onClick={handleShare} style={{ width: 44, height: 44, borderRadius: 999, border: "1px solid rgba(201,155,47,0.55)", background: "linear-gradient(180deg, #140C07 0%, #0A0604 100%)", color: "#E2B858", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px -4px rgba(10,6,4,0.45)" }} aria-label="Share">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemoryCardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0A0604", color: "#E2B858", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Loading…</div>}>
      <PageContent />
    </Suspense>
  );
}
