'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function EditDeckPage() {
  const [addCardModalActive, setAddCardModalActive] = useState(false);
  const [importModalActive, setImportModalActive] = useState(false);
  const [cards, setCards] = useState([
    { id: 1, num: 1, name: 'Swords to Plowshares', type: 'Instant', typeClass: 'instant', qty: 'x1' },
    { id: 2, num: 2, name: 'Nature\'s Lore', type: 'Sorcery', typeClass: 'sorcery', qty: 'x1' },
    { id: 3, num: 3, name: 'Cultivate', type: 'Sorcery', typeClass: 'sorcery', qty: 'x1' },
    { id: 4, num: 4, name: 'Craterhoof Behemoth', type: 'Creature', typeClass: 'creature', qty: 'x1' },
  ]);

  const removeCard = (id: number) => {
    setCards(cards.filter(card => card.id !== id));
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
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
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
      background: none;
      border: none;
      padding: 0;
    }

    .header-back:active { transform: scale(0.85); }

    .header-info {
      flex: 1;
    }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .header-subtitle {
      font-size: 10px;
      color: rgb(138,154,142);
      margin-top: 1px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .header-action-btn {
      padding: 5px 8px;
      background: rgb(245,239,227);
      border-radius: 8px;
      border: 1px solid rgb(184,168,138);
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
      width: 52px;
    }

    .header-action-btn:active { transform: scale(0.9); }

    .header-action-btn svg {
      width: 12px;
      height: 12px;
      display: block;
      margin: 0 auto 1px;
    }

    .header-action-label {
      font-size: 7px;
      font-weight: 600;
      color: rgb(138,154,142);
    }

    /* ── Scrollable Content ── */
    .content {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 4px 0 16px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .content::-webkit-scrollbar { display: none; }

    /* ── Section Label ── */
    .section-label {
      font-size: 12px;
      font-weight: 700;
      color: rgb(44,62,54);
      margin-bottom: 6px;
    }

    /* ── Input Field ── */
    .field-input {
      width: 100%;
      padding: 10px 12px;
      background: rgb(245,239,227);
      border: 1px solid rgb(184,168,138);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: rgb(44,62,54);
      outline: none;
      margin-bottom: 14px;
    }

    .field-input:focus {
      border-color: rgb(56,158,133);
    }

    /* ── Commander Card ── */
    .commander-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border-radius: 14px;
      border: 1.5px solid rgb(56,158,133);
      box-shadow: 0 4px 12px rgba(26,120,105,0.35);
      margin-bottom: 16px;
    }

    .commander-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(245,239,227,0.25);
      flex-shrink: 0;
      background: rgba(245,239,227,0.1);
    }

    .commander-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .commander-info {
      flex: 1;
    }

    .commander-name {
      font-size: 14px;
      font-weight: 700;
      color: rgb(245,239,227);
    }

    .commander-type {
      font-size: 10px;
      color: rgba(245,239,227,0.55);
      margin-top: 2px;
    }

    .commander-arrow {
      color: rgb(245,239,227);
      font-size: 14px;
      opacity: 0.5;
    }

    /* ── Cards Header ── */
    .cards-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .cards-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cards-header-title {
      font-size: 12px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .cards-count {
      font-size: 10px;
      color: rgb(138,154,142);
      background: rgb(245,239,227);
      border: 1px solid rgb(184,168,138);
      border-radius: 6px;
      padding: 1px 6px;
      font-weight: 600;
    }

    .cards-sort {
      font-size: 10px;
      color: rgb(138,154,142);
      cursor: pointer;
    }

    /* ── Card List ── */
    .card-list {
      background: rgb(245,239,227);
      border-radius: 14px;
      border: 1px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      margin-bottom: 12px;
      overflow: hidden;
    }

    .card-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border-bottom: 1px solid rgba(184,168,138,0.4);
    }

    .card-row:last-child { border-bottom: none; }

    .card-num {
      font-size: 12px;
      font-weight: 700;
      color: rgb(26,122,106);
      width: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    .card-type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .card-type-dot.instant { background: rgb(45,127,160); }
    .card-type-dot.sorcery { background: rgb(168,74,58); }
    .card-type-dot.creature { background: rgb(42,138,86); }
    .card-type-dot.artifact { background: rgb(138,154,142); }
    .card-type-dot.enchantment { background: rgb(184,146,46); }

    .card-details {
      flex: 1;
      min-width: 0;
    }

    .card-name {
      font-size: 12px;
      font-weight: 600;
      color: rgb(44,62,54);
    }

    .card-type-label {
      font-size: 9px;
      color: rgb(138,154,142);
    }

    .card-qty {
      font-size: 10px;
      color: rgb(138,154,142);
      margin-right: 6px;
    }

    .card-remove {
      color: rgb(168,74,58);
      font-size: 14px;
      cursor: pointer;
      opacity: 0.5;
      width: 18px;
      text-align: center;
      transition: opacity 0.2s;
      background: none;
      border: none;
      padding: 0;
    }

    .card-remove:active { opacity: 1; }

    /* ── Add Cards Button ── */
    .add-cards-btn {
      padding: 12px;
      text-align: center;
      cursor: pointer;
      margin-bottom: 14px;
      background: rgb(245,239,227);
      border-radius: 14px;
      border: 1.5px dashed rgb(184,168,138);
      transition: all 0.2s ease;
      width: 100%;
    }

    .add-cards-btn:active { transform: scale(0.98); }

    .add-cards-text {
      font-size: 14px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .add-cards-sub {
      font-size: 9px;
      color: rgb(138,154,142);
      margin-top: 2px;
    }

    /* ── Save Button ── */
    .save-btn {
      padding: 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border: 1.5px solid rgb(56,158,133);
      color: rgb(245,239,227);
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(26,120,105,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-shrink: 0;
      margin-bottom: 16px;
    }

    .save-btn:active { transform: scale(0.97); }

    /* ── Add Card Modal ── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-overlay.active { display: flex; }

    .modal-card {
      width: calc(100% - 48px);
      max-width: 340px;
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: modalIn 0.25s ease;
      max-height: 70%;
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

    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: rgb(222,212,192);
      border-radius: 10px;
      border: 1px solid rgb(184,168,138);
      margin-bottom: 10px;
    }

    .search-input-wrap svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: rgb(44,62,54);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
    }

    .search-input::placeholder {
      color: rgb(138,154,142);
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .search-result-row {
      padding: 8px 10px;
      background: rgb(222,212,192);
      border-radius: 10px;
      border: 1px solid rgb(184,168,138);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .search-result-row:active { transform: scale(0.98); }

    .search-result-name {
      font-size: 12px;
      font-weight: 600;
      color: rgb(44,62,54);
    }

    .search-result-type {
      font-size: 9px;
      color: rgb(138,154,142);
      margin-left: 6px;
    }

    .search-result-add {
      color: rgb(26,122,106);
      font-size: 16px;
      font-weight: 700;
    }

    /* ── Import Modal ── */
    .import-textarea {
      width: 100%;
      height: 200px;
      padding: 12px;
      background: rgb(222,212,192);
      border: 1px solid rgb(184,168,138);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: rgb(44,62,54);
      outline: none;
      resize: none;
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .import-textarea::placeholder {
      color: rgb(138,154,142);
    }

    .import-textarea:focus {
      border-color: rgb(56,158,133);
    }

    .import-btn {
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
    }

    .import-btn:active { transform: scale(0.97); }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">

        {/* Header */}
        <div className="header">
          <Link href="/decks" className="header-back">‹</Link>
          <div className="header-info">
            <div className="header-title">Edit Deck</div>
          </div>
          <div className="header-actions">
            <button
              className="header-action-btn"
              onClick={() => setImportModalActive(true)}
              type="button"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="rgb(26,122,106)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="4" y="2" width="10" height="12" rx="1.5"/>
                <path d="M2 5v8a1.5 1.5 0 0 0 1.5 1.5H10"/>
              </svg>
              <div className="header-action-label">Import</div>
            </button>
            <button className="header-action-btn" type="button">
              <svg viewBox="0 0 16 16" fill="none" stroke="rgb(26,122,106)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2H3a1 1 0 0 0-1 1v3"/>
                <path d="M10 14h3a1 1 0 0 0 1-1v-3"/>
                <path d="M14 6V3a1 1 0 0 0-1-1h-3"/>
                <path d="M2 10v3a1 1 0 0 0 1 1h3"/>
              </svg>
              <div className="header-action-label">Archidekt</div>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="content">

          {/* Deck Name */}
          <div className="section-label">Deck Name</div>
          <input
            className="field-input"
            type="text"
            defaultValue="Atraxa Superfriends"
          />

          {/* Commander */}
          <div className="section-label">Commander</div>
          <div className="commander-card">
            <div className="commander-avatar">
              <img src="https://cards.scryfall.io/art_crop/front/d/0/d0d33d52-3d28-4f2d-b7f6-92571f2f0e0e.jpg" alt="Atraxa"/>
            </div>
            <div className="commander-info">
              <div className="commander-name">Atraxa, Praetors' Voice</div>
              <div className="commander-type">Legendary Creature</div>
            </div>
            <span className="commander-arrow">▼</span>
          </div>

          {/* Cards in Deck Header */}
          <div className="cards-header">
            <div className="cards-header-left">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="4" y="2" width="10" height="12" rx="1.5"/>
                <path d="M2 5v8a1.5 1.5 0 0 0 1.5 1.5H10"/>
              </svg>
              <span className="cards-header-title">Cards in Deck</span>
              <span className="cards-count">{cards.length} / 100</span>
            </div>
            <span className="cards-sort">Sort ▼</span>
          </div>

          {/* Card List */}
          <div className="card-list">
            {cards.map((card) => (
              <div key={card.id} className="card-row">
                <span className="card-num">{card.num}</span>
                <div className={`card-type-dot ${card.typeClass}`}></div>
                <div className="card-details">
                  <div className="card-name">{card.name}</div>
                  <div className="card-type-label">{card.type}</div>
                </div>
                <span className="card-qty">{card.qty}</span>
                <button
                  className="card-remove"
                  onClick={() => removeCard(card.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add Cards */}
          <button
            className="add-cards-btn"
            onClick={() => setAddCardModalActive(true)}
            type="button"
          >
            <div className="add-cards-text">+ Add Cards</div>
          </button>

        </div>

        {/* Save Button pinned to bottom */}
        <button className="save-btn" type="button">
          <span>✓</span>
          Save Deck
        </button>

      </div>

      {/* Add Card Modal */}
      <div
        className={`modal-overlay ${addCardModalActive ? 'active' : ''}`}
        onClick={() => setAddCardModalActive(false)}
      >
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Add Card</div>
            <button
              className="modal-close"
              onClick={() => setAddCardModalActive(false)}
              type="button"
            >
              &#10005;
            </button>
          </div>
          <div className="search-input-wrap">
            <svg viewBox="0 0 16 16" fill="none" stroke="rgb(26,122,106)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7" cy="7" r="5"/>
              <path d="M14 14L11 11"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search Scryfall..."
            />
          </div>
          <div className="search-results">
            <div className="search-result-row">
              <div>
                <span className="search-result-name">Counterspell</span>
                <span className="search-result-type">Instant</span>
              </div>
              <span className="search-result-add">+</span>
            </div>
            <div className="search-result-row">
              <div>
                <span className="search-result-name">Mana Crypt</span>
                <span className="search-result-type">Artifact</span>
              </div>
              <span className="search-result-add">+</span>
            </div>
            <div className="search-result-row">
              <div>
                <span className="search-result-name">Cyclonic Rift</span>
                <span className="search-result-type">Instant</span>
              </div>
              <span className="search-result-add">+</span>
            </div>
            <div className="search-result-row">
              <div>
                <span className="search-result-name">Demonic Tutor</span>
                <span className="search-result-type">Sorcery</span>
              </div>
              <span className="search-result-add">+</span>
            </div>
            <div className="search-result-row">
              <div>
                <span className="search-result-name">Lightning Greaves</span>
                <span className="search-result-type">Artifact</span>
              </div>
              <span className="search-result-add">+</span>
            </div>
            <div className="search-result-row">
              <div>
                <span className="search-result-name">Beast Within</span>
                <span className="search-result-type">Instant</span>
              </div>
              <span className="search-result-add">+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <div
        className={`modal-overlay ${importModalActive ? 'active' : ''}`}
        onClick={() => setImportModalActive(false)}
      >
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Import Deck List</div>
            <button
              className="modal-close"
              onClick={() => setImportModalActive(false)}
              type="button"
            >
              &#10005;
            </button>
          </div>
          <textarea
            className="import-textarea"
            placeholder={`Paste your deck list here...\n\n1x Sol Ring\n1x Arcane Signet\n1x Swords to Plowshares\n1x Counterspell\n...`}
          ></textarea>
          <button
            className="import-btn"
            onClick={() => setImportModalActive(false)}
            type="button"
          >
            Import Cards
          </button>
        </div>
      </div>
    </>
  );
}
