'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getGame } from '@/lib/games';
import { updateLifeTotal, updatePoisonCounters, updateExperienceCounters, updateEnergyCounters, concedeGame, updateLifeBySeat, updatePoisonBySeat, updateExperienceBySeat, updateEnergyBySeat } from '@/lib/game-triggers';
import { supabase } from '@/lib/supabase';
import { getQrCodeUrl } from '@/lib/pods';
import { useWakeLock } from '@/lib/use-wake-lock';

// Dark mode constants
const DARK = {
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
  forest:    '#3F9F4D',
  forestDeep:'#2C7A37',
  line:      'rgba(226,184,88,0.10)',
  lineStrong:'rgba(226,184,88,0.18)',
  cellBorder:'rgba(226,184,88,0.14)',
  shadowRest:'0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
  navBg:     'linear-gradient(180deg, rgba(10,6,4,0) 0%, rgba(10,6,4,0.92) 30%, #0A0604 100%)',
  navPill:   '#150E08',
  navBorder: 'rgba(226,184,88,0.18)',
};

type PlayerNum = 1 | 2 | 3;

interface Player {
  life: number;
  name: string;
  commander: string | null;
  claimed: boolean;
  colors: string[];
  assignedColor?: string;
}

interface Counters {
  poison: number;
  experience: number;
  energy: number;
}

