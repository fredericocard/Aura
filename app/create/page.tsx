'use client';

import { useState } from 'react';
import Link from 'next/link';

const SAMPLE_DECKS = [
  { id: 'omnath', name: 'Omnath, Locus of Creation', art: 'https://cards.scryfall.io/art_crop/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg', colors: ['G','W','U','R'] },
  { id: 'atraxa', name: "Atraxa, Praetors' Voice", art: 'https://cards.scryfall.io/art_crop/front/d/0/d0d33d52-3d28-4f2d-b7f6-92571f2f0e0e.jpg', colors: ['W','U','B','G'] },
  { id: 'krenko', name: 'Krenko, Mob Boss', art: 'https://cards.scryfall.io/art_crop/front/c/d/cd9fef1d-fbdc-4e44-9740-d214f712e067.jpg', colors: ['R'] },
];

const MANA_COLORS: Record<string, string> = {
  W: '#E9DEB6',
  U: '#5B7E9E',
  B: '#3F352E',
  R: '#B0593E',
  G: '#5B7B45',
};

export default function Page() {
  const [podName, setPodName] = useState('Friday Night Pod');
  const [selectedPlayers, setSelectedPlayers] = useState(4);
  const [selectedDeck, setSelectedDeck] = useState(0);
  const [showQr, setShowQr] = useState(false);

  // Generate decorative QR pattern
  const qrCells = Array.from({ length: 121 }).map((_, i) => {
    const r = Math.floor(i / 11), c = i % 11;
    const corner = (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
    const filled = corner || (Math.sin(i * 1.7) + Math.cos(i * 0.9)) > 0.2;
    return filled;
  });

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Young+Serif&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

    html, body {
      height: 100%;
      overflow: hidden;
      font-family: 'Instrument Sans', sans-serif;
      background: #F5EFE2;
    }

    .app {
      width: 100%;
      height: 100%;
      max-width: 430px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 52px 12px 12px;
      background: rgba(245,239,226,0.85);
      backdrop-filter: blur(14px) saturate(120%);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      border-bottom: 1px solid rgba(43,33,24,0.08);
      flex-shrink: 0;
    }

    .header-back {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #2B2118;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .header-back:active { transform: scale(0.85); }

    .header-title {
      flex: 1;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.01em;
      color: #2B2118;
    }

    /* ── Content ── */
    .content {
      flex: 1;
      overflow: auto;
      padding: 8px 16px 120px;
    }

    /* ── Eyebrow Label ── */
    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8A7E6F;
      padding: 6px 4px 8px;
    }

    .eyebrow-top {
      padding: 18px 4px 8px;
    }

    /* ── Pod Name Input ── */
    .pod-name-input {
      width: 100%;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.14);
      border-radius: 20px;
      padding: 14px 16px;
      font-family: 'Young Serif', serif;
      font-size: 18px;
      color: #2B2118;
      outline: none;
    }

    .pod-name-input:focus {
      border-color: #2F5D3A;
    }

    /* ── Player Count ── */
    .player-selector {
      display: flex;
      gap: 8px;
    }

    .player-tile {
      flex: 1;
      padding: 14px 0;
      text-align: center;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.14);
      border-radius: 14px;
      font-family: 'Young Serif', serif;
      font-size: 22px;
      letter-spacing: -0.01em;
      color: #2B2118;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-tile:active { transform: scale(0.95); }

    .player-tile.selected {
      background: #2F5D3A;
      color: #F5EFE2;
      border: none;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
    }

    /* ── Deck List ── */
    .deck-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .deck-row {
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.08);
      border-radius: 20px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .deck-row:active { transform: scale(0.98); }

    .deck-row.selected {
      background: #E5ECE3;
      border: 1.5px solid #2F5D3A;
    }

    .deck-art {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .deck-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 50% 25%;
    }

    .deck-info {
      flex: 1;
      min-width: 0;
    }

    .deck-name {
      font-family: 'Young Serif', serif;
      font-size: 16px;
      color: #2B2118;
      line-height: 1.15;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .deck-mana {
      display: flex;
      gap: 3px;
      margin-top: 4px;
    }

    .mana-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      box-shadow: 0 0 0 1px rgba(43,33,24,0.18);
    }

    .deck-check {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 1.5px solid rgba(43,33,24,0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .deck-check.selected {
      border: none;
      background: #2F5D3A;
    }

    /* ── Sticky CTA ── */
    .cta-wrap {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 14px 16px 32px;
      background: linear-gradient(to top, #F5EFE2 60%, rgba(245,239,226,0));
      z-index: 5;
    }

    .create-btn {
      width: 100%;
      border: none;
      cursor: pointer;
      background: #2F5D3A;
      color: #F5EFE2;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      font-size: 16px;
      padding: 16px 20px;
      border-radius: 20px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      transition: all 0.2s ease;
    }

    .create-btn:active { transform: scale(0.97); }

    /* ── QR Popup ── */
    .qr-overlay {
      position: fixed;
      inset: 0;
      z-index: 70;
      background: rgba(43,33,24,0.55);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px;
    }

    .qr-card {
      background: #FAF5EA;
      border-radius: 24px;
      padding: 24px 22px 22px;
      width: 100%;
      max-width: 320px;
      position: relative;
      box-shadow: 0 4px 0 rgba(43,33,24,0.06), 0 30px 60px -16px rgba(43,33,24,0.35);
      border: 1px solid #B06B2C;
      animation: popIn 0.3s ease;
    }

    @keyframes popIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .qr-dismiss {
      position: absolute;
      top: 12px;
      right: 12px;
      color: #8A7E6F;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }

    .qr-dismiss:active { transform: scale(0.85); }

    .qr-header {
      text-align: center;
      margin-bottom: 14px;
    }

    .qr-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #B06B2C;
    }

    .qr-title {
      font-family: 'Young Serif', serif;
      font-size: 22px;
      color: #2B2118;
      margin-top: 4px;
      line-height: 1.15;
    }

    .qr-grid-wrap {
      width: 200px;
      height: 200px;
      margin: 0 auto;
      padding: 12px;
      background: #FFFFFF;
      border-radius: 14px;
      box-shadow: 0 0 0 1px rgba(43,33,24,0.08);
      display: grid;
      grid-template-columns: repeat(11, 1fr);
      grid-template-rows: repeat(11, 1fr);
      gap: 1.5px;
    }

    .qr-cell {
      border-radius: 1px;
    }

    .qr-cell.filled { background: #2B2118; }

    .qr-code-text {
      text-align: center;
      margin-top: 14px;
      font-family: 'Young Serif', serif;
      font-size: 28px;
      letter-spacing: 0.14em;
      color: #B06B2C;
      font-variant-numeric: tabular-nums;
    }

    .qr-enter-btn {
      width: 100%;
      margin-top: 16px;
      border: none;
      cursor: pointer;
      background: #2F5D3A;
      color: #F5EFE2;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 20px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      transition: all 0.2s ease;
      display: block;
      text-align: center;
      text-decoration: none;
    }

    .qr-enter-btn:active { transform: scale(0.97); }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        {/* Header */}
        <div className="header">
          <Link href="/landing" className="header-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="header-title">Create a pod</div>
        </div>

        {/* Content */}
        <div className="content">
          {/* Pod Name */}
          <div className="eyebrow">Pod Name</div>
          <input
            className="pod-name-input"
            type="text"
            value={podName}
            onChange={(e) => setPodName(e.target.value)}
            placeholder="Enter pod name..."
          />

          {/* Player Count */}
          <div className="eyebrow eyebrow-top">Number of Players</div>
          <div className="player-selector">
            {[2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={`player-tile ${selectedPlayers === n ? 'selected' : ''}`}
                onClick={() => setSelectedPlayers(n)}
              >
                {n}
              </div>
            ))}
          </div>

          {/* Deck Selection */}
          <div className="eyebrow eyebrow-top">Select Your Deck</div>
          <div className="deck-list">
            {SAMPLE_DECKS.map((d, i) => (
              <div
                key={d.id}
                className={`deck-row ${selectedDeck === i ? 'selected' : ''}`}
                onClick={() => setSelectedDeck(i)}
              >
                <div className="deck-art">
                  <img src={d.art} alt={d.name} />
                </div>
                <div className="deck-info">
                  <div className="deck-name">{d.name}</div>
                  <div className="deck-mana">
                    {d.colors.map((c, j) => (
                      <div key={j} className="mana-dot" style={{ background: MANA_COLORS[c] || '#A89F8E' }} />
                    ))}
                  </div>
                </div>
                <div className={`deck-check ${selectedDeck === i ? 'selected' : ''}`}>
                  {selectedDeck === i && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5EFE2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="cta-wrap">
          <button className="create-btn" onClick={() => setShowQr(true)}>Create Pod</button>
        </div>
      </div>

      {/* QR Popup */}
      {showQr && (
        <div className="qr-overlay" onClick={() => setShowQr(false)}>
          <div className="qr-card" onClick={(e) => e.stopPropagation()}>
            <button className="qr-dismiss" onClick={() => setShowQr(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className="qr-header">
              <div className="qr-eyebrow">Pod Created</div>
              <div className="qr-title">Share this code so others can join</div>
            </div>

            {/* Decorative QR */}
            <div className="qr-grid-wrap">
              {qrCells.map((filled, i) => (
                <div key={i} className={`qr-cell ${filled ? 'filled' : ''}`} />
              ))}
            </div>

            <div className="qr-code-text">ARC—7X2K</div>

            <Link href={`/gridview-${selectedPlayers}p`} className="qr-enter-btn">
              Enter Pod
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
