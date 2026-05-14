'use client';

import React, { useEffect, useState } from 'react';
import { getCommanderPrintings, CommanderPrinting } from '@/lib/scryfall';
import { updateCommanderArt } from '@/lib/commanders';

// Picker modal that lists every printing of a commander on Scryfall and
// lets the user pick which art_crop to use. Persists the choice to
// decks.commander_art_url so every surface in the app re-derives art from
// the same column.

export type CommanderArtPickerProps = {
  open: boolean;
  deckId: string;
  commanderName: string;
  /** The art URL the deck currently shows. Used to highlight which printing is active. */
  currentArtUrl?: string | null;
  onClose: () => void;
  /** Called with the new art URL after a successful save (parent can refresh local state). */
  onSaved?: (newArtUrl: string) => void;
  /** Render in dark mode. */
  dark?: boolean;
};

const DARK_TOKEN_OVERRIDES: Record<string, string> = {
  '--parchment':      '#0A0604',
  '--parchment-card': '#150E08',
  '--parchment-deep': '#050302',
  '--ink':            '#F0E8D8',
  '--ink-2':          '#C5B9A5',
  '--ink-3':          '#8A7E6F',
  '--ink-4':          '#5C5043',
  '--fg-subtle':      '#8A7E6F',
  '--copper':         '#E2B858',
  '--line':           'rgba(226,184,88,0.10)',
  '--line-strong':    'rgba(226,184,88,0.18)',
};

export function CommanderArtPicker({
  open,
  deckId,
  commanderName,
  currentArtUrl,
  onClose,
  onSaved,
  dark = false,
}: CommanderArtPickerProps) {
  const [printings, setPrintings] = useState<CommanderPrinting[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !commanderName) return;
    let cancelled = false;
    setPrintings(null);
    setSelectedId(null);
    setErrorText(null);
    getCommanderPrintings(commanderName).then((rows) => {
      if (cancelled) return;
      setPrintings(rows);
      // Highlight whichever printing matches the deck's current art URL.
      if (currentArtUrl) {
        const match = rows.find((p) => p.art_crop === currentArtUrl);
        if (match) setSelectedId(match.id);
      }
    });
    return () => { cancelled = true; };
  }, [open, commanderName, currentArtUrl]);

  if (!open) return null;

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: dark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(43, 33, 24, 0.40)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  };
  const wrapperStyle: React.CSSProperties = dark
    ? (Object.assign({}, baseStyle, DARK_TOKEN_OVERRIDES) as React.CSSProperties)
    : baseStyle;

  const handleSave = async () => {
    if (!selectedId || !printings) return;
    const chosen = printings.find((p) => p.id === selectedId);
    if (!chosen?.art_crop) {
      setErrorText('This printing has no art crop available.');
      return;
    }
    setSaving(true);
    setErrorText(null);
    const { error } = await updateCommanderArt(deckId, chosen.art_crop);
    setSaving(false);
    if (error) {
      setErrorText(error);
      return;
    }
    onSaved?.(chosen.art_crop);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" style={wrapperStyle}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--parchment-card)',
          color: 'var(--ink)',
          borderRadius: 20,
          border: '1px solid var(--line-strong)',
          boxShadow: '0 30px 60px -16px rgba(43,33,24,0.45)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 8px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--copper)',
              marginBottom: 4,
            }}
          >
            Commander art
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              lineHeight: 1.15,
              color: 'var(--ink)',
            }}
          >
            {commanderName}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'var(--fg-subtle)',
              marginTop: 4,
            }}
          >
            Pick a printing to use everywhere this deck appears.
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 16px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {printings === null && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--fg-subtle)',
                fontSize: 13,
                padding: '20px 0',
              }}
            >
              Loading printings…
            </div>
          )}
          {printings && printings.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--fg-subtle)',
                fontSize: 13,
                padding: '20px 0',
              }}
            >
              No printings found for "{commanderName}".
            </div>
          )}
          {printings?.map((p) => {
            const selected = selectedId === p.id;
            const thumb = p.art_crop ?? p.normal;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                style={{
                  appearance: 'none',
                  background: 'var(--parchment-deep)',
                  border: `2px solid ${selected ? 'var(--copper)' : 'var(--line-strong)'}`,
                  borderRadius: 12,
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textAlign: 'left',
                  boxShadow: selected ? '0 0 0 2px rgba(226,184,88,0.25)' : 'none',
                  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease',
                  transform: selected ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 11',
                    backgroundImage: thumb ? `url(${thumb})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    background: thumb ? undefined : 'rgba(176,107,44,0.12)',
                  }}
                />
                <div
                  style={{
                    padding: '6px 8px 8px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 10,
                    color: 'var(--fg-subtle)',
                    lineHeight: 1.3,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--ink)',
                      fontSize: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.set_name}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    #{p.collector_number}
                    {p.released_at ? ` · ${p.released_at.slice(0, 4)}` : ''}
                    {p.promo ? ' · promo' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {errorText && (
          <div
            style={{
              margin: '0 16px 8px',
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(158,43,43,0.18)',
              border: '1px solid rgba(158,43,43,0.35)',
              color: '#E78A85',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            {errorText}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '12px 16px 16px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line-strong)',
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedId || saving}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 999,
              background: !selectedId || saving ? 'rgba(176,107,44,0.5)' : 'var(--copper)',
              color: 'var(--parchment)',
              border: 'none',
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: !selectedId || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Use this art'}
          </button>
        </div>
      </div>
    </div>
  );
}