function PageContent() {
  useWakeLock();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') ?? '';
  const podId = searchParams.get('podId') ?? '';
  const [playerUserIds, setPlayerUserIds] = useState<Record<number, string>>({});
  const [playerSeatNumbers, setPlayerSeatNumbers] = useState<Record<number, number>>({});
  const [podShortCode, setPodShortCode] = useState<string>('');
  const syncTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const debouncedSync = (key: string, fn: () => void) => {
    if (syncTimerRef.current[key]) clearTimeout(syncTimerRef.current[key]);
    syncTimerRef.current[key] = setTimeout(fn, 300);
  };

  const [players, setPlayers] = useState<Record<PlayerNum, Player>>({
    1: { life: 40, name: 'Frederico', commander: 'Atraxa, Praetors\' Voice', claimed: true, colors: ['W','U','B','G'] },
    2: { life: 40, name: 'Player 2', commander: null, claimed: false, colors: [] },
    3: { life: 40, name: 'Player 3', commander: null, claimed: false, colors: [] }
  });

  const [counters, setCounters] = useState<Record<PlayerNum, Counters>>({
    1: { poison: 0, experience: 0, energy: 0 },
    2: { poison: 0, experience: 0, energy: 0 },
    3: { poison: 0, experience: 0, energy: 0 }
  });

  const [selectedCounterPlayer, setSelectedCounterPlayer] = useState<PlayerNum>(1);
  const [diceTab, setDiceTab] = useState<'d6' | 'd20' | 'coin'>('d6');
  const [diceResult, setDiceResult] = useState<string>('—');
  const [diceRolling, setDiceRolling] = useState(false);
  const [rollingText, setRollingText] = useState('');
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [showCountersModal, setShowCountersModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSlot, setJoinSlot] = useState<PlayerNum | null>(null);
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [countersFlipped, setCountersFlipped] = useState(false);
  const navTimerRef = useRef<NodeJS.Timeout>(null);
  const pulseTimerRef = useRef<NodeJS.Timeout>(null);
  const longPressRef = useRef<{ timeout: NodeJS.Timeout | null; interval: NodeJS.Timeout | null }>({ timeout: null, interval: null });

  const PULSE_SCHEDULE = [30000, 30000, 60000, 60000];
  const PULSE_ONGOING = 300000;

  const manaColorStyles: Record<string, { grad: number[][]; border: number[]; shadow: number[] }> = {
    W: { grad: [[160,140,90],[190,170,115],[210,192,140]], border: [220,200,155], shadow: [160,140,90] },
    U: { grad: [[14,72,110],[26,100,140],[42,125,165]], border: [56,135,170], shadow: [14,72,110] },
    B: { grad: [[25,18,30],[42,35,50],[60,52,68]], border: [75,65,82], shadow: [25,18,30] },
    R: { grad: [[120,42,30],[148,64,48],[172,88,68]], border: [185,100,80], shadow: [120,42,30] },
    G: { grad: [[14,92,77],[26,122,106],[42,143,120]], border: [56,158,133], shadow: [14,92,77] }
  };

  const qrCodeUrl = podShortCode
    ? getQrCodeUrl(podShortCode, typeof window !== 'undefined' ? window.location.origin : 'https://auramtg.com')
    : '';

  const pickPlayerColor = (playerNum: PlayerNum, currentUsedColors: string[]): string | null => {
    const p = players[playerNum];
    if (!p.colors || p.colors.length === 0) return null;

    const allMana = Object.keys(manaColorStyles);

    if (!currentUsedColors.includes(p.colors[0])) {
      return p.colors[0];
    }

    for (let i = 1; i < p.colors.length; i++) {
      if (!currentUsedColors.includes(p.colors[i])) {
        return p.colors[i];
      }
    }

    const available = allMana.filter((c: any) => !currentUsedColors.includes(c));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    return p.colors[0];
  };

  const applyColorIdentity = (playerNum: PlayerNum, newUsedColors: string[] = usedColors) => {
    const p = players[playerNum];
    if (!p.claimed || !p.colors || p.colors.length === 0) return;

    const mana = pickPlayerColor(playerNum, newUsedColors);
    if (!mana) return;

    const updatedColors = [...newUsedColors, mana];
    setUsedColors(updatedColors);

    setPlayers(prev => ({
      ...prev,
      [playerNum]: { ...prev[playerNum], assignedColor: mana }
    }));
  };

  const updateLifeDisplay = (playerNum: PlayerNum, newLife: number) => {
    const clamped = Math.max(0, Math.min(999, newLife));
    setPlayers(prev => ({
      ...prev,
      [playerNum]: { ...prev[playerNum], life: clamped }
    }));
  };

  const stopLongPress = () => {
    if (longPressRef.current.timeout) { clearTimeout(longPressRef.current.timeout); longPressRef.current.timeout = null; }
    if (longPressRef.current.interval) { clearInterval(longPressRef.current.interval); longPressRef.current.interval = null; }
  };

  // Sync life to backend — uses userId if available, otherwise falls back to seat_number
  const syncLife = (playerNum: PlayerNum, newLife: number) => {
    if (!gameId) return;
    const userId = playerUserIds[playerNum];
    const seat = playerSeatNumbers[playerNum];
    if (userId) {
      updateLifeTotal(gameId, userId, newLife).catch(() => {});
    } else if (seat) {
      updateLifeBySeat(gameId, seat, newLife).catch(() => {});
    }
  };

  const handleLifeDelta = (playerNum: PlayerNum, delta: number) => {
    setPlayers(prev => {
      const newLife = Math.max(0, Math.min(999, prev[playerNum].life + delta));
      if (newLife === 0) stopLongPress();

      debouncedSync(`life-${playerNum}`, () => {
        syncLife(playerNum, newLife);
      });

      return {
        ...prev,
        [playerNum]: { ...prev[playerNum], life: newLife }
      };
    });
  };

  const revivePlayer = (playerNum: PlayerNum) => {
    setPlayers(prev => ({
      ...prev,
      [playerNum]: { ...prev[playerNum], life: 1 }
    }));
    syncLife(playerNum, 1);
  };

  const startLongPress = (playerNum: PlayerNum, delta: number) => {
    longPressRef.current.timeout = setTimeout(() => {
      handleLifeDelta(playerNum, delta * 4);
      longPressRef.current.interval = setInterval(() => {
        handleLifeDelta(playerNum, delta * 5);
      }, 200);
    }, 500);
  };

  const openJoinModal = (slot: PlayerNum) => {
    setJoinSlot(slot);
    setShowJoinModal(true);
  };

  const copyPodCode = () => {
    if (podShortCode) {
      navigator.clipboard.writeText(podShortCode).catch(() => {});
    }
  };

  const handleDiceRoll = () => {
    if (diceRolling) return;

    setDiceRolling(true);
    setRollingText('Rolling…');

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const max = diceTab === 'd6' ? 6 : diceTab === 'd20' ? 20 : 2;
      const val = Math.floor(Math.random() * max) + 1;
      setDiceResult(diceTab === 'coin' ? (val === 1 ? 'H' : 'T') : val.toString());

      if (frame >= 14) {
        clearInterval(interval);
        setDiceRolling(false);
        const final = Math.floor(Math.random() * max) + 1;
        setDiceResult(diceTab === 'coin' ? (final === 1 ? 'HEADS' : 'TAILS') : final.toString());
        setRollingText('');
      }
    }, 70);
  };

  const updateCounters = (playerNum: PlayerNum, type: keyof Counters, amount: number) => {
    setCounters(prev => {
      const newVal = Math.max(0, prev[playerNum][type] + amount);
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

  const openDiceModal = () => {
    setShowDiceModal(true);
    setDiceResult('—');
    setRollingText('');
    onPopupOpen();
  };

  const closeDiceModal = () => {
    setShowDiceModal(false);
    onPopupClose();
  };

  const openCountersModal = () => {
    setShowCountersModal(true);
    onPopupOpen();
  };

  const closeCountersModal = () => {
    setShowCountersModal(false);
    onPopupClose();
  };

  const onPopupOpen = () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    setNavCollapsed(false);
  };

  const onPopupClose = () => {
    scheduleNavCollapse();
  };

  const scheduleNavCollapse = () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setNavCollapsed(true), 5000);
  };

  const expandNav = () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    setNavCollapsed(false);
  };

  const handleNavClick = () => {
    if (navCollapsed) {
      expandNav();
      if (!showDiceModal && !showCountersModal) {
        scheduleNavCollapse();
      }
    }
  };

  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;

      try {
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

        const playerSlots: Record<PlayerNum, Player> = {
          1: { life: 40, name: 'Player 1', commander: null, claimed: false, colors: [] },
          2: { life: 40, name: 'Player 2', commander: null, claimed: false, colors: [] },
          3: { life: 40, name: 'Player 3', commander: null, claimed: false, colors: [] }
        };

        const userIdMap: Record<number, string> = {};
        const seatMap: Record<number, number> = {};
        const newCounters: Record<PlayerNum, Counters> = {
          1: { poison: 0, experience: 0, energy: 0 },
          2: { poison: 0, experience: 0, energy: 0 },
          3: { poison: 0, experience: 0, energy: 0 }
        };

        game.players.forEach((p: any) => {
          const playerNum = (p.seat_number ?? 1) as PlayerNum;
          if (playerNum > 3) return;

          const deck: any = p.deck_id ? deckMap.get(p.deck_id) : null;
          const isEmptySeat = !p.user_id && !p.deck_id && !p.commander_name;
          const displayName = deck?.commander_name ?? p.commander_name ?? `Player ${playerNum}`;

          if (p.user_id) userIdMap[playerNum] = p.user_id;
          seatMap[playerNum] = playerNum;
          playerSlots[playerNum] = {
            life: p.life_total ?? 40,
            name: displayName,
            commander: deck?.commander_name ?? p.commander_name ?? null,
            colors: deck?.color_identity ? deck.color_identity.split('').filter((c: string) => 'WUBRG'.includes(c)) : [],
            claimed: !isEmptySeat
          };
          newCounters[playerNum] = {
            poison: p.poison_counters ?? 0,
            experience: p.experience_counters ?? 0,
            energy: p.energy_counters ?? 0
          };
        });

        setPlayers(playerSlots);
        setPlayerUserIds(userIdMap);
        setPlayerSeatNumbers(seatMap);
        setCounters(newCounters);

        const channel = supabase
          .channel(`game-${gameId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, (payload: any) => {
            const row = payload.new;
            if (!row) return;
            const num = row.seat_number as PlayerNum;
            if (num && num <= 3) {
              setPlayers(prev => ({ ...prev, [num]: { ...prev[num], life: row.life_total ?? prev[num].life } }));
              setCounters(prev => ({ ...prev, [num]: { poison: row.poison_counters ?? prev[num].poison, experience: row.experience_counters ?? prev[num].experience, energy: row.energy_counters ?? prev[num].energy } }));
            }
          })
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      } catch (error) {
        console.error('Failed to load game data:', error);
      }
    };

    loadGameData();
  }, [gameId]);

  useEffect(() => {
    scheduleNavCollapse();
    for (let i = 1; i <= 3; i++) {
      applyColorIdentity(i as PlayerNum);
    }

    let pulseStep = 0;
    const schedulePulse = () => {
      const delay = pulseStep < PULSE_SCHEDULE.length ? PULSE_SCHEDULE[pulseStep] : PULSE_ONGOING;
      pulseStep++;
      pulseTimerRef.current = setTimeout(() => {
        const unclaimed = ([1, 2, 3] as const).filter(i => !players[i].claimed);
        if (unclaimed.length > 0) {
          schedulePulse();
        }
      }, delay);
    };
    schedulePulse();

    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const getTileBackgroundColor = (playerNum: PlayerNum) => {
    const p = players[playerNum];
    if (!p.claimed || !p.assignedColor) return undefined;

    const style = manaColorStyles[p.assignedColor];
    if (!style) return undefined;

    const [d, m, l] = style.grad;
    return {
      background: `linear-gradient(135deg, rgb(${d[0]},${d[1]},${d[2]}) 0%, rgb(${m[0]},${m[1]},${m[2]}) 50%, rgb(${l[0]},${l[1]},${l[2]}) 100%)`,
      border: `1.5px solid rgb(${style.border[0]},${style.border[1]},${style.border[2]})`,
      boxShadow: `0 8px 20px rgba(${style.shadow[0]},${style.shadow[1]},${style.shadow[2]},0.35), 0 2px 6px rgba(${style.shadow[0]},${style.shadow[1]},${style.shadow[2]},0.25)`
    };
  };

  const isEliminated = (playerNum: PlayerNum) => players[playerNum].life === 0;

  const PlayerTile = ({ playerNum, rotation, className = '' }: { playerNum: PlayerNum; rotation?: string; className?: string }) => {
    const p = players[playerNum];
    const isUnclaimed = !p.claimed;
    const isEliminatedState = isEliminated(playerNum);
    const bgColor = getTileBackgroundColor(playerNum);

    return (
      <div
        className={`player-tile ${isUnclaimed ? 'unclaimed' : `claimed`} ${isEliminatedState ? 'eliminated' : ''} ${className}`}
        style={bgColor}
        id={`tile${playerNum}`}
      >
        {isUnclaimed && !isEliminatedState && (
          <div className="join-btn" onClick={() => openJoinModal(playerNum)}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 1C9.657 1 11 2.343 11 4C11 5.657 9.657 7 8 7C6.343 7 5 5.657 5 4C5 2.343 6.343 1 8 1Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 14C3 11.239 5.239 9 8 9C10.761 9 13 11.239 13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        <div className={`tile-content ${rotation ? rotation : ''}`}>
          {/* Not eliminated: normal life display */}
          {!isEliminatedState && (
            <div className="tile-normal">
              <div className="tile-counters">
                {counters[playerNum].poison > 0 && (
                  <div className="tile-counter-indicator visible">
                    <svg viewBox="0 0 23 23" fill="none">
                      <path d="M11.3 15.8C16.8 15.8 21.3 12.6 21.3 8.6C21.3 4.6 16.8 1.3 11.3 1.3C5.8 1.3 1.3 4.6 1.3 8.6C1.3 12.6 5.8 15.8 11.3 15.8Z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7.5 6.8L3.8 3.1M15 6.8L18.8 3.1M11.3 15.8V21.3M6.3 19.5H16.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="tile-counter-number">{counters[playerNum].poison}</span>
                  </div>
                )}
                {counters[playerNum].experience > 0 && (
                  <div className="tile-counter-indicator visible">
                    <svg viewBox="0 0 23 23" fill="none">
                      <path d="M1.3 21.3L3 5.7L7.1 12.4L11.3 1.3L15.5 12.4L19.6 5.7L21.3 21.3H1.3Z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.3 21.3H21.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="tile-counter-number">{counters[playerNum].experience}</span>
                  </div>
                )}
                {counters[playerNum].energy > 0 && (
                  <div className="tile-counter-indicator visible">
                    <svg viewBox="0 0 23 23" fill="none">
                      <path d="M13.8 1.3L1.3 12.7H11.3L8.8 21.3L21.3 9.9H11.3L13.8 1.3Z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="tile-counter-number">{counters[playerNum].energy}</span>
                  </div>
                )}
              </div>
              <div className="life-display">
                <button className="life-minus-btn" onClick={() => handleLifeDelta(playerNum, -1)} onMouseDown={() => startLongPress(playerNum, -1)} onMouseUp={stopLongPress} onMouseLeave={stopLongPress} onTouchStart={() => startLongPress(playerNum, -1)} onTouchEnd={stopLongPress}>−</button>
                <div className={`life-number ${p.life <= 10 ? 'critical' : ''}`}>{p.life}</div>
                <button className="life-plus-btn" onClick={() => handleLifeDelta(playerNum, 1)} onMouseDown={() => startLongPress(playerNum, 1)} onMouseUp={stopLongPress} onMouseLeave={stopLongPress} onTouchStart={() => startLongPress(playerNum, 1)} onTouchEnd={stopLongPress}>+</button>
              </div>
              <div className={p.claimed ? 'tile-commander' : 'commander-dash'}>
                {p.claimed ? p.commander : `Player ${playerNum}`}
              </div>
            </div>
          )}

          {/* Eliminated + unclaimed: QR code + revive */}
          {isEliminatedState && !p.claimed && (
            <div className="tile-qr active">
              <div className="qr-label">Scan to review game</div>
              <div className="qr-box">
                <div className="qr-pattern">
                  <div className="qr-center">
                    <div className="qr-badge">P</div>
                  </div>
                </div>
              </div>
              <div className="qr-player-label">Player {playerNum} — eliminated</div>
              <button className="revive-btn" onClick={() => revivePlayer(playerNum)}>Revive</button>
            </div>
          )}

          {/* Eliminated + claimed: life number + revive only */}
          {isEliminatedState && p.claimed && (
            <div className="tile-normal">
              <div className="life-number critical">{p.life}</div>
              <button className="revive-btn" onClick={() => revivePlayer(playerNum)}>Revive</button>
              <div className="tile-commander">{p.commander}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body {
          height: 100%;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          background: ${DARK.bg};
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
          background: ${DARK.bg};
        }
        .grid-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          min-height: 0;
          overflow: hidden;
        }
        .grid-top {
          flex: 2;
          display: flex;
          gap: 8px;
          min-height: 0;
        }
        .grid-bottom-row {
          flex: 1;
          min-height: 0;
        }
        .grid-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .player-tile {
          flex: 1;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: ${DARK.bgCard};
          border: 1px solid ${DARK.cellBorder};
          box-shadow: ${DARK.shadowRest};
        }
        .player-tile.claimed {
          border: 1px solid ${DARK.cellBorder};
        }
        .player-tile.unclaimed {
          border: 2px dashed ${DARK.cellBorder};
          background: ${DARK.bgDeep};
        }
        .tile-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 10;
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
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 2;
        }
        .tile-commander {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 9px;
          text-align: center;
          margin-top: 6px;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: ${DARK.ink2};
          letter-spacing: 0.02em;
        }
        .commander-dash {
          color: ${DARK.ink3};
          font-size: 9px;
          text-align: center;
          margin-top: 6px;
          letter-spacing: 0.02em;
        }
        .life-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          position: relative;
          z-index: 10;
        }
        .life-minus-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid ${DARK.lineStrong};
          background: transparent;
          color: ${DARK.ink};
          font-size: 18px;
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
          background: rgba(255,80,80,0.08);
        }
        .claimed .life-minus-btn {
          border: 1px solid ${DARK.lineStrong};
          background: transparent;
          color: ${DARK.ink};
        }
        .claimed .life-minus-btn:active {
          background: rgba(255,80,80,0.08);
        }
        .life-number {
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 80px;
          color: ${DARK.ink};
          line-height: 1;
          text-align: center;
          letter-spacing: -3px;
          transition: color 0.2s ease;
          text-shadow: 0 0 40px rgba(226,184,88,0.12), 0 1px 0 rgba(10,6,4,0.6);
        }
        .life-number.critical {
          color: #FF6B6B;
        }
        .life-plus-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid ${DARK.lineStrong};
          background: transparent;
          color: ${DARK.ink};
          font-size: 18px;
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
          background: rgba(80,200,80,0.08);
        }
        .claimed .life-plus-btn {
          border: 1px solid ${DARK.lineStrong};
          background: transparent;
          color: ${DARK.ink};
        }
        .claimed .life-plus-btn:active {
          background: rgba(80,200,80,0.08);
        }
        .join-btn {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(63,159,77,0.18);
          border: 1px solid ${DARK.copper};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.2s ease;
        }
        .join-btn:active {
          transform: scale(0.9);
          background: rgba(63,159,77,0.28);
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
        .grid-bottom-row .join-btn {
          bottom: 8px;
          right: 8px;
        }
        .join-btn svg {
          width: 18px;
          height: 18px;
          stroke: ${DARK.copper};
        }
        @keyframes joinPulseGlow {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(226,184,88,0); }
          30%  { transform: scale(1.12); box-shadow: 0 0 12px 4px rgba(226,184,88,0.35); }
          60%  { transform: scale(1.05); box-shadow: 0 0 8px 2px rgba(226,184,88,0.18); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(226,184,88,0); }
        }
        .join-btn.pulse-glow {
          animation: joinPulseGlow 1.6s ease-in-out;
        }
        @keyframes joinPulseGlowLeft {
          0%   { transform: rotate(90deg) scale(1); box-shadow: 0 0 0 0 rgba(226,184,88,0); background: rgba(63,159,77,0.18); }
          30%  { transform: rotate(90deg) scale(1.12); box-shadow: 0 0 12px 4px rgba(226,184,88,0.35), 0 0 20px 8px rgba(226,184,88,0.2); background: rgba(63,159,77,0.28); }
          60%  { transform: rotate(90deg) scale(1.05); box-shadow: 0 0 8px 2px rgba(226,184,88,0.18), 0 0 14px 5px rgba(226,184,88,0.1); background: rgba(63,159,77,0.22); }
          100% { transform: rotate(90deg) scale(1); box-shadow: 0 0 0 0 rgba(226,184,88,0); background: rgba(63,159,77,0.18); }
        }
        @keyframes joinPulseGlowRight {
          0%   { transform: rotate(-90deg) scale(1); box-shadow: 0 0 0 0 rgba(226,184,88,0); background: rgba(63,159,77,0.18); }
          30%  { transform: rotate(-90deg) scale(1.12); box-shadow: 0 0 12px 4px rgba(226,184,88,0.35), 0 0 20px 8px rgba(226,184,88,0.2); background: rgba(63,159,77,0.28); }
          60%  { transform: rotate(-90deg) scale(1.05); box-shadow: 0 0 8px 2px rgba(226,184,88,0.18), 0 0 14px 5px rgba(226,184,88,0.1); background: rgba(63,159,77,0.22); }
          100% { transform: rotate(-90deg) scale(1); box-shadow: 0 0 0 0 rgba(226,184,88,0); background: rgba(63,159,77,0.18); }
        }
        .grid-column:first-child .join-btn.pulse-glow {
          animation: joinPulseGlowLeft 1.6s ease-in-out;
        }
        .grid-column:last-child .join-btn.pulse-glow {
          animation: joinPulseGlowRight 1.6s ease-in-out;
        }
        .grid-bottom-row .join-btn.pulse-glow {
          animation: joinPulseGlow 1.6s ease-in-out;
        }
        .tile-qr { display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; gap: 6px; position: relative; z-index: 10; }
        .tile-qr.active { display: flex; }
        .tile-normal.hidden { display: none; }
        .player-tile.eliminated {
          background-color: ${DARK.bgCard} !important;
          border: 1px solid ${DARK.cellBorder} !important;
        }
        .qr-label {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 8px;
          color: ${DARK.ink3};
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .qr-box {
          width: 50px;
          height: 50px;
          background: ${DARK.bgDeep};
          border-radius: 10px;
          border: 1px solid ${DARK.cellBorder};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .qr-pattern {
          width: 100%;
          height: 100%;
          background: repeating-conic-gradient(${DARK.bgCard} 0% 25%, ${DARK.bgDeep} 0% 50%) 50% / 8px 8px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-center {
          background: ${DARK.bgDeep};
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
          color: ${DARK.ink};
          background: ${DARK.copper};
        }
        .qr-player-label {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 7px;
          color: ${DARK.ink3};
          font-style: italic;
        }
        .revive-btn {
          padding: 4px 10px;
          background: rgba(63,159,77,0.15);
          border: 1px solid ${DARK.copper};
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 8px;
          color: ${DARK.copper};
          margin-top: 3px;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .revive-btn:active {
          transform: scale(0.9);
          background: rgba(63,159,77,0.25);
        }
        .join-modal {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.65);
          display: none; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .join-modal.active { display: flex; }
        .join-modal-card {
          width: calc(100% - 40px); max-width: 340px;
          background: ${DARK.bgCard};
          border: 1px solid ${DARK.lineStrong};
          border-radius: 20px; padding: 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          position: relative;
          text-align: center;
        }
        .join-modal-title {
          font-weight: 700; font-size: 18px; color: ${DARK.ink};
          margin-bottom: 6px; text-align: center; letter-spacing: 0.02em;
        }
        .join-modal-subtitle {
          font-size: 13px; color: ${DARK.ink3};
          margin-bottom: 16px;
        }
        .join-qr-box {
          width: 150px; height: 150px;
          margin: 0 auto;
          background: ${DARK.bgDeep};
          border-radius: 14px;
          border: 1px solid ${DARK.cellBorder};
          display: flex; align-items: center; justify-content: center;
          padding: 10px;
        }
        .join-qr-pattern {
          width: 100%; height: 100%;
          background: repeating-conic-gradient(${DARK.bgCard} 0% 25%, ${DARK.bgDeep} 0% 50%) 50% / 12px 12px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .join-qr-center {
          background: ${DARK.bgDeep};
          padding: 8px;
          border-radius: 8px;
        }
        .join-qr-badge {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 800;
          color: ${DARK.ink};
          background: ${DARK.copper};
        }
        .join-slot-code {
          margin-top: 16px;
          padding: 10px 16px;
          background: ${DARK.bgDeep};
          border: 1px solid ${DARK.lineStrong};
          border-radius: 10px;
          display: inline-block;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .join-slot-code:active {
          transform: scale(0.98);
          border-color: ${DARK.copper};
        }
        .join-slot-code span {
          color: ${DARK.copper};
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 4px;
          font-family: 'Courier New', monospace;
        }
        .join-simulate-btn {
          margin-top: 18px;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, ${DARK.forest} 0%, ${DARK.forestDeep} 100%);
          border: none; border-radius: 12px;
          color: ${DARK.ink};
          font-weight: 700; font-size: 15px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .join-simulate-btn:active { transform: scale(0.98); }
        .bottom-nav {
          margin-top: auto;
          margin-bottom: 16px;
          margin-left: 12px;
          margin-right: 12px;
          padding: 12px;
          height: auto;
          border-radius: 16px;
          background: ${DARK.navBg};
          border: 1px solid ${DARK.navBorder};
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1), padding 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          justify-content: space-around;
        }
        .bottom-nav.collapsed {
          height: auto;
          padding: 8px 12px;
        }
        .nav-item {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; cursor: pointer; flex: 1;
          padding: 8px 12px;
          border-radius: 12px;
          background: transparent;
          transition: all 0.2s ease;
          color: ${DARK.ink3};
        }
        .nav-item:active {
          transform: scale(0.92);
          background: ${DARK.navPill};
          border-radius: 12px;
        }
        .nav-item:active .dice-icon { border-color: ${DARK.copper}; }
        .nav-item:active .dice-dot { background: ${DARK.copper}; }
        .nav-item:active .star-icon { border-color: ${DARK.copper}; }
        .nav-item:active .star { background: ${DARK.copper}; }
        .nav-item:active .nav-label { color: ${DARK.copper}; }
        .nav-item:active .list-icon span { background: ${DARK.copper}; }
        .nav-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
        .dice-icon {
          width: 20px; height: 20px;
          border: 1.5px solid ${DARK.ink3}; border-radius: 4px;
          position: relative;
          transition: border-color 0.2s ease;
        }
        .dice-dot {
          width: 2px; height: 2px; background: ${DARK.ink3};
          position: absolute; border-radius: 50%;
          transition: background 0.2s ease;
        }
        .dice-dot:nth-child(1) { top: 2px; left: 2px; }
        .dice-dot:nth-child(2) { top: 2px; right: 2px; }
        .dice-dot:nth-child(3) { top: 8px; left: 8px; }
        .dice-dot:nth-child(4) { bottom: 2px; left: 2px; }
        .dice-dot:nth-child(5) { bottom: 2px; right: 2px; }
        .star-icon {
          width: 20px; height: 20px;
          border: 1.5px solid ${DARK.ink3}; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s ease;
        }
        .star {
          width: 10px; height: 10px;
          clipPath: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          background: ${DARK.ink3};
          transition: background 0.2s ease;
        }
        .nav-label {
          font-weight: 500; font-size: 11px; color: ${DARK.ink3};
          max-height: 18px;
          opacity: 1;
          overflow: hidden;
          transition: max-height 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .bottom-nav.collapsed .nav-label {
          max-height: 0;
          opacity: 0;
        }
        .bottom-nav.collapsed .nav-item {
          gap: 0;
        }
        .list-icon {
          width: 16px; height: 12px;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .list-icon span {
          height: 1.5px; background: ${DARK.ink3}; border-radius: 1px;
          transition: background 0.2s ease;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.65);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-overlay.active {
          display: flex;
        }
        .dice-modal {
          width: calc(100% - 40px);
          max-width: 340px;
          background: ${DARK.bgCard};
          border: 1px solid ${DARK.lineStrong};
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          color: ${DARK.ink3};
          cursor: pointer;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .modal-close:active {
          transform: scale(0.9);
          background: ${DARK.bgDeep};
        }
        .modal-title {
          font-weight: 700;
          font-size: 18px;
          color: ${DARK.ink};
          margin-bottom: 20px;
          text-align: center;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .tab-group {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .tab {
          padding: 10px 18px;
          border: 1px solid ${DARK.lineStrong};
          background: ${DARK.bgDeep};
          color: ${DARK.ink3};
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .tab.active {
          background: ${DARK.copper};
          color: ${DARK.bgDeep};
          border-color: ${DARK.copper};
        }
        .result-display {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 96px;
          color: ${DARK.copper};
          text-align: center;
          margin-bottom: 12px;
          line-height: 1;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: -2px;
        }
        .rolling-text {
          font-size: 13px;
          color: ${DARK.ink3};
          text-align: center;
          margin-bottom: 20px;
          min-height: 18px;
        }
        .roll-button {
          width: 100%;
          padding: 14px;
          background: ${DARK.copper};
          border: none;
          border-radius: 12px;
          color: ${DARK.bgDeep};
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.02em;
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
          background: rgba(0,0,0,0.65);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
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
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 1px solid ${DARK.lineStrong};
          background: ${DARK.bgCard};
          color: ${DARK.copper};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1002;
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%);
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          transition: all 0.2s ease;
        }
        .counters-flip-btn:active {
          transform: translateX(-50%) scale(0.9);
          background: ${DARK.bgDeep};
        }
        .counters-flip-btn svg {
          width: 24px;
          height: 24px;
          stroke: ${DARK.copper};
        }
        .counters-modal {
          width: 280px;
          background: ${DARK.bgCard};
          border: 1px solid ${DARK.lineStrong};
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          position: relative;
          transition: transform 0.3s ease;
        }
        .counters-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .counters-title {
          font-weight: 700;
          font-size: 14px;
          color: ${DARK.ink};
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .player-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }
        .player-selector-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid ${DARK.lineStrong};
          background: ${DARK.bgDeep};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: ${DARK.ink};
          transition: all 0.2s ease;
          position: relative;
        }
        .player-selector-btn.active {
          border-color: ${DARK.copper};
          background: ${DARK.copper};
          color: ${DARK.bgDeep};
          box-shadow: 0 0 0 1px ${DARK.bgCard};
          transform: scale(1.08);
        }
        .player-selector-btn:active {
          transform: scale(0.95);
        }
        .selected-player-info {
          text-align: center;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${DARK.lineStrong};
        }
        .selected-commander {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 12px;
          color: ${DARK.copper};
          margin-bottom: 3px;
          letter-spacing: 0.02em;
        }
        .selected-player-name {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 10px;
          color: ${DARK.ink3};
        }
        .counter-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: ${DARK.bgDeep};
          border-radius: 10px;
          margin-bottom: 10px;
          border: 1px solid ${DARK.line};
        }
        .counter-row:last-child {
          margin-bottom: 0;
        }
        .counter-label {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .counter-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${DARK.copper};
        }
        .counter-icon svg {
          width: 20px;
          height: 20px;
          stroke: ${DARK.copper};
        }
        .counter-name {
          font-weight: 600;
          font-size: 12px;
          color: ${DARK.ink};
          letter-spacing: 0.02em;
          text-transform: uppercase;
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
          border: 1px solid ${DARK.lineStrong};
          background: ${DARK.bgCard};
          color: ${DARK.copper};
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .counter-btn:active {
          transform: scale(0.9);
          background: ${DARK.bgDeep};
        }
        .counter-value {
          font-weight: 700;
          font-size: 22px;
          color: ${DARK.copper};
          min-width: 28px;
          text-align: center;
          font-family: 'Courier New', monospace;
        }
        .tile-counters {
          display: flex;
          gap: 6px;
          justify-content: center;
          min-height: 14px;
          margin-bottom: 6px;
          position: relative;
          z-index: 5;
        }
        .tile-counter-indicator {
          display: none;
          align-items: center;
          gap: 3px;
          opacity: 0.9;
        }
        .tile-counter-indicator.visible {
          display: flex;
        }
        .tile-counter-indicator svg {
          width: 10px;
          height: 10px;
        }
        .tile-counter-indicator svg path {
          stroke: ${DARK.copper};
          stroke-width: 2.2;
        }
        .tile-counter-number {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 10px;
          color: ${DARK.copper};
          line-height: 1;
          letter-spacing: 0.02em;
        }
        .toast {
          position: fixed;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background: ${DARK.bgCard};
          color: ${DARK.ink};
          padding: 12px 24px;
          border-radius: 10px;
          border: 1px solid ${DARK.lineStrong};
          font-size: 13px;
          font-weight: 600;
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
      ` }} />

      <div className="grid-container">
        <div className="grid-top">
          <div className="grid-column">
            <PlayerTile playerNum={2} rotation="rotate-left" />
          </div>
          <div className="grid-column">
            <PlayerTile playerNum={3} rotation="rotate-right" />
          </div>
        </div>

        <div className="grid-bottom-row">
          <PlayerTile playerNum={1} />
        </div>
      </div>

      <div className={`bottom-nav ${navCollapsed ? 'collapsed' : ''}`} onClick={handleNavClick}>
        <div className="nav-item" onClick={openDiceModal}>
          <div className="nav-icon">
            <div className="dice-icon">
              <div className="dice-dot"></div>
              <div className="dice-dot"></div>
              <div className="dice-dot"></div>
              <div className="dice-dot"></div>
              <div className="dice-dot"></div>
            </div>
          </div>
          <div className="nav-label">Dice</div>
        </div>
        <div className="nav-item" onClick={openCountersModal}>
          <div className="nav-icon">
            <div className="star-icon"><div className="star"></div></div>
          </div>
          <div className="nav-label">Counters</div>
        </div>
        <Link href={`/singleview?podId=${podId}&gameId=${gameId}`} style={{ textDecoration: 'none' }}>
          <div className="nav-item">
            <div className="nav-icon">
              <div className="list-icon">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div className="nav-label">Single View</div>
          </div>
        </Link>
      </div>

      {showDiceModal && (
        <div className="modal-overlay active" onClick={closeDiceModal}>
          <div className="dice-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDiceModal}>✕</button>
            <div className="modal-title">Dice Roller</div>
            <div className="tab-group">
              <button
                className={`tab ${diceTab === 'd6' ? 'active' : ''}`}
                onClick={() => { setDiceTab('d6'); setDiceResult('—'); setRollingText(''); }}
              >
                D6
              </button>
              <button
                className={`tab ${diceTab === 'd20' ? 'active' : ''}`}
                onClick={() => { setDiceTab('d20'); setDiceResult('—'); setRollingText(''); }}
              >
                D20
              </button>
              <button
                className={`tab ${diceTab === 'coin' ? 'active' : ''}`}
                onClick={() => { setDiceTab('coin'); setDiceResult('—'); setRollingText(''); }}
              >
                Coin
              </button>
            </div>
            <div className="result-display">{diceResult}</div>
            <div className="rolling-text">{rollingText}</div>
            <button className="roll-button" onClick={handleDiceRoll}>Roll</button>
          </div>
        </div>
      )}

      {showCountersModal && (
        <div className="counters-overlay active" onClick={closeCountersModal}>
          <div className={`counters-popup-wrapper ${countersFlipped ? 'facing-right' : 'facing-left'}`} onClick={(e) => e.stopPropagation()}>
            <div className="counters-modal">
              <div className="counters-header">
                <div className="counters-title">Counters</div>
                <button className="modal-close" onClick={closeCountersModal}>✕</button>
              </div>
              <div className="player-selector">
                {([1, 2, 3] as const).map(num => (
                  <button
                    key={num}
                    className={`player-selector-btn ${selectedCounterPlayer === num ? 'active' : ''}`}
                    onClick={() => setSelectedCounterPlayer(num)}
                    style={
                      players[num].claimed && players[num].assignedColor
                        ? (() => {
                            const style = manaColorStyles[players[num].assignedColor!];
                            const m = style.grad[1];
                            return {
                              background: `rgb(${m[0]},${m[1]},${m[2]})`,
                              borderColor: `rgb(${style.border[0]},${style.border[1]},${style.border[2]})`
                            };
                          })()
                        : { background: DARK.bgDeep, color: DARK.ink }
                    }
                  >
                    {players[num].name.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="selected-player-info">
                <div className="selected-commander">{players[selectedCounterPlayer].commander || '—'}</div>
                <div className="selected-player-name">
                  {players[selectedCounterPlayer].claimed ? players[selectedCounterPlayer].name : `Player ${selectedCounterPlayer}`}
                </div>
              </div>
              <div className="counter-row">
                <div className="counter-label">
                  <div className="counter-icon">
                    <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.3 15.8455C16.8228 15.8455 21.3 12.5894 21.3 8.57278C21.3 4.55616 16.8228 1.30005 11.3 1.30005C5.77714 1.30005 1.29999 4.55616 1.29999 8.57278C1.29999 12.5894 5.77714 15.8455 11.3 15.8455Z" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.54999 6.75453L3.79999 3.11816M15.05 6.75453L18.8 3.11816M11.3 15.8454V21.3M6.29999 19.4818H16.3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="counter-name">Poison</div>
                </div>
                <div className="counter-controls">
                  <button className="counter-btn" onClick={() => updateCounters(selectedCounterPlayer, 'poison', -1)}>−</button>
                  <div className="counter-value">{counters[selectedCounterPlayer].poison}</div>
                  <button className="counter-btn" onClick={() => updateCounters(selectedCounterPlayer, 'poison', 1)}>+</button>
                </div>
              </div>
              <div className="counter-row">
                <div className="counter-label">
                  <div className="counter-icon">
                    <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1.30002 21.3L2.96668 5.74449L7.13335 12.4112L11.3 1.30005L15.4667 12.4112L19.6334 5.74449L21.3 21.3H1.30002Z" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.30002 21.3H21.3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="counter-name">Experience</div>
                </div>
                <div className="counter-controls">
                  <button className="counter-btn" onClick={() => updateCounters(selectedCounterPlayer, 'experience', -1)}>−</button>
                  <div className="counter-value">{counters[selectedCounterPlayer].experience}</div>
                  <button className="counter-btn" onClick={() => updateCounters(selectedCounterPlayer, 'experience', 1)}>+</button>
                </div>
              </div>
              <div className="counter-row">
                <div className="counter-label">
                  <div className="counter-icon">
                    <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.8 1.30005L1.30005 12.7286H11.3L8.80005 21.3L21.3 9.87148H11.3L13.8 1.30005Z" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="counter-name">Energy</div>
                </div>
                <div className="counter-controls">
                  <button className="counter-btn" onClick={() => updateCounters(selectedCounterPlayer, 'energy', -1)}>−</button>
                  <div className="counter-value">{counters[selectedCounterPlayer].energy}</div>
                  <button className="counter-btn" onClick={() => updateCounters(selectedCounterPlayer, 'energy', 1)}>+</button>
                </div>
              </div>
            </div>
            <button className="counters-flip-btn" onClick={() => setCountersFlipped(!countersFlipped)}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2L18 6L14 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 6H7C4.24 6 2 8.24 2 11V11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 18L2 14L6 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 14H13C15.76 14 18 11.76 18 9V9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {showJoinModal && joinSlot && (
        <div className="join-modal active" onClick={() => setShowJoinModal(false)}>
          <div className="join-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJoinModal(false)}>✕</button>
            <div className="join-modal-title">Join Slot {joinSlot}</div>
            <div className="join-modal-subtitle">Scan to claim this player slot</div>
            <div className="join-qr-box">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR code to join pod" width={130} height={130} style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div style={{ color: DARK.ink3, fontSize: 12 }}>No pod code</div>
              )}
            </div>
            <div className="join-slot-code" onClick={copyPodCode} style={{ cursor: 'pointer' }}>
              <span>{podShortCode ? `${podShortCode.slice(0, 3)}—${podShortCode.slice(3)}` : '------'}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: DARK.ink3, textAlign: 'center' }}>
              Tap the code to copy
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GridView3P() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: DARK.ink3 }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
