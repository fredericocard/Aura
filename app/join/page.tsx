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
      padding: 8px 0 16px;
    }

    /* ── QR Scanner Area ── */
    .scanner-area {
      width: 100%;
      height: 220px;
      background: linear-gradient(135deg, rgb(245,239,227), rgb(222,212,192));
      border-radius: 16px;
      border: 2px dashed rgba(26,122,106,0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .scan-line {
      position: absolute;
      top: 40%;
      left: 24px;
      right: 24px;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgb(26,122,106), transparent);
      box-shadow: 0 0 12px rgb(26,122,106);
      animation: scanLine 2s ease-in-out infinite;
    }

    @keyframes scanLine {
      0%, 100% { top: 30%; opacity: 0.3; }
      50% { top: 65%; opacity: 1; }
    }

    .scanner-icon {
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }

    .scanner-text {
      color: rgb(90,110,98);
      font-size: 13px;
      position: relative;
      z-index: 1;
    }

    /* ── Divider ── */
    .or-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 4px 0 20px;
    }

    .or-divider-line {
      flex: 1;
      height: 1px;
      background: rgba(184,168,138,0.55);
    }

    .or-divider-text {
      color: rgb(138,154,142);
      font-size: 12px;
    }

    /* ── Code Input ── */
    .code-input-row {
      display: flex;
      gap: 6px;
      margin-bottom: 24px;
      flex-shrink: 0;
    }

    .code-char {
      flex: 1;
      height: 48px;
      background: rgb(222,212,192);
      border-radius: 8px;
      border: 1px solid rgb(184,168,138);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .code-char.filled {
      border-color: rgb(26,122,106);
    }

    .code-char.dash {
      background: transparent;
      border: none;
      color: rgb(138,154,142);
      font-weight: 400;
    }

    .code-char.empty {
      color: rgb(138,154,142);
    }

    /* ── Join Button ── */
    .join-btn {
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
    }

    .join-btn:active { transform: scale(0.97); }

    .join-btn svg {
      width: 16px;
      height: 16px;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        <div className="header">
          <Link href="/landing" className="header-back">‹</Link>
          <div className="header-title">Join a Pod</div>
        </div>

        <div className="content">
          <div className="scanner-area">
            <div className="scan-line"></div>
            <div className="scanner-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgb(26,122,106)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span className="scanner-text">Point camera at QR code</span>
          </div>

          <div className="or-divider">
            <div className="or-divider-line"></div>
            <span className="or-divider-text">or enter code</span>
            <div className="or-divider-line"></div>
          </div>

          <div className="code-input-row">
            <div className="code-char filled">A</div>
            <div className="code-char filled">R</div>
            <div className="code-char filled">C</div>
            <div className="code-char dash">–</div>
            <div className="code-char filled">7</div>
            <div className="code-char empty">_</div>
            <div className="code-char empty">_</div>
            <div className="code-char empty">_</div>
          </div>

          <Link href="/singleview" className="join-btn">
            <svg viewBox="0 0 16 16" fill="none" stroke="rgb(245,239,227)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 0 0-1 1v3"/>
              <path d="M10 14h3a1 1 0 0 0 1-1v-3"/>
              <path d="M14 6V3a1 1 0 0 0-1-1h-3"/>
              <path d="M2 10v3a1 1 0 0 0 1 1h3"/>
            </svg>
            Join Pod
          </Link>
        </div>
      </div>
    </>
  );
}
