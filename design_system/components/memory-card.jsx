// MemoryCard — collectible trading-card reveal popup.
// Supports 3 variants: 'ornate' (default), 'foil', 'matte'.
//
// Composition (top → bottom):
//   1. Game info:       pod name / date on left, Aura score on right
//   2. Commander art:   4 angled slices, each tinted by its commander's badge,
//                       name overlay at bottom, optional badge + crown
//   3. Badges earned:   row of glyphs (with ×N count), plus Save/Share circle
//                       buttons aligned to the right
//   4. Profile CTA:     pinned full-width at the screen bottom (outside card)

// Which badges each player earned this game. Plural per player.
// Used to look up the archetype for their storyline blurb.
const PLAYER_BADGES_EARNED = {
  frederico: ['brilliance'],          // winner — Mastermind
  manel:     ['fun'],                 // Beloved
  sofia:     ['allegiance'],          // Kingmaker
  tomas:     ['flavor'],              // Lore Master
};
// Primary badge shown in the commander banner ("Brewed for …").
const COMMANDER_BADGES = {
  frederico: 'brilliance',
  manel:     'fun',
  sofia:     'allegiance',
  tomas:     'flavor',
};
const WINNER_ID = 'frederico';

// Human-friendly badge names used in the commander banner.
const BADGE_LABELS = {
  brilliance: 'Brilliance',
  rivalry:    'Rivalry',
  allegiance: 'Allegiance',
  fun:        'Fun',
  flavor:     'Flavour',
};

// ─── Archetype table ────────────────────────────────────────────
// Every combination of badges earned in a game maps to a single archetype.
// Key = badge ids sorted alphabetically, joined with "+". Total 31 entries.
const ARCHETYPES = {
  // 1 badge
  'brilliance':                                  'The Mastermind',
  'flavor':                                      'The Lore Master',
  'rivalry':                                     'The Archenemy',
  'allegiance':                                  'The Kingmaker',
  'fun':                                         'The Beloved',
  // 2 badges
  'brilliance+flavor':                           'The Chronicler',
  'brilliance+rivalry':                          'The Power Hungry',
  'allegiance+brilliance':                       'The Architect',
  'brilliance+fun':                              'The Enchanter',
  'flavor+rivalry':                              'The Dark Legend',
  'allegiance+flavor':                           'The Bard',
  'flavor+fun':                                  'The Showrunner',
  'allegiance+rivalry':                          'The Schemer',
  'fun+rivalry':                                 'The Chaos Agent',
  'allegiance+fun':                              'The Bonded',
  // 3 badges
  'brilliance+flavor+rivalry':                   'The Nemesis',
  'allegiance+brilliance+flavor':                'The Sage',
  'brilliance+flavor+fun':                       'The Raconteur',
  'allegiance+brilliance+rivalry':               'The Grand Tactician',
  'brilliance+fun+rivalry':                      'The Gladiator',
  'allegiance+brilliance+fun':                   'The Patron',
  'allegiance+flavor+rivalry':                   'The Usurper',
  'flavor+fun+rivalry':                          'The Trickster',
  'allegiance+flavor+fun':                       'The Herald',
  'allegiance+fun+rivalry':                      'The Warchief',
  // 4 badges
  'allegiance+brilliance+flavor+rivalry':        'The Grand Vizier',
  'brilliance+flavor+fun+rivalry':               'The Archmage',
  'allegiance+brilliance+flavor+fun':            'The Luminary',
  'allegiance+brilliance+fun+rivalry':           'The High Commander',
  'allegiance+flavor+fun+rivalry':               'The Mythmaker',
  // 5 badges
  'allegiance+brilliance+flavor+fun+rivalry':    'The Living Legend',
};

// Look up the archetype for an array of badge ids earned by one player this game.
// Returns null if no badges.
function getArchetype(badgeIds) {
  if (!badgeIds || badgeIds.length === 0) return null;
  const key = [...badgeIds].sort().join('+');
  return ARCHETYPES[key] || null;
}

