'use client';

import React, { useState, useRef } from 'react';

export default function SingleViewPage() {
  // Life counter state
  const [life, setLife] = useState(40);
  const [isLifeExpanded, setIsLifeExpanded] = useState(false);
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);

  // Counter states
  const [poison, setPoison] = useState(0);
  const [experience, setExperience] = useState(0);
  const [energy, setEnergy] = useState(0);

  // Modal states
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [diceTab, setDiceTab] = useState('d20');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const [countersModalOpen, setCountersModalOpen] = useState(false);

  // Login/commander search state
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showSearchMode, setShowSearchMode] = useState(false);
  const [showSSO, setShowSSO] = useState(false);
  const [ssoView, setSsoView] = useState('ssoViewSignin');

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Opponent data
  const opponents = [
    { key: 'kess', name: 'Kess, Dissident Mage', player: 'Marta', life: 16, color: 'm', lifeColor: 'teal', aura: 72, badges: { brilliance: 2, flavor: 1, rivalry: 0, allegiance: 3, fun: 0 } },
    { key: 'korvold', name: 'Korvold, Fae-Cursed King', player: 'Rafa', life: 12, color: 'r', lifeColor: 'red', poison: 2, aura: 45, badges: { brilliance: 1, flavor: 0, rivalry: 2, allegiance: 0, fun: 1 } },
    { key: 'ghave', name: 'Ghave, Guru of Spores', player: 'Ana', life: 24, color: 'a', lifeColor: 'teal', aura: 88, badges: { brilliance: 4, flavor: 2, rivalry: 1, allegiance: 1, fun: 3 } },
  ];

  const myDecks = [
    { name: 'Omnath', color: 'G' },
    { name: 'Korvold', color: 'R' },
    { name: 'Atraxa', color: 'U' },
    { name: 'Urza', color: 'U' },
  ];

  // Long press ref
  const longPressRef = useRef<{ timeout: NodeJS.Timeout | null; interval: NodeJS.Timeout | null }>({ timeout: null, interval: null });

  const stopLongPress = () => {
    if (longPressRef.current.timeout) { clearTimeout(longPressRef.current.timeout); longPressRef.current.timeout = null; }
    if (longPressRef.current.interval) { clearInterval(longPressRef.current.interval); longPressRef.current.interval = null; }
  };

  // Life control functions
  const adjustLife = (delta: number) => {
    setLife(prev => {
      const newLife = Math.max(0, prev + delta);
      if (newLife === 0) stopLongPress();
      return newLife;
    });
  };

  const startLongPress = (delta: number) => {
    longPressRef.current.timeout = setTimeout(() => {
      adjustLife(delta * 4);
      longPressRef.current.interval = setInterval(() => {
        adjustLife(delta * 5);
      }, 200);
    }, 500);
  };

  const handleRevive = () => {
    setLife(1);
  };

  // Opponent expansion
  const expandOpponent = (key: string) => {
    setExpandedOpponent(key);
    setIsLifeExpanded(true);
  };

  const collapseOpponent = () => {
    setExpandedOpponent(null);
    setIsLifeExpanded(false);
  };

  // Dice roll
  const rollDice = () => {
    setIsRolling(true);
    setDiceResult(null);

    setTimeout(() => {
      let result = 0;
      if (diceTab === 'd20') result = Math.floor(Math.random() * 20) + 1;
      else if (diceTab === 'd10') result = Math.floor(Math.random() * 10) + 1;
      else if (diceTab === 'd6') result = Math.floor(Math.random() * 6) + 1;

      setDiceResult(result);
      setIsRolling(false);
    }, 1000);
  };

  // Login flows
  const handleConfirmCommander = () => {
    if (selectedCard) {
      setLoginOverlayOpen(false);
      setToastMessage(`Confirmed: ${selectedCard.name}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  const handleSSOComplete = () => {
    setIsLoggedIn(true);
    setShowSSO(false);
    setToastMessage('Welcome back!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleConfirmDeck = () => {
    if (selectedDeck !== null) {
      setLoginOverlayOpen(false);
      setToastMessage(`Deck selected: ${myDecks[selectedDeck].name}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  // Search for commanders (simulated)
  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim()) {
      const mockResults = [
        { name: 'Omnath, Locus of Mana', type: 'Legendary Creature — Spirit', art: '' },
        { name: 'Atraxa, Praetors\' Voice', type: 'Legendary Creature — Angel Horror', art: '' },
      ];
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCard = (card: any) => {
    setSelectedCard(card);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
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

        .life-card {
          border-radius: 26px;
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          border: 1.5px solid rgb(56,158,133);
          box-shadow: 0 16px 34px rgba(26,120,105,0.35), 0 4px 10px rgba(13,64,51,0.25);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-top: 16px;
        }

        .life-card.collapsed {
          height: 268px;
        }

        .life-card.expanded {
          height: 96px;
          border-radius: 22px;
        }

        .life-number {
          font-family: 'Jaldi', sans-serif;
          font-weight: 700;
          color: rgb(245,239,227);
          text-align: center;
          transition: font-size 0.3s ease;
          line-height: 1;
        }

        .life-card.collapsed .life-number { font-size: 150px; }
        .life-card.expanded .life-number { font-size: 72px; }

        .life-card.critical { box-shadow: 0 16px 34px rgba(168,74,58,0.4), 0 4px 10px rgba(168,74,58,0.25); }
        .life-card.critical .life-number { color: #ff6b6b; text-shadow: 0 0 20px rgba(255,107,107,0.5); }

        .life-card.dead {
          box-shadow: 0 16px 34px rgba(168,74,58,0.5), 0 4px 10px rgba(168,74,58,0.3);
          background: linear-gradient(135deg, rgb(80,50,45) 0%, rgb(100,60,50) 50%, rgb(120,70,55) 100%);
          border-color: rgba(168,74,58,0.6);
        }

        .life-card.dead .life-number {
          color: #ff6b6b;
          text-shadow: 0 0 30px rgba(255,107,107,0.6);
        }

        .revive-btn {
          padding: 12px 32px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          border: 1.5px solid rgb(56,158,133);
          color: rgb(245,239,227);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(26,120,105,0.35);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .revive-btn:active { transform: scale(0.95); }

        .review-game-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          margin-top: 12px;
          background: rgb(245,239,227);
          border: 1px solid rgb(184,168,138);
          border-radius: 14px;
          box-shadow: 0 6px 16px rgba(26,20,13,0.08);
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
          width: 100%;
        }

        .review-game-btn:active { transform: scale(0.98); }

        .review-game-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .review-game-text {
          font-size: 14px;
          font-weight: 600;
          color: rgb(44,62,54);
        }

        .review-game-arrow {
          font-size: 14px;
          color: rgb(26,122,106);
          margin-left: auto;
        }

        .life-controls {
          display: flex;
          justify-content: space-between;
          width: 100%;
          position: absolute;
          padding: 0 22px;
          transition: all 0.3s ease;
        }

        .life-card.collapsed .life-controls { bottom: 24px; }
        .life-card.expanded .life-controls { top: 26px; padding: 0 16px; }

        .control-button {
          width: 54px; height: 54px; border-radius: 27px;
          border: 1px solid rgb(245,239,227);
          background: rgba(245,239,227,0.18);
          color: rgb(245,239,227);
          font-size: 28px; font-weight: bold;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }

        .life-card.expanded .control-button { width: 44px; height: 44px; border-radius: 22px; font-size: 24px; }
        .control-button:active { transform: scale(0.9); background: rgba(245,239,227,0.3); }

        .life-counters {
          position: absolute;
          top: 12px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 12px;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .life-card.expanded .life-counters { top: 6px; }

        .life-counter-indicator {
          display: none;
          align-items: center;
          gap: 4px;
          opacity: 0.85;
        }

        .life-counter-indicator.visible { display: flex; }

        .life-counter-indicator svg {
          width: 12px;
          height: 12px;
        }

        .life-counter-indicator svg path {
          stroke: rgb(245,239,227);
          stroke-width: 2.8;
        }

        .life-counter-number {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: rgb(245,239,227);
          line-height: 1;
        }

        .opponents-panel {
          margin-top: 16px;
          border-radius: 22px;
          background: rgb(245,239,227);
          border: 1px solid rgb(184,168,138);
          box-shadow: 0 6px 16px rgba(26,20,13,0.08);
          overflow-y: auto;
          transition: all 0.3s ease;
        }

        .opponent-row {
          padding: 14px 20px;
          display: flex;
          align-items: flex-start;
          gap: 0;
          column-gap: 12px;
          border-bottom: 1px solid rgba(184,168,138,0.55);
          cursor: pointer;
          transition: all 0.5s ease;
          position: relative;
          flex-wrap: wrap;
        }

        .opponent-row:last-child { border-bottom: none; }

        .opponent-row.dimmed { opacity: 0.55; padding: 8px 20px; align-items: center; }
        .opponent-row.dimmed .opponent-name { font-size: 12px; margin-bottom: 0; }
        .opponent-row.dimmed .opponent-player { max-height: 0; overflow: hidden; margin: 0; opacity: 0; }
        .opponent-row.dimmed .expand-text { max-height: 0; overflow: hidden; margin: 0; opacity: 0; }
        .opponent-row.dimmed .life-chip { max-height: 0; max-width: 0; overflow: hidden; opacity: 0; padding: 0; border: none; }
        .opponent-row.dimmed .opponent-avatar { width: 28px; height: 28px; font-size: 12px; border-width: 2px; }

        .opponent-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgb(222,212,192);
          border: 2.5px solid;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .opponent-avatar.m { border-color: rgb(140,51,77); color: rgb(140,51,77); }
        .opponent-avatar.r { border-color: rgb(184,102,51); color: rgb(184,102,51); }
        .opponent-avatar.a { border-color: rgb(26,122,106); color: rgb(26,122,106); }

        .opponent-row.active-expanded { z-index: 10; }
        .opponent-row.active-expanded .opponent-avatar { width: 44px; height: 44px; border-width: 3px; font-size: 18px; }

        .opponent-info { flex: 1; min-width: 0; }

        .opponent-name {
          font-weight: 700; font-size: 15px;
          color: rgb(44,62,54);
          margin-bottom: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .opponent-name.korvold-color { color: rgb(168,74,58); }

        .opponent-player { font-weight: 500; font-size: 11px; color: rgb(90,110,98); margin-bottom: 4px; transition: all 0.5s ease; max-height: 20px; opacity: 1; }

        .expand-text { font-weight: 600; font-size: 8px; color: rgb(175,174,173); text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.5s ease; max-height: 20px; opacity: 1; }

        .life-chip {
          width: 38px; padding: 6px 0;
          border-radius: 8px; border: 1px solid;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          font-weight: 700; text-align: center; flex-shrink: 0;
          transition: all 0.5s ease;
        }

        .life-chip-heart { font-size: 11px; line-height: 1; }
        .life-chip-value { font-size: 17px; line-height: 1; }

        .life-chip.teal { border-color: rgb(26,122,106); color: rgb(26,122,106); }
        .life-chip.teal .life-chip-heart, .life-chip.teal .life-chip-value { color: rgb(26,122,106); }
        .life-chip.red { border-color: rgb(168,74,58); color: rgb(168,74,58); }
        .life-chip.red .life-chip-heart, .life-chip.red .life-chip-value { color: rgb(168,74,58); }

        .life-chip { position: relative; }
        .counter-badges {
          position: absolute;
          top: -10px;
          right: -6px;
          display: flex;
          flex-direction: row;
          gap: 2px;
          align-items: center;
        }

        .counter-pip {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          color: rgb(245,239,227);
          font-size: 8px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgb(245,239,227);
        }

        .counter-pip.poison { background: rgb(90,60,90); }
        .counter-pip.experience { background: rgb(184,146,46); }
        .counter-pip.energy { background: rgb(217,150,50); }

        .expand-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(26,20,13,0.45);
        }

        .expand-backdrop.active {
          display: block;
        }

        .opponents-panel.has-expanded {
          position: relative;
          z-index: 51;
          overflow-y: auto;
          flex-shrink: 1;
        }

        .app.has-expanded {
          overflow: visible;
        }

        .expanded-detail {
          width: 100%;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.55s ease, opacity 0.45s ease, padding 0.55s ease, margin 0.55s ease;
          padding: 0;
        }

        .opponent-row.active-expanded .expanded-detail {
          max-height: 600px;
          opacity: 1;
          padding: 12px 0 4px;
        }

        .commander-card {
          width: 100%;
          background: linear-gradient(135deg, rgb(241,231,211) 0%, rgb(229,216,194) 100%);
          border: 1.25px solid rgb(184,146,46);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .expand-aura-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .expand-aura-label {
          font-size: 12px;
          font-weight: 700;
          color: rgb(90,110,98);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .expand-aura-score {
          padding: 2px 10px;
          border-radius: 8px;
          border: 1.5px solid rgba(120,180,220,0.8);
          background: rgba(195,225,245,0.5);
          font-size: 13px;
          font-weight: 700;
          color: rgb(60,130,185);
        }

        .brewed-for-divider {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 0 6px;
        }

        .brewed-for-line {
          flex: 1;
          height: 1px;
          background: rgba(184,168,138,0.6);
        }

        .brewed-for-text {
          font-size: 10px;
          font-weight: 700;
          color: rgb(90,110,98);
          text-transform: uppercase;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .badges-row {
          display: flex;
          width: 100%;
          padding: 6px 0 4px;
          gap: 4px;
          justify-content: center;
          flex-wrap: nowrap;
        }

        .badge-circle-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
          max-width: 60px;
        }

        .badge-circle-wrap {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid rgb(184,168,138);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgb(245,239,227);
        }

        .badge-circle-wrap.earned {
          border-color: rgb(184,168,138);
        }

        .badge-circle-wrap.empty {
          border-color: rgba(184,168,138,0.35);
          opacity: 0.4;
        }

        .badge-circle-wrap svg {
          width: 20px;
          height: 20px;
        }

        .badge-count-pip {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgb(26,122,106);
          color: rgb(245,239,227);
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgb(245,239,227);
        }

        .badge-circle-label {
          font-size: 8px;
          font-weight: 600;
          color: rgb(90,110,98);
          text-align: center;
          line-height: 1.2;
        }

        .badge-circle-wrap.empty + .badge-circle-label {
          opacity: 0.4;
        }

        .commander-header {
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 100%);
          padding: 6px 14px; height: 32px;
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid rgba(184,146,46,0.75);
        }

        .commander-header-text { font-family: 'Jaldi', sans-serif; font-weight: 700; font-size: 14px; color: rgb(245,239,227); }

        .commander-mana { display: flex; gap: 4px; }

        .mana-pip {
          width: 18px; height: 18px; border-radius: 50%;
          border: 1px solid rgb(245,239,227);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 10px; color: rgb(245,239,227);
        }
        .mana-pip.u { background: rgb(92,143,209); }
        .mana-pip.b { background: rgb(51,51,56); }
        .mana-pip.r { background: rgb(217,102,77); }

        .commander-body { padding: 10px 14px; }
        .commander-type { font-weight: 600; font-size: 10px; color: rgb(44,62,54); margin-bottom: 6px; }
        .commander-divider { height: 1px; background: rgba(184,168,138,0.7); margin-bottom: 6px; }
        .commander-rules { font-size: 9px; color: rgb(44,62,54); line-height: 1.5; margin-bottom: 6px; white-space: pre-wrap; }
        .commander-flavor { font-size: 9px; color: rgb(90,110,98); font-style: italic; line-height: 1.3; margin-bottom: 8px; }
        .commander-pt {
          font-family: 'Jaldi', sans-serif; font-weight: 700; font-size: 12px;
          color: rgb(26,122,106);
          border: 1px solid rgb(184,146,46); border-radius: 4px;
          padding: 2px 8px; display: inline-block; float: right;
          background: rgb(245,239,227);
        }

        .bottom-nav {
          margin-top: auto;
          padding-top: 16px;
          margin-bottom: 16px;
          height: 84px;
          border-radius: 26px;
          border-top: 1px solid rgba(184,168,138,0.5);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          position: relative;
          z-index: 51;
        }

        .nav-item {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; cursor: pointer; flex: 1;
          transition: all 0.2s ease;
        }
        .nav-item:active { transform: scale(0.9); }

        .nav-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }

        .dice-icon {
          width: 24px; height: 24px;
          border: 1.75px solid rgb(26,122,106); border-radius: 4px;
          position: relative;
        }
        .dice-dot {
          width: 3px; height: 3px; background: rgb(26,122,106);
          position: absolute; border-radius: 50%;
        }
        .dice-dot:nth-child(1) { top: 3px; left: 3px; }
        .dice-dot:nth-child(2) { top: 3px; right: 3px; }
        .dice-dot:nth-child(3) { top: 9px; left: 9px; }
        .dice-dot:nth-child(4) { bottom: 3px; left: 3px; }
        .dice-dot:nth-child(5) { bottom: 3px; right: 3px; }

        .star-icon {
          width: 24px; height: 24px;
          border: 1.75px solid rgb(26,122,106); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .star {
          width: 12px; height: 12px;
          clipPath: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          background: rgb(26,122,106);
        }

        .nav-label { font-weight: 500; font-size: 12px; color: rgb(90,110,98); }

        .grid-view-button {
          flex: 1; height: 64px;
          background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
          border-radius: 18px; border: 1px solid rgb(56,158,133);
          box-shadow: 0 4px 12px rgba(26,120,105,0.45);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; cursor: pointer;
          color: rgb(245,239,227); font-weight: 700; font-size: 12px;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .grid-view-button:active { transform: scale(0.95); }

        .grid-icon { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
        .grid-square { width: 8px; height: 8px; background: rgb(245,239,227); border-radius: 2px; }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.55);
          display: none; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-overlay.active { display: flex; }

        .dice-modal {
          width: calc(100% - 40px); max-width: 335px;
          background: rgb(245,239,227);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 20px; padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          position: relative;
        }

        .modal-close {
          position: absolute; top: 16px; right: 16px;
          background: none; border: none;
          font-size: 20px; color: rgb(90,110,98); cursor: pointer;
        }
        .modal-close:active { transform: scale(0.9); }

        .modal-title { font-weight: 600; font-size: 16px; color: rgb(44,62,54); margin-bottom: 16px; text-align: center; }

        .tab-group { display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; }

        .tab {
          padding: 8px 16px; border: 1.3px solid rgb(184,168,138);
          background: rgb(222,212,192); color: rgb(44,62,54);
          font-weight: 600; font-size: 14px; cursor: pointer;
          border-radius: 999px; transition: all 0.2s ease;
        }
        .tab.active {
          background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
          color: rgb(245,239,227); border-color: transparent;
        }

        .result-display {
          font-family: 'Inter', sans-serif; font-weight: 700; font-size: 96px;
          color: rgb(26,122,106); text-align: center;
          margin-bottom: 8px; line-height: 1; min-height: 100px;
          display: flex; align-items: center; justify-content: center;
        }

        .rolling-text { font-size: 12px; color: rgb(90,110,98); text-align: center; margin-bottom: 20px; min-height: 16px; }

        .roll-button {
          width: 100%; padding: 12px;
          background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
          border: none; border-radius: 10px;
          color: rgb(245,239,227); font-weight: 600; font-size: 14px; cursor: pointer;
        }
        .roll-button:active { transform: scale(0.98); }

        .counters-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.55);
          display: none; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .counters-overlay.active { display: flex; }

        .counters-modal {
          width: calc(100% - 40px); max-width: 335px;
          background: rgb(245,239,227);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 20px; padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          position: relative;
        }

        .counters-content { padding: 0; }
        .counters-title { font-weight: 600; font-size: 16px; color: rgb(44,62,54); margin-bottom: 16px; text-align: center; }

        .counter-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px; background: rgb(222,212,192);
          border-radius: 12px; margin-bottom: 12px;
        }

        .counter-label { display: flex; align-items: center; gap: 12px; }
        .counter-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
        .counter-icon svg { width: 20px; height: 20px; }
        .counter-name { font-weight: 400; font-size: 14px; color: rgb(44,62,54); }

        .counter-controls { display: flex; align-items: center; gap: 10px; }
        .counter-btn {
          width: 28px; height: 32px; border-radius: 8px;
          border: 1.3px solid rgb(184,168,138);
          background: rgb(245,239,227);
          color: rgb(44,62,54); font-size: 18px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .counter-btn:active { transform: scale(0.9); }
        .counter-value { font-weight: 700; font-size: 24px; color: rgb(44,62,54); min-width: 28px; text-align: center; }

        .toast {
          position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(20px);
          background: rgb(44,62,54); color: rgb(245,239,227);
          padding: 10px 20px; border-radius: 8px;
          font-size: 13px; font-weight: 500;
          opacity: 0; pointer-events: none;
          transition: all 0.3s ease; z-index: 9999;
        }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

        .login-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .login-overlay.hidden {
          display: none;
        }

        .login-modal-wrap {
          width: 100%;
          max-width: 430px;
          position: relative;
        }

        .login-profile-btn {
          position: absolute;
          top: -40px;
          right: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgb(245,239,227);
          border: 1.5px solid rgb(184,168,138);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 100;
        }

        .login-modal {
          width: calc(100% - 48px);
          max-width: 382px;
          margin: 0 auto;
          background: rgb(245,239,227);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .login-title { font-weight: 700; font-size: 18px; color: rgb(44,62,54); margin-bottom: 16px; text-align: center; }

        .search-row {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .search-input {
          flex: 1;
          padding: 12px 14px;
          background: rgb(222,212,192);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 10px;
          font-size: 14px;
          color: rgb(90,110,98);
          font-family: 'Inter', sans-serif;
        }

        .search-confirm-btn {
          padding: 12px 20px;
          background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
          border: none;
          border-radius: 10px;
          color: rgb(245,239,227);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .search-confirm-btn:active { transform: scale(0.98); }

        .search-results {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 12px;
        }

        .search-loading,
        .search-empty {
          padding: 20px;
          text-align: center;
          color: rgb(90,110,98);
          font-size: 13px;
        }

        .search-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
        }

        .search-item:active { transform: scale(0.98); }
        .search-item.selected { background: rgba(26,122,106,0.1); border-color: rgb(26,122,106); }

        .search-item-art {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          background: rgb(222,212,192);
          flex-shrink: 0;
          overflow: hidden;
        }

        .search-item-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .search-item-info {
          flex: 1;
          min-width: 0;
        }

        .search-item-name {
          font-size: 14px;
          font-weight: 600;
          color: rgb(44,62,54);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-item-type {
          font-size: 10px;
          color: rgb(90,110,98);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-item-check {
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .search-item.selected .search-item-check {
          opacity: 1;
        }

        .decks-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .deck-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 6px;
          border-radius: 12px;
          border: 1.5px solid rgb(184,168,138);
          background: rgb(245,239,227);
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .deck-option:active { transform: scale(0.95); }

        .deck-option.selected {
          border-color: rgb(26,122,106);
          background: rgba(26,122,106,0.08);
        }

        .deck-option-art {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          background: rgb(222,212,192);
          border: 2px solid rgb(184,168,138);
          position: relative;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .deck-option.selected .deck-option-art {
          border-color: rgb(26,122,106);
          box-shadow: 0 0 0 2px rgb(26,122,106);
        }

        .deck-option-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .deck-option-check {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(26,122,106,0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          color: rgb(245,239,227);
          font-weight: 700;
        }

        .deck-option.selected .deck-option-check {
          opacity: 1;
        }

        .deck-option-name {
          font-size: 10px;
          font-weight: 600;
          color: rgb(44,62,54);
          text-align: center;
          line-height: 1.3;
          width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .search-new-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px dashed rgb(184,168,138);
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: rgb(90,110,98);
          transition: all 0.2s ease;
          margin-bottom: 12px;
          width: 100%;
        }

        .search-new-btn:active {
          background: rgba(26,122,106,0.05);
          border-color: rgb(26,122,106);
          color: rgb(26,122,106);
        }

        .login-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgb(184,168,138), transparent);
          margin: 12px 0;
        }

        .login-alt {
          display: inline;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: rgb(26,122,106);
          text-decoration: underline;
          text-underline-offset: 3px;
          background: none;
          border: none;
          padding: 0;
          text-align: center;
          width: 100%;
        }

        .login-alt:active {
          opacity: 0.7;
        }

        .sso-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: none;
          align-items: flex-end;
          justify-content: center;
          z-index: 3000;
        }

        .sso-overlay.active { display: flex; }

        .sso-card {
          width: 100%;
          max-width: 430px;
          background: rgb(245,239,227);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 20px 20px 0 0;
          border-bottom: none;
          padding: 20px 24px 28px;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
          animation: ssoSlideUp 0.3s ease;
          max-height: 85%;
          overflow-y: auto;
        }

        @keyframes ssoSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .sso-close-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }

        .sso-close {
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

        .sso-close:active { transform: scale(0.9); }

        .sso-header {
          text-align: center;
          margin-bottom: 16px;
        }

        .sso-logo-mini {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          border: 1.5px solid rgb(56,158,133);
          box-shadow: 0 4px 12px rgba(26,120,105,0.35);
        }

        .sso-logo-mini span {
          font-family: 'Jaldi', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: rgb(245,239,227);
          line-height: 1;
        }

        .sso-title {
          font-size: 20px;
          font-weight: 700;
          color: rgb(44,62,54);
        }

        .sso-subtitle {
          color: rgb(90,110,98);
          font-size: 13px;
          margin-top: 4px;
        }

        .sso-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sso-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sso-btn:active { transform: scale(0.97); }

        .sso-google {
          background: rgb(245,239,227);
          color: rgb(44,62,54);
          border: 1px solid rgb(184,168,138);
          box-shadow: 0 6px 16px rgba(26,20,13,0.08);
        }

        .sso-apple {
          background: rgb(44,62,54);
          color: rgb(245,239,227);
          border: 1px solid rgb(44,62,54);
        }

        .sso-icon {
          font-size: 16px;
          font-weight: 700;
          width: 20px;
          text-align: center;
        }

        .sso-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }

        .sso-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(184,168,138,0.55);
        }

        .sso-divider-text {
          color: rgb(138,154,142);
          font-size: 12px;
        }

        .sso-btn-primary {
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

        .sso-btn-primary:active { transform: scale(0.97); }

        .sso-footer {
          text-align: center;
          margin-top: 4px;
        }

        .sso-footer-text {
          color: rgb(90,110,98);
          font-size: 13px;
        }

        .sso-footer-link {
          color: rgb(26,122,106);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .sso-view { display: none; }
        .sso-view.active { display: flex; flex-direction: column; gap: 12px; }
      `}} />

      <div className={`app ${expandedOpponent ? 'has-expanded' : ''}`}>

        {/* Login Overlay */}
        {loginOverlayOpen && (
          <div className="login-overlay">
            <div className="login-modal-wrap">
              <a href="/profile" style={{ textDecoration: 'none' }}>
                <div className="login-profile-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(90,110,98)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </a>

              <div className="login-modal">
                <div className="login-title">Choose your Commander</div>

                {!isLoggedIn ? (
                  <div>
                    <div className="search-row" style={{ marginTop: '16px' }}>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Commander name..."
                        value={searchText}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoComplete="off"
                      />
                      <button className="search-confirm-btn" onClick={handleConfirmCommander}>Confirm</button>
                    </div>
                    <div className="search-results">
                      {searchResults.length > 0 ? (
                        searchResults.map((card: any, idx: any) => (
                          <div
                            key={idx}
                            className={`search-item ${selectedCard?.name === card.name ? 'selected' : ''}`}
                            onClick={() => handleSelectCard(card)}
                          >
                            <div className="search-item-art" />
                            <div className="search-item-info">
                              <div className="search-item-name">{card.name}</div>
                              <div className="search-item-type">{card.type}</div>
                            </div>
                            <div className="search-item-check">✓</div>
                          </div>
                        ))
                      ) : searchText && (
                        <div className="search-empty">No commanders found</div>
                      )}
                    </div>
                    <div className="login-divider" />
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                      <span
                        className="login-alt"
                        onClick={() => setShowSSO(true)}
                      >
                        Log in
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="decks-grid" style={{ marginTop: '16px' }}>
                      {myDecks.map((deck: any, idx: any) => (
                        <div
                          key={idx}
                          className={`deck-option ${selectedDeck === idx ? 'selected' : ''}`}
                          onClick={() => setSelectedDeck(idx)}
                        >
                          <div className="deck-option-art">
                            <div className="deck-option-check">✓</div>
                          </div>
                          <div className="deck-option-name">{deck.name}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="search-new-btn"
                      onClick={() => setShowSearchMode(!showSearchMode)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Search new commander
                    </button>
                    {showSearchMode && (
                      <div>
                        <div className="search-row">
                          <input
                            type="text"
                            className="search-input"
                            placeholder="Commander name..."
                            onChange={(e) => handleSearch(e.target.value)}
                            autoComplete="off"
                          />
                          <button className="search-confirm-btn">Confirm</button>
                        </div>
                        <div className="search-results">
                          {searchResults.length > 0 ? (
                            searchResults.map((card: any, idx: any) => (
                              <div
                                key={idx}
                                className={`search-item ${selectedCard?.name === card.name ? 'selected' : ''}`}
                                onClick={() => handleSelectCard(card)}
                              >
                                <div className="search-item-art" />
                                <div className="search-item-info">
                                  <div className="search-item-name">{card.name}</div>
                                  <div className="search-item-type">{card.type}</div>
                                </div>
                              </div>
                            ))
                          ) : null}
                        </div>
                      </div>
                    )}
                    <button
                      className={`search-confirm-btn enabled`}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        opacity: selectedDeck !== null ? 1 : 0.35,
                        pointerEvents: selectedDeck !== null ? 'auto' : 'none'
                      }}
                      onClick={handleConfirmDeck}
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SSO Modal */}
        {showSSO && (
          <div className={`sso-overlay ${showSSO ? 'active' : ''}`} onClick={() => setShowSSO(false)}>
            <div className="sso-card" onClick={(e) => e.stopPropagation()}>
              <div className="sso-close-row">
                <button className="sso-close" onClick={() => setShowSSO(false)}>×</button>
              </div>

              <div className={`sso-view ${ssoView === 'ssoViewSignin' ? 'active' : ''}`}>
                <div className="sso-header">
                  <div className="sso-logo-mini"><span>P</span></div>
                  <div className="sso-title">Welcome back</div>
                  <div className="sso-subtitle">Sign in to your account</div>
                </div>
                <div className="sso-content">
                  <button className="sso-btn sso-google" onClick={handleSSOComplete}>
                    <span className="sso-icon">G</span>
                    Continue with Google
                  </button>
                  <button className="sso-btn sso-apple" onClick={handleSSOComplete}>
                    <span className="sso-icon">🍎</span>
                    Continue with Apple
                  </button>
                  <div className="sso-divider">
                    <div className="sso-divider-line" />
                    <div className="sso-divider-text">or</div>
                    <div className="sso-divider-line" />
                  </div>
                  <button className="sso-btn-primary" onClick={() => setSsoView('ssoViewSignin')}>
                    Sign in with Email
                  </button>
                  <div className="sso-footer">
                    <span className="sso-footer-text">
                      No account?{' '}
                      <span
                        className="sso-footer-link"
                        onClick={() => setSsoView('ssoViewSignup')}
                      >
                        Sign Up
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className={`sso-view ${ssoView === 'ssoViewSignup' ? 'active' : ''}`}>
                <div className="sso-header">
                  <div className="sso-logo-mini"><span>P</span></div>
                  <div className="sso-title">Create Account</div>
                  <div className="sso-subtitle">Join PodHub today</div>
                </div>
                <div className="sso-content">
                  <button className="sso-btn sso-google" onClick={handleSSOComplete}>
                    <span className="sso-icon">G</span>
                    Continue with Google
                  </button>
                  <button className="sso-btn sso-apple" onClick={handleSSOComplete}>
                    <span className="sso-icon">🍎</span>
                    Continue with Apple
                  </button>
                  <div className="sso-divider">
                    <div className="sso-divider-line" />
                    <div className="sso-divider-text">or</div>
                    <div className="sso-divider-line" />
                  </div>
                  <button className="sso-btn-primary" onClick={handleSSOComplete}>
                    Create Account
                  </button>
                  <div className="sso-footer">
                    <span className="sso-footer-text">
                      Already have an account?{' '}
                      <span
                        className="sso-footer-link"
                        onClick={() => setSsoView('ssoViewSignin')}
                      >
                        Log In
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Life Card */}
        <div className={`life-card ${isLifeExpanded ? 'expanded' : 'collapsed'} ${life === 0 ? 'dead' : life < 10 ? 'critical' : ''}`}>
          <div className="life-counters">
            {poison > 0 && (
              <div className="life-counter-indicator visible">
                <svg viewBox="0 0 23 23" fill="none">
                  <path d="M11.3 15.8455C16.8228 15.8455 21.3 12.5894 21.3 8.57278C21.3 4.55616 16.8228 1.30005 11.3 1.30005C5.77714 1.30005 1.29999 4.55616 1.29999 8.57278C1.29999 12.5894 5.77714 15.8455 11.3 15.8455Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.55 6.755L3.8 3.118M15.05 6.755L18.8 3.118M11.3 15.845V21.3M6.3 19.482H16.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="life-counter-number">{poison}</span>
              </div>
            )}
            {experience > 0 && (
              <div className="life-counter-indicator visible">
                <svg viewBox="0 0 23 23" fill="none">
                  <path d="M1.3 21.3L2.967 5.744L7.133 12.411L11.3 1.3L15.467 12.411L19.633 5.744L21.3 21.3H1.3Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1.3 21.3H21.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="life-counter-number">{experience}</span>
              </div>
            )}
            {energy > 0 && (
              <div className="life-counter-indicator visible">
                <svg viewBox="0 0 23 23" fill="none">
                  <path d="M13.8 1.3L1.3 12.729H11.3L8.8 21.3L21.3 9.871H11.3L13.8 1.3Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="life-counter-number">{energy}</span>
              </div>
            )}
          </div>
          <div className="life-number">{life}</div>
          {life > 0 ? (
            <div className="life-controls">
              <button className="control-button" onClick={() => adjustLife(-1)} onMouseDown={() => startLongPress(-1)} onMouseUp={stopLongPress} onMouseLeave={stopLongPress} onTouchStart={() => startLongPress(-1)} onTouchEnd={stopLongPress}>−</button>
              <button className="control-button" onClick={() => adjustLife(1)} onMouseDown={() => startLongPress(1)} onMouseUp={stopLongPress} onMouseLeave={stopLongPress} onTouchStart={() => startLongPress(1)} onTouchEnd={stopLongPress}>+</button>
            </div>
          ) : (
            <div className="life-controls" style={{ justifyContent: 'center' }}>
              <button className="revive-btn" onClick={handleRevive}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" />
                  <path d="M12 8V16M8 12H16" />
                </svg>
                Revive
              </button>
            </div>
          )}
        </div>

        {/* Review Game Button — only visible when dead */}
        {life === 0 && (
          <a href="/game-review" className="review-game-btn">
            <div className="review-game-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(26,122,106)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8M16 17H8M10 9H8" />
              </svg>
            </div>
            <span className="review-game-text">Review Game</span>
            <span className="review-game-arrow">&#8250;</span>
          </a>
        )}

        {/* Opponents Panel */}
        <div className={`opponents-panel ${expandedOpponent ? 'has-expanded' : ''}`}>
          {opponents.map((opp: any) => (
            <div
              key={opp.key}
              className={`opponent-row ${expandedOpponent === opp.key ? 'active-expanded' : ''} ${expandedOpponent && expandedOpponent !== opp.key ? 'dimmed' : ''}`}
              onClick={() => expandedOpponent === opp.key ? collapseOpponent() : expandOpponent(opp.key)}
            >
              <div className={`opponent-avatar ${opp.color}`}>{opp.color.toUpperCase()}</div>
              <div className="opponent-info">
                <div className={`opponent-name ${opp.name.includes('Korvold') ? 'korvold-color' : ''}`}>
                  {opp.name}
                </div>
                <div className="opponent-player">{opp.player}</div>
                <div className="expand-text">▼  TAP TO EXPAND</div>
              </div>
              <div className={`life-chip ${opp.lifeColor}`}>
                <div className="life-chip-heart">♥</div>
                <div className="life-chip-value">{opp.life}</div>
                {opp.poison && (
                  <div className="counter-badges">
                    <div className="counter-pip poison">{opp.poison}</div>
                  </div>
                )}
              </div>

              <div className="expanded-detail">
                {/* AURA Score */}
                <div className="expand-aura-row">
                  <span className="expand-aura-label">AURA</span>
                  <span className="expand-aura-score">{opp.aura}</span>
                </div>

                {/* Commander Card */}
                <div className="commander-card">
                  <div className="commander-header">
                    <div className="commander-header-text">{opp.name.toUpperCase()}</div>
                    <div className="commander-mana">
                      {opp.key === 'kess' && (
                        <>
                          <div className="mana-pip u">U</div>
                          <div className="mana-pip b">B</div>
                          <div className="mana-pip r">R</div>
                        </>
                      )}
                      {opp.key === 'korvold' && (
                        <>
                          <div className="mana-pip b">B</div>
                          <div className="mana-pip r">R</div>
                          <div className="mana-pip u" style={{ background: 'rgb(155,211,174)' }}>G</div>
                        </>
                      )}
                      {opp.key === 'ghave' && (
                        <>
                          <div className="mana-pip u" style={{ background: 'rgb(255,251,213)' }}>W</div>
                          <div className="mana-pip b">B</div>
                          <div className="mana-pip u" style={{ background: 'rgb(155,211,174)' }}>G</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="commander-body">
                    <div className="commander-type">
                      {opp.key === 'kess' && 'Legendary Creature — Human Wizard'}
                      {opp.key === 'korvold' && 'Legendary Creature — Dragon Noble'}
                      {opp.key === 'ghave' && 'Legendary Creature — Fungus Shaman'}
                    </div>
                    <div className="commander-divider" />
                    <div className="commander-rules">
                      {opp.key === 'kess' && 'Flying.\nAt the beginning of each opponent\'s end step, if you didn\'t cast a creature spell this turn, you may cast target instant or sorcery from that player\'s graveyard.'}
                      {opp.key === 'korvold' && 'Flying\nWhenever Korvold, Fae-Cursed King enters the battlefield or attacks, sacrifice another permanent.\nWhenever you sacrifice a permanent, put a +1/+1 counter on Korvold and draw a card.'}
                      {opp.key === 'ghave' && 'Ghave enters with five +1/+1 counters.\n{1}, Remove a +1/+1 counter from a creature you control: Create a 1/1 green Saproling creature token.\n{1}, Sacrifice a creature: Put a +1/+1 counter on target creature.'}
                    </div>
                    <div className="commander-flavor">
                      {opp.key === 'kess' && '"Knowledge outlives even its keeper."'}
                      {opp.key === 'korvold' && '"All that remains is mine."'}
                      {opp.key === 'ghave' && '"From death, life. From life, death."'}
                    </div>
                    <div className="commander-pt">
                      {opp.key === 'kess' && '3 / 2'}
                      {opp.key === 'korvold' && '4 / 4'}
                      {opp.key === 'ghave' && '0 / 0'}
                    </div>
                  </div>
                </div>

                {/* Brewed For Divider */}
                <div className="brewed-for-divider">
                  <div className="brewed-for-line" />
                  <span className="brewed-for-text">Brewed For</span>
                  <div className="brewed-for-line" />
                </div>

                {/* Badges Row */}
                <div className="badges-row">
                  {/* Brilliance */}
                  <div className="badge-circle-item">
                    <div className={`badge-circle-wrap ${opp.badges.brilliance > 0 ? 'earned' : 'empty'}`}>
                      <svg viewBox="0 0 32 32" fill="none" stroke="rgb(184,146,46)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 3 L18.5 11 L27 12 L21 18 L23 27 L16 22.5 L9 27 L11 18 L5 12 L13.5 11 Z" />
                      </svg>
                      {opp.badges.brilliance > 0 && <div className="badge-count-pip">{opp.badges.brilliance}</div>}
                    </div>
                    <div className="badge-circle-label">Brilliance</div>
                  </div>
                  {/* Flavor */}
                  <div className="badge-circle-item">
                    <div className={`badge-circle-wrap ${opp.badges.flavor > 0 ? 'earned' : 'empty'}`}>
                      <svg viewBox="0 0 32 32" fill="none" stroke="rgb(168,74,58)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 28 C10 28 6 23 6 17 C6 11 10 5 16 3 C16 9 19 13 23 14 C23 14 27 10 27 17 C27 23 22 28 16 28 Z" />
                      </svg>
                      {opp.badges.flavor > 0 && <div className="badge-count-pip">{opp.badges.flavor}</div>}
                    </div>
                    <div className="badge-circle-label">Flavor</div>
                  </div>
                  {/* Rivalry */}
                  <div className="badge-circle-item">
                    <div className={`badge-circle-wrap ${opp.badges.rivalry > 0 ? 'earned' : 'empty'}`}>
                      <svg viewBox="0 0 32 32" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 26 L22 10 M22 10 L22 16 M22 10 L28 10" />
                        <path d="M26 26 L10 10 M10 10 L10 16 M10 10 L4 10" />
                        <circle cx="16" cy="18" r="3" strokeWidth="1.4" />
                      </svg>
                      {opp.badges.rivalry > 0 && <div className="badge-count-pip">{opp.badges.rivalry}</div>}
                    </div>
                    <div className="badge-circle-label">Rivalry</div>
                  </div>
                  {/* Allegiance */}
                  <div className="badge-circle-item">
                    <div className={`badge-circle-wrap ${opp.badges.allegiance > 0 ? 'earned' : 'empty'}`}>
                      <svg viewBox="0 0 32 32" fill="none" stroke="rgb(26,122,106)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 3 L28 8 V17 C28 23 22 28 16 30 C10 28 4 23 4 17 V8 Z" />
                        <path d="M12 16 L15 19 L21 13" strokeWidth="2" />
                      </svg>
                      {opp.badges.allegiance > 0 && <div className="badge-count-pip">{opp.badges.allegiance}</div>}
                    </div>
                    <div className="badge-circle-label">Allegiance</div>
                  </div>
                  {/* Fun */}
                  <div className="badge-circle-item">
                    <div className={`badge-circle-wrap ${opp.badges.fun > 0 ? 'earned' : 'empty'}`}>
                      <svg viewBox="0 0 32 32" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.8" strokeLinecap="round">
                        <circle cx="16" cy="16" r="12" />
                        <circle cx="12" cy="13" r="1.5" fill="rgb(44,62,54)" />
                        <circle cx="20" cy="13" r="1.5" fill="rgb(44,62,54)" />
                        <path d="M11 20 C12.5 23 19.5 23 21 20" strokeWidth="1.5" />
                      </svg>
                      {opp.badges.fun > 0 && <div className="badge-count-pip">{opp.badges.fun}</div>}
                    </div>
                    <div className="badge-circle-label">Fun</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dark Backdrop */}
        <div className={`expand-backdrop ${expandedOpponent ? 'active' : ''}`} onClick={collapseOpponent} />

        {/* Bottom Nav */}
        <div className="bottom-nav">
          <div className="nav-item" onClick={() => setDiceModalOpen(true)}>
            <div className="nav-icon">
              <div className="dice-icon">
                <div className="dice-dot" />
                <div className="dice-dot" />
                <div className="dice-dot" />
                <div className="dice-dot" />
                <div className="dice-dot" />
              </div>
            </div>
            <div className="nav-label">Dice</div>
          </div>
          <div className="nav-item" onClick={() => setCountersModalOpen(true)}>
            <div className="nav-icon">
              <div className="star-icon"><div className="star" /></div>
            </div>
            <div className="nav-label">Counters</div>
          </div>
          <a href="/gridview-4p" className="grid-view-button" style={{ textDecoration: 'none' }}>
            <div className="grid-icon">
              <div className="grid-square" />
              <div className="grid-square" />
              <div className="grid-square" />
              <div className="grid-square" />
            </div>
            <span style={{ fontSize: '11px' }}>Grid</span>
          </a>
        </div>
      </div>

      {/* Dice Modal */}
      <div className={`modal-overlay ${diceModalOpen ? 'active' : ''}`} onClick={() => setDiceModalOpen(false)}>
        <div className="dice-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setDiceModalOpen(false)}>×</button>
          <div className="modal-title">Roll Dice</div>
          <div className="tab-group">
            {['d20', 'd10', 'd6'].map((tab) => (
              <button
                key={tab}
                className={`tab ${diceTab === tab ? 'active' : ''}`}
                onClick={() => setDiceTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="result-display">
            {isRolling ? '...' : diceResult !== null ? diceResult : ''}
          </div>
          <div className="rolling-text">
            {isRolling ? 'Rolling...' : ''}
          </div>
          <button className="roll-button" onClick={rollDice} disabled={isRolling}>
            Roll
          </button>
        </div>
      </div>

      {/* Counters Modal */}
      <div className={`counters-overlay ${countersModalOpen ? 'active' : ''}`} onClick={() => setCountersModalOpen(false)}>
        <div className="counters-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setCountersModalOpen(false)}>×</button>
          <div className="counters-title">Counters</div>
          <div className="counters-content">
            <div className="counter-row">
              <div className="counter-label">
                <div className="counter-icon">
                  <svg viewBox="0 0 23 23" fill="none">
                    <path d="M11.3 15.8455C16.8228 15.8455 21.3 12.5894 21.3 8.57278C21.3 4.55616 16.8228 1.30005 11.3 1.30005C5.77714 1.30005 1.29999 4.55616 1.29999 8.57278C1.29999 12.5894 5.77714 15.8455 11.3 15.8455Z" stroke="rgb(44,62,54)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.54999 6.75453L3.79999 3.11816M15.05 6.75453L18.8 3.11816M11.3 15.8454V21.3M6.29999 19.4818H16.3" stroke="rgb(44,62,54)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="counter-name">Poison</div>
              </div>
              <div className="counter-controls">
                <button className="counter-btn" onClick={() => setPoison(Math.max(0, poison - 1))}>−</button>
                <div className="counter-value">{poison}</div>
                <button className="counter-btn" onClick={() => setPoison(poison + 1)}>+</button>
              </div>
            </div>

            <div className="counter-row">
              <div className="counter-label">
                <div className="counter-icon">
                  <svg viewBox="0 0 23 23" fill="none">
                    <path d="M1.3 21.3L2.967 5.744L7.133 12.411L11.3 1.3L15.467 12.411L19.633 5.744L21.3 21.3H1.3Z" stroke="rgb(44,62,54)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1.3 21.3H21.3" stroke="rgb(44,62,54)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="counter-name">Experience</div>
              </div>
              <div className="counter-controls">
                <button className="counter-btn" onClick={() => setExperience(Math.max(0, experience - 1))}>−</button>
                <div className="counter-value">{experience}</div>
                <button className="counter-btn" onClick={() => setExperience(experience + 1)}>+</button>
              </div>
            </div>

            <div className="counter-row">
              <div className="counter-label">
                <div className="counter-icon">
                  <svg viewBox="0 0 23 23" fill="none">
                    <path d="M13.8 1.3L1.3 12.729H11.3L8.8 21.3L21.3 9.871H11.3L13.8 1.3Z" stroke="rgb(44,62,54)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="counter-name">Energy</div>
              </div>
              <div className="counter-controls">
                <button className="counter-btn" onClick={() => setEnergy(Math.max(0, energy - 1))}>−</button>
                <div className="counter-value">{energy}</div>
                <button className="counter-btn" onClick={() => setEnergy(energy + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </>
  );
}
