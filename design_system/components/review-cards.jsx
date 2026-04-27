// ReviewCard — individual question cards (done, active, inactive states)

function DoneCard({ idx, cat, answerPlayer, onReopen }) {
  return (
    <button onClick={onReopen} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'var(--parchment-card)',
      border: '1px solid var(--line)',
      borderLeft: '4px solid var(--forest)',
      borderRadius: 'var(--r-card)',
      padding: '14px 16px 14px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow-rest)',
      fontFamily: 'var(--font-ui)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{idx + 1}/6</span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{cat.question}</span>
      {answerPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, overflow: 'hidden', border: '2px solid var(--parchment-card)', boxShadow: '0 0 0 1px var(--line)' }}>
            <img src={answerPlayer.art} alt="" style={{ width: '100%', height: '100%' }}/>
          </div>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 500 }}>{answerPlayer.commanderShort}</span>
        </div>
      )}
    </button>
  );
}

function InactiveCard({ idx, cat }) {
  return (
    <div style={{
      background: 'var(--parchment-card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-card)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow-rest)',
      opacity: 0.72,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{idx + 1}/6</span>
      <span style={{ flex: 1, fontSize: 15, color: 'var(--fg-subtle)', fontWeight: 500 }}>{cat.question}</span>
    </div>
  );
}

function ActiveCard({ idx, cat, selectedId, onSelect, variant = 'default' }) {
  // variant: 'default' | 'ornate' | 'flat'
  const faded = selectedId != null;

  const borderTreatment = variant === 'ornate'
    ? { border: `1.5px solid ${cat.color}`, borderLeft: `6px solid ${cat.color}` }
    : variant === 'flat'
    ? { border: '1px solid var(--line)', borderTop: `3px solid ${cat.color}` }
    : { border: '1px solid var(--line)', borderLeft: `4px solid ${cat.color}` };

  return (
    <div style={{
      background: variant === 'ornate' ? 'var(--parchment-card)' : 'var(--parchment-card)',
      ...borderTreatment,
      borderRadius: 'var(--r-card)',
      padding: variant === 'ornate' ? '22px 20px 24px' : '20px 18px 22px',
      boxShadow: 'var(--shadow-active)',
      position: 'relative',
    }}>
      {/* Category row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <CategoryBadge cat={cat} size={variant === 'ornate' ? 44 : 40}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: cat.color,
          }}>
            {cat.label} · {idx + 1}/6
          </div>
          <div style={{
            fontSize: variant === 'ornate' ? 26 : 22,
            fontWeight: variant === 'ornate' ? 400 : 700, color: 'var(--ink)', letterSpacing: '-0.01em',
            fontFamily: variant === 'ornate' ? 'var(--font-display)' : 'var(--font-ui)',
            lineHeight: 1.15, marginTop: 2,
          }}>
            {cat.question}
          </div>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {PLAYERS.map(p => (
          <PlayerOption key={p.id}
            player={p}
            selected={selectedId === p.id}
            faded={faded && selectedId !== p.id}
            onSelect={onSelect}
          />
        ))}
        <SkipOption
          faded={faded && selectedId !== '__skip'}
          onSelect={() => onSelect('__skip')}
        />
      </div>
    </div>
  );
}

// ─── Confirmation card ─────────────────────────────────────────
function ConfirmationCard({ answers, onAccept }) {
  return (
    <div style={{
      background: 'var(--forest-soft)',
      border: '1px solid var(--forest-line)',
      borderRadius: 'var(--r-card)',
      padding: '22px 20px',
      boxShadow: 'var(--shadow-active)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 999, background: 'var(--forest)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={20} width={2.5}/>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', lineHeight: 1.1 }}>Review complete</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Here's your feedback</div>
        </div>
      </div>
    </div>
  );
}

// ─── Bracket check card (Q6) ───────────────────────────────────
// Different shape from trait cards: no badge glyph, no aura awarded.
// Commander list as checkboxes, plus "everyone was on bracket" default.
// Three states: inactive, active, done.

function BracketInactiveCard({ idx, q }) {
  return (
    <div style={{
      background: 'var(--parchment-card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-card)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow-rest)',
      opacity: 0.72,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{idx + 1}/6</span>
      <span style={{ flex: 1, fontSize: 15, color: 'var(--fg-subtle)', fontWeight: 500 }}>{q.question}</span>
    </div>
  );
}

function BracketDoneCard({ idx, q, answer, onReopen }) {
  // answer: 'on-bracket' | playerId
  const player = answer && answer !== 'on-bracket' ? PLAYERS.find(p => p.id === answer) : null;
  return (
    <button onClick={onReopen} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'var(--parchment-card)',
      border: '1px solid var(--line)',
      borderLeft: '4px solid var(--ink-3)',
      borderRadius: 'var(--r-card)',
      padding: '14px 16px 14px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow-rest)',
      fontFamily: 'var(--font-ui)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{idx + 1}/6</span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{q.question}</span>
      {player ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, overflow: 'hidden', border: '2px solid var(--parchment-card)', boxShadow: '0 0 0 1px var(--line)' }}>
            <img src={player.art} alt="" style={{ width: '100%', height: '100%' }}/>
          </div>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 500 }}>{player.commanderShort}</span>
        </div>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 500, fontStyle: 'italic' }}>On bracket</span>
      )}
    </button>
  );
}

function BracketActiveCard({ idx, q, selected, onSelect, variant = 'default' }) {
  // selected: null | 'on-bracket' | playerId
  const borderTreatment = variant === 'ornate'
    ? { border: '1.5px solid var(--ink-3)', borderLeft: '6px solid var(--ink-3)' }
    : variant === 'flat'
    ? { border: '1px solid var(--line)', borderTop: '3px solid var(--ink-3)' }
    : { border: '1px solid var(--line)', borderLeft: '4px solid var(--ink-3)' };

  return (
    <div style={{
      background: 'var(--parchment-card)',
      ...borderTreatment,
      borderRadius: 'var(--r-card)',
      padding: variant === 'ornate' ? '22px 20px 24px' : '20px 18px 22px',
      boxShadow: 'var(--shadow-active)',
    }}>
      {/* Header — uses a scales-of-balance icon instead of a trait sigil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: variant === 'ornate' ? 44 : 40, height: variant === 'ornate' ? 44 : 40,
          borderRadius: 999, background: 'var(--parchment-deep)',
          border: '1.5px solid var(--ink-3)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Balance / scales glyph */}
          <svg width={variant === 'ornate' ? 28 : 24} height={variant === 'ornate' ? 28 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v16"/>
            <path d="M6 20h12"/>
            <path d="M4 9h16"/>
            <path d="M4 9l-2 5a3 3 0 0 0 6 0z"/>
            <path d="M20 9l-2 5a3 3 0 0 0 6 0z"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-2)',
          }}>Bracket check · {idx + 1}/6</div>
          <div style={{
            fontSize: variant === 'ornate' ? 24 : 20,
            fontWeight: variant === 'ornate' ? 400 : 700, color: 'var(--ink)', letterSpacing: '-0.01em',
            fontFamily: variant === 'ornate' ? 'var(--font-display)' : 'var(--font-ui)',
            lineHeight: 1.15, marginTop: 2,
          }}>{q.question}</div>
        </div>
      </div>

      {/* "Everyone was on bracket" — default, prominent */}
      <BracketRow
        label="Everyone was on bracket"
        sub="Default · no deck outpaced the table"
        selected={selected === 'on-bracket'}
        onSelect={() => onSelect('on-bracket')}
        leading={
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: selected === 'on-bracket' ? 'var(--forest)' : 'var(--parchment-deep)',
            color: selected === 'on-bracket' ? 'var(--parchment)' : 'var(--ink-2)',
            border: selected === 'on-bracket' ? 'none' : '1.5px dashed var(--line-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={20} width={2.5}/>
          </div>
        }
      />

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, margin: '12px 2px',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>Or flag a deck</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
      </div>

      {/* Commander rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {PLAYERS.map(p => (
          <BracketRow
            key={p.id}
            label={p.commanderShort}
            sub={p.name}
            selected={selected === p.id}
            onSelect={() => onSelect(p.id)}
            leading={
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 999, overflow: 'hidden',
                  border: '2px solid var(--parchment-card)',
                  boxShadow: selected === p.id
                    ? '0 0 0 2px var(--cat-rivalry)'
                    : '0 0 0 1px var(--line)',
                }}>
                  <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block' }}/>
                </div>
                {selected === p.id && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 999,
                    background: 'rgba(158,43,43,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                  }}>
                    <Icon name="check" size={18} width={2.5}/>
                  </div>
                )}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

function BracketRow({ label, sub, selected, onSelect, leading }) {
  return (
    <button onClick={onSelect} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 10px', borderRadius: 12,
      background: selected ? 'var(--parchment-deep)' : 'transparent',
      border: 'none',
      fontFamily: 'var(--font-ui)',
      transition: 'background 120ms var(--ease)',
    }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}

Object.assign(window, { DoneCard, InactiveCard, ActiveCard, ConfirmationCard, BracketInactiveCard, BracketDoneCard, BracketActiveCard });
