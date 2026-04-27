// Review components — Game Review screen for Aura
// All components exported to window for cross-script use.

const PLAYERS = [
  { id: 'frederico', name: 'Frederico', commander: 'Omnath, Locus of Creation', commanderShort: 'Omnath', art: '../assets/commanders/omnath.jpg' },
  { id: 'manel',     name: 'Manel',     commander: 'Krenko, Mob Boss',          commanderShort: 'Krenko',   art: '../assets/commanders/krenko.jpg' },
  { id: 'sofia',     name: 'Sofia',     commander: 'Atraxa, Praetors\u2019 Voice', commanderShort: 'Atraxa', art: '../assets/commanders/atraxa.jpg' },
  { id: 'tomas',     name: 'Tom\u00E1s', commander: 'Muldrotha, the Gravetide',  commanderShort: 'Muldrotha', art: '../assets/commanders/muldrotha.jpg' },
];

const CATEGORIES = [
  { id: 'brilliance', label: 'Brilliance', question: 'Who pulled off the wildest play?',      glyph: 'brilliance', color: 'var(--cat-brilliance)', soft: 'var(--cat-brilliance-soft)' },
  { id: 'flavor',     label: 'Flavour',    question: 'Who took the flavour win?',              glyph: 'flavor',     color: 'var(--cat-flavor)',     soft: 'var(--cat-flavor-soft)' },
  { id: 'rivalry',    label: 'Rivalry',    question: 'Who had the biggest target on its back?', glyph: 'rivalry',    color: 'var(--cat-rivalry)',    soft: 'var(--cat-rivalry-soft)' },
  { id: 'allegiance', label: 'Allegiance', question: 'Who did you team up with?',              glyph: 'allegiance', color: 'var(--cat-allegiance)', soft: 'var(--cat-allegiance-soft)' },
  { id: 'fun',        label: 'Fun',        question: "Who's invited back first?",              glyph: 'fun',        color: 'var(--cat-fun)',        soft: 'var(--cat-fun-soft)' },
];

// Q6 is a separate "bracket check" — not a trait badge. Different UI.
const BRACKET_QUESTION = {
  id: 'bracket',
  question: 'Did any deck play above its bracket?',
  hint: 'Flag a deck that outpaced the table. Default: everyone was on bracket.',
};

// Tiny lucide-style stroke icons (inline so we don't depend on CDN timing).
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    sparkles: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v3M20.5 4.5h-3M5 18v3M6.5 19.5h-3"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>,
    swords: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M9.5 6.5 21 18v3h-3L6.5 9.5"/><path d="m5 14 6 6"/><path d="m4 13 2-2"/><path d="m7 10-2-2"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    smile: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
    layers: <><path d="m12.83 2.18-9 4a2 2 0 0 0 0 3.64l9 4a2 2 0 0 0 1.66 0l9-4a2 2 0 0 0 0-3.64l-9-4a2 2 0 0 0-1.66 0z"/><path d="m2 12.5 9.2 4.1a2 2 0 0 0 1.6 0L22 12.5"/><path d="m2 17.5 9.2 4.1a2 2 0 0 0 1.6 0L22 17.5"/></>,
    'chevron-left': <polyline points="15 18 9 12 15 6"/>,
    'chevron-down': <polyline points="6 9 12 15 18 9"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    'share-2': <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></>,
    crown: <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>,
    'thumbs-up': <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-8a2 2 0 0 1 2 2v1.88z"/>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ─── BadgeGlyph ────────────────────────────────────────────────
