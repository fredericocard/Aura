'use client';

import React, { useState } from 'react';

export default function Page() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleBack = () => {
    displayToast('Back to Profile');
  };

  const handleDeckClick = () => {
    displayToast('Deck Details — Coming Soon');
  };

  const handleNewDeck = () => {
    displayToast('New Deck — Coming Soon');
  };

  const handleNavClick = (label: string) => {
    displayToast(`${label} — Coming Soon`);
  };

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
    .decks-header {
      padding: 16px 0 8px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back-btn {
      position: absolute;
      left: 0;
      top: 16px;
      color: rgb(90,110,98);
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

    .title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .title-text {
      font-size: 20px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    /* ── Scrollable Deck List ── */
    .deck-list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 8px 0;
    }

    /* ── Deck Card ── */
    .deck-card {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 10px;
      cursor: pointer;
      background: rgb(245,239,227);
      border-radius: 22px;
      border: 1px solid rgb(184,168,138);
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      transition: all 0.2s ease;
      text-decoration: none;
      color: inherit;
    }

    .deck-card:active {
      transform: scale(0.9);
    }

    .deck-art {
      width: 72px;
      height: 64px;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
      background: rgb(222,212,192);
    }

    .deck-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .deck-art-fade {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 50%, rgba(245,239,227,0.9) 100%);
    }

    .deck-info {
      flex: 1;
      padding: 12px 14px;
    }

    .deck-commander {
      color: rgb(44,62,54);
      font-size: 14px;
      font-weight: 700;
    }

    .deck-mana {
      display: flex;
      gap: 4px;
      margin-top: 5px;
    }

    .mana-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .deck-chevron {
      color: rgb(26,122,106);
      font-size: 18px;
      font-weight: 600;
      padding-right: 16px;
      flex-shrink: 0;
    }

    /* ── New Deck Button ── */
    .new-deck-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 24px;
      margin: 4px auto 0;
      width: fit-content;
      background: rgb(245,239,227);
      border-radius: 22px;
      border: 1px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      cursor: pointer;
      color: rgb(44,62,54);
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      transition: all 0.2s ease;
    }

    .new-deck-btn:active {
      transform: scale(0.9);
    }

    .new-deck-plus {
      font-size: 16px;
      color: rgb(26,122,106);
      font-weight: 700;
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
      border: none;
      font-family: inherit;
      text-decoration: none;
      color: inherit;
    }

    /* Active state — current page, permanent teal gradient */
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

    /* Press state for inactive items */
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

    /* Active nav item press — subtle scale */
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

    /* ── Toast ── */
    .toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgb(44,62,54);
      color: rgb(245,239,227);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      z-index: 9999;
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        {/* Header */}
        <div className="decks-header">
          <a href="/profile" className="back-btn" onClick={(e) => {
            e.preventDefault();
            handleBack();
          }}>
            &#8249;
          </a>
          <div className="title-row">
            <span className="title-text">Your Decks</span>
          </div>
        </div>

        {/* Deck List */}
        <div className="deck-list">
          {/* Deck 1: Atraxa Superfriends */}
          <a href="/deck-accomplishments" className="deck-card" onClick={(e) => {
            e.preventDefault();
            handleDeckClick();
          }}>
            <div className="deck-art">
              <img src="https://cards.scryfall.io/art_crop/front/c/3/c34ae834-775e-447a-a330-0270c227c667.jpg" alt="Atraxa" />
              <div className="deck-art-fade"></div>
            </div>
            <div className="deck-info">
              <div className="deck-commander">Atraxa, Praetors' Voice</div>
              <div className="deck-mana">
                <div className="mana-dot" style={{background:'#f5efe3',border:'1px solid rgb(184,168,138)'}}></div>
                <div className="mana-dot" style={{background:'#2d7fa0'}}></div>
                <div className="mana-dot" style={{background:'#3a3a3a'}}></div>
                <div className="mana-dot" style={{background:'#2a8a56'}}></div>
              </div>
            </div>
            <span className="deck-chevron">&#8250;</span>
          </a>

          {/* Deck 2: Korvold Sac */}
          <a href="/deck-accomplishments" className="deck-card" onClick={(e) => {
            e.preventDefault();
            handleDeckClick();
          }}>
            <div className="deck-art">
              <img src="https://cards.scryfall.io/art_crop/front/9/2/92ea1575-eb64-43b5-b604-c6e23054f228.jpg" alt="Korvold" />
              <div className="deck-art-fade"></div>
            </div>
            <div className="deck-info">
              <div className="deck-commander">Korvold, Fae-Cursed King</div>
              <div className="deck-mana">
                <div className="mana-dot" style={{background:'#3a3a3a'}}></div>
                <div className="mana-dot" style={{background:'#a84a3a'}}></div>
                <div className="mana-dot" style={{background:'#2a8a56'}}></div>
              </div>
            </div>
            <span className="deck-chevron">&#8250;</span>
          </a>

          {/* Deck 3: Yuriko Ninjas */}
          <a href="/deck-accomplishments" className="deck-card" onClick={(e) => {
            e.preventDefault();
            handleDeckClick();
          }}>
            <div className="deck-art">
              <img src="https://cards.scryfall.io/art_crop/front/3/b/3bd81ae6-e628-447a-a36b-597e63ede295.jpg" alt="Yuriko" />
              <div className="deck-art-fade"></div>
            </div>
            <div className="deck-info">
              <div className="deck-commander">Yuriko, the Tiger's Shadow</div>
              <div className="deck-mana">
                <div className="mana-dot" style={{background:'#2d7fa0'}}></div>
                <div className="mana-dot" style={{background:'#3a3a3a'}}></div>
              </div>
            </div>
            <span className="deck-chevron">&#8250;</span>
          </a>

          {/* New Deck button */}
          <button className="new-deck-btn" onClick={handleNewDeck}>
            <span className="new-deck-plus">+</span> New Deck
          </button>
        </div>

        {/* Bottom Nav: Recent Games | Profile | Decks (active) */}
        <div className="bottom-nav">
          <a href="/recent-games" className="nav-item" onClick={(e) => {
            e.preventDefault();
            handleNavClick('Recent Games');
          }}>
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4H16M2 9H16M2 14H16"/>
              </svg>
            </div>
            <div className="nav-label">Recent Games</div>
          </a>

          <a href="/profile" className="nav-item" onClick={(e) => {
            e.preventDefault();
            handleNavClick('Profile');
          }}>
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="9" cy="6" r="3.5"/>
                <path d="M2.5 17C2.5 13 5 11 9 11C13 11 15.5 13 15.5 17"/>
              </svg>
            </div>
            <div className="nav-label">Profile</div>
          </a>

          <div className="nav-item active">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="1" width="12" height="14" rx="2"/>
                <path d="M6 17H15C16 17 17 16 17 15V5" opacity="0.5" strokeWidth="1.2"/>
              </svg>
            </div>
            <div className="nav-label">Decks</div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMsg}
      </div>
    </>
  );
}
