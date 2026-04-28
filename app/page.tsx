"use client";

const screens = [
  { number: "01", name: "Landing", href: "/landing", status: "live" },
  { number: "02", name: "How to Play", href: "/howtoplay", status: "waiting" },
  { number: "03", name: "Create a Pod", href: "/create", status: "live" },
  { number: "04", name: "Join a Pod", href: "/join", status: "live" },
  { number: "05a", name: "Grid View — 2 Players", href: "/gridview-2p", status: "waiting" },
  { number: "05b", name: "Grid View — 3 Players", href: "/gridview-3p", status: "waiting" },
  { number: "05c", name: "Grid View — 4 Players", href: "/gridview-4p", status: "waiting" },
  { number: "05d", name: "Grid View — 5 Players", href: "/gridview-5p", status: "waiting" },
  { number: "06", name: "Single View", href: "/singleview", status: "waiting" },
  { number: "07", name: "Game Review", href: "/review", status: "live" },
  { number: "08", name: "Profile", href: "/profile", status: "waiting" },
  { number: "09", name: "Decks", href: "/decks", status: "live" },
  { number: "10", name: "Deck Accomplishments", href: "/deck-accomplishments", status: "waiting" },
  { number: "11", name: "Recent Games", href: "/recent-games", status: "waiting" },
];

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5EFE2',
      fontFamily: "'Instrument Sans', sans-serif",
      padding: '60px 24px 40px',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase' as const,
            color: '#B06B2C',
            marginBottom: 8,
          }}>
            Wireframe Preview
          </div>
          <h1 style={{
            fontFamily: "'Young Serif', serif",
            fontSize: 36,
            color: '#2B2118',
            fontWeight: 400,
            marginBottom: 4,
          }}>
            Aura
          </h1>
          <p style={{ fontSize: 14, color: '#8A7E6F' }}>
            Your Commander Journey Remembered
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {screens.map((s) => (
            <a
              key={s.number}
              href={s.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 14,
                background: s.status === 'live' ? '#fff' : 'rgba(255,255,255,0.5)',
                border: s.status === 'live'
                  ? '1px solid rgba(47,93,58,0.2)'
                  : '1px solid rgba(43,33,24,0.06)',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#B8AE9E',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 20,
              }}>
                {s.number}
              </span>
              <span style={{
                flex: 1,
                fontSize: 15,
                fontWeight: 600,
                color: '#2B2118',
              }}>
                {s.name}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                padding: '4px 10px',
                borderRadius: 999,
                background: s.status === 'live'
                  ? 'rgba(47,93,58,0.1)'
                  : 'rgba(43,33,24,0.05)',
                color: s.status === 'live' ? '#2F5D3A' : '#B8AE9E',
              }}>
                {s.status === 'live' ? 'Live' : 'Waiting for design'}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