// Heraldic trait emblems, 64×64 viewBox. Dense symmetric line-art in the
// spirit of traditional heraldry / tattoo sigils — not generic icons.
// Each is a bold silhouette with ornamental flourishes and inner detail,
// built on a consistent stroke weight so the set reads as a family.
function BadgeGlyph({ name, size = 28, stroke = 'currentColor', fill = 'none' }) {
  // Some glyphs are PNG-backed (brand artwork). Render as a CSS-masked span
  // so the silhouette still inherits the category color.
  const PNG_GLYPHS = {
    brilliance: (window.__AURA_GLYPH_BASE__ || '../assets/glyphs/') + 'brilliance.png',
    flavor:     (window.__AURA_GLYPH_BASE__ || '../assets/glyphs/') + 'flavor.png',
    rivalry:    (window.__AURA_GLYPH_BASE__ || '../assets/glyphs/') + 'rivalry.png',
    allegiance: (window.__AURA_GLYPH_BASE__ || '../assets/glyphs/') + 'allegiance.png',
    fun:        (window.__AURA_GLYPH_BASE__ || '../assets/glyphs/') + 'fun.png',
  };
  if (PNG_GLYPHS[name]) {
    return (
      <span style={{
        display: 'inline-block',
        width: size, height: size,
        backgroundColor: stroke,
        WebkitMaskImage: `url("${PNG_GLYPHS[name]}")`,
        maskImage: `url("${PNG_GLYPHS[name]}")`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
      }}/>
    );
  }

  const p = {
    width: size, height: size, viewBox: '0 0 64 64',
    fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const glyphs = {
    // ── Brilliance — a squirrel-scholar reading an open tome ───────────
    // Heraldic / tribal-tattoo vocabulary, matching the Rivalry crest:
    // bilateral symmetry, pure outline (no fill), flowing curves, teardrop
    // terminals, negative-space interior detail. Front-facing bust with a
    // big S-curve tail flourish crowning the composition.
    brilliance: (
      <>
        {/* ── Tail flourish — a double-S filigree crowning the head.
               Drawn as two nested curves so negative space creates the
               ribbing (same double-contour trick as the helm's horns).   */}
        <path d="M32 4
                 C 24 6, 20 14, 24 22
                 C 26 26, 30 26, 32 24
                 C 34 26, 38 26, 40 22
                 C 44 14, 40 6, 32 4 Z"
              strokeLinejoin="round"/>
        {/* Tail inner rib */}
        <path d="M32 9
                 C 28 11, 27 16, 29 21
                 M 32 9
                 C 36 11, 37 16, 35 21" opacity="0.75"/>
        {/* Tail tip curl dot */}
        <circle cx="32" cy="6.5" r="0.9" fill={stroke} stroke="none"/>

        {/* ── Ears — tufted, flame-pointed, with inner channel ───────── */}
        {/* Left ear */}
        <path d="M18 22
                 C 14 18, 12 22, 14 27
                 C 16 30, 20 29, 22 26 Z"
              strokeLinejoin="round"/>
        <path d="M16 23 C 16 25, 17 27, 19 27" opacity="0.7"/>
        {/* Right ear — mirror */}
        <path d="M46 22
                 C 50 18, 52 22, 50 27
                 C 48 30, 44 29, 42 26 Z"
              strokeLinejoin="round"/>
        <path d="M48 23 C 48 25, 47 27, 45 27" opacity="0.7"/>

        {/* ── Head — rounded squirrel skull with cheek pouches ───────── */}
        <path d="M20 28
                 C 18 34, 20 40, 24 43
                 C 26 45, 28 46, 32 46
                 C 36 46, 38 45, 40 43
                 C 44 40, 46 34, 44 28
                 C 42 24, 38 22, 32 22
                 C 26 22, 22 24, 20 28 Z"
              strokeLinejoin="round"/>

        {/* Brow ridge — two arched tribal strokes, meeting in a spear */}
        <path d="M24 30 C 26 28, 28 28, 30 30" opacity="0.9"/>
        <path d="M40 30 C 38 28, 36 28, 34 30" opacity="0.9"/>
        {/* Central forehead flame — the "spark of insight" */}
        <path d="M32 26 L 30 32 L 32 30 L 34 32 Z"
              fill={stroke} stroke="none"/>

        {/* Eyes — teardrop almonds, angled inward (alert, reading) */}
        <path d="M25 34
                 C 24 36, 25 38, 28 37
                 C 28 35, 27 34, 25 34 Z"
              fill={stroke} stroke="none"/>
        <path d="M39 34
                 C 40 36, 39 38, 36 37
                 C 36 35, 37 34, 39 34 Z"
              fill={stroke} stroke="none"/>

        {/* Nose — small triangular wedge */}
        <path d="M30.5 40 L 32 42 L 33.5 40 Z"
              fill={stroke} stroke="none"/>
        {/* Philtrum groove */}
        <path d="M32 42 L 32 44" opacity="0.7"/>
        {/* Buck teeth — two small chevrons */}
        <path d="M31 44 L 31 46 L 31.6 45.4"/>
        <path d="M33 44 L 33 46 L 32.4 45.4"/>

        {/* Whisker flourishes (3 per side, tapering) */}
        <path d="M22 38 L 18 37" opacity="0.6"/>
        <path d="M22 40 L 17 40" opacity="0.6"/>
        <path d="M22 42 L 18 43" opacity="0.6"/>
        <path d="M42 38 L 46 37" opacity="0.6"/>
        <path d="M42 40 L 47 40" opacity="0.6"/>
        <path d="M42 42 L 46 43" opacity="0.6"/>

        {/* ── Paws — symmetric, gripping the book from above ─────────── */}
        {/* Left paw */}
        <path d="M24 46
                 C 22 47, 21 49, 22 51
                 L 26 51
                 C 27 49, 27 47, 26 46 Z"
              strokeLinejoin="round"/>
        {/* Left paw claws (3 small teardrop tips) */}
        <path d="M22.5 51 L 22.5 53" />
        <path d="M24 51 L 24 53.2" />
        <path d="M25.5 51 L 25.5 53" />
        {/* Right paw — mirror */}
        <path d="M40 46
                 C 42 47, 43 49, 42 51
                 L 38 51
                 C 37 49, 37 47, 38 46 Z"
              strokeLinejoin="round"/>
        <path d="M41.5 51 L 41.5 53" />
        <path d="M40 51 L 40 53.2" />
        <path d="M38.5 51 L 38.5 53" />

        {/* ── Open tome — fanned pages with central binding ridge ───── */}
        {/* Book outline — open V-shape with curled outer edges */}
        <path d="M14 52
                 C 16 51, 22 50, 28 52
                 L 32 54
                 L 36 52
                 C 42 50, 48 51, 50 52
                 L 48 60
                 C 42 59, 38 59, 34 60
                 L 32 61
                 L 30 60
                 C 26 59, 22 59, 16 60 Z"
              strokeLinejoin="round"/>
        {/* Center binding spine — spear flourish */}
        <path d="M32 54 L 30 57 L 32 61 L 34 57 Z"
              fill={stroke} stroke="none"/>
        {/* Page lines — left side */}
        <path d="M18 54 C 22 53.5, 26 54, 28 55" opacity="0.65"/>
        <path d="M18 56 C 22 55.5, 26 56, 28 57" opacity="0.65"/>
        {/* Page lines — right side */}
        <path d="M46 54 C 42 53.5, 38 54, 36 55" opacity="0.65"/>
        <path d="M46 56 C 42 55.5, 38 56, 36 57" opacity="0.65"/>

        {/* ── Acorn flourishes at base corners ────────────────────── */}
        <path d="M10 60 C 10 58, 13 58, 13 60 C 13 62, 10 62, 10 60 Z"
              opacity="0.8"/>
        <path d="M10 58 L 11.5 56" opacity="0.8"/>
        <path d="M51 60 C 51 58, 54 58, 54 60 C 54 62, 51 62, 51 60 Z"
              opacity="0.8"/>
        <path d="M54 58 L 52.5 56" opacity="0.8"/>
      </>
    ),

    // ── Flavour — grail chalice with a blossoming flame crown ──────────
    // Ornate stemmed goblet, curling flame tongues, base plinth with a
    // carved foot. Heraldic drinking-vessel crest.
    flavor: (
      <>
        {/* Flame crown — central spire flanked by smaller tongues */}
        <path d="M32 6 C 28 11, 30 14, 29 17 C 26 15, 25 11, 25 11 C 24 15, 22 17, 24 21 C 28 20, 29 19, 32 18 C 35 19, 36 20, 40 21 C 42 17, 40 15, 39 11 C 39 11, 38 15, 35 17 C 34 14, 36 11, 32 6 Z"
              strokeLinejoin="round"/>
        {/* Flame inner tongue */}
        <path d="M32 10 C 30 13, 31 16, 32 18 C 33 16, 34 13, 32 10 Z" fill={fill} opacity="0.6"/>
        {/* Chalice upper rim — ornate lip */}
        <path d="M16 22 L 48 22"/>
        <path d="M14 22 Q 14 19, 17 19 L 47 19 Q 50 19, 50 22"/>
        {/* Chalice bowl with side volutes */}
        <path d="M16 22 C 16 32, 22 38, 32 38 C 42 38, 48 32, 48 22"
              strokeLinejoin="round"/>
        {/* Bowl inner fluting */}
        <path d="M24 24 C 24 30, 26 34, 32 35" opacity="0.55"/>
        <path d="M40 24 C 40 30, 38 34, 32 35" opacity="0.55"/>
        {/* Stem with knop (node) */}
        <path d="M32 38 L 32 44"/>
        <path d="M27 44 Q 32 48, 37 44 Q 32 41, 27 44 Z"/>
        {/* Lower stem */}
        <path d="M32 48 L 32 52"/>
        {/* Base — plinth with foot */}
        <path d="M22 58 L 42 58"/>
        <path d="M24 52 L 40 52 L 44 58 L 20 58 Z" strokeLinejoin="miter"/>
        {/* Base ornament line */}
        <path d="M26 55 L 38 55" opacity="0.5"/>
      </>
    ),

    // ── Rivalry — horned warlord helm (redrawn at higher detail) ───────
    // Two broad backswept horns, crowned dome, narrow visor slits,
    // carved nose guard, cheek guards with rivets.
    rivalry: (
      <>
        {/* Left horn — thick ribbed curl */}
        <path d="M15 26 C 8 22, 4 16, 5 6 C 10 10, 14 13, 18 17 L 20 22 Z"
              fill={fill} strokeLinejoin="round"/>
        {/* Left horn ridges */}
        <path d="M9 11 Q 12 12, 14 15" opacity="0.7"/>
        <path d="M10 16 Q 13 17, 15 19" opacity="0.7"/>
        {/* Right horn — mirror */}
        <path d="M49 26 C 56 22, 60 16, 59 6 C 54 10, 50 13, 46 17 L 44 22 Z"
              fill={fill} strokeLinejoin="round"/>
        <path d="M55 11 Q 52 12, 50 15" opacity="0.7"/>
        <path d="M54 16 Q 51 17, 49 19" opacity="0.7"/>

        {/* Helm dome — rounded crown */}
        <path d="M17 24 C 19 16, 25 12, 32 12 C 39 12, 45 16, 47 24"
              strokeLinejoin="round"/>
        {/* Crown spike */}
        <path d="M29 12 L 32 6 L 35 12"/>
        {/* Brow ridge line */}
        <path d="M17 24 L 47 24"/>
        {/* Forehead chevron ornament */}
        <path d="M25 20 L 32 16 L 39 20" opacity="0.7"/>

        {/* Cheek guards + visor block */}
        <path d="M17 24 L 17 36 L 22 44 L 28 46 L 32 50 L 36 46 L 42 44 L 47 36 L 47 24 Z"
              strokeLinejoin="round"/>

        {/* Visor slits — angular eye openings */}
        <path d="M22 29 L 28 27 L 30 31 L 23 33 Z" fill={stroke} stroke="none"/>
        <path d="M42 29 L 36 27 L 34 31 L 41 33 Z" fill={stroke} stroke="none"/>

        {/* Nose guard — vertical ridge */}
        <path d="M32 25 L 30 40 L 32 45 L 34 40 Z" strokeLinejoin="round"/>
        {/* Cheek rivets */}
        <circle cx="22" cy="39" r="1.1" fill={stroke} stroke="none"/>
        <circle cx="42" cy="39" r="1.1" fill={stroke} stroke="none"/>
        {/* Chin fang-points */}
        <path d="M28 46 L 30 52 L 32 50 L 34 52 L 36 46" opacity="0.8"/>
      </>
    ),

    // ── Allegiance — heraldic knot of two clasped hands with a cord ────
    // Two bracer-armored forearms meeting in a warrior's handclasp,
    // bound by a circular cord & shield lozenge. Alliance sworn in iron.
    allegiance: (
      <>
        {/* Outer binding circle */}
        <circle cx="32" cy="32" r="24"/>
        {/* Inner decorative ring */}
        <circle cx="32" cy="32" r="21" strokeDasharray="2 3" opacity="0.55"/>

        {/* Left forearm — bracer with studs */}
        <path d="M4 40 L 20 34 L 30 34 L 32 32 L 30 30 L 20 30 L 4 24"
              strokeLinejoin="round"/>
        {/* Left bracer bands */}
        <path d="M10 26 L 10 38" opacity="0.7"/>
        <path d="M16 28 L 16 36" opacity="0.7"/>
        {/* Left bracer studs */}
        <circle cx="10" cy="32" r="1" fill={stroke} stroke="none"/>
        <circle cx="16" cy="32" r="1" fill={stroke} stroke="none"/>

        {/* Right forearm — mirror */}
        <path d="M60 40 L 44 34 L 34 34 L 32 32 L 34 30 L 44 30 L 60 24"
              strokeLinejoin="round"/>
        <path d="M54 26 L 54 38" opacity="0.7"/>
        <path d="M48 28 L 48 36" opacity="0.7"/>
        <circle cx="54" cy="32" r="1" fill={stroke} stroke="none"/>
        <circle cx="48" cy="32" r="1" fill={stroke} stroke="none"/>

        {/* Central lozenge — the clasped-hand knot */}
        <path d="M32 22 L 42 32 L 32 42 L 22 32 Z" strokeLinejoin="miter"/>
        {/* Inner knot */}
        <path d="M32 28 L 36 32 L 32 36 L 28 32 Z" strokeLinejoin="miter"/>
        <circle cx="32" cy="32" r="1.5" fill={stroke} stroke="none"/>

        {/* Cord flourishes — tassels top/bottom */}
        <path d="M32 8 L 32 14 M 30 12 L 32 14 L 34 12" opacity="0.75"/>
        <path d="M32 56 L 32 50 M 30 52 L 32 50 L 34 52" opacity="0.75"/>
      </>
    ),

    // ── Fun — radiant sun-face crest with rays ─────────────────────────
    // Classical heraldic "sun in splendor": a face of the sun with
    // alternating straight/wavy rays. Warm, ceremonial, unmistakable.
    fun: (
      <>
        {/* Outer rays — 8 straight */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
          const rad = (a * Math.PI) / 180;
          const x1 = 32 + Math.cos(rad) * 22;
          const y1 = 32 + Math.sin(rad) * 22;
          const x2 = 32 + Math.cos(rad) * 30;
          const y2 = 32 + Math.sin(rad) * 30;
          return <path key={`r${a}`} d={`M${x1} ${y1} L ${x2} ${y2}`}/>;
        })}
        {/* Wavy rays between — 8 */}
        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map(a => {
          const rad = (a * Math.PI) / 180;
          const x1 = 32 + Math.cos(rad) * 22;
          const y1 = 32 + Math.sin(rad) * 22;
          const x2 = 32 + Math.cos(rad) * 28;
          const y2 = 32 + Math.sin(rad) * 28;
          // triangle flame ray
          const perp = rad + Math.PI / 2;
          const mx = 32 + Math.cos(rad) * 25 + Math.cos(perp) * 1.6;
          const my = 32 + Math.sin(rad) * 25 + Math.sin(perp) * 1.6;
          return <path key={`w${a}`} d={`M${x1} ${y1} L ${mx} ${my} L ${x2} ${y2}`} opacity="0.85"/>;
        })}

        {/* Sun disc */}
        <circle cx="32" cy="32" r="14" fill={fill}/>
        {/* Inner ring */}
        <circle cx="32" cy="32" r="11" opacity="0.55"/>

        {/* Sun face — brows */}
        <path d="M24 28 Q 27 26, 30 28" />
        <path d="M34 28 Q 37 26, 40 28" />
        {/* Eyes */}
        <circle cx="27" cy="30.5" r="1.4" fill={stroke} stroke="none"/>
        <circle cx="37" cy="30.5" r="1.4" fill={stroke} stroke="none"/>
        {/* Nose curl */}
        <path d="M32 32 Q 31 34, 32 36" opacity="0.7"/>
        {/* Smile — broad crescent */}
        <path d="M25 36 Q 32 42, 39 36" />
        {/* Cheek dots */}
        <circle cx="23" cy="34" r="0.9" fill={stroke} stroke="none" opacity="0.6"/>
        <circle cx="41" cy="34" r="0.9" fill={stroke} stroke="none" opacity="0.6"/>
      </>
    ),
  };
  return <svg {...p}>{glyphs[name] || null}</svg>;
}


