'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Page() {
  const [podName, setPodName] = useState('Friday Night MTG');
  const [selectedPlayers, setSelectedPlayers] = useState(4);
  const [selectedDeck, setSelectedDeck] = useState(0);
  const [showQr, setShowQr] = useState(false);

  const decks = [
    {
      emoji: '🦋',
      name: 'Atraxa Superfriends',
      mana: ['w', 'u', 'b', 'g'],
    },
    {
      emoji: '🐉',
      name: 'Korvold Sac',
      mana: ['b', 'r', 'g'],
    },
    {
      emoji: '🥷',
      name: 'Yuriko Ninjas',
      mana: ['u', 'b'],
    },
  ];

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
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      flex-shrink: 0;
    }

    .header-back {
      color: rgb(90,110,98);
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      transition: all 0.2s ease;
      width: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-back:active { transform: scale(0.85); }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    /* ── Content ── */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 4px 0 16px;
    }

    /* ── Section Label ── */
    .section-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .section-label-text {
      font-size: 14px;
      font-weight: 700;
      color: rgb(44,62,54);
      flex-shrink: 0;
    }

    .section-label-line {
      flex: 1;
      height: 1px;
      background: rgba(184,168,138,0.55);
    }

    /* ── Pod Name Input ── */
    .pod-name-input {
      width: 100%;
      padding: 12px 14px;
      background: rgb(222,212,192);
      border: 1px solid rgb(184,168,138);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: rgb(44,62,54);
      outline: none;
      margin-bottom: 18px;
    }

    .pod-name-input::placeholder {
      color: rgb(138,154,142);
    }

    .pod-name-input:focus {
      border-color: rgb(56,158,133);
    }

    /* ── Player Count Selector ── */
    .player-selector {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 18px;
    }

    .player-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgb(245,239,227);
      border: 1.5px solid rgb(184,168,138);
    }

    .player-circle:active { transform: scale(0.9); }

    .player-circle.selected {
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border: 1.5px solid rgb(56,158,133);
      box-shadow: 0 4px 12px rgba(26,120,105,0.35);
    }

    .player-circle-num {
      font-size: 18px;
      font-weight: 700;
      color: rgb(90,110,98);
    }

    .player-circle.selected .player-circle-num {
      color: rgb(245,239,227);
    }

    /* ── Deck List ── */
    .deck-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      overflow: hidden;
    }

    .deck-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgb(245,239,227);
      border-radius: 14px;
      border: 1.5px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .deck-row:active { transform: scale(0.98); }

    .deck-row.selected {
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border-color: rgb(56,158,133);
      box-shadow: 0 4px 12px rgba(26,120,105,0.35);
    }

    .deck-emoji {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgb(222,212,192);
      border: 1px solid rgba(184,168,138,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .deck-row.selected .deck-emoji {
      background: rgba(245,239,227,0.15);
      border-color: rgba(245,239,227,0.3);
    }

    .deck-info {
      flex: 1;
      min-width: 0;
    }

    .deck-name {
      font-size: 14px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .deck-row.selected .deck-name {
      color: rgb(245,239,227);
    }

    .deck-mana {
      display: flex;
      gap: 3px;
      margin-top: 4px;
    }

    .mana-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .mana-dot.w { background: rgb(222,212,192); border: 1px solid rgb(184,168,138); }
    .mana-dot.u { background: rgb(45,127,160); }
    .mana-dot.b { background: rgb(58,58,58); }
    .mana-dot.r { background: rgb(168,74,58); }
    .mana-dot.g { background: rgb(42,138,86); }

    .deck-check {
      color: rgb(184,146,46);
      font-size: 16px;
      font-weight: 700;
    }

    /* ── Create Button ── */
    .create-btn {
      margin-top: auto;
      padding: 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border: 1.5px solid rgb(56,158,133);
      color: rgb(245,239,227);
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(26,120,105,0.35);
      flex-shrink: 0;
    }

    .create-btn:active { transform: scale(0.97); }

    /* ── QR Popup Overlay ── */
    .qr-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .qr-overlay.active { display: flex; }

    .qr-card {
      width: calc(100% - 48px);
      max-width: 340px;
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: scaleIn 0.25s ease;
    }

    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .qr-close-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    }

    .qr-close {
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

    .qr-close:active { transform: scale(0.9); }

    .qr-header {
      text-align: center;
      margin-bottom: 16px;
    }

    .qr-title {
      font-size: 18px;
      font-weight: 700;
      color: rgb(44,62,54);
      margin-bottom: 4px;
    }

    .qr-subtitle {
      font-size: 13px;
      color: rgb(90,110,98);
    }

    .qr-box {
      width: 160px;
      height: 160px;
      margin: 0 auto 16px;
      background: #fff;
      border-radius: 16px;
      border: 1.5px solid rgb(184,168,138);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .qr-pattern {
      width: 130px;
      height: 130px;
      background: repeating-conic-gradient(rgb(44,62,54) 0% 25%, #fff 0% 50%) 50% / 13px 13px;
      border-radius: 6px;
    }

    .qr-badge {
      position: absolute;
      background: rgb(26,122,106);
      border-radius: 6px;
      padding: 3px 8px;
    }

    .qr-badge span {
      color: rgb(245,239,227);
      font-size: 10px;
      font-weight: 700;
    }

    .qr-code-section {
      text-align: center;
      margin-bottom: 16px;
    }

    .qr-code-label {
      font-size: 11px;
      color: rgb(138,154,142);
      margin-bottom: 4px;
    }

    .qr-code-value {
      font-family: monospace;
      font-size: 22px;
      font-weight: 700;
      color: rgb(44,62,54);
      letter-spacing: 4px;
    }

    .qr-enter-btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border: 1.5px solid rgb(56,158,133);
      color: rgb(245,239,227);
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      display: block;
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
            ‹
          </Link>
          <div className="header-title">Create Pod</div>
        </div>

        {/* Content */}
        <div className="content">
          {/* Pod Name */}
          <div className="section-label">
            <span className="section-label-text">Pod Name</span>
            <div className="section-label-line" />
          </div>
          <input
            className="pod-name-input"
            type="text"
            placeholder="Enter pod name..."
            value={podName}
            onChange={(e) => setPodName(e.target.value)}
          />

          {/* Player Count */}
          <div className="section-label">
            <span className="section-label-text">Number of Players</span>
            <div className="section-label-line" />
          </div>
          <div className="player-selector">
            {[2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`player-circle ${selectedPlayers === num ? 'selected' : ''}`}
                onClick={() => setSelectedPlayers(num)}
              >
                <span className="player-circle-num">{num}</span>
              </div>
            ))}
          </div>

          {/* Deck Selection */}
          <div className="section-label">
            <span className="section-label-text">Choose Your Deck</span>
            <div className="section-label-line" />
          </div>
          <div className="deck-list">
            {decks.map((deck, idx) => (
              <div
                key={idx}
                className={`deck-row ${selectedDeck === idx ? 'selected' : ''}`}
                onClick={() => setSelectedDeck(idx)}
              >
                <div className="deck-emoji">{deck.emoji}</div>
                <div className="deck-info">
                  <div className="deck-name">{deck.name}</div>
                  <div className="deck-mana">
                    {deck.mana.map((color, i) => (
                      <div key={i} className={`mana-dot ${color}`} />
                    ))}
                  </div>
                </div>
                {selectedDeck === idx && <span className="deck-check">✓</span>}
              </div>
            ))}
          </div>

          {/* Create Button */}
          <div className="create-btn" onClick={() => setShowQr(true)}>
            Create Pod
          </div>
        </div>
      </div>

      {/* QR Popup */}
      <div
        className={`qr-overlay ${showQr ? 'active' : ''}`}
        onClick={() => setShowQr(false)}
      >
        <div className="qr-card" onClick={(e) => e.stopPropagation()}>
          <div className="qr-close-row">
            <div
              className="qr-close"
              onClick={() => setShowQr(false)}
              role="button"
              tabIndex={0}
            >
              &#10005;
            </div>
          </div>
          <div className="qr-header">
            <div className="qr-title">Pod Created!</div>
            <div className="qr-subtitle">Share this code so others can join</div>
          </div>
          <div className="qr-box">
            <div className="qr-pattern" />
            <div className="qr-badge">
              <span>PodHub</span>
            </div>
          </div>
          <div className="qr-code-section">
            <div className="qr-code-label">Pod Code</div>
            <div className="qr-code-value">ARC-7X2K</div>
          </div>
          <Link href="/gridview-4p" className="qr-enter-btn">
            Enter Pod
          </Link>
        </div>
      </div>
    </>
  );
}
