'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { getUserCommanderSummaries, type CommanderSummary } from '@/lib/commander-profile';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountViewOpen, setAccountViewOpen] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [commanders, setCommanders] = useState<CommanderSummary[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const { signOut, user, loading: authLoading } = useAuth();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoadingDecks(false); return; }
      setNameInputValue(authUser.user_metadata?.display_name ?? authUser.email?.split('@')[0] ?? '');
      setUserEmail(authUser.email ?? '');
      try {
        const summaries = await getUserCommanderSummaries(authUser.id);
        setCommanders(summaries);
      } catch {}
      setLoadingDecks(false);
    }
    load();
  }, []);

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setTimeout(() => {
      setAccountViewOpen(false);
    }, 300);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
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

        /* ── Top Bar ── */
        .top-bar {
          display: flex;
          justify-content: flex-end;
          padding: 12px 0 0;
          flex-shrink: 0;
        }

        .settings-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          transition: all 0.2s ease;
        }

        .settings-btn:active {
          transform: scale(0.9);
        }

        .settings-btn svg {
          width: 20px;
          height: 20px;
        }

        /* ── Scrollable Content ── */
        .profile-content {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ── Avatar + Name ── */
        .profile-header {
          text-align: center;
          padding: 16px 0 16px;
        }

        .avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          border: 1.5px solid rgb(56,158,133);
          box-shadow: 0 4px 12px rgba(26,120,105,0.35);
        }

        .avatar-letter {
          font-size: 32px;
          font-weight: 700;
          color: rgb(245,239,227);
        }

        .profile-name {
          font-size: 20px;
          font-weight: 700;
          color: rgb(44,62,54);
        }

        .profile-points {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 4px;
        }

        .points-icon {
          color: rgb(184,146,46);
          font-size: 12px;
        }

        .points-value {
          color: rgb(90,110,98);
          font-size: 13px;
          font-weight: 600;
        }

        /* ── Create / Join Pod Buttons ── */
        .pod-actions {
          padding: 0 0 16px;
          display: flex;
          gap: 10px;
        }

        .pod-btn {
          flex: 1;
          padding: 18px 10px;
          cursor: pointer;
          text-align: center;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          aspect-ratio: 1.4;
          justify-content: center;
          border: none;
          font-family: inherit;
        }

        .pod-btn:active {
          transform: scale(0.9);
        }

        .pod-btn-create {
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          border: 1.5px solid rgb(56,158,133);
          box-shadow: 0 4px 12px rgba(26,120,105,0.35);
        }

        .pod-btn-join {
          background: rgb(245,239,227);
          border: 1.5px solid rgb(184,168,138);
          box-shadow: 0 6px 16px rgba(26,20,13,0.08);
        }

        .pod-btn-label {
          font-size: 14px;
          font-weight: 600;
          color: rgb(245,239,227);
        }

        .pod-btn-join .pod-btn-label {
          color: rgb(44,62,54);
        }

        .pod-btn svg {
          width: 18px;
          height: 18px;
        }

        /* ── Section Cards ── */
        .section-card {
          margin-bottom: 16px;
          padding: 16px;
          background: rgb(245,239,227);
          border-radius: 22px;
          border: 1px solid rgb(184,168,138);
          box-shadow: 0 6px 16px rgba(26,20,13,0.08);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: rgb(44,62,54);
          flex-shrink: 0;
        }

        .section-divider {
          flex: 1;
          height: 1px;
          background: rgba(184,168,138,0.55);
        }

        .section-link {
          font-size: 11px;
          color: rgb(26,122,106);
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* ── Stats Grid ── */
        .stats-grid {
          display: flex;
          gap: 8px;
        }

        .stat-cell {
          flex: 1;
          padding: 10px 4px;
          background: rgb(222,212,192);
          border-radius: 12px;
          text-align: center;
        }

        .stat-value-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .stat-icon {
          font-size: 11px;
        }

        .stat-value {
          color: rgb(44,62,54);
          font-size: 18px;
          font-weight: 700;
        }

        .stat-label {
          color: rgb(90,110,98);
          font-size: 9px;
          margin-top: 3px;
          font-weight: 500;
        }

        /* ── Most Rated Decks (vertical list) ── */
        .rated-deck-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rated-deck-row {
          display: flex;
          align-items: center;
          gap: 0;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(184,168,138,0.6);
          background: rgb(222,212,192);
        }

        .rated-deck-img {
          position: relative;
          width: 64px;
          height: 54px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgb(200,190,170);
        }

        .rated-deck-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .rated-deck-img-fade {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 40%, rgba(222,212,192,0.85) 100%);
        }

        .rated-deck-info {
          flex: 1;
          min-width: 0;
          padding: 8px 12px;
        }

        .rated-deck-name {
          color: rgb(44,62,54);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0 0 8px rgba(245,239,227,0.5);
        }

        .rated-deck-aura {
          color: rgb(60,130,185);
          font-size: 11px;
          font-weight: 600;
          margin-top: 2px;
        }

        .aura-value {
          font-weight: 700;
          font-size: 12px;
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

        /* ── Settings Modal ── */
        .settings-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .settings-overlay.active {
          display: flex;
        }

        .settings-card {
          width: calc(100% - 40px);
          max-width: 335px;
          background: rgb(245,239,227);
          border: 1.3px solid rgb(184,168,138);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          position: relative;
        }

        .settings-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 20px;
          color: rgb(90,110,98);
          cursor: pointer;
          line-height: 1;
        }

        .settings-close:active {
          transform: scale(0.9);
        }

        .settings-title {
          font-size: 16px;
          font-weight: 600;
          color: rgb(44,62,54);
          margin-bottom: 18px;
        }

        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .settings-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(184,168,138,0.4);
          cursor: pointer;
          transition: all 0.2s ease;
          background: none;
          border: none;
          font-family: inherit;
          padding: 14px 0;
          width: 100%;
          text-align: left;
        }

        .settings-item:last-child {
          border-bottom: none;
        }

        .settings-item:active {
          transform: scale(0.98);
        }

        .settings-item-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .settings-item-icon svg {
          width: 18px;
          height: 18px;
        }

        .settings-item-text {
          flex: 1;
        }

        .settings-item-label {
          font-size: 14px;
          font-weight: 600;
          color: rgb(44,62,54);
        }

        .settings-item-desc {
          font-size: 11px;
          color: rgb(90,110,98);
          margin-top: 1px;
        }

        .settings-item-chevron {
          color: rgb(26,122,106);
          font-size: 16px;
          font-weight: 600;
        }

        .settings-item.danger .settings-item-label {
          color: rgb(168,74,58);
        }

        .settings-item.danger .settings-item-icon svg {
          stroke: rgb(168,74,58);
        }

        /* ── Account View (inside settings modal) ── */
        .account-view {
          display: none;
        }

        .account-view.active {
          display: block;
        }

        .settings-main.hidden {
          display: none;
        }

        .account-back {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: rgb(90,110,98);
          cursor: pointer;
          margin-bottom: 16px;
          padding: 0;
        }

        .account-back:active {
          transform: scale(0.95);
        }

        .account-avatar-edit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .account-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgb(56,158,133);
          position: relative;
          cursor: pointer;
        }

        .account-avatar-letter {
          font-size: 32px;
          font-weight: 700;
          color: rgb(245,239,227);
        }

        .account-avatar-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgb(245,239,227);
          border: 1.5px solid rgb(184,168,138);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .account-avatar-badge svg {
          width: 12px;
          height: 12px;
        }

        .account-change-photo {
          font-size: 12px;
          font-weight: 600;
          color: rgb(26,122,106);
          cursor: pointer;
        }

        .account-field {
          margin-bottom: 14px;
        }

        .account-field-label {
          font-size: 11px;
          font-weight: 600;
          color: rgb(90,110,98);
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .account-field-input {
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
        }

        .account-field-input:focus {
          border-color: rgb(56,158,133);
        }

        .account-save-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
          border: 1.5px solid rgb(56,158,133);
          border-radius: 12px;
          color: rgb(245,239,227);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 6px;
          transition: all 0.2s ease;
        }

        .account-save-btn:active {
          transform: scale(0.98);
        }

        .account-delete {
          text-align: center;
          margin-top: 16px;
          font-size: 12px;
          font-weight: 600;
          color: rgb(168,74,58);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .account-delete:active {
          transform: scale(0.95);
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
      ` }} />

      <div className="app">
        {/* Settings */}
        <div className="top-bar">
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="rgb(90,110,98)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.3 2h3.4l.5 2.2a6 6 0 0 1 1.5.9l2.1-.7 1.7 3-1.6 1.5a6 6 0 0 1 0 1.8l1.6 1.5-1.7 3-2.1-.7a6 6 0 0 1-1.5.9L11.7 18H8.3l-.5-2.2a6 6 0 0 1-1.5-.9l-2.1.7-1.7-3 1.6-1.5a6 6 0 0 1 0-1.8L2.5 7.8l1.7-3 2.1.7a6 6 0 0 1 1.5-.9L8.3 2Z"/>
              <circle cx="10" cy="10" r="2.5"/>
            </svg>
          </button>
        </div>

        <div className="profile-content">

          {/* Avatar + Name */}
          <div className="profile-header">
            <div className="avatar">
              <span className="avatar-letter">{(nameInputValue || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="profile-name">{nameInputValue || 'Player'}</div>
          </div>

          {/* Create / Join Pod */}
          <div className="pod-actions">
            <Link href="/create" className="pod-btn pod-btn-create" style={{ textDecoration: 'none' }}>
              <svg viewBox="0 0 18 18" fill="none" stroke="rgb(245,239,227)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 2L9 16M2 9L16 9"/>
              </svg>
              <span className="pod-btn-label">Create a Pod</span>
            </Link>
            <Link href="/join" className="pod-btn pod-btn-join" style={{ textDecoration: 'none' }}>
              <svg viewBox="0 0 18 18" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="2" width="14" height="14" rx="2"/>
                <path d="M6 9L9 12L12 6"/>
              </svg>
              <span className="pod-btn-label">Join a Pod</span>
            </Link>
          </div>

          {/* Most Rated Decks */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Your Decks</span>
              <div className="section-divider"></div>
              <Link href="/decks" className="section-link" style={{ textDecoration: 'none' }}>View all ›</Link>
            </div>
            <div className="rated-deck-list">
              {loadingDecks ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'rgb(90,110,98)', fontSize: 13 }}>Loading decks...</div>
              ) : commanders.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'rgb(90,110,98)', fontSize: 13 }}>No commanders registered yet</div>
              ) : (
                commanders.map((c: any) => (
                  <Link key={c.deckId} href={`/deck-accomplishments?deckId=${c.deckId}`} className="rated-deck-row" style={{ textDecoration: 'none' }}>
                    <div className="rated-deck-img">
                      {c.commanderArtUrl ? (
                        <img src={c.commanderArtUrl} alt={c.commanderName} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(222,212,192)', fontSize: 18, color: 'rgb(44,62,54)' }}>{c.commanderName.charAt(0)}</div>
                      )}
                      <div className="rated-deck-img-fade"></div>
                    </div>
                    <div className="rated-deck-info">
                      <div className="rated-deck-name">{c.commanderName}</div>
                      <div className="rated-deck-aura"><span className="aura-value">{Math.round(c.auraScore)}</span> {c.tier}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Bottom Nav: Recent Games | Profile (active) | Decks */}
        <div className="bottom-nav">
          <Link href="/recent-games" className="nav-item" style={{ textDecoration: 'none' }}>
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4H16M2 9H16M2 14H16"/>
              </svg>
            </div>
            <div className="nav-label">Recent Games</div>
          </Link>

          <button className="nav-item active">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="9" cy="6" r="3.5"/>
                <path d="M2.5 17C2.5 13 5 11 9 11C13 11 15.5 13 15.5 17"/>
              </svg>
            </div>
            <div className="nav-label">Profile</div>
          </button>

          <Link href="/decks" className="nav-item" style={{ textDecoration: 'none' }}>
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="1" width="12" height="14" rx="2"/>
                <path d="M6 17H15C16 17 17 16 17 15V5" opacity="0.5" strokeWidth="1.2"/>
              </svg>
            </div>
            <div className="nav-label">Decks</div>
          </Link>
        </div>
      </div>

      {/* Settings Modal */}
      <div className={`settings-overlay ${settingsOpen ? 'active' : ''}`}>
        <div className="settings-card">
          <button
            className="settings-close"
            onClick={closeSettings}
          >
            ✕
          </button>

          {/* Main settings list */}
          <div className={`settings-main ${accountViewOpen ? 'hidden' : ''}`}>
            <div className="settings-title">Settings</div>
            <div className="settings-list">
              <button
                className="settings-item"
                onClick={() => setAccountViewOpen(true)}
              >
                <div className="settings-item-icon">
                  <svg viewBox="0 0 18 18" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.4" strokeLinecap="round">
                    <circle cx="9" cy="6" r="3.5"/>
                    <path d="M2.5 17C2.5 13 5 11 9 11C13 11 15.5 13 15.5 17"/>
                  </svg>
                </div>
                <div className="settings-item-text">
                  <div className="settings-item-label">Account</div>
                  <div className="settings-item-desc">Name, image, delete account</div>
                </div>
                <span className="settings-item-chevron">›</span>
              </button>
              <button
                className="settings-item danger"
                onClick={async () => {
                  await signOut();
                  setSettingsOpen(false);
                  window.location.href = '/landing';
                }}
              >
                <div className="settings-item-icon">
                  <svg viewBox="0 0 18 18" fill="none" stroke="rgb(168,74,58)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2H3C2 2 1 3 1 4V14C1 15 2 16 3 16H6"/>
                    <path d="M12 13L17 9L12 5"/>
                    <path d="M17 9H7"/>
                  </svg>
                </div>
                <div className="settings-item-text">
                  <div className="settings-item-label">Log Out</div>
                </div>
              </button>
            </div>
          </div>

          {/* Account edit view */}
          <div className={`account-view ${accountViewOpen ? 'active' : ''}`}>
            <button
              className="account-back"
              onClick={() => setAccountViewOpen(false)}
            >
              ‹ Settings
            </button>

            <div className="account-avatar-edit">
              <div
                className="account-avatar"
                onClick={() => showToastMessage('Change Photo — Coming Soon')}
              >
                <span className="account-avatar-letter">{(nameInputValue || '?').charAt(0).toUpperCase()}</span>
                <div className="account-avatar-badge">
                  <svg viewBox="0 0 16 16" fill="none" stroke="rgb(90,110,98)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5H4L5.5 3H10.5L12 5H14V13H2Z"/>
                    <circle cx="8" cy="9" r="2.5"/>
                  </svg>
                </div>
              </div>
              <span className="account-change-photo">Change Photo</span>
            </div>

            <div className="account-field">
              <div className="account-field-label">Display Name</div>
              <input
                className="account-field-input"
                type="text"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
              />
            </div>

            <div className="account-field">
              <div className="account-field-label">Email</div>
              <input
                className="account-field-input"
                type="email"
                value={userEmail}
                readOnly
                style={{ color: 'rgb(90,110,98)' }}
              />
            </div>

            <button
              className="account-save-btn"
              onClick={async () => {
                const { error } = await supabase.auth.updateUser({
                  data: { display_name: nameInputValue },
                });
                if (error) {
                  showToastMessage('Failed to save: ' + error.message);
                } else {
                  setSettingsOpen(false);
                  setAccountViewOpen(false);
                  showToastMessage('Changes Saved');
                }
              }}
            >
              Save Changes
            </button>

            <div
              className="account-delete"
              onClick={() => showToastMessage('Delete Account — Coming Soon')}
            >
              Delete Account
            </div>
          </div>

        </div>
      </div>

      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </>
  );
}
