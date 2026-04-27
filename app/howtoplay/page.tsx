'use client';

import Link from 'next/link';

export default function Page() {
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
      padding: 10px 0;
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

    .header-back:active {
      transform: scale(0.85);
    }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    /* ── Content — no scroll, button pinned to bottom ── */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 4px 0 16px;
      gap: 0;
    }

    /* ── Step Number ── */
    .step-number {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgb(14,92,77) 0%, rgb(26,122,106) 50%, rgb(42,143,120) 100%);
      border: 1.5px solid rgb(56,158,133);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: rgb(245,239,227);
      flex-shrink: 0;
    }

    /* ── Info Cards — flex to share space ── */
    .info-card {
      padding: 10px 14px;
      background: rgb(245,239,227);
      border-radius: 18px;
      border: 1px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      flex-shrink: 0;
    }

    .info-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .info-card-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: rgb(222,212,192);
      border: 1px solid rgba(184,168,138,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .info-card-icon svg {
      width: 16px;
      height: 16px;
    }

    .info-card-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .info-card-title {
      font-size: 14px;
      font-weight: 700;
      color: rgb(44,62,54);
      line-height: 1.2;
    }

    .info-card-step {
      font-size: 9px;
      font-weight: 600;
      color: rgb(26,122,106);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .info-card-desc {
      font-size: 11px;
      font-weight: 400;
      color: rgb(90,110,98);
      line-height: 1.45;
    }

    /* ── Step Connector Line ── */
    .step-connector {
      display: flex;
      justify-content: center;
      padding: 0 0 0 38px;
      flex-shrink: 0;
    }

    .step-connector-line {
      width: 1.5px;
      height: 8px;
      background: rgba(26,122,106,0.2);
      border-radius: 1px;
    }

    /* ── CTA Button ── */
    .cta-btn {
      margin-top: auto;
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(26,120,105,0.35);
      flex-shrink: 0;
      text-decoration: none;
    }

    .cta-btn:active {
      transform: scale(0.97);
    }

    .cta-btn svg {
      width: 16px;
      height: 16px;
    }
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
          <div className="header-title">How to Play</div>
        </div>

        {/* Content — fills screen, no scroll */}
        <div className="content">
          {/* Card 1: What is a Pod? */}
          <div className="info-card">
            <div className="info-card-header">
              <div className="info-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="3" r="2" />
                  <circle cx="20" cy="16" r="2" />
                  <circle cx="4" cy="16" r="2" />
                </svg>
              </div>
              <div className="info-card-title-wrap">
                <div className="info-card-step">Step 1</div>
                <div className="info-card-title">What is a Pod?</div>
              </div>
              <div className="step-number">1</div>
            </div>
            <div className="info-card-desc">A pod is a Commander game session. Create one and invite friends, or scan a QR code to join.</div>
          </div>

          <div className="step-connector">
            <div className="step-connector-line"></div>
          </div>

          {/* Card 2: Creating a Pod */}
          <div className="info-card">
            <div className="info-card-header">
              <div className="info-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="info-card-title-wrap">
                <div className="info-card-step">Step 2</div>
                <div className="info-card-title">Create a Pod</div>
              </div>
              <div className="step-number">2</div>
            </div>
            <div className="info-card-desc">Choose your deck, set player count, and share the QR code to let friends join instantly.</div>
          </div>

          <div className="step-connector">
            <div className="step-connector-line"></div>
          </div>

          {/* Card 3: Game View */}
          <div className="info-card">
            <div className="info-card-header">
              <div className="info-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M8 12H16M12 9V15" />
                </svg>
              </div>
              <div className="info-card-title-wrap">
                <div className="info-card-step">Step 3</div>
                <div className="info-card-title">Game View</div>
              </div>
              <div className="step-number">3</div>
            </div>
            <div className="info-card-desc">Track life totals, view opponents' decks, use dice roller, and toggle to grid view.</div>
          </div>

          <div className="step-connector">
            <div className="step-connector-line"></div>
          </div>

          {/* Card 4: Review System */}
          <div className="info-card">
            <div className="info-card-header">
              <div className="info-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(44,62,54)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L14 8H20L15 12L17 18L12 14L7 18L9 12L4 8H10Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="info-card-title-wrap">
                <div className="info-card-step">Step 4</div>
                <div className="info-card-title">Review System</div>
              </div>
              <div className="step-number">4</div>
            </div>
            <div className="info-card-desc">Rate decks, award badges, and shape each player's aura. It's all about reputation!</div>
          </div>

          {/* CTA Button */}
          <Link href="/create" className="cta-btn">
            <svg viewBox="0 0 16 16" fill="none" stroke="rgb(245,239,227)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2V14M2 8H14" />
            </svg>
            Create a Pod
          </Link>
        </div>
      </div>
    </>
  );
}
