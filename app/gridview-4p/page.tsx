'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getGame } from '@/lib/games';
import { updateLifeTotal, updatePoisonCounters, updateExperienceCounters, updateEnergyCounters, concedeGame, updateLifeBySeat, updatePoisonBySeat, updateExperienceBySeat, updateEnergyBySeat } from '@/lib/game-triggers';
import { supabase } from '@/lib/supabase';
import { useWakeLock } from '@/lib/use-wake-lock';
import { getQrCodeUrl } from '@/lib/pods';

function PageContent() {
  useWakeLock();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') ?? '';
  const podId = searchParams.get('podId') ?? '';

  // Sync life changes to backend (debounced fire-and-forget)
  const syncLife = (userId: string, newLife: number) => {
    if (gameId) updateLifeTotal(gameId, userId, newLife).catch(() => {});
  };
  const syncPoison = (userId: string, count: number) => {
    if (gameId) updatePoisonCounters(gameId, userId, count).catch(() => {});
  };
  const syncExperience = (userId: string, count: number) => {
    if (gameId) updateExperienceCounters(gameId, userId, count).catch(() => {});
  };
  const syncEnergy = (userId: string, count: number) => {
    if (gameId) updateEnergyCounters(gameId, userId, count).catch(() => {});
  };
  const [players, setPlayers] = useState<Record<number, { life: number; name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor: string | null }>>({
    1: { life: 40, name: 'Frederico', commander: 'Atraxa, Praetors\' Voice', claimed: true, colors: ['W', 'U', 'B', 'G'], assignedColor: null },
    2: { life: 40, name: 'Player 2', commander: null, claimed: false, colors: [], assignedColor: null },
    3: { life: 40, name: 'Player 3', commander: null, claimed: false, colors: [], assignedColor: null },
    4: { life: 40, name: 'Player 4', commander: null, claimed: false, colors: [], assignedColor: null }
  });

  const [playerColors] = useState<Record<number, string>>({
    1: 'rgb(26,122,106)',
    2: 'rgb(168,74,58)',
    3: 'rgb(42,138,86)',
    4: 'rgb(184,146,46)'
  });

  const [playerClasses] = useState<Record<number, string>>({ 1: 'p1', 2: 'p2', 3: 'p3', 4: 'p4' });

  const [manaColorStyles] = useState<Record<string, { grad: number[][]; border: number[]; shadow: number[] }>>({
    W: { grad: [[160, 140, 90], [190, 170, 115], [210, 192, 140]], border: [220, 200, 155], shadow: [160, 140, 90] },
    U: { grad: [[14, 72, 110], [26, 100, 140], [42, 125, 165]], border: [56, 135, 170], shadow: [14, 72, 110] },
    B: { grad: [[25, 18, 30], [42, 35, 50], [60, 52, 68]], border: [75, 65, 82], shadow: [25, 18, 30] },
    R: { grad: [[120, 42, 30], [148, 64, 48], [172, 88, 68]], border: [185, 100, 80], shadow: [120, 42, 30] },
    G: { grad: [[14, 92, 77], [26, 122, 106], [42, 143, 120]], border: [56, 158, 133], shadow: [14, 92, 77] }
  });

  const [usedColors, setUsedColors] = useState<string[]>([]);
  const [counters, setCounters] = useState<Record<number, { poison: number; experience: number; energy: number }>>({
    1: { poison: 0, experience: 0, energy: 0 },
    2: { poison: 0, experience: 0, energy: 0 },
    3: { poison: 0, experience: 0, energy: 0 },
    4: { poison: 0, experience: 0, energy: 0 }
  });

  const [selectedCounterPlayer, setSelectedCounterPlayer] = useState(1);
  const [diceTab, setDiceTab] = useState('d6');
  const [rolling, setRolling] = useState(false);
  const [diceResult, setDiceResult] = useState('—');
  const [rollingText, setRollingText] = useState('');
  const [joinSlot, setJoinSlot] = useState<number | null>(null);
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [countersModalOpen, setCountersModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [facingLeft, setFacingLeft] = useState(true);
  const [cellSizes, setCellSizes] = useState<Record<number, { lifeSize: number; btnSize: number; btnFont: number }>>({});

  const [podShortCode, setPodShortCode] = useState<string>('');
  const syncTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const debouncedSync = (key: string, fn: () => void) => {
    if (syncTimerRef.current[key]) clearTimeout(syncTimerRef.current[key]);
    syncTimerRef.current[key] = setTimeout(fn, 300);
  };

  // Map player slot → user_id for backend sync
  const [playerUserIds, setPlayerUserIds] = useState<Record<number, string>>({});
  const [playerSeatNumbers, setPlayerSeatNumbers] = useState<Record<number, number>>({});

  const holdTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  const repeatTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  const navCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load real game data if gameId is provided
  useEffect(() => {
    if (!gameId) return;
    async function loadGame() {
      const { data: game } = await getGame(gameId);
      if (!game) return;

      if (game.pod_id) {
        const { data: pod } = await supabase.from('pods').select('short_code').eq('id', game.pod_id).single() as { data: any };
        if (pod?.short_code) setPodShortCode(pod.short_code);
      }

      const deckIds = game.players.map((p: any) => p.deck_id).filter(Boolean);
      let deckMap = new Map();
      if (deckIds.length > 0) {
        const { data: decks } = await supabase
          .from('decks')
          .select('id, commander_name, color_identity')
          .in('id', deckIds) as { data: any };
        deckMap = new Map((decks ?? []).map((d: any) => [d.id, d]) as any);
      }

      const newPlayers: Record<number, typeof players[1]> = {};
      const newUserIds: Record<number, string> = {};
      const newSeatNumbers: Record<number, number> = {};
      const newCounters: Record<number, { poison: number; experience: number; energy: number }> = {};
      game.players.forEach((p: any) => {
        const deck: any = p.deck_id ? deckMap.get(p.deck_id) : null;
        const slot = p.seat_number ?? 1;
        if (slot > 4) return;
        const isEmptySeat = !p.user_id && !p.deck_id && !p.commander_name;
        const displayName = deck?.commander_name ?? p.commander_name ?? `Player ${slot}`;

        newPlayers[slot] = {
          life: p.life_total ?? 40,
          name: displayName.split(',')[0],
          commander: deck?.commander_name ?? p.commander_name ?? null,
          claimed: !isEmptySeat,
          colors: (deck?.color_identity ?? '').split('').filter((c: string) => 'WUBRG'.includes(c)),
          assignedColor: null,
        };
        if (p.user_id) newUserIds[slot] = p.user_id;
        newSeatNumbers[slot] = slot;
        newCounters[slot] = {
          poison: p.poison_counters ?? 0,
          experience: p.experience_counters ?? 0,
          energy: p.energy_counters ?? 0
        };
      });
      setPlayers(newPlayers);
      setPlayerUserIds(newUserIds);
      setPlayerSeatNumbers(newSeatNumbers);
      setCounters(newCounters);

      const channel = supabase
        .channel(`game-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, (payload: any) => {
          const row = payload.new;
          if (!row) return;
          const num = row.seat_number;
          if (num && num <= 4) {
            setPlayers(prev => ({ ...prev, [num]: { ...prev[num], life: row.life_total ?? prev[num].life } }));
            setCounters(prev => ({ ...prev, [num]: { poison: row.poison_counters ?? prev[num].poison, experience: row.experience_counters ?? prev[num].experience, energy: row.energy_counters ?? prev[num].energy } }));
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    loadGame();
  }, [gameId]);

  const pickPlayerColor = (playerNum: number, newUsedColors: string[]) => {
    const p = players[playerNum];
    if (!p.colors || p.colors.length === 0) return null;

    const allMana = Object.keys(manaColorStyles);

    if (!newUsedColors.includes(p.colors[0])) {
      newUsedColors.push(p.colors[0]);
      return p.colors[0];
    }

    for (let i = 1; i < p.colors.length; i++) {
      if (!newUsedColors.includes(p.colors[i])) {
        newUsedColors.push(p.colors[i]);
        return p.colors[i];
      }
    }

    const available = allMana.filter((c: any) => !newUsedColors.includes(c));
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      newUsedColors.push(pick);
      return pick;
    }

    return p.colors[0];
  };

  const qrCodeUrl = podShortCode
    ? getQrCodeUrl(podShortCode, typeof window !== 'undefined' ? window.location.origin : 'https://auramtg.com')
    : '';

  const applyColorIdentity = (playerNum: number) => {
    const p = players[playerNum];
    if (!p.claimed || !p.colors || p.colors.length === 0) return;

    const newUsedColors = [...usedColors];
    const mana = pickPlayerColor(playerNum, newUsedColors);
    setUsedColors(newUsedColors);

    if (!mana) return;

    setPlayers(prev => ({
      ...prev,
      [playerNum]: { ...p, assignedColor: mana }
    }));
  };

  const updateLifeDisplay = (playerNum: number) => {
    const life = players[playerNum].life;
    // State is managed in render
  };

  const handleLifeChange = (playerNum: number, delta: number) => {
    setPlayers(prev => {
      const newLife = Math.max(0, Math.min(999, prev[playerNum].life + delta));
      if (newLife === 0) {
        if (holdTimersRef.current[playerNum]) clearTimeout(holdTimersRef.current[playerNum]);
        if (repeatTimersRef.current[playerNum]) clearInterval(repeatTimersRef.current[playerNum]);
      }

      // Sync to backend — userId or seat fallback
      if (gameId) {
        debouncedSync(`life-${playerNum}`, () => {
          const userId = playerUserIds[playerNum];
          const seat = playerSeatNumbers[playerNum];
          if (userId) updateLifeTotal(gameId, userId, newLife).catch(() => {});
          else if (seat) updateLifeBySeat(gameId, seat, newLife).catch(() => {});
        });
      }

      return {
        ...prev,
        [playerNum]: { ...prev[playerNum], life: newLife }
      };
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const openJoinModal = (slotNum: number) => {
    setJoinSlot(slotNum);
    setJoinModalOpen(true);
  };

  const copyPodCode = () => {
    if (podShortCode) {
      navigator.clipboard.writeText(podShortCode).catch(() => {});
    }
  };

  const handleRevive = (playerNum: number) => {
    setPlayers(prev => ({
      ...prev,
      [playerNum]: { ...prev[playerNum], life: 1 }
    }));

    const userId = playerUserIds[playerNum];
    const seat = playerSeatNumbers[playerNum];
    if (gameId) {
      if (userId) updateLifeTotal(gameId, userId, 1).catch(() => {});
      else if (seat) updateLifeBySeat(gameId, seat, 1).catch(() => {});
    }
  };

  const handleDiceRoll = () => {
    if (rolling) return;
    setRolling(true);
    setRollingText('Rolling…');

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const max = diceTab === 'd6' ? 6 : diceTab === 'd20' ? 20 : 2;
      const val = Math.floor(Math.random() * max) + 1;
      setDiceResult(diceTab === 'coin' ? (val === 1 ? 'H' : 'T') : val.toString());

      if (frame >= 14) {
        clearInterval(interval);
        setRolling(false);
        const final = Math.floor(Math.random() * max) + 1;
        setDiceResult(diceTab === 'coin' ? (final === 1 ? 'HEADS' : 'TAILS') : final.toString());
        setRollingText('');
      }
    }, 70);
  };

  const handleCounterChange = (type: 'poison' | 'experience' | 'energy', action: 'plus' | 'minus') => {
    const playerNum = selectedCounterPlayer;
    setCounters(prev => {
      const newVal = action === 'plus' ? prev[playerNum][type] + 1 : Math.max(0, prev[playerNum][type] - 1);

      const userId = playerUserIds[playerNum];
      const seat = playerSeatNumbers[playerNum];
      if (gameId) {
        debouncedSync(`${type}-${playerNum}`, () => {
          if (userId) {
            if (type === 'poison') updatePoisonCounters(gameId, userId, newVal).catch(() => {});
            else if (type === 'experience') updateExperienceCounters(gameId, userId, newVal).catch(() => {});
            else if (type === 'energy') updateEnergyCounters(gameId, userId, newVal).catch(() => {});
          } else if (seat) {
            if (type === 'poison') updatePoisonBySeat(gameId, seat, newVal).catch(() => {});
            else if (type === 'experience') updateExperienceBySeat(gameId, seat, newVal).catch(() => {});
            else if (type === 'energy') updateEnergyBySeat(gameId, seat, newVal).catch(() => {});
          }
        });
      }

      return {
        ...prev,
        [playerNum]: {
          ...prev[playerNum],
          [type]: newVal
        }
      };
    });
  };

  const onPopupOpen = () => {
    setPopupOpen(true);
    if (navCollapseTimerRef.current) clearTimeout(navCollapseTimerRef.current);
    setNavCollapsed(false);
  };

  const onPopupClose = () => {
    setPopupOpen(false);
    scheduleCollapse();
  };

  const collapseNav = () => {
    if (popupOpen) return;
    setNavCollapsed(true);
  };

  const scheduleCollapse = () => {
    if (navCollapseTimerRef.current) clearTimeout(navCollapseTimerRef.current);
    navCollapseTimerRef.current = setTimeout(collapseNav, 5000);
  };

  const expandNav = () => {
    if (navCollapseTimerRef.current) clearTimeout(navCollapseTimerRef.current);
    setNavCollapsed(false);
  };

  const handleNavClick = () => {
    if (navCollapsed) {
      expandNav();
      if (!popupOpen) scheduleCollapse();
    }
  };

  const getPlayerColor = (playerNum: number) => {
    const p = players[playerNum];
    if (!p.claimed || !p.assignedColor) return null;
    const style = manaColorStyles[p.assignedColor];
    if (!style) return null;
    const [d, m, l] = style.grad;
    const brd = style.border;
    const shd = style.shadow;
    return {
      background: `linear-gradient(135deg, rgb(${d[0]},${d[1]},${d[2]}) 0%, rgb(${m[0]},${m[1]},${m[2]}) 50%, rgb(${l[0]},${l[1]},${l[2]}) 100%)`,
      border: `1.5px solid rgb(${brd[0]},${brd[1]},${brd[2]})`,
      boxShadow: `0 8px 20px rgba(${shd[0]},${shd[1]},${shd[2]},0.35), 0 2px 6px rgba(${shd[0]},${shd[1]},${shd[2]},0.25)`
    };
  };

  useEffect(() => {
    scheduleCollapse();
    const unclaimedExist = [1, 2, 3, 4].some(i => !players[i].claimed);
    if (!unclaimedExist) return;

    const PULSE_SCHEDULE = [30000, 30000, 60000, 60000];
    const PULSE_ONGOING = 300000;
    let pulseStep = 0;

    const schedulePulse = () => {
      const delay = pulseStep < PULSE_SCHEDULE.length ? PULSE_SCHEDULE[pulseStep] : PULSE_ONGOING;
      pulseStep++;
      pulseTimeoutRef.current = setTimeout(() => {
        const unclaimedPlayers = [1, 2, 3, 4].filter(i => !players[i].claimed);
        if (unclaimedPlayers.length > 0) {
          schedulePulse();
        }
      }, delay);
    };

    schedulePulse();

    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      if (navCollapseTimerRef.current) clearTimeout(navCollapseTimerRef.current);
    };
  }, []);

  const renderPlayerTile = (playerNum: 1 | 2 | 3 | 4) => {
    const p = players[playerNum];
    const colorStyle = getPlayerColor(playerNum);
    const isRotatedLeft = playerNum === 1 || playerNum === 3;
    const isEliminated = p.life === 0;

    const stopHold = () => {
      if (holdTimersRef.current[playerNum]) clearTimeout(holdTimersRef.current[playerNum]);
      if (repeatTimersRef.current[playerNum]) clearInterval(repeatTimersRef.current[playerNum]);
    };

    const startHold = (delta: number) => {
      const timer = setTimeout(() => {
        handleLifeChange(playerNum, delta * 4);
        const repeatTimer = setInterval(() => {
          handleLifeChange(playerNum, delta * 5);
        }, 200);
        repeatTimersRef.current[playerNum] = repeatTimer;
      }, 500);
      holdTimersRef.current[playerNum] = timer;
    };

    return (
      <div
        key={playerNum}
        className={`player-tile ${p.claimed ? 'claimed' : 'unclaimed'} ${playerClasses[playerNum]} ${isEliminated && !p.claimed ? 'eliminated' : ''}`}
        id={`tile${playerNum}`}
        style={colorStyle || {}}
      >
        {!p.claimed && p.life > 0 && (
          <div className="join-btn" onClick={() => openJoinModal(playerNum)} data-slot={playerNum}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 1C9.657 1 11 2.343 11 4C11 5.657 9.657 7 8 7C6.343 7 5 5.657 5 4C5 2.343 6.343 1 8 1Z" stroke="rgb(26,122,106)" strokeWidth="1.5" />
              <path d="M3 14C3 11.239 5.239 9 8 9C10.761 9 13 11.239 13 14" stroke="rgb(26,122,106)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
        <div className={`tile-content ${isRotatedLeft ? 'rotate-left' : 'rotate-right'}`}>
          {/* Normal: life > 0 */}
          {!isEliminated && (
            <div className="tile-normal" id={`normal${playerNum}`}>
              <div className="tile-counters" id={`counters${playerNum}`}>
                <div className={`tile-counter-indicator ${counters[playerNum].poison > 0 ? 'visible' : ''}`}>
                  <svg viewBox="0 0 23 23" fill="none">
                    <path d="M11.3 15.8C16.8 15.8 21.3 12.6 21.3 8.6C21.3 4.6 16.8 1.3 11.3 1.3C5.8 1.3 1.3 4.6 1.3 8.6C1.3 12.6 5.8 15.8 11.3 15.8Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.5 6.8L3.8 3.1M15 6.8L18.8 3.1M11.3 15.8V21.3M6.3 19.5H16.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="tile-counter-number">{counters[playerNum].poison}</span>
                </div>
                <div className={`tile-counter-indicator ${counters[playerNum].experience > 0 ? 'visible' : ''}`}>
                  <svg viewBox="0 0 23 23" fill="none">
                    <path d="M1.3 21.3L3 5.7L7.1 12.4L11.3 1.3L15.5 12.4L19.6 5.7L21.3 21.3H1.3Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1.3 21.3H21.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="tile-counter-number">{counters[playerNum].experience}</span>
                </div>
                <div className={`tile-counter-indicator ${counters[playerNum].energy > 0 ? 'visible' : ''}`}>
                  <svg viewBox="0 0 23 23" fill="none">
                    <path d="M13.8 1.3L1.3 12.7H11.3L8.8 21.3L21.3 9.9H11.3L13.8 1.3Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="tile-counter-number">{counters[playerNum].energy}</span>
                </div>
              </div>
              <div className="life-display">
                <button className="life-minus-btn" onClick={() => handleLifeChange(playerNum, -1)} onMouseDown={() => startHold(-1)} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={() => startHold(-1)} onTouchEnd={stopHold}>−</button>
                <div className={`life-number ${p.life <= 10 ? 'critical' : ''}`}>{p.life}</div>
                <button className="life-plus-btn" onClick={() => handleLifeChange(playerNum, 1)} onMouseDown={() => startHold(1)} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={() => startHold(1)} onTouchEnd={stopHold}>+</button>
              </div>
              {p.claimed ? (
                <div className="tile-commander">{p.commander}</div>
              ) : (
                <div className="commander-dash">Player {playerNum}</div>
              )}
            </div>
          )}

          {/* Eliminated + unclaimed: QR code + revive */}
          {isEliminated && !p.claimed && (
            <div className="tile-qr active">
              <div className="qr-label">Scan to review game</div>
              <div className="qr-box">
                <div className="qr-pattern">
                  <div className="qr-center">
                    <div className="qr-badge" style={{ background: `linear-gradient(135deg,${playerColors[playerNum]},rgb(184,146,46))` }}>P</div>
                  </div>
                </div>
              </div>
              <div className="qr-player-label">Player {playerNum} — eliminated</div>
              <button className="revive-btn" onClick={() => handleRevive(playerNum)}>Revive</button>
            </div>
          )}

          {/* Eliminated + claimed: life number + revive only */}
          {isEliminated && p.claimed && (
            <div className="tile-normal">
              <div className="life-number critical">{p.life}</div>
              <button className="revive-btn" onClick={() => handleRevive(playerNum)}>Revive</button>
              <div className="tile-commander">{p.commander}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      overflow: hidden;
    }

    .grid-container {
      flex: 1;
      display: flex;
      gap: 6px;
      padding: 10px;
      min-height: 0;
      overflow: hidden;
    }

    .grid-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .player-tile {
      flex: 1;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .player-tile.claimed {
      border: 2px solid;
    }

    .player-tile.unclaimed {
      border: 2px dashed rgba(138,154,142,0.25);
      background-color: rgba(138,154,142,0.03);
    }

    .tile-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .tile-content.rotate-left {
      transform: rotate(90deg);
    }

    .tile-content.rotate-right {
      transform: rotate(-90deg);
    }

    .tile-normal {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
    }

    .tile-commander {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 10px;
      text-align: center;
      margin-top: 6px;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .commander-dash {
      color: rgb(138,154,142);
      font-size: 10px;
      text-align: center;
      margin-top: 6px;
    }

    .life-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }

    .life-minus-btn {
      width: var(--btn-size, 32px);
      height: var(--btn-size, 32px);
      border-radius: 50%;
      border: 1.5px solid rgba(168,74,58,0.2);
      background: rgba(168,74,58,0.12);
      color: rgb(168,74,58);
      font-size: var(--btn-font, 20px);
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .life-minus-btn:active {
      transform: scale(0.9);
    }

    .claimed .life-minus-btn {
      border: 1px solid rgb(245,239,227);
      background: rgba(245,239,227,0.18);
      color: rgb(245,239,227);
    }

    .claimed .life-minus-btn:active {
      background: rgba(245,239,227,0.3);
    }

    .life-number {
      font-family: 'Jaldi', sans-serif;
      font-weight: 900;
      font-size: var(--life-font-size, 80px);
      color: rgb(44,62,54);
      line-height: 1;
      text-align: center;
      letter-spacing: -2px;
      transition: color 0.2s ease;
    }

    .life-number.critical {
      color: rgb(168,74,58);
    }

    .life-plus-btn {
      width: var(--btn-size, 32px);
      height: var(--btn-size, 32px);
      border-radius: 50%;
      border: 1.5px solid rgba(42,138,86,0.2);
      background: rgba(42,138,86,0.12);
      color: rgb(42,138,86);
      font-size: var(--btn-font, 20px);
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .life-plus-btn:active {
      transform: scale(0.9);
    }

    .claimed .life-plus-btn {
      border: 1px solid rgb(245,239,227);
      background: rgba(245,239,227,0.18);
      color: rgb(245,239,227);
    }

    .claimed .life-plus-btn:active {
      background: rgba(245,239,227,0.3);
    }

    .join-btn {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(26,122,106,0.18);
      border: 1px solid rgba(26,122,106,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
    }

    .grid-column:first-child .join-btn {
      bottom: 8px;
      left: 8px;
      transform: rotate(90deg);
    }

    .grid-column:last-child .join-btn {
      top: 8px;
      right: 8px;
      transform: rotate(-90deg);
    }

    .join-btn svg {
      width: 18px;
      height: 18px;
    }

    @keyframes joinPulseGlow {
      0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(26,122,106,0); }
      30%  { transform: scale(1.12); box-shadow: 0 0 12px 4px rgba(26,122,106,0.35); }
      60%  { transform: scale(1.05); box-shadow: 0 0 8px 2px rgba(26,122,106,0.18); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26,122,106,0); }
    }

    .join-btn.pulse-glow {
      animation: joinPulseGlow 1.6s ease-in-out;
    }

    @keyframes joinPulseGlowLeft {
      0%   { transform: rotate(90deg) scale(1); box-shadow: 0 0 0 0 rgba(26,122,106,0); background: rgba(26,122,106,0.18); }
      30%  { transform: rotate(90deg) scale(1.12); box-shadow: 0 0 12px 4px rgba(26,122,106,0.35), 0 0 20px 8px rgba(255,255,255,0.15); background: rgba(255,255,255,0.35); }
      60%  { transform: rotate(90deg) scale(1.05); box-shadow: 0 0 8px 2px rgba(26,122,106,0.18), 0 0 14px 5px rgba(255,255,255,0.08); background: rgba(255,255,255,0.2); }
      100% { transform: rotate(90deg) scale(1); box-shadow: 0 0 0 0 rgba(26,122,106,0); background: rgba(26,122,106,0.18); }
    }

    @keyframes joinPulseGlowRight {
      0%   { transform: rotate(-90deg) scale(1); box-shadow: 0 0 0 0 rgba(26,122,106,0); background: rgba(26,122,106,0.18); }
      30%  { transform: rotate(-90deg) scale(1.12); box-shadow: 0 0 12px 4px rgba(26,122,106,0.35), 0 0 20px 8px rgba(255,255,255,0.15); background: rgba(255,255,255,0.35); }
      60%  { transform: rotate(-90deg) scale(1.05); box-shadow: 0 0 8px 2px rgba(26,122,106,0.18), 0 0 14px 5px rgba(255,255,255,0.08); background: rgba(255,255,255,0.2); }
      100% { transform: rotate(-90deg) scale(1); box-shadow: 0 0 0 0 rgba(26,122,106,0); background: rgba(26,122,106,0.18); }
    }

    .grid-column:first-child .join-btn.pulse-glow {
      animation: joinPulseGlowLeft 1.6s ease-in-out;
    }

    .grid-column:last-child .join-btn.pulse-glow {
      animation: joinPulseGlowRight 1.6s ease-in-out;
    }

    .tile-qr {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: 4px;
    }

    .tile-qr.active {
      display: flex;
    }

    .tile-normal.hidden {
      display: none;
    }

    .player-tile.eliminated {
      background-color: rgb(245,239,227) !important;
      border: 2px solid rgb(184,168,138) !important;
    }

    .qr-label {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 6px;
      color: rgb(138,154,142);
    }

    .qr-box {
      width: 50px;
      height: 50px;
      background: rgb(44,62,54);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }

    .qr-pattern {
      width: 100%;
      height: 100%;
      background: repeating-conic-gradient(#e8dcc8 0% 25%, rgb(44,62,54) 0% 50%) 50% / 8px 8px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-center {
      background: rgb(44,62,54);
      padding: 2px;
      border-radius: 3px;
    }

    .qr-badge {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6px;
      font-weight: 800;
      color: rgb(245,239,227);
    }

    .qr-player-label {
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      font-size: 5px;
      color: rgb(138,154,142);
      font-style: italic;
    }

    .revive-btn {
      padding: 3px 8px;
      background: rgba(42,138,86,0.15);
      border: 1px solid rgba(42,138,86,0.35);
      border-radius: 6px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 7px;
      color: rgb(42,138,86);
      margin-top: 2px;
    }

    .revive-btn:active {
      transform: scale(0.9);
    }

    .join-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .join-modal.active {
      display: flex;
    }

    .join-modal-card {
      width: calc(100% - 40px);
      max-width: 335px;
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      position: relative;
      text-align: center;
    }

    .join-modal-title {
      font-weight: 600;
      font-size: 16px;
      color: rgb(44,62,54);
      margin-bottom: 4px;
      text-align: left;
    }

    .join-modal-subtitle {
      font-size: 12px;
      color: rgb(90,110,98);
      margin-bottom: 16px;
    }

    .join-qr-box {
      width: 130px;
      height: 130px;
      margin: 0 auto;
      background: rgb(44,62,54);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }

    .join-qr-pattern {
      width: 100%;
      height: 100%;
      background: repeating-conic-gradient(#e8dcc8 0% 25%, rgb(44,62,54) 0% 50%) 50% / 10px 10px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .join-qr-center {
      background: rgb(44,62,54);
      padding: 6px;
      border-radius: 6px;
    }

    .join-qr-badge {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: rgb(245,239,227);
    }

    .join-slot-code {
      margin-top: 12px;
      padding: 6px 14px;
      background: rgb(222,212,192);
      border-radius: 8px;
      display: inline-block;
    }

    .join-slot-code span {
      color: rgb(184,146,46);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
    }

    .join-simulate-btn {
      margin-top: 14px;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
      border: none;
      border-radius: 10px;
      color: rgb(245,239,227);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .join-simulate-btn:active {
      transform: scale(0.98);
    }

    .bottom-nav {
      margin-top: auto;
      margin-bottom: 16px;
      padding: 12px 8px;
      height: 84px;
      border-radius: 26px;
      border-top: 1px solid rgba(184,168,138,0.5);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                  padding 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bottom-nav.collapsed {
      height: 48px;
      padding: 6px 8px;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      flex: 1;
      padding: 8px 0;
      border-radius: 12px;
      background: transparent;
      transition: all 0.2s ease, gap 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nav-item:active {
      transform: scale(0.9);
      background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
      border-radius: 12px;
    }

    .nav-item:active .dice-icon {
      border-color: rgb(245,239,227);
    }

    .nav-item:active .dice-dot {
      background: rgb(245,239,227);
    }

    .nav-item:active .star-icon {
      border-color: rgb(245,239,227);
    }

    .nav-item:active .star {
      background: rgb(245,239,227);
    }

    .nav-item:active .nav-label {
      color: rgb(245,239,227);
    }

    .nav-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dice-icon {
      width: 24px;
      height: 24px;
      border: 1.75px solid rgb(90,110,98);
      border-radius: 4px;
      position: relative;
      transition: border-color 0.2s ease;
    }

    .dice-dot {
      width: 3px;
      height: 3px;
      background: rgb(90,110,98);
      position: absolute;
      border-radius: 50%;
      transition: background 0.2s ease;
    }

    .dice-dot:nth-child(1) { top: 3px; left: 3px; }
    .dice-dot:nth-child(2) { top: 3px; right: 3px; }
    .dice-dot:nth-child(3) { top: 9px; left: 9px; }
    .dice-dot:nth-child(4) { bottom: 3px; left: 3px; }
    .dice-dot:nth-child(5) { bottom: 3px; right: 3px; }

    .star-icon {
      width: 24px;
      height: 24px;
      border: 1.75px solid rgb(90,110,98);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.2s ease;
    }

    .star {
      width: 12px;
      height: 12px;
      clipPath: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      background: rgb(90,110,98);
      transition: background 0.2s ease;
    }

    .nav-label {
      font-weight: 500;
      font-size: 12px;
      color: rgb(90,110,98);
      max-height: 18px;
      opacity: 1;
      overflow: hidden;
      transition: max-height 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                  margin-top 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bottom-nav.collapsed .nav-label {
      max-height: 0;
      opacity: 0;
    }

    .bottom-nav.collapsed .nav-item {
      gap: 0;
    }

    .nav-item:active .list-icon span {
      background: rgb(245,239,227);
    }

    .list-icon {
      width: 16px;
      height: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .list-icon span {
      height: 1.5px;
      background: rgb(90,110,98);
      border-radius: 1px;
      transition: background 0.2s ease;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-overlay.active {
      display: flex;
    }

    .dice-modal {
      width: calc(100% - 40px);
      max-width: 335px;
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 20px;
      color: rgb(90,110,98);
      cursor: pointer;
    }

    .modal-close:active {
      transform: scale(0.9);
    }

    .modal-title {
      font-weight: 600;
      font-size: 16px;
      color: rgb(44,62,54);
      margin-bottom: 16px;
      text-align: center;
    }

    .tab-group {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .tab {
      padding: 8px 16px;
      border: 1.3px solid rgb(184,168,138);
      background: rgb(222,212,192);
      color: rgb(44,62,54);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border-radius: 999px;
      transition: all 0.2s ease;
    }

    .tab.active {
      background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
      color: rgb(245,239,227);
      border-color: transparent;
    }

    .result-display {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 96px;
      color: rgb(26,122,106);
      text-align: center;
      margin-bottom: 8px;
      line-height: 1;
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rolling-text {
      font-size: 12px;
      color: rgb(90,110,98);
      text-align: center;
      margin-bottom: 20px;
      min-height: 16px;
    }

    .roll-button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, rgb(26,122,106) 0%, rgb(21,138,114) 100%);
      border: none;
      border-radius: 10px;
      color: rgb(245,239,227);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .roll-button:active {
      transform: scale(0.98);
    }

    .counters-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .counters-overlay.active {
      display: flex;
    }

    .counters-popup-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0;
    }

    .counters-popup-wrapper.facing-left {
      flex-direction: row;
    }

    .counters-popup-wrapper.facing-right {
      flex-direction: row;
    }

    .counters-popup-wrapper.facing-left .counters-modal {
      transform: rotate(90deg);
    }

    .counters-popup-wrapper.facing-right .counters-modal {
      transform: rotate(-90deg);
    }

    .counters-flip-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1.3px solid rgb(184,168,138);
      background: rgb(245,239,227);
      color: rgb(44,62,54);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1002;
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
    }

    .counters-flip-btn:active {
      transform: translateX(-50%) scale(0.9);
    }

    .counters-flip-btn svg {
      width: 22px;
      height: 22px;
    }

    .counters-modal {
      width: 300px;
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      position: relative;
      transition: transform 0.3s ease;
    }

    .counters-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .counters-title {
      font-weight: 600;
      font-size: 16px;
      color: rgb(44,62,54);
    }

    .player-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .player-selector-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgb(184,168,138);
      background: rgb(222,212,192);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Jaldi', sans-serif;
      font-weight: 700;
      font-size: 16px;
      color: rgb(245,239,227);
      transition: all 0.2s ease;
      position: relative;
    }

    .player-selector-btn.active {
      border-color: rgb(44,62,54);
      box-shadow: 0 0 0 2px rgb(44,62,54);
      transform: scale(1.08);
    }

    .player-selector-btn:active {
      transform: scale(0.95);
    }

    .selected-player-info {
      text-align: center;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgb(184,168,138);
    }

    .selected-commander {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 13px;
      color: rgb(44,62,54);
      margin-bottom: 2px;
    }

    .selected-player-name {
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      font-size: 11px;
      color: rgb(90,110,98);
    }

    .counter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px;
      background: rgb(222,212,192);
      border-radius: 12px;
      margin-bottom: 10px;
    }

    .counter-row:last-child {
      margin-bottom: 0;
    }

    .counter-label {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .counter-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .counter-icon svg {
      width: 20px;
      height: 20px;
    }

    .counter-name {
      font-weight: 400;
      font-size: 14px;
      color: rgb(44,62,54);
    }

    .counter-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .counter-btn {
      width: 28px;
      height: 32px;
      border-radius: 8px;
      border: 1.3px solid rgb(184,168,138);
      background: rgb(245,239,227);
      color: rgb(44,62,54);
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .counter-btn:active {
      transform: scale(0.9);
    }

    .counter-value {
      font-weight: 700;
      font-size: 24px;
      color: rgb(44,62,54);
      min-width: 28px;
      text-align: center;
    }

    .tile-counters {
      display: flex;
      gap: 8px;
      justify-content: center;
      min-height: 14px;
      margin-bottom: 6px;
    }

    .tile-counter-indicator {
      display: none;
      align-items: center;
      gap: 3px;
      opacity: 0.85;
    }

    .tile-counter-indicator.visible {
      display: flex;
    }

    .tile-counter-indicator svg {
      width: 10px;
      height: 10px;
    }

    .tile-counter-indicator svg path {
      stroke: rgb(44,62,54);
      strokeWidth: 2.8;
    }

    .claimed .tile-counter-indicator svg path {
      stroke: rgb(245,239,227);
    }

    .tile-counter-number {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 11px;
      color: rgb(44,62,54);
      line-height: 1;
    }

    .claimed .tile-counter-number {
      color: rgb(245,239,227);
    }

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

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Jaldi:wght@400;700&display=swap');
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        <div className="grid-container">
          <div className="grid-column">
            {renderPlayerTile(1)}
            {renderPlayerTile(3)}
          </div>
          <div className="grid-column">
            {renderPlayerTile(2)}
            {renderPlayerTile(4)}
          </div>
        </div>

        <div className={`bottom-nav ${navCollapsed ? 'collapsed' : ''}`} onClick={handleNavClick}>
          <div
            className="nav-item"
            onClick={() => {
              onPopupOpen();
              setDiceModalOpen(true);
              setDiceResult('—');
              setRollingText('');
            }}
          >
            <div className="nav-icon">
              <div className="dice-icon">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="dice-dot"></div>)}
              </div>
            </div>
            <div className="nav-label">Dice</div>
          </div>
          <div
            className="nav-item"
            onClick={() => {
              onPopupOpen();
              setCountersModalOpen(true);
            }}
          >
            <div className="nav-icon">
              <div className="star-icon">
                <div className="star"></div>
              </div>
            </div>
            <div className="nav-label">Counters</div>
          </div>
          <Link href={`/singleview?podId=${podId}&gameId=${gameId}`} style={{ textDecoration: 'none' }}>
            <div className="nav-item">
              <div className="nav-icon">
                <div className="list-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="nav-label">Single View</div>
            </div>
          </Link>
        </div>
      </div>

      {diceModalOpen && (
        <div
          className="modal-overlay active"
          onClick={() => {
            if (event?.target === event?.currentTarget) {
              setDiceModalOpen(false);
              onPopupClose();
            }
          }}
        >
          <div className="dice-modal">
            <button
              className="modal-close"
              onClick={() => {
                setDiceModalOpen(false);
                onPopupClose();
              }}
            >
              ✕
            </button>
            <div className="modal-title">Dice Roller</div>
            <div className="tab-group">
              {['d6', 'd20', 'coin'].map(tab => (
                <button
                  key={tab}
                  className={`tab ${diceTab === tab ? 'active' : ''}`}
                  onClick={() => {
                    setDiceTab(tab);
                    setDiceResult('—');
                    setRollingText('');
                  }}
                >
                  {tab === 'coin' ? 'Coin' : tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="result-display">{diceResult}</div>
            <div className="rolling-text">{rollingText}</div>
            <button className="roll-button" onClick={handleDiceRoll}>
              Roll
            </button>
          </div>
        </div>
      )}

      {countersModalOpen && (
        <div
          className="counters-overlay active"
          onClick={() => {
            if (event?.target === event?.currentTarget) {
              setCountersModalOpen(false);
              onPopupClose();
            }
          }}
        >
          <div className={`counters-popup-wrapper ${facingLeft ? 'facing-left' : 'facing-right'}`}>
            <div className="counters-modal">
              <div className="counters-header">
                <div className="counters-title">Counters</div>
                <button
                  className="modal-close"
                  onClick={() => {
                    setCountersModalOpen(false);
                    onPopupClose();
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="player-selector">
                {[1, 2, 3, 4].map(num => {
                  const p = players[num];
                  const style = p.claimed && p.assignedColor && manaColorStyles[p.assignedColor]
                    ? { background: `rgb(${manaColorStyles[p.assignedColor].grad[1].join(',')})`, borderColor: `rgb(${manaColorStyles[p.assignedColor].border.join(',')})` }
                    : { background: 'rgb(222,212,192)', color: 'rgb(90,110,98)' };

                  return (
                    <button
                      key={num}
                      className={`player-selector-btn ${selectedCounterPlayer === num ? 'active' : ''}`}
                      style={style}
                      onClick={() => setSelectedCounterPlayer(num)}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <div className="selected-player-info">
                <div className="selected-commander">
                  {players[selectedCounterPlayer].commander || '—'}
                </div>
                <div className="selected-player-name">
                  {players[selectedCounterPlayer].claimed
                    ? players[selectedCounterPlayer].name
                    : `Player ${selectedCounterPlayer}`}
                </div>
              </div>

              {(['poison', 'experience', 'energy'] as const).map(type => (
                <div key={type} className="counter-row">
                  <div className="counter-label">
                    <div className="counter-icon">
                      {type === 'poison' ? (
                        <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.3 15.8455C16.8228 15.8455 21.3 12.5894 21.3 8.57278C21.3 4.55616 16.8228 1.30005 11.3 1.30005C5.77714 1.30005 1.29999 4.55616 1.29999 8.57278C1.29999 12.5894 5.77714 15.8455 11.3 15.8455Z" stroke="#2C3E36" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.54999 6.75453L3.79999 3.11816M15.05 6.75453L18.8 3.11816M11.3 15.8454V21.3M6.29999 19.4818H16.3" stroke="#2C3E36" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : type === 'experience' ? (
                        <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.30002 21.3L2.96668 5.74449L7.13335 12.4112L11.3 1.30005L15.4667 12.4112L19.6334 5.74449L21.3 21.3H1.30002Z" stroke="#2C3E36" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M1.30002 21.3H21.3" stroke="#2C3E36" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.8 1.30005L1.30005 12.7286H11.3L8.80005 21.3L21.3 9.87148H11.3L13.8 1.30005Z" stroke="#2C3E36" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                    <div className="counter-name">
                      {type === 'experience' ? 'Experience' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                  </div>
                  <div className="counter-controls">
                    <button className="counter-btn" onClick={() => handleCounterChange(type, 'minus')}>
                      −
                    </button>
                    <div className="counter-value">
                      {counters[selectedCounterPlayer][type]}
                    </div>
                    <button className="counter-btn" onClick={() => handleCounterChange(type, 'plus')}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="counters-flip-btn"
              onClick={() => setFacingLeft(!facingLeft)}
            >
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2L18 6L14 10" stroke="#2C3E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 6H7C4.24 6 2 8.24 2 11V11" stroke="#2C3E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 18L2 14L6 10" stroke="#2C3E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 14H13C15.76 14 18 11.76 18 9V9" stroke="#2C3E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {joinModalOpen && (
        <div className="join-modal active">
          <div className="join-modal-card">
            <button
              className="modal-close"
              onClick={() => setJoinModalOpen(false)}
            >
              ✕
            </button>
            <div className="join-modal-title">Join Slot {joinSlot}</div>
            <div className="join-modal-subtitle">Scan to claim this player slot</div>
            <div style={{ width: 150, height: 150, margin: '0 auto', padding: 10, background: '#FFFFFF', borderRadius: 12, boxShadow: '0 0 0 1px rgba(43,33,24,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR code to join pod" width={130} height={130} style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div style={{ color: '#B8AE9E', fontSize: 12 }}>No pod code</div>
              )}
            </div>
            <div className="join-slot-code" onClick={copyPodCode} style={{ cursor: 'pointer' }}>
              <span>{podShortCode ? `${podShortCode.slice(0, 3)}—${podShortCode.slice(3)}` : '------'}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgb(90,110,98)', textAlign: 'center' }}>
              Tap the code to copy
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast show">
          {toast}
        </div>
      )}
    </>
  );
}

export default function GridView4P() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
