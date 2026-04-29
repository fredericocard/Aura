'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getGameLog, type GameLogEntry } from '@/lib/game-log';
import { supabase } from '@/lib/supabase';

interface Player {
  name: string;
  commander: string;
  commanderFull: string;
  img: string;
}

interface Badge {
  key: string;
}

interface Game {
  pod: string;
  date: string;
  aura: number;
  auraType: 'loss' | 'gain';
  winnerIdx: number;
  players: Player[];
  badges: Badge[];
  shareCode: string | null;
}

const badgeIcons: Record<string, string> = {
  brilliance: '<svg viewBox="0 0 24 24" fill="none" stroke="rgb(184,146,46)" strokeWidth="2" strokeLinejoin="round"><polygon points="12,2 15,9 22,9 17,14 18.5,21 12,17 5.5,21 7,14 2,9 9,9"/></svg>',
  flavor: '<svg viewBox="0 0 24 24" fill="none" stroke="rgb(168,74,58)" strokeWidth="2" strokeLinecap="round"><path d="M12 22C12 22 4 16 4 10C4 6 7 3 10 3C11.2 3 12 3.8 12 3.8C12 3.8 12.8 3 14 3C17 3 20 6 20 10C20 16 12 22 12 22Z"/></svg>',
  rivalry: '<svg viewBox="0 0 24 24" fill="none" stroke="rgb(90,110,98)" strokeWidth="2" strokeLinecap="round"><path d="M6 4L18 20M18 4L6 20"/><path d="M4 12H20"/></svg>',
  allegiance: '<svg viewBox="0 0 24 24" fill="none" stroke="rgb(26,122,106)" strokeWidth="2" strokeLinejoin="round"><path d="M12 3L20 9V17L12 21L4 17V9L12 3Z"/></svg>',
  fun: '<svg viewBox="0 0 24 24" fill="none" stroke="rgb(90,110,98)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"/><circle cx="9" cy="10" r="1" fill="rgb(90,110,98)"/><circle cx="15" cy="10" r="1" fill="rgb(90,110,98)"/></svg>',
};