// Per-badge slice treatment. `overlay` is the blended tint layer.
// `glow` is an outer box-shadow. `filter` tunes art saturation/contrast.
const BADGE_MOODS = {
  brilliance: {
    overlay: 'radial-gradient(circle at 50% 40%, rgba(201,155,47,0.35), rgba(201,155,47,0.08) 70%)',
    glow:    '0 0 18px rgba(201,155,47,0.55), 0 0 2px rgba(201,155,47,0.8) inset',
    filter:  'saturate(1.05) contrast(1.02) brightness(1.06)',
    stroke:  'rgba(201,155,47,0.85)',
  },
  rivalry: {
    overlay: 'linear-gradient(180deg, rgba(158,43,43,0.15) 0%, rgba(120,20,20,0.28) 100%)',
    glow:    '0 0 14px rgba(158,43,43,0.45)',
    filter:  'saturate(1.15) contrast(1.18)',
    stroke:  'rgba(158,43,43,0.8)',
  },
  allegiance: {
    overlay: 'linear-gradient(180deg, rgba(47,122,116,0.12) 0%, rgba(47,122,116,0.28) 100%)',
    glow:    '0 0 16px rgba(47,122,116,0.45)',
    filter:  'saturate(0.95) contrast(1.02) hue-rotate(-4deg)',
    stroke:  'rgba(47,122,116,0.75)',
  },
  fun: {
    overlay: 'linear-gradient(180deg, rgba(250,200,120,0.15) 0%, rgba(224,123,74,0.3) 100%)',
    glow:    '0 0 18px rgba(250,200,120,0.55)',
    filter:  'saturate(1.3) contrast(1.08) brightness(1.05)',
    stroke:  'rgba(224,123,74,0.85)',
  },
  flavor: {
    overlay: 'linear-gradient(180deg, rgba(194,90,61,0.1) 0%, rgba(156,66,92,0.22) 100%)',
    glow:    '0 0 16px rgba(194,90,61,0.4)',
    filter:  'sepia(0.15) saturate(1.08) contrast(1.04)',
    stroke:  'rgba(194,90,61,0.75)',
  },
  // No badge — muted
  none: {
    overlay: 'linear-gradient(180deg, rgba(43,33,24,0.15) 0%, rgba(43,33,24,0.42) 100%)',
    glow:    '0 2px 10px rgba(43,33,24,0.25)',
    filter:  'saturate(0.55) brightness(0.85) contrast(0.95)',
    stroke:  'rgba(43,33,24,0.25)',
  },
};

// ─── Commander panel ────────────────────────────────────────────
// A tall portrait panel. Four of these sit edge-to-edge inside a single
// rounded clip — no individual card chrome. Art fills the panel; bottom
// dark gradient carries the name + player name.
function CommanderPanel({ player, isWinner, isFirst, isLast }) {
  const badge = COMMANDER_BADGES[player.id] || null;
  const mood  = BADGE_MOODS[badge || 'none'];
  const cat   = badge ? CATEGORIES.find(c => c.id === badge) : null;

  return (
    <div style={{
      position: 'relative',
      flex: '1 1 0',
      minWidth: 0,
      height: '100%',
      // Thin hairline between panels (not on outer edges — outer clip handles those)
      borderRight: isLast ? 'none' : '1px solid rgba(18,10,4,0.55)',
      background: 'var(--ink)',
      overflow: 'hidden',
    }}>
      {/* Art — fills the full panel */}
      <img
        src={player.art}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 25%', // favor upper body / face
          display: 'block',
          filter: mood.filter,
        }}
      />

      {/* Badge mood tint */}
      <div style={{
        position: 'absolute', inset: 0,
        background: mood.overlay,
        mixBlendMode: badge ? 'soft-light' : 'normal',
        pointerEvents: 'none',
      }}/>

      {/* Soft image-fade — subtle gradient that transitions the art into the banner */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 58,
        height: 110,
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,6,4,0.35) 45%, rgba(10,6,4,0.85) 85%, #0A0604 100%)',
        pointerEvents: 'none',
      }}/>

      {/* Solid black banner — fixed height, holds commander name (+ crown slot) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 58,
        background: '#0A0604',
        padding: '0 6px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {/* Crown slot — always reserved so names align across panels */}
        <div style={{
          height: 13, marginBottom: 2,
          color: 'var(--parchment)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isWinner ? 0.95 : 0,
        }}>
          <Icon name="crown" size={13} width={1.8}/>
        </div>
        <div style={{ textAlign: 'center', maxWidth: '100%' }}>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 300,
            fontSize: 10,
            lineHeight: 1.1,
            color: 'rgba(245,239,226,0.6)',
            letterSpacing: '0.01em',
            marginBottom: 3,
          }}>Brewed for</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 13,
            lineHeight: 1.1,
            color: 'var(--parchment)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}>{badge ? BADGE_LABELS[badge] : '—'}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Badges earned row ──────────────────────────────────────────
