// GameReviewScreen — the whole mid-flow Game Review screen
// State: Q1 answered (Frederico/Omnath), Q2 active (Flavor), Q3-6 inactive.

function GameReviewScreen({ variant = 'default', showBracket = false }) {
  // Mid-flow demo state — Q1 answered with Frederico, Q2 active, rest inactive
  const [answers, setAnswers] = React.useState(
    showBracket
      ? { brilliance: 'frederico', flavor: 'tomas', rivalry: 'manel', allegiance: 'sofia', fun: 'manel' }
      : { brilliance: 'frederico' }
  );
  const [activeIdx, setActiveIdx] = React.useState(showBracket ? -1 : 1);
  const [bracketAnswer, setBracketAnswer] = React.useState(null);

  // Scroll bracket into view on the showBracket variant
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (showBracket && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [showBracket]);

  const selectAnswer = (catId, playerId) => {
    setAnswers(a => ({ ...a, [catId]: playerId }));
  };

  const allAnswered = CATEGORIES.every(c => answers[c.id] != null);
  const accent = variant === 'ornate' ? 'var(--copper)' : 'var(--forest)';

  return (
    <div className="ph-root" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--parchment)',
      backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(201,155,47,0.04), transparent 40%), radial-gradient(circle at 90% 80%, rgba(47,93,58,0.05), transparent 40%)',
    }}>
      <ReviewHeader onBack={() => {}}/>

      {/* Card stack */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 120px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {CATEGORIES.map((cat, idx) => {
          const ans = answers[cat.id];
          const isActive = !showBracket && idx === activeIdx;
          if (ans != null) {
            const player = PLAYERS.find(p => p.id === ans);
            return <DoneCard key={cat.id} idx={idx} cat={cat} answerPlayer={player} onReopen={() => setActiveIdx(idx)}/>;
          }
          if (isActive) {
            return (
              <div key={cat.id} style={{ margin: '10px 0' }}>
                <ActiveCard
                  idx={idx} cat={cat}
                  selectedId={answers[cat.id]}
                  onSelect={(pid) => selectAnswer(cat.id, pid)}
                  variant={variant}
                />
              </div>
            );
          }
          return <InactiveCard key={cat.id} idx={idx} cat={cat}/>;
        })}

        {/* Q6 — bracket check (different UI, no aura awarded) */}
        {showBracket ? (
          <div style={{ margin: '10px 0' }}>
            <BracketActiveCard
              idx={5} q={BRACKET_QUESTION}
              selected={bracketAnswer}
              onSelect={setBracketAnswer}
              variant={variant}
            />
          </div>
        ) : (
          <BracketInactiveCard idx={5} q={BRACKET_QUESTION}/>
        )}

        {allAnswered && <ConfirmationCard answers={answers}/>}
      </div>

      {/* Action button */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 16px 32px',
        background: 'linear-gradient(to top, var(--parchment) 60%, rgba(245,239,226,0))',
        pointerEvents: 'none',
      }}>
        <button disabled={!allAnswered} style={{
          pointerEvents: 'auto',
          width: '100%', border: 'none',
          background: accent, color: 'var(--parchment)',
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16,
          padding: '16px 20px', borderRadius: 'var(--r-card)',
          boxShadow: allAnswered ? 'var(--shadow-rest)' : 'none',
          opacity: allAnswered ? 1 : 0.4,
          cursor: allAnswered ? 'pointer' : 'not-allowed',
          transition: 'opacity 160ms var(--ease)',
        }}>Accept Review</button>
      </div>
    </div>
  );
}

Object.assign(window, { GameReviewScreen });
