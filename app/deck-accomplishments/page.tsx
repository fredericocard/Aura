'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCommanderProfile, type CommanderProfile } from '@/lib/commander-profile';

const BRACKETS = [
  { num: 1, name: 'Exhibition', desc: 'Your ultra-casual commander deck.', restrictions: ['No mass land denial or extra turns', 'No 2-card infinite combos', 'No game changers'], note: 'Few tutors' },
  { num: 2, name: 'Core', desc: 'The average current preconstructed deck.', restrictions: ['No mass land denial', 'No chaining extra turns', 'No 2-card infinite combos', 'No game changers'], note: 'Few tutors' },
  { num: 3, name: 'Upgraded', desc: 'Beyond the strength of an average precon deck.', restrictions: ['No mass land denial', 'No chaining extra turns'], note: 'Late game 2-card infinite combos allowed. Three game changes.' },
  { num: 4, name: 'Optimized', desc: 'High power commander. It\'s time to go wild!', restrictions: [], note: 'No restrictions (other than the banned list)' },
  { num: 5, name: 'cEDH', desc: 'High power with a very competitive and metagame focused mindset.', restrictions: [], note: 'No restrictions (other than the banned list)' },
];

export default function DeckAccomplishmentsPage() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId') ?? '';
  const [bracketModalActive, setBracketModalActive] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<number>(3);
  const [profile, setProfile] = useState<CommanderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) { setError('No deck specified'); setLoading(false); return; }
    async function load() {
      try {
        const data = await getCommanderProfile(deckId);
        setProfile(data);
        setSelectedBracket(data.currentBracket);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load profile');
      }
      setLoading(false);
    }
    load();
  }, [deckId]);

  const styles = `
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
    .page-header {
      padding: 16px 0 4px;
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      z-index: 2;
      background: rgb(14,52,44);
      margin: 0 -24px;
      padding: 16px 24px 4px;
    }

    .back-btn {
      color: rgb(245,239,227);
      font-size: 22px;
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
      line-height: 1;
      transition: all 0.2s ease;
    }

    .back-btn:active {
      transform: scale(0.9);
    }

    /* ── Scrollable Content ── */
    .scroll-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      position: relative;
      margin: 0 -24px;
      padding: 0 24px;
    }

    .commander-color-wash {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 220px;
      pointer-events: none;
      z-index: 0;
      border-radius: 0 0 30px 30px;
    }

    /* ── Commander Identity Row ── */
    .commander-identity {
      display: flex;
      align-items: center;
      padding: 10px 0 6px;
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    .commander-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: rgb(222,212,192);
      border: 2px solid rgba(245,239,227,0.5);
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    .commander-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .commander-info {
      flex: 1;
      min-width: 0;
    }

    .commander-name {
      font-size: 17px;
      font-weight: 700;
      color: rgb(245,239,227);
      line-height: 1.2;
    }

    .commander-mana {
      display: flex;
      gap: 4px;
      margin-top: 5px;
    }

    .mana-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    /* ── AURA CARD — the hero element ── */
    .aura-card {
      margin: 10px 0 12px;
      padding: 10px 16px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      overflow: hidden;
      z-index: 1;
    }

    /* Tier-specific coloring via CSS vars set inline */
    .aura-card {
      background: var(--aura-bg);
      border: 1.5px solid var(--aura-border);
      box-shadow: 0 8px 24px var(--aura-shadow);
    }

    .aura-icon {
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .aura-icon svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .aura-number {
      font-family: 'Jaldi', sans-serif;
      font-size: 22px;
      font-weight: 700;
      line-height: 1;
      color: var(--aura-text);
      position: relative;
      z-index: 1;
    }

    .aura-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .aura-tier-name {
      font-size: 20px;
      font-weight: 700;
      color: var(--aura-text);
      line-height: 1.2;
    }

    .aura-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--aura-text);
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .aura-range {
      font-size: 11px;
      font-weight: 500;
      color: var(--aura-text);
      opacity: 0.5;
      margin-top: 2px;
    }

    /* ── Stats Row (discreet) ── */
    .stats-row {
      margin: 0 0 14px;
      display: flex;
      gap: 16px;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    .stat-cell {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .stat-value-row {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .stat-value {
      font-size: 13px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .stat-icon {
      color: rgb(184,146,46);
      font-size: 9px;
    }

    .stat-label {
      font-size: 11px;
      color: rgb(90,110,98);
      font-weight: 500;
    }

    /* ── Bracket Pill ── */
    .bracket-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 0 auto 14px;
      padding: 6px 14px;
      background: rgba(14,52,44,0.08);
      border: 1px solid rgba(184,168,138,0.6);
      border-radius: 20px;
      position: relative;
      z-index: 1;
      width: fit-content;
    }

    .bracket-number {
      font-size: 14px;
      font-weight: 800;
      color: rgb(26,122,106);
      line-height: 1;
    }

    .bracket-divider {
      width: 1px;
      height: 12px;
      background: rgb(184,168,138);
    }

    .bracket-name {
      font-size: 11px;
      font-weight: 600;
      color: rgb(44,62,54);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Ornate Divider ── */
    .ornate-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0 14px;
      position: relative;
      z-index: 1;
    }

    .ornate-line-left {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgb(184,168,138));
    }

    .ornate-line-right {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, rgb(184,168,138), transparent);
    }

    .ornate-label {
      color: rgb(44,62,54);
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* ── Badges Grid (2-column) ── */
    .badges-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .badge-card {
      width: calc(50% - 4px);
      padding: 10px 10px;
      background: rgb(245,239,227);
      border-radius: 12px;
      border: 1px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .badge-icon-wrap {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .badge-icon-wrap svg {
      width: 28px;
      height: 28px;
    }

    .badge-text {
      flex: 1;
      min-width: 0;
    }

    .badge-title {
      font-size: 12px;
      font-weight: 700;
      color: rgb(44,62,54);
      line-height: 1.2;
    }

    .badge-count {
      font-size: 12px;
      font-weight: 700;
      color: rgb(26,122,106);
    }

    .badge-desc {
      font-size: 8px;
      color: rgb(90,110,98);
      line-height: 1.3;
      margin-top: 2px;
    }

    /* Unearned / ghost state */
    .badge-card.empty {
      background: rgba(245,239,227,0.45);
      border: 1.5px dashed rgba(184,168,138,0.35);
      box-shadow: none;
    }

    .badge-card.empty .badge-icon-wrap svg {
      opacity: 0.2;
    }

    .badge-card.empty .badge-title {
      color: rgb(138,154,142);
    }

    .badge-card.empty .badge-count {
      color: rgba(138,154,142,0.5);
    }

    .badge-card.empty .badge-desc {
      color: rgba(138,154,142,0.6);
    }

    /* ── Action Buttons ── */
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 4px 0 16px;
    }

    .action-btn {
      padding: 14px;
      text-align: center;
      cursor: pointer;
      background: rgb(245,239,227);
      border-radius: 22px;
      border: 1px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      color: rgb(44,62,54);
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      width: 100%;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .action-btn:active {
      transform: scale(0.9);
    }


    /* ── Bracket Modal ── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-card {
      width: calc(100% - 48px);
      max-width: 340px;
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: modalIn 0.25s ease;
      max-height: 70vh;
      overflow-y: auto;
    }

    @keyframes modalIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgb(222,212,192);
      border: 1px solid rgb(184,168,138);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgb(90,110,98);
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
    }

    .modal-close:active { transform: scale(0.9); }

    .bracket-option {
      padding: 12px;
      background: rgb(222,212,192);
      border-radius: 12px;
      border: 1.5px solid rgb(184,168,138);
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .bracket-option:active { transform: scale(0.98); }

    .bracket-option.selected {
      border-color: rgb(26,122,106);
      background: rgba(26,122,106,0.08);
      box-shadow: 0 0 0 1px rgb(26,122,106);
    }

    .bracket-option-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .bracket-option-num {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgb(14,52,44) 0%, rgb(26,72,62) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: rgb(245,239,227);
      flex-shrink: 0;
    }

    .bracket-option-name {
      font-size: 14px;
      font-weight: 700;
      color: rgb(44,62,54);
      flex: 1;
    }

    .bracket-option-check {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid rgb(184,168,138);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .bracket-option.selected .bracket-option-check {
      border-color: rgb(26,122,106);
      background: rgb(26,122,106);
    }

    .bracket-option-check-mark {
      color: rgb(245,239,227);
      font-size: 11px;
      font-weight: 700;
      display: none;
    }

    .bracket-option.selected .bracket-option-check-mark {
      display: block;
    }

    .bracket-option-desc {
      font-size: 10px;
      color: rgb(90,110,98);
      margin-left: 38px;
      line-height: 1.4;
    }

    .bracket-option-restrictions {
      margin-top: 6px;
      margin-left: 38px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bracket-restriction {
      font-size: 9px;
      color: rgb(168,74,58);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .bracket-note {
      font-size: 9px;
      color: rgb(90,110,98);
      margin-left: 38px;
      margin-top: 3px;
      font-style: italic;
    }

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
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
      border: 1px solid rgb(56,158,133);
      box-shadow: 0 4px 12px rgba(26,120,105,0.45);
    }

    .nav-item.active .nav-label {
      color: rgb(245,239,227);
      font-weight: 700;
    }

    .nav-item.active .nav-icon-svg {
      stroke: rgb(245,239,227);
    }

    .nav-item:not(.active):active {
      transform: scale(0.9);
      background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
    }

    .nav-item:not(.active):active .nav-label {
      color: rgb(245,239,227);
    }

    .nav-item:not(.active):active .nav-icon-svg {
      stroke: rgb(245,239,227);
    }

    .nav-item.active:active {
      transform: scale(0.95);
    }

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

  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        {/* Header */}
        <div className="page-header">
          <a href="/decks" className="back-btn" style={{ textDecoration: 'none' }}>&#8249;</a>
        </div>

        {/* Scrollable Content */}
        <div className="scroll-content">
          <div
            className="commander-color-wash"
            style={{
              background: 'linear-gradient(180deg, rgb(14,52,44) 0%, rgb(14,52,44) 20%, rgb(20,70,58) 50%, rgb(35,85,72) 70%, #e8dcc8 100%)',
            }}
          />

          {/* Commander Identity (compact) */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(245,239,227,0.7)' }}>Loading commander profile...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#B0593E' }}>{error}</div>
          ) : profile && (
          <>
          <div className="commander-identity">
            <div className="commander-avatar">
              {profile.commanderArtUrl ? (
                <img src={profile.commanderArtUrl} alt={profile.commanderName} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'rgb(245,239,227)' }}>{profile.commanderName.charAt(0)}</div>
              )}
            </div>
            <div className="commander-info">
              <div className="commander-name">{profile.commanderName}</div>
              <div className="commander-mana">
                {(profile.colorIdentity ?? '').split('').filter((c: any) => 'WUBRG'.includes(c)).map((c: any, i: any) => {
                  const colors: Record<string, string> = { W: '#f5efe3', U: '#2d7fa0', B: '#3a3a3a', R: '#b0593e', G: '#2a8a56' };
                  return <div key={i} className="mana-dot" style={{ background: colors[c] || '#888', border: c === 'W' ? '1px solid rgb(184,168,138)' : 'none' }} />;
                })}
              </div>
            </div>
          </div>

          {/* AURA CARD — Beloved tier (60-79), crystal blue */}
          <div
            className="aura-card"
            style={{
              '--aura-bg': 'rgba(195,225,245,0.85)',
              '--aura-border': 'rgba(120,180,220,0.8)',
              '--aura-shadow': 'rgba(130,190,230,0.22)',
              '--aura-text': 'rgb(60,130,185)',
            } as React.CSSProperties}
          >
            <div className="aura-icon">
              <svg viewBox="0 0 72 72" fill="none">
                {/* Outer glow */}
                <path
                  d="M36 4 L62 20 L62 52 L36 68 L10 52 L10 20 Z"
                  fill="var(--aura-bg)"
                  stroke="var(--aura-border)"
                  strokeWidth="1.5"
                />
                {/* Inner facet lines */}
                <path
                  d="M36 4 L36 68 M10 20 L62 52 M62 20 L10 52"
                  stroke="var(--aura-border)"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </svg>
              <span className="aura-number">{Math.round(profile.auraScore)}</span>
            </div>
            <div className="aura-details">
              <div className="aura-label">Aura</div>
              <div className="aura-tier-name">{profile.auraTier.tier}</div>
              <div className="aura-range">{profile.confidenceBand} · {profile.totalGames} games</div>
            </div>
          </div>

          {/* Stats Row (discreet) */}
          <div className="stats-row">
            <div className="stat-cell">
              <div className="stat-value-row">
                <span className="stat-value">{profile.totalGames}</span>
              </div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value-row">
                <span className="stat-value">{profile.totalBadgesEarned}</span>
              </div>
              <div className="stat-label">Badges Earned</div>
            </div>
          </div>

          {/* Bracket Pill */}
          <div className="bracket-pill" onClick={() => setBracketModalActive(true)} style={{ cursor: 'pointer' }}>
            <span className="bracket-number">{selectedBracket}</span>
            <div className="bracket-divider" />
            <span className="bracket-name">{BRACKETS[selectedBracket - 1].name}</span>
          </div>

          {/* Ornate Divider */}
          <div className="ornate-divider">
            <div className="ornate-line-left" />
            <span className="ornate-label">Brewed for</span>
            <div className="ornate-line-right" />
          </div>

          {/* Badges Grid */}
          <div className="badges-grid">
            {/* Brilliance — earned */}
            <div className="badge-card">
              <div className="badge-icon-wrap">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="rgb(184,146,46)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 3 L18.5 11 L27 12 L21 18 L23 27 L16 22.5 L9 27 L11 18 L5 12 L13.5 11 Z" />
                  <path
                    d="M16 8 L17.5 13 L22 13.5 L18.5 17 L19.5 22 L16 19.5 L12.5 22 L13.5 17 L10 13.5 L14.5 13 Z"
                    stroke="rgb(184,146,46)"
                    strokeWidth="0.8"
                    opacity="0.4"
                  />
                </svg>
              </div>
              <div className="badge-text">
                <div className="badge-title">
                  Brilliance <span className="badge-count">{(profile.badges.find((b: any) => b.badge === 'brilliance')?.earnedCount ?? 0) > 0 ? `x${profile.badges.find((b: any) => b.badge === 'brilliance')?.earnedCount}` : '—'}</span>
                </div>
                <div className="badge-desc">Sharp plays and strategic mastery</div>
              </div>
            </div>

            {/* Flavor — earned */}
            <div className="badge-card">
              <div className="badge-icon-wrap">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="rgb(168,74,58)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 28 C10 28 6 23 6 17 C6 11 10 5 16 3 C16 9 19 13 23 14 C23 14 27 10 27 17 C27 23 22 28 16 28 Z" />
                  <path
                    d="M16 28 C13 28 11 25 11 22 C11 19 13 17 16 16 C16 19 17.5 21 19 21.5 C19 21.5 21 19.5 21 22 C21 25 19 28 16 28 Z"
                    stroke="rgb(168,74,58)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                </svg>
              </div>
              <div className="badge-text">
                <div className="badge-title">
                  Flavor <span className="badge-count">{(profile.badges.find((b: any) => b.badge === 'flavor')?.earnedCount ?? 0) > 0 ? `x${profile.badges.find((b: any) => b.badge === 'flavor')?.earnedCount}` : '—'}</span>
                </div>
                <div className="badge-desc">Thematic deck and memorable moments</div>
              </div>
            </div>

            {/* Rivalry — empty */}
            <div className="badge-card empty">
              <div className="badge-icon-wrap">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="rgb(44,62,54)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 26 L22 10 M22 10 L22 16 M22 10 L28 10" />
                  <path d="M26 26 L10 10 M10 10 L10 16 M10 10 L4 10" />
                  <circle cx="16" cy="18" r="3" strokeWidth="1.2" />
                </svg>
              </div>
              <div className="badge-text">
                <div className="badge-title">
                  Rivalry <span className="badge-count">{(profile.badges.find((b: any) => b.badge === 'rivalry')?.earnedCount ?? 0) > 0 ? `x${profile.badges.find((b: any) => b.badge === 'rivalry')?.earnedCount}` : '—'}</span>
                </div>
                <div className="badge-desc">Intense standoffs and worthy opponents</div>
              </div>
            </div>

            {/* Allegiance — earned */}
            <div className="badge-card">
              <div className="badge-icon-wrap">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="rgb(26,122,106)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 3 L28 8 V17 C28 23 22 28 16 30 C10 28 4 23 4 17 V8 Z" />
                  <path d="M12 16 L15 19 L21 13" strokeWidth="2" />
                </svg>
              </div>
              <div className="badge-text">
                <div className="badge-title">
                  Allegiance <span className="badge-count">{(profile.badges.find((b: any) => b.badge === 'allegiance')?.earnedCount ?? 0) > 0 ? `x${profile.badges.find((b: any) => b.badge === 'allegiance')?.earnedCount}` : '—'}</span>
                </div>
                <div className="badge-desc">Loyal alliances and table politics</div>
              </div>
            </div>

            {/* Fun — empty */}
            <div className="badge-card empty">
              <div className="badge-icon-wrap">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="rgb(44,62,54)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <circle cx="16" cy="16" r="12" />
                  <circle cx="12" cy="13" r="1.5" fill="rgb(44,62,54)" />
                  <circle cx="20" cy="13" r="1.5" fill="rgb(44,62,54)" />
                  <path d="M11 20 C12.5 23 19.5 23 21 20" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="badge-text">
                <div className="badge-title">
                  Fun <span className="badge-count">{(profile.badges.find(b => b.badge === 'fun')?.earnedCount ?? 0) > 0 ? `x${profile.badges.find(b => b.badge === 'fun')?.earnedCount}` : '—'}</span>
                </div>
                <div className="badge-desc">Great vibes and enjoyable games</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <a href={`/recent-games?deckId=${deckId}`} className="action-btn" style={{ textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4H16M2 9H16M2 14H16" />
              </svg>
              Recent Games
            </a>
            <button className="action-btn" onClick={() => setBracketModalActive(true)}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h4v4H2zM2 11h4v4H2zM12 7h4v4h-4zM6 5h6M6 13h6M12 9V5M12 9v4" />
              </svg>
              Brackets
            </button>
          </div>
          </>
          )}
        </div>

        {/* Bottom Nav: Recent Games | Profile | Decks (active) */}
        <div className="bottom-nav">
          <a href="/recent-games" className="nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="nav-icon">
              <svg
                className="nav-icon-svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 4H16M2 9H16M2 14H16" />
              </svg>
            </div>
            <div className="nav-label">Recent Games</div>
          </a>

          <a href="/profile" className="nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="nav-icon">
              <svg
                className="nav-icon-svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="9" cy="6" r="3.5" />
                <path d="M2.5 17C2.5 13 5 11 9 11C13 11 15.5 13 15.5 17" />
              </svg>
            </div>
            <div className="nav-label">Profile</div>
          </a>

          <a href="/decks" className="nav-item active" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="nav-icon">
              <svg
                className="nav-icon-svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <rect x="3" y="1" width="12" height="14" rx="2" />
                <path d="M6 17H15C16 17 17 16 17 15V5" opacity="0.5" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="nav-label">Decks</div>
          </a>
        </div>
      </div>

      {/* Bracket Selection Modal */}
      {bracketModalActive && (
        <div className="modal-overlay" onClick={() => setBracketModalActive(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Select Bracket</div>
              <button className="modal-close" onClick={() => setBracketModalActive(false)} type="button">&#10005;</button>
            </div>
            {BRACKETS.map((b) => (
              <div
                key={b.num}
                className={`bracket-option${selectedBracket === b.num ? ' selected' : ''}`}
                onClick={() => { setSelectedBracket(b.num); setBracketModalActive(false); }}
              >
                <div className="bracket-option-header">
                  <div className="bracket-option-num">{b.num}</div>
                  <div className="bracket-option-name">{b.name}</div>
                  <div className="bracket-option-check">
                    <span className="bracket-option-check-mark">&#10003;</span>
                  </div>
                </div>
                <div className="bracket-option-desc">{b.desc}</div>
                {b.restrictions.length > 0 && (
                  <div className="bracket-option-restrictions">
                    {b.restrictions.map((r, i) => (
                      <div key={i} className="bracket-restriction">&#9747; {r}</div>
                    ))}
                  </div>
                )}
                {b.note && (
                  <div className="bracket-note">
                    {b.restrictions.length === 0 ? '✓ ' : ''}{b.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