function BadgesEarned({ badges }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {badges.map((b, i) => {
        const cat = CATEGORIES.find(c => c.id === b.id);
        return (
          <div key={i} style={{ position: 'relative' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 999,
              background: cat.soft, color: cat.color,
              border: `1.5px solid ${cat.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BadgeGlyph name={cat.glyph} size={20} stroke={cat.color}/>
            </div>
            {b.count > 1 && (
              <div style={{
                position: 'absolute', right: -4, bottom: -4,
                minWidth: 18, height: 18, borderRadius: 999,
                background: 'var(--ink)', color: 'var(--parchment)',
                fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
                border: '1.5px solid var(--parchment-card)',
              }}>×{b.count}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Keepsake variant helpers ───────────────────────────────────
// A dark, gilded horizontal-row keepsake — shown when variant === 'keepsake'.
function KeepsakeRow({ player, isWinner, isLast }) {
  const badge = COMMANDER_BADGES[player.id] || null;
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'stretch',
      height: 72,
      background: '#0A0604',
      borderBottom: isLast ? 'none' : '1px solid rgba(201,155,47,0.22)',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', width: '65%', flexShrink: 0, overflow: 'hidden' }}>
        <img src={player.art} alt="" style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 12%',
          transform: 'scale(1.15)',
          transformOrigin: '50% 12%',
          display: 'block',
        }}/>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: 80,
          background: 'linear-gradient(90deg, transparent 0%, rgba(10,6,4,0.55) 55%, #0A0604 100%)',
          pointerEvents: 'none',
        }}/>
        {isWinner && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            width: 22, height: 22, borderRadius: 999,
            background: 'rgba(10,6,4,0.72)',
            border: '1px solid rgba(226,184,88,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#E2B858',
          }}>
            <Icon name="crown" size={12} width={1.8}/>
          </div>
        )}
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        padding: '8px 12px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1,
      }}>
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 500,
          color: 'var(--parchment)', letterSpacing: '0.06em', textTransform: 'uppercase',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8,
        }}>{player.name}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 15, lineHeight: 1.15,
          color: 'var(--parchment)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{player.commanderShort}</div>
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 300,
          color: 'rgba(245,239,226,0.55)', marginTop: 2,
        }}>
          Brewed for <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 10,
            color: 'var(--parchment)', marginLeft: 2,
          }}>{BADGE_LABELS[badge]}</span>
        </div>
      </div>
    </div>
  );
}

function KeepsakeStoryPassage() {
  const role = (id) => (getArchetype(PLAYER_BADGES_EARNED[id]) || '').replace(/^The\s+/, '');
  const name = (id) => PLAYERS.find(p => p.id === id).name;
  const fgStrong = 'var(--parchment)';
  const fgSoft = 'rgba(245,239,226,0.7)';
  const accent = 'rgba(226,184,88,0.75)';
  return (
    <div style={{
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 13, lineHeight: 1.45,
      color: fgStrong,
      padding: '0 4px',
      textWrap: 'pretty',
    }}>
      <span style={{ color: fgSoft }}>In this chapter, </span>
      <strong style={{ fontWeight: 700 }}>{name('frederico')}</strong>
      <span style={{ color: fgSoft }}> played the </span>
      <em style={{ fontStyle: 'italic' }}>{role('frederico')}</em>
      <span style={{ color: fgSoft }}>, </span>
      <strong style={{ fontWeight: 700 }}>{name('manel')}</strong>
      <span style={{ color: fgSoft }}> the </span>
      <em style={{ fontStyle: 'italic' }}>{role('manel')}</em>
      <span style={{ color: fgSoft }}>, </span>
      <strong style={{ fontWeight: 700 }}>{name('sofia')}</strong>
      <span style={{ color: fgSoft }}> the </span>
      <em style={{ fontStyle: 'italic' }}>{role('sofia')}</em>
      <span style={{ color: fgSoft }}>, and </span>
      <strong style={{ fontWeight: 700 }}>{name('tomas')}</strong>
      <span style={{ color: fgSoft }}> the </span>
      <em style={{ fontStyle: 'italic' }}>{role('tomas')}</em>
      <span style={{ color: fgSoft }}>.</span>
      <div style={{
        marginTop: 6, fontStyle: 'italic', fontSize: 11,
        color: accent, textAlign: 'right',
      }}>— Friday Night Pod</div>
    </div>
  );
}

function KeepsakeCard() {
  return (
    <div style={{
      padding: 4,
      background: 'linear-gradient(135deg, #E2B858 0%, #C99B2F 22%, #8C5A28 50%, #C99B2F 78%, #E2B858 100%)',
      borderRadius: 'var(--r-memory)',
      boxShadow: '0 30px 60px -20px rgba(10,6,4,0.55), 0 12px 24px -8px rgba(43,33,24,0.35), 0 1px 0 rgba(255,255,255,0.35) inset',
    }}>
      <div style={{
        background: '#0A0604',
        backgroundImage: `
          radial-gradient(ellipse at 50% 15%, rgba(201,155,47,0.34), transparent 45%),
          radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 50%),
          linear-gradient(180deg, #140C07 0%, #0A0604 45%, #050302 100%)
        `,
        borderRadius: 'calc(var(--r-memory) - 4px)',
        padding: '12px 12px 14px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(201,155,47,0.35), inset 0 0 30px rgba(0,0,0,0.5)',
      }}>
        {/* Compass rose rays */}
        <svg width="520" height="520" viewBox="0 0 320 320" aria-hidden="true" style={{
          position: 'absolute', top: '15%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.22,
          pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)',
        }}>
          <g stroke="#E2B858" strokeWidth="0.8" fill="none">
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              const r1 = 40, r2 = 170;
              const cx = 160, cy = 160;
              return <line key={i}
                x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}/>;
            })}
            <circle cx="160" cy="160" r="40"/>
            <circle cx="160" cy="160" r="60" strokeDasharray="1 3"/>
            <circle cx="160" cy="160" r="110" strokeDasharray="1 4"/>
            <circle cx="160" cy="160" r="170"/>
          </g>
        </svg>

        {/* Engraved header */}
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8, paddingBottom: 8,
          borderBottom: '1px solid rgba(201,155,47,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <AuraMark size={16} color="#E2B858"/>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 15, letterSpacing: '-0.01em',
              color: '#E2B858', lineHeight: 1,
            }}>Aura</div>
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'rgba(226,184,88,0.6)',
          }}>Apr 18 · 9:42 PM · 1h 24m</div>
        </div>

        {/* Engraved motto */}
        <div style={{
          position: 'relative',
          marginBottom: 12,
          textAlign: 'center',
          fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.34em', textTransform: 'uppercase',
          color: 'rgba(226,184,88,0.85)',
          textShadow: '0 0 12px rgba(201,155,47,0.45)',
        }}>
          ✦ &nbsp; Every Game Has a Story &nbsp; ✦
        </div>

        {/* Horizontal commander stack */}
        <div style={{
          position: 'relative',
          borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(201,155,47,0.3)',
        }}>
          {PLAYERS.map((p, i) => (
            <KeepsakeRow key={p.id} player={p}
              isWinner={p.id === WINNER_ID}
              isLast={i === PLAYERS.length - 1}/>
          ))}
        </div>

        {/* Story passage */}
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: '1px solid rgba(201,155,47,0.25)',
          position: 'relative',
        }}>
          <KeepsakeStoryPassage/>
        </div>
      </div>
    </div>
  );
}

// ─── Main popup ─────────────────────────────────────────────────
function MemoryCardPopup({ onClose, variant = 'ornate' }) {
  const winner = PLAYERS.find(p => p.id === WINNER_ID);
  const badges = [
    { id: 'brilliance', count: 2 },
    { id: 'flavor',     count: 1 },
    { id: 'rivalry',    count: 1 },
    { id: 'allegiance', count: 1 },
    { id: 'fun',        count: 1 },
  ];
  const totalBadges = badges.reduce((s, b) => s + b.count, 0);

  // Variant frame treatment — only outer background/border differs.
  const isOrnate = variant === 'ornate';
  const isFoil   = variant === 'foil';
  const isMatte  = variant === 'matte';
  const isKeepsake = variant === 'keepsake';

  // Keepsake has its own full layout + floating actions below the card.
  if (isKeepsake) {
    return (
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(10,6,4,0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column',
        padding: '40px 20px 24px',
        fontFamily: 'var(--font-ui)',
        overflowY: 'auto',
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}>
          <KeepsakeCard/>
          {/* Floating actions — dark to match the card */}
          <div style={{ display: 'flex', gap: 14 }}>
            <button aria-label="Save" style={{
              width: 44, height: 44, borderRadius: 999,
              border: '1px solid rgba(201,155,47,0.55)',
              background: 'linear-gradient(180deg, #140C07 0%, #0A0604 100%)',
              color: '#E2B858', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px -4px rgba(10,6,4,0.45), 0 0 0 1px rgba(201,155,47,0.18) inset, 0 1px 0 rgba(255,220,150,0.2) inset',
            }}><Icon name="download" size={16}/></button>
            <button aria-label="Share" style={{
              width: 44, height: 44, borderRadius: 999,
              border: '1px solid rgba(201,155,47,0.55)',
              background: 'linear-gradient(180deg, #140C07 0%, #0A0604 100%)',
              color: '#E2B858', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px -4px rgba(10,6,4,0.45), 0 0 0 1px rgba(201,155,47,0.18) inset, 0 1px 0 rgba(255,220,150,0.2) inset',
            }}><Icon name="share-2" size={16}/></button>
          </div>
        </div>

        {/* Profile button — pinned at bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <button onClick={(e) => e.stopPropagation()} style={{
            width: '100%', border: 'none',
            background: 'var(--forest)', color: 'var(--parchment)',
            fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16,
            padding: '16px 20px', borderRadius: 'var(--r-card)',
            boxShadow: 'var(--shadow-rest)',
            cursor: 'pointer',
          }}>View Profile</button>
        </div>
      </div>
    );
  }

  const outerBorder = isOrnate
    ? { padding: 3, background: 'linear-gradient(135deg, #C99B2F 0%, #B06B2C 50%, #C99B2F 100%)' }
    : isMatte
      ? { padding: 0, background: 'var(--line-strong)' }
      : { padding: 2, background: 'linear-gradient(135deg, #E8D8B5 0%, #C99B2F 40%, #F6ECD2 60%, #C99B2F 100%)' };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(43,33,24,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      padding: '56px 20px 24px',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* Card frame */}
      <div onClick={(e) => e.stopPropagation()} style={{
        ...outerBorder,
        borderRadius: 'var(--r-memory)',
        boxShadow: 'var(--shadow-memory)',
      }}>
        {/* Inner card */}
        <div style={{
          background: 'var(--parchment-card)',
          borderRadius: isMatte ? 'var(--r-memory)' : 'calc(var(--r-memory) - 3px)',
          padding: '14px 14px 14px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Foil shimmer (foil variant only) */}
          {isFoil && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(115deg, transparent 30%, rgba(201,155,47,0.18) 45%, rgba(255,255,255,0.3) 50%, rgba(201,155,47,0.18) 55%, transparent 70%)',
              mixBlendMode: 'overlay',
              animation: 'foil-shimmer 6s ease-in-out infinite',
            }}/>
          )}

          {/* Game info + actions */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18,
                color: 'var(--ink)', lineHeight: 1.15,
              }}>Friday Night Pod</div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 500, marginTop: 2 }}>
                Apr 18 · 9:42 PM · 1h 24m
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button aria-label="Save" style={{
                width: 36, height: 36, borderRadius: 999, border: '1px solid var(--line-strong)',
                background: 'var(--parchment)', color: 'var(--ink)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="download" size={16}/></button>
              <button aria-label="Share" style={{
                width: 36, height: 36, borderRadius: 999, border: '1px solid var(--line-strong)',
                background: 'var(--parchment)', color: 'var(--ink)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="share-2" size={16}/></button>
            </div>
          </div>

          {/* Player names row — column headers above commander strip */}
          <div style={{
            display: 'flex',
            padding: '0 0 4px',
          }}>
            {PLAYERS.map((p) => (
              <div key={p.id} style={{
                flex: '1 1 0',
                minWidth: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 10, fontWeight: 500,
                color: 'var(--ink)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                padding: '0 4px',
              }}>{p.name}</div>
            ))}
          </div>

          {/* Commander composite — tall portrait strip, edge-to-edge */}
          <div style={{
            position: 'relative',
            height: 308,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(43,33,24,0.25), inset 0 0 0 1px rgba(18,10,4,0.5)',
            background: 'var(--ink)',
            display: 'flex',
          }}>
            {PLAYERS.map((p, i) => (
              <CommanderPanel
                key={p.id}
                player={p}
                isWinner={p.id === WINNER_ID}
                isFirst={i === 0}
                isLast={i === PLAYERS.length - 1}
              />
            ))}
          </div>

          {/* Pod archetypes — a little storytelling beat under the portrait strip */}
          <div style={{ marginTop: 14 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 13, color: 'var(--fg-subtle)',
              fontStyle: 'italic',
              marginBottom: 6,
            }}>The pod remembers…</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {PLAYERS.map((p) => {
                const role = getArchetype(PLAYER_BADGES_EARNED[p.id]);
                if (!role) return null;
                return (
                  <div key={p.id} style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13, lineHeight: 1.35,
                    color: 'var(--ink)',
                  }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>, </span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 400,
                      fontStyle: 'italic',
                    }}>{role}.</span>
                  </div>
                );
              })}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 12, color: 'var(--fg-subtle)',
              fontStyle: 'italic',
              marginTop: 8, textAlign: 'right',
            }}>— Until the next shuffle.</div>
          </div>
        </div>
      </div>

      {/* Profile button — pinned at bottom */}
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button onClick={(e) => e.stopPropagation()} style={{
          width: '100%', border: 'none',
          background: 'var(--forest)', color: 'var(--parchment)',
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16,
          padding: '16px 20px', borderRadius: 'var(--r-card)',
          boxShadow: 'var(--shadow-rest)',
          cursor: 'pointer',
        }}>View Profile</button>
      </div>

      <style>{`
        @keyframes foil-shimmer {
          0%, 100% { transform: translateX(-30%); opacity: 0.8; }
          50%      { transform: translateX(30%);  opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { MemoryCardPopup });
