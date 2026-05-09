// Dark mode design tokens — KeepsakeCard-inspired
// Always-on dark mode, no light/dark toggle needed

export const DARK = {
  bg:        '#0A0604',
  bgCard:    '#150E08',
  bgDeep:    '#050302',
  ink:       '#F0E8D8',
  ink2:      '#C5B9A5',
  ink3:      '#8A7E6F',
  ink4:      '#5C5043',
  copper:    '#E2B858',
  copperDim: 'rgba(226,184,88,0.55)',
  copperGlow:'rgba(201,155,47,0.34)',
  gold:      '#C99B2F',
  forest:    '#B06B2C',
  forestDeep:'#8C5422',
  line:      'rgba(226,184,88,0.10)',
  lineStrong:'rgba(226,184,88,0.18)',
  cellBorder:'rgba(226,184,88,0.14)',
  shadowRest:'0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
  navBg:     'linear-gradient(180deg, rgba(10,6,4,0) 0%, rgba(10,6,4,0.92) 30%, #0A0604 100%)',
  navPill:   '#150E08',
} as const;

// Mana color wash for cell backgrounds
export const COLOR_WASH: Record<string, string> = {
  W: 'rgba(245,235,200,0.14)',
  U: 'rgba(80,160,220,0.10)',
  B: 'rgba(130,100,160,0.10)',
  R: 'rgba(220,100,80,0.10)',
  G: 'rgba(80,180,120,0.10)',
  C: 'rgba(168,159,142,0.10)',
};

// Commander damage heat colors (green → yellow → orange → red)
export const CMDR_DMG_COLORS = [
  '#5A9E6F','#8AB866','#B8CC55','#D4B84A','#D49A3E','#D47A34','#CC5B30','#B83A2A','#A02626','#8B1A1A',
];

// Counter type definitions
export const COUNTER_VOCAB = {
  poison:     { label: 'Poison',     glyph: 'skull',    tone: '#4F8A4D', soft: '#E2EBDB', lethal: 10 },
  energy:     { label: 'Energy',     glyph: 'bolt',     tone: '#C99B2F', soft: '#F6ECD2', lethal: null },
  experience: { label: 'Experience', glyph: 'star',     tone: '#7E4E8A', soft: '#EADDEE', lethal: null },
} as const;

// Mana color styles for player tiles
export const MANA_STYLES: Record<string, {
  grad: number[][];
  border: string;
  shadow: string;
}> = {
  W: {
    grad: [[160,140,90],[190,170,115],[210,192,140]],
    border: 'rgba(210,192,140,0.5)',
    shadow: 'rgba(210,192,140,0.15)',
  },
  U: {
    grad: [[14,72,110],[26,100,140],[42,125,165]],
    border: 'rgba(42,125,165,0.5)',
    shadow: 'rgba(42,125,165,0.15)',
  },
  B: {
    grad: [[25,18,30],[42,35,50],[60,52,68]],
    border: 'rgba(60,52,68,0.5)',
    shadow: 'rgba(60,52,68,0.15)',
  },
  R: {
    grad: [[120,42,30],[148,64,48],[172,88,68]],
    border: 'rgba(172,88,68,0.5)',
    shadow: 'rgba(172,88,68,0.15)',
  },
  G: {
    grad: [[14,92,77],[26,122,106],[42,143,120]],
    border: 'rgba(42,143,120,0.5)',
    shadow: 'rgba(42,143,120,0.15)',
  },
};