function GameCard({ game, index }: { game: Game; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const handleShowDetail = () => {
    setShowDetail(true);
  };

  const auraSign = game.aura >= 0 ? '+' : '';

  return (
    <>
      <div
        className={`game-card ${game.auraType === 'gain' ? 'aura-gain' : 'aura-loss'} ${expanded ? 'expanded' : ''}`}
        id={`game${index}`}
      >
        <div className="game-collapsed" onClick={() => setExpanded(!expanded)}>
          <div className="game-info">
            <div className="game-pod-name">{game.pod}</div>
            <div className="game-meta">{game.date}</div>
          </div>
          <div className={`game-aura-block ${game.auraType}`}>
            <svg className="game-aura-hex" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
            </svg>
            <span className="game-aura-number">{auraSign}{game.aura}</span>
          </div>
          <div className="game-expand-icon">▾</div>
        </div>
        <div className="game-expanded">
          <div className="game-expanded-inner">
            <div className="game-players-label">Players</div>
            {game.players.map((player, playerIdx) => (
              <div key={playerIdx} className="game-player-row">
                <div
                  className="game-player-avatar"
                  style={{
                    background:
                      playerIdx === 0
                        ? 'linear-gradient(135deg,rgb(26,122,106),rgba(26,122,106,0.6))'
                        : playerIdx === 1
                          ? 'linear-gradient(135deg,rgb(168,74,58),rgba(168,74,58,0.6))'
                          : playerIdx === 2
                            ? 'linear-gradient(135deg,rgb(42,138,86),rgba(42,138,86,0.6))'
                            : 'linear-gradient(135deg,rgb(184,146,46),rgba(184,146,46,0.6))',
                  }}
                >
                  {player.name.charAt(0)}
                </div>
                <span className="game-player-name">{player.name}</span>
                <span className="game-player-commander">◆ {player.commander}</span>
              </div>
            ))}

            <div className="game-badges-label">Badges Earned</div>
            {game.badges.map((badge, badgeIdx) => (
              <div key={badgeIdx} className="game-badge-row">
                <div className="game-badge-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke={getBadgeColor(badge.key)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {renderBadgePath(badge.key)}
                  </svg>
                </div>
                <span className="game-badge-name">{capitalizeFirstLetter(badge.key)}</span>
                <span className="game-badge-from">from {getBadgeFrom(game, badge.key)}</span>
              </div>
            ))}

            <div className="game-actions">
              <div className="game-card-btn" onClick={(e) => { e.stopPropagation(); handleShowDetail(); }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                  <path d="M5 6h6M5 9h4" />
                </svg>
                Card
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <MemoryCard game={game} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

function MemoryCard({ game, onClose }: { game: Game; onClose: () => void }) {
  const winner = game.players[game.winnerIdx];
  const auraSign = game.aura >= 0 ? '+' : '';
  const badgeCounts: Record<string, number> = {};
  game.badges.forEach((b) => {
    badgeCounts[b.key] = (badgeCounts[b.key] || 0) + 1;
  });
  const badgeList = Object.entries(badgeCounts).map(([key, count]) => ({ key, count }));

  return (
    <div className="mc-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mc-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="mc">
          <div className="mc-bg">
            <div className="mc-inner">
              <div className="mc-info">
                <div>
                  <div className="mc-pod">{game.pod}</div>
                  <div className="mc-date">{game.date}</div>
                </div>
                <div className={`mc-aura ${game.auraType === 'loss' ? 'loss' : ''}`}>
                  <div className="mc-aura-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                    </svg>
                  </div>
                  <div className="mc-aura-val">{auraSign}{game.aura}</div>
                </div>
              </div>

              <div className="mc-slices">
                {game.players.map((player, idx) => (
                  <div key={idx} className="mc-slice">
                    <img src={player.img} alt={player.commander} />
                  </div>
                ))}
              </div>

              <div className="mc-winner">
                <div className="mc-winner-crown">👑</div>
                <div className="mc-winner-info">
                  <div className="mc-winner-label">Winner</div>
                  <div className="mc-winner-name">{winner.commanderFull}</div>
                  <div className="mc-winner-player">{winner.name}</div>
                </div>
              </div>

              <div className="mc-players">
                {game.players.map((player, idx) => (
                  <div key={idx} className={`mc-p ${idx === game.winnerIdx ? 'is-winner' : ''}`}>
                    <div className="mc-p-avatar">
                      <img src={player.img} alt={player.name} />
                    </div>
                    <div className="mc-p-commander">{player.commander}</div>
                    <div className="mc-p-name">{player.name}</div>
                  </div>
                ))}
              </div>

              <div className="mc-divider" />
              <div className="mc-stats">
                {badgeList.map((badge, idx) => (
                  <div key={idx} className="mc-badge-circle">
                    <div dangerouslySetInnerHTML={{ __html: badgeIcons[badge.key] }} />
                    {badge.count > 1 && <div className="mc-badge-count">{badge.count}</div>}
                  </div>
                ))}
                <div style={{ fontSize: '9px', color: 'rgba(245,239,227,0.4)', marginLeft: '2px' }}>×{game.badges.length} badges earned</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mc-actions">
          <div className="mc-act" onClick={(e) => { e.stopPropagation(); alert('Image saved!'); }}>
            <div className="mc-act-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </div>
          <div className="mc-act" onClick={(e) => { e.stopPropagation(); alert('Share sheet'); }}>
            <div className="mc-act-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getBadgeColor(key: string): string {
  const colors: Record<string, string> = {
    brilliance: 'rgb(184,146,46)',
    flavor: 'rgb(168,74,58)',
    rivalry: 'rgb(90,110,98)',
    allegiance: 'rgb(26,122,106)',
    fun: 'rgb(90,110,98)',
  };
  return colors[key] || 'rgb(90,110,98)';
}

function renderBadgePath(key: string): React.JSX.Element {
  switch (key) {
    case 'brilliance':
      return <polygon points="12,2 15,9 22,9 17,14 18.5,21 12,17 5.5,21 7,14 2,9 9,9" />;
    case 'flavor':
      return <path d="M12 22C12 22 4 16 4 10C4 6 7 3 10 3C11.2 3 12 3.8 12 3.8C12 3.8 12.8 3 14 3C17 3 20 6 20 10C20 16 12 22 12 22Z" />;
    case 'rivalry':
      return (
        <>
          <path d="M6 4L18 20M18 4L6 20" />
          <path d="M4 12H20" />
        </>
      );
    case 'allegiance':
      return <path d="M12 3L20 9V17L12 21L4 17V9L12 3Z" />;
    case 'fun':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" />
          <circle cx="9" cy="10" r="1" fill="rgb(90,110,98)" />
          <circle cx="15" cy="10" r="1" fill="rgb(90,110,98)" />
        </>
      );
    default:
      return <></>;
  }
}

function getBadgeFrom(game: Game, badgeKey: string): string {
  const badgeFrom: Record<string, string> = {
    flavor: 'Sofia',
    brilliance: 'Manel',
    fun: game.pod === 'Mountain Showdown' ? 'Tomás' : 'Sofia',
    allegiance: 'Sofia',
    rivalry: 'Manel',
  };
  return badgeFrom[badgeKey] || 'Unknown';
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function RecentGamesContent() {
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDeck, setFilterDeck] = useState<string | null>(null);
  const [filterAura, setFilterAura] = useState<'all' | 'gain' | 'loss'>('all');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const deckIdFilter = searchParams.get('deckId') ?? undefined;
      const result = await getGameLog(user.id, { deckId: deckIdFilter, pageSize: 50 });
      const mapped: Game[] = result.entries.map(e => ({
        pod: `${e.podSize}-player game`,
        date: new Date(e.gameDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        aura: 0, // AURA delta not available in game log entry
        auraType: e.isWinner ? 'gain' as const : 'loss' as const,
        winnerIdx: e.podCommanders.findIndex(c => c.isWinner),
        players: e.podCommanders.map(c => ({
          name: c.commanderName,
          commander: c.commanderName.split(',')[0],
          commanderFull: c.commanderName,
          img: c.artUrl ?? '',
        })),
        badges: [],
        shareCode: e.shareCode,
      }));
      setGames(mapped);
      setLoading(false);
    }
    loadGames();
  }, [searchParams]);

  const allDecks = Array.from(new Set(games.flatMap(g => g.players.map(p => p.commander))));

  const filteredGames = games
    .filter(g => {
      if (filterDeck) {
        const me = g.players.find(p => p.commander === filterDeck);
        if (!me) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filterAura === 'gain') return b.aura - a.aura;
      if (filterAura === 'loss') return a.aura - b.aura;
      return 0;
    });

  const hasActiveFilter = filterDeck !== null || filterAura !== 'all';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Jaldi:wght@400;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        html, body {
          height: 100%;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          background: #e8dcc8;
        }

        .app {
          width: 100%;
          height: 100%;
          max-width: 430px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          padding: 0 24px;
          padding-top: env(safe-area-inset-top, 16px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          overflow: hidden;
        }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 0;
          flex-shrink: 0;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: rgb(44,62,54);
        }

        .header-line {
          flex: 1;
          height: 1px;
          background: rgba(184,168,138,0.55);
        }

        /* ── Filter Button ── */
        .filter-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1.3px solid rgb(184,168,138);
          background: rgb(222,212,192);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgb(44,62,54);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .filter-btn:active { transform: scale(0.95); }

        .filter-btn.active {
          background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
          color: rgb(245,239,227);
          border-color: rgb(56,158,133);
        }

        .filter-btn svg {
          width: 14px;
          height: 14px;
        }

        /* ── Filter Popup ── */
        .filter-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 500;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 80px;
        }

        .filter-popup {
          width: calc(100% - 48px);
          max-width: 340px;
          background: rgb(245,239,227);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        }

        .filter-popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .filter-popup-title {
          font-size: 16px;
          font-weight: 700;
          color: rgb(44,62,54);
        }

        .filter-close {
          background: none;
          border: none;
          font-size: 20px;
          color: rgb(90,110,98);
          cursor: pointer;
        }

        .filter-close:active { transform: scale(0.9); }

        .filter-section-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgb(90,110,98);
          margin-bottom: 8px;
        }

        .filter-section {
          margin-bottom: 16px;
        }

        .filter-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.3px solid rgb(184,168,138);
          background: rgb(222,212,192);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgb(44,62,54);
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%235a6e62' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        .filter-select:focus {
          outline: none;
          border-color: rgb(26,122,106);
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .filter-chip {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1.3px solid rgb(184,168,138);
          background: rgb(222,212,192);
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgb(44,62,54);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-chip:active { transform: scale(0.95); }

        .filter-chip.selected {
          background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
          color: rgb(245,239,227);
          border-color: rgb(56,158,133);
        }

        .filter-clear-btn {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: 1.3px solid rgb(184,168,138);
          background: rgb(222,212,192);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgb(90,110,98);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-clear-btn:active { transform: scale(0.95); }

        .filter-no-results {
          text-align: center;
          padding: 40px 20px;
          color: rgb(90,110,98);
          font-size: 13px;
        }

        /* ── Games List ── */
        .games-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 4px 0 8px;
        }

        .games-list::-webkit-scrollbar { display: none; }

        /* ── Game Card ── */
        .game-card {
          margin-bottom: 10px;
          background: rgb(245,239,227);
          border-radius: 14px;
          border: 1px solid rgb(184,168,138);
          border-left: 4px solid rgb(26,122,106);
          box-shadow: 0 6px 16px rgba(26,20,13,0.08);
          overflow: hidden;
        }

        .game-card.aura-gain {
          border-left: 4px solid rgb(60,130,185);
        }

        .game-card.aura-loss {
          border-left: 4px solid rgb(168,74,58);
        }

        .game-collapsed {
          padding: 12px 12px 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .game-collapsed:active { background: rgba(26,122,106,0.04); }

        .game-info {
          flex: 1;
          min-width: 0;
        }

        .game-pod-name {
          font-size: 15px;
          font-weight: 700;
          color: rgb(44,62,54);
        }

        .game-meta {
          font-size: 11px;
          color: rgb(90,110,98);
          margin-top: 2px;
        }

        /* Aura Score — right-aligned scoreboard */
        .game-aura-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-left: 12px;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          position: relative;
        }

        .game-aura-block.gain {
          background: radial-gradient(circle at center, rgba(60,130,185,0.12) 0%, rgba(60,130,185,0.03) 70%, transparent 100%);
        }

        .game-aura-block.loss {
          background: radial-gradient(circle at center, rgba(168,74,58,0.12) 0%, rgba(168,74,58,0.03) 70%, transparent 100%);
        }

        .game-aura-hex {
          width: 18px;
          height: 18px;
          margin-bottom: 1px;
        }

        .game-aura-number {
          font-family: 'Jaldi', sans-serif;
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
        }

        .game-aura-block.gain .game-aura-hex { color: rgb(60,130,185); }
        .game-aura-block.gain .game-aura-number { color: rgb(60,130,185); }

        .game-aura-block.loss .game-aura-hex { color: rgb(168,74,58); }
        .game-aura-block.loss .game-aura-number { color: rgb(168,74,58); }

        .game-expand-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.25s ease;
          color: rgb(90,110,98);
          font-size: 20px;
          margin-left: 8px;
        }

        .game-card.expanded .game-expand-icon {
          transform: rotate(180deg);
        }

        /* ── Expanded Section ── */
        .game-expanded {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .game-card.expanded .game-expanded {
          max-height: 400px;
        }

        .game-expanded-inner {
          padding: 0 14px 12px;
          border-top: 1px solid rgba(184,168,138,0.4);
        }

        /* Players & Commanders */
        .game-players-label {
          font-size: 10px;
          font-weight: 700;
          color: rgb(90,110,98);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 10px 0 6px;
        }

        .game-player-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }

        .game-player-avatar {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: rgb(240,237,228);
          flex-shrink: 0;
        }

        .game-player-name {
          font-size: 12px;
          font-weight: 600;
          color: rgb(44,62,54);
        }

        .game-player-commander {
          font-size: 11px;
          color: rgb(26,122,106);
          margin-left: auto;
        }

        /* Badges */
        .game-badges-label {
          font-size: 10px;
          font-weight: 700;
          color: rgb(90,110,98);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 10px 0 6px;
        }

        .game-badge-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
        }

        .game-badge-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgb(222,212,192);
          border: 1.5px solid rgb(184,168,138);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .game-badge-icon svg {
          width: 13px;
          height: 13px;
        }

        .game-badge-name {
          font-size: 12px;
          font-weight: 600;
          color: rgb(44,62,54);
        }

        .game-badge-from {
          font-size: 10px;
          color: rgb(90,110,98);
          margin-left: auto;
        }

        /* Card Button */
        .game-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
        }

        .game-card-btn {
          flex: 1;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgb(184,168,138);
          background: rgb(222,212,192);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: rgb(44,62,54);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        .game-card-btn:active { transform: scale(0.95); }

        /* ── Bottom Nav ── */
        .bottom-nav {
          margin-top: auto;
          margin-bottom: 16px;
          padding-top: 16px;
          height: 84px;
          border-radius: 26px;
          border-top: 1px solid rgba(184,168,138,0.5);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          flex: 1;
          padding: 10px 6px;
          border-radius: 18px;
          background: transparent;
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
          border: 1px solid rgb(56,158,133);
          box-shadow: 0 4px 12px rgba(26,120,105,0.45);
        }

        .nav-item.active .nav-label { color: rgb(245,239,227); font-weight: 700; }
        .nav-item.active .nav-icon-svg { stroke: rgb(245,239,227); }

        .nav-item:not(.active):active {
          transform: scale(0.9);
          background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
        }

        .nav-item:not(.active):active .nav-label { color: rgb(245,239,227); }
        .nav-item:not(.active):active .nav-icon-svg { stroke: rgb(245,239,227); }

        .nav-item.active:active { transform: scale(0.95); }

        .nav-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-icon-svg {
          stroke: rgb(90,110,98);
          fill: none;
          transition: stroke 0.2s ease;
        }

        .nav-label {
          font-weight: 500;
          font-size: 12px;
          color: rgb(90,110,98);
          transition: color 0.2s ease;
        }

        /* ══════════════════════════════════════
           Memory Card — Collectible Game Card
           ══════════════════════════════════════ */
        .mc-overlay {
          position: fixed;
          inset: 0;
          background: rgba(232,220,200,0.45);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }

        .mc-overlay.show {
          opacity: 1;
          pointer-events: auto;
        }

        .mc {
          width: 100%;
          max-width: 360px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(184,146,46,0.3),
            0 0 30px rgba(184,146,46,0.08),
            0 30px 80px rgba(8,12,10,0.5);
          transform: translateY(40px) scale(0.92);
          transition: transform 0.55s cubic-bezier(0.34, 1.25, 0.64, 1);
          position: relative;
        }

        .mc-overlay.show .mc {
          transform: translateY(0) scale(1);
        }

        .mc-bg {
          background: linear-gradient(165deg,
            rgb(12,42,35) 0%,
            rgb(18,62,52) 25%,
            rgb(26,82,68) 50%,
            rgb(14,52,44) 75%,
            rgb(10,32,28) 100%);
          position: relative;
        }

        .mc-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 30% 20%, rgba(184,146,46,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(26,122,106,0.08) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }

        .mc-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 20%,
            rgba(255,255,255,0.03) 35%,
            rgba(255,255,255,0.06) 38%,
            rgba(255,255,255,0.03) 41%,
            transparent 60%
          );
          pointer-events: none;
          z-index: 2;
        }

        .mc-inner {
          position: relative;
          z-index: 3;
        }

        .mc-info {
          padding: 14px 16px 8px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .mc-pod {
          font-size: 11px;
          font-weight: 600;
          color: rgba(245,239,227,0.7);
          letter-spacing: 0.3px;
        }

        .mc-date {
          font-size: 9px;
          color: rgba(245,239,227,0.4);
        }

        .mc-aura {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .mc-aura-icon { color: rgb(60,130,185); }

        .mc-aura-val {
          font-family: 'Jaldi', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: rgb(60,130,185);
        }

        .mc-aura.loss .mc-aura-icon,
        .mc-aura.loss .mc-aura-val { color: rgb(168,74,58); }

        .mc-slices {
          height: 200px;
          display: flex;
          position: relative;
          margin: 0 12px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(184,146,46,0.2);
        }

        .mc-slice {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .mc-slice img {
          position: absolute;
          top: 0; left: -30%;
          width: 160%;
          height: 100%;
          object-fit: cover;
        }

        .mc-slice:nth-child(1) { clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%); z-index: 4; }
        .mc-slice:nth-child(2) { clip-path: polygon(15% 0, 100% 0, 85% 100%, 0 100%); margin-left: -8%; z-index: 3; }
        .mc-slice:nth-child(3) { clip-path: polygon(15% 0, 100% 0, 85% 100%, 0 100%); margin-left: -8%; z-index: 2; }
        .mc-slice:nth-child(4) { clip-path: polygon(15% 0, 100% 0, 100% 100%, 0 100%); margin-left: -8%; z-index: 1; }

        .mc-slice::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 1px; height: 100%;
          background: rgba(184,146,46,0.3);
          z-index: 5;
        }

        .mc-slice:last-child::after { display: none; }

        .mc-slices::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(12,42,35,0.1) 0%,
            transparent 30%,
            transparent 60%,
            rgba(12,42,35,0.5) 100%
          );
          z-index: 5;
          pointer-events: none;
          border-radius: 12px;
        }

        .mc-winner {
          margin: -24px 12px 0;
          position: relative;
          z-index: 6;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: linear-gradient(135deg,
            rgba(184,146,46,0.15) 0%,
            rgba(184,146,46,0.08) 100%);
          border: 1px solid rgba(184,146,46,0.3);
          border-radius: 10px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .mc-winner-crown { font-size: 18px; flex-shrink: 0; }
        .mc-winner-info { flex: 1; }

        .mc-winner-label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgb(184,146,46);
        }

        .mc-winner-name {
          font-size: 15px;
          font-weight: 700;
          color: rgb(245,239,227);
          line-height: 1.2;
        }

        .mc-winner-player {
          font-size: 10px;
          color: rgba(245,239,227,0.5);
        }

        .mc-players {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding: 14px 16px 10px;
        }

        .mc-p {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }

        .mc-p-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          overflow: hidden;
          border: 1.5px solid rgba(184,168,138,0.4);
        }

        .mc-p-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .mc-p.is-winner .mc-p-avatar {
          border-color: rgb(184,146,46);
          box-shadow: 0 0 8px rgba(184,146,46,0.3);
        }

        .mc-p-commander {
          font-size: 8px;
          font-weight: 600;
          color: rgba(245,239,227,0.8);
          text-align: center;
          max-width: 60px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mc-p-name {
          font-size: 7px;
          color: rgba(245,239,227,0.4);
          text-align: center;
        }

        .mc-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 16px 14px;
        }

        .mc-badge-circle {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(245,239,227,0.08);
          border: 1px solid rgba(184,168,138,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .mc-badge-circle svg { width: 14px; height: 14px; }

        .mc-badge-count {
          position: absolute;
          top: -4px; right: -4px;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: rgb(26,122,106);
          font-size: 8px;
          font-weight: 700;
          color: rgb(245,239,227);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(12,42,35,0.5);
        }

        .mc-divider {
          height: 1px;
          margin: 0 24px;
          background: linear-gradient(90deg, transparent 0%, rgba(184,146,46,0.2) 50%, transparent 100%);
        }

        .mc-wrapper {
          position: relative;
          width: 100%;
          max-width: 360px;
        }

        .mc-actions {
          position: absolute;
          bottom: -18px;
          right: 10px;
          display: flex;
          gap: 6px;
          z-index: 10;
        }

        .mc-act {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(245,239,227,0.85);
          border: 1.5px solid rgb(184,168,138);
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 2px 8px rgba(26,20,13,0.12);
        }

        .mc-act:active {
          transform: scale(0.9);
          background: rgba(245,239,227,0.95);
        }

        .mc-act-icon { color: rgb(44,62,54); display: flex; align-items: center; justify-content: center; }

        .mc-profile {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
          background: rgba(245,239,227,0.7);
          border-top: 1px solid rgb(184,168,138);
          cursor: pointer;
          transition: all 0.2s ease;
          color: rgb(44,62,54);
          font-size: 14px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 1001;
        }

        .mc-profile:active {
          background: rgba(245,239,227,0.9);
        }
      ` }} />

      <div className="app">
        {/* Header */}
        <div className="header">
          <div className="header-title">Recent Games</div>
          <div className="header-line" />
          <button className={`filter-btn ${hasActiveFilter ? 'active' : ''}`} onClick={() => setFilterOpen(true)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 3h12M4 7h8M6 11h4" />
            </svg>
            Filter
          </button>
        </div>

        {/* Filter Popup */}
        {filterOpen && (
          <div className="filter-overlay" onClick={() => setFilterOpen(false)}>
            <div className="filter-popup" onClick={(e) => e.stopPropagation()}>
              <div className="filter-popup-header">
                <div className="filter-popup-title">Filters</div>
                <button className="filter-close" onClick={() => setFilterOpen(false)}>✕</button>
              </div>

              <div className="filter-section">
                <div className="filter-section-label">Deck</div>
                <select
                  className="filter-select"
                  value={filterDeck || ''}
                  onChange={(e) => setFilterDeck(e.target.value || null)}
                >
                  <option value="">All Decks</option>
                  {allDecks.map((deck) => (
                    <option key={deck} value={deck}>{deck}</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <div className="filter-section-label">Aura</div>
                <div className="filter-chips">
                  <div className={`filter-chip ${filterAura === 'gain' ? 'selected' : ''}`} onClick={() => setFilterAura(filterAura === 'gain' ? 'all' : 'gain')}>Ascending ↑</div>
                  <div className={`filter-chip ${filterAura === 'loss' ? 'selected' : ''}`} onClick={() => setFilterAura(filterAura === 'loss' ? 'all' : 'loss')}>Descending ↓</div>
                </div>
              </div>

              {hasActiveFilter && (
                <button className="filter-clear-btn" onClick={() => { setFilterDeck(null); setFilterAura('all'); }}>
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Games List */}
        <div className="games-list">
          {filteredGames.length === 0 ? (
            <div className="filter-no-results">No games match your filters.</div>
          ) : (
            filteredGames.map((game, idx) => (
              <GameCard key={idx} game={game} index={idx} />
            ))
          )}
        </div>

        {/* Bottom Nav */}
        <div className="bottom-nav">
          <div className="nav-item active">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4H16M2 9H16M2 14H16" />
              </svg>
            </div>
            <div className="nav-label">Recent Games</div>
          </div>
          <Link href="/profile" className="nav-item">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="9" cy="6" r="3.5" />
                <path d="M2.5 17C2.5 13 5 11 9 11C13 11 15.5 13 15.5 17" />
              </svg>
            </div>
            <div className="nav-label">Profile</div>
          </Link>
          <Link href="/decks" className="nav-item">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="1" width="12" height="14" rx="2" />
                <path d="M6 17H15C16 17 17 16 17 15V5" opacity="0.5" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="nav-label">Decks</div>
          </Link>
        </div>
      </div>
    </>
  );
}

export default function RecentGamesPage() {
  return (
    <Suspense>
      <RecentGamesContent />
    </Suspense>
  );
}