// ─── AuraMark — the brand mark, inline SVG so it renders anywhere ─
function AuraMark({ size = 22, color = 'var(--forest)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs>
        <clipPath id={`aura-clip-${size}`}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
      </defs>
      <g clipPath={`url(#aura-clip-${size})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

function ReviewHeader({ onBack }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'rgba(245,239,226,0.85)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      borderBottom: '1px solid var(--line)',
    }}>
      <button onClick={onBack} style={{
        width: 40, height: 40, borderRadius: 999, border: 'none',
        background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink)', cursor: 'pointer',
      }}>
        <Icon name="chevron-left" size={24}/>
      </button>
      <h1 style={{
        margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 700,
        fontSize: 20, letterSpacing: '-0.01em', color: 'var(--ink)',
        flex: 1,
      }}>Review Game</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.75 }}>
        <AuraMark size={20}/>
      </div>
    </div>
  );
}

// ─── Category badge ────────────────────────────────────────────
function CategoryBadge({ cat, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: cat.soft, color: cat.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1.5px solid ${cat.color}`,
    }}>
      <BadgeGlyph name={cat.glyph} size={Math.round(size * 0.62)} stroke={cat.color}/>
    </div>
  );
}

// ─── Player option (for active card) ───────────────────────────
function PlayerOption({ player, selected, faded, onSelect }) {
  return (
    <button onClick={() => onSelect(player.id)} style={{
      flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
      opacity: faded ? 0.28 : 1,
      transition: 'opacity 160ms var(--ease)',
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 999, overflow: 'hidden',
          border: '2px solid var(--parchment-card)',
          boxShadow: selected
            ? '0 0 0 3px var(--copper)'
            : '0 0 0 1px var(--line)',
          transition: 'box-shadow 160ms var(--ease)',
          background: 'var(--parchment-deep)',
        }}>
          <img src={player.art} alt="" style={{ width: '100%', height: '100%', display: 'block' }}/>
        </div>
        {selected && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 999,
            background: 'rgba(176,107,44,0.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <Icon name="check" size={26} width={2.5}/>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{player.name}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{player.commanderShort}</div>
      </div>
    </button>
  );
}

// ─── Skip option ───────────────────────────────────────────────
function SkipOption({ faded, onSelect }) {
  return (
    <button onClick={onSelect} style={{
      flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
      opacity: faded ? 0.28 : 1,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 999,
        border: '1.5px dashed var(--line-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg-subtle)', background: 'var(--parchment)',
      }}>
        <Icon name="arrow-right" size={22}/>
      </div>
      <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Skip</div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>No answer</div>
      </div>
    </button>
  );
}

Object.assign(window, { PLAYERS, CATEGORIES, BRACKET_QUESTION, Icon, BadgeGlyph, AuraMark, ReviewHeader, CategoryBadge, PlayerOption, SkipOption });
