# apply-defeat-animation.ps1
# Run from anywhere. Just: powershell -ExecutionPolicy Bypass -File .\apply-defeat-animation.ps1
# Or in pwsh: .\apply-defeat-animation.ps1

$ErrorActionPreference = 'Stop'
$base = 'C:\Users\noahk\Desktop\aura'

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Replace-InFile([string]$Path, [string]$Old, [string]$New) {
  if (-not (Test-Path $Path)) { throw "Missing file: $Path" }
  $content = [System.IO.File]::ReadAllText($Path)
  # Normalize so CRLF / LF mismatch between this script and the target file doesn't break .Replace
  $hasCRLF = $content.Contains("`r`n")
  $oldN = $Old -replace "`r`n", "`n"
  $newN = $New -replace "`r`n", "`n"
  if ($hasCRLF) {
    $oldN = $oldN -replace "`n", "`r`n"
    $newN = $newN -replace "`n", "`r`n"
  }
  if (-not $content.Contains($oldN)) {
    Write-Warning "Pattern NOT found in $Path -- skipping (already applied?)"
    return
  }
  $content = $content.Replace($oldN, $newN)
  Write-Utf8NoBom -Path $Path -Content $content
  Write-Host "  patched: $Path" -ForegroundColor Green
}

# ============================================================================
# 1) Create the new shared DefeatedOverlay component
# ============================================================================

$overlay = @'
'use client';

import React, { useEffect, useId, useState } from 'react';

// ─── ZeroFade (TS port of ZeroFade.jsx) ───────────────────────────────────
// The serif "0" scales in crimson with red glow, a circular pulse blooms
// behind it, ash-wisps drift upward, and the numeral drains to ash.
//
// Total runtime = inMs + holdMs + outMs (default 1860ms).

export type ZeroFadeProps = {
  size?: number;
  color?: string;
  hot?: string;
  glow?: string;
  pulseColor?: string;
  ashColor?: string;
  ashOpacity?: number;
  smokeColor?: string;
  smokeCount?: number;
  font?: string;
  inMs?: number;
  holdMs?: number;
  outMs?: number;
  boxWidth?: number;
  boxHeight?: number;
  loop?: boolean;
  loopGap?: number;
  trigger?: unknown;
  label?: string;
};

export const ZERO_FADE_DEFAULT_DURATION = 320 + 340 + 1200; // 1860ms

function pct(at: number, total: number) {
  return ((at / total) * 100).toFixed(2);
}

export function ZeroFade({
  size = 88,
  color = 'var(--parchment, #F5EFE2)',
  hot = '#E78A85',
  glow = 'rgba(158,43,43,0.7)',
  pulseColor = 'rgba(158,43,43,0.55)',
  ashColor = 'rgba(245,239,226,0.32)',
  ashOpacity = 0.6,
  smokeColor = 'rgba(245,239,226,0.55)',
  smokeCount = 3,
  font = 'var(--font-display, "Young Serif", Georgia, serif)',
  inMs = 320,
  holdMs = 340,
  outMs = 1200,
  boxWidth,
  boxHeight,
  loop = false,
  loopGap = 600,
  trigger,
  label = '0',
}: ZeroFadeProps) {
  const rawId = useId();
  const id = rawId.replace(/[^a-z0-9]/gi, '');
  const [k, setK] = useState(0);

  const totalMs = inMs + holdMs + outMs;
  const pulseDelay = Math.round(inMs * 0.3);
  const pulseDur = Math.max(600, Math.round((inMs + holdMs) * 1.1));
  const smokeStart = Math.round(inMs * 0.6);
  const smokeDur = Math.max(1200, Math.round(holdMs + outMs * 0.7));

  useEffect(() => {
    setK((x) => x + 1);
  }, [trigger]);

  useEffect(() => {
    if (!loop) return;
    const t = setTimeout(() => setK((x) => x + 1), totalMs + loopGap);
    return () => clearTimeout(t);
  }, [k, loop, totalMs, loopGap]);

  const pulseSize = Math.round(size * 1.6);
  const resolvedBoxWidth = boxWidth ?? Math.round(size * 1.9);
  const resolvedBoxHeight = boxHeight ?? Math.round(size * 1.55);

  const css = `
    @keyframes zf-num-${id} {
      0%   { opacity: 0; transform: scale(0.6);
             color: ${color}; text-shadow: 0 0 0 transparent; }
      ${pct(inMs * 0.6, totalMs)}% { opacity: 1; transform: scale(1.08);
             color: ${hot}; text-shadow: 0 0 18px ${glow}; }
      ${pct(inMs, totalMs)}% { opacity: 1; transform: scale(1);
             color: ${color}; text-shadow: none; }
      ${pct(inMs + holdMs, totalMs)}% { color: ${color}; opacity: 1; }
      100% { color: ${ashColor}; opacity: ${ashOpacity}; transform: scale(1); }
    }
    @keyframes zf-pulse-${id} {
      0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.4); }
      22%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1.0); }
      100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.7); }
    }
    @keyframes zf-smoke-${id} {
      0%   { opacity: 0;   transform: translate(-50%, 0)    scale(0.6); }
      30%  { opacity: 0.8; transform: translate(-50%, -10px) scale(1.0); }
      100% { opacity: 0;   transform: translate(-50%, -40px) scale(1.6); }
    }
  `;

  const wisps = Array.from({ length: smokeCount }, (_, i) => {
    const spread = smokeCount > 1 ? (i / (smokeCount - 1) - 0.5) * 36 : 0;
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          left: `calc(50% + ${spread}px)`,
          top: '32%',
          width: 14,
          height: 14,
          borderRadius: 999,
          background: `radial-gradient(circle, ${smokeColor}, transparent 70%)`,
          opacity: 0,
          animation: `zf-smoke-${id} ${smokeDur}ms cubic-bezier(.22,.61,.36,1) ${smokeStart + i * 140}ms forwards`,
          pointerEvents: 'none',
        }}
      />
    );
  });

  return (
    <div
      style={{
        position: 'relative',
        width: resolvedBoxWidth,
        height: resolvedBoxHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      <style>{css}</style>

      <div key={k} style={{ position: 'absolute', inset: 0 }}>
        {/* crimson pulse — behind the numeral */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: pulseSize,
            height: pulseSize,
            borderRadius: 999,
            background: `radial-gradient(circle, ${pulseColor}, transparent 65%)`,
            transform: 'translate(-50%, -50%) scale(0.4)',
            opacity: 0,
            animation: `zf-pulse-${id} ${pulseDur}ms cubic-bezier(.22,.61,.36,1) ${pulseDelay}ms forwards`,
            pointerEvents: 'none',
          }}
        />

        {/* ash-wisps rising from the numeral */}
        {wisps}

        {/* the numeral itself */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: font,
              fontWeight: 400,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              willChange: 'transform, color, opacity, text-shadow',
              animation: `zf-num-${id} ${totalMs}ms cubic-bezier(.22,.61,.36,1) forwards`,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DefeatedOverlay ───────────────────────────────────────────────────────
// Drop-in cell overlay used by every gridview's NormalCell + EmptyCell.

export type DefeatedOverlayProps = {
  bgColor: string;
  reviveColor: string;
  reviveTextColor: string;
  reviveBorder?: string;
  reviewBorder?: string;
  reviewTextColor?: string;
  onRevive?: () => void;
  onReview?: () => void;
  showReviewButton?: boolean;
  zIndex?: number;
  triggerKey?: string | number;
  label?: string;
  size?: number;
};

export function DefeatedOverlay({
  bgColor,
  reviveColor,
  reviveTextColor,
  reviveBorder,
  reviewBorder,
  reviewTextColor,
  onRevive,
  onReview,
  showReviewButton = false,
  zIndex = 25,
  triggerKey,
  label = '0',
  size = 88,
}: DefeatedOverlayProps) {
  const [buttonsIn, setButtonsIn] = useState(false);

  useEffect(() => {
    setButtonsIn(false);
    const t = setTimeout(() => setButtonsIn(true), ZERO_FADE_DEFAULT_DURATION);
    return () => clearTimeout(t);
  }, [triggerKey]);

  const rawId = useId();
  const id = rawId.replace(/[^a-z0-9]/gi, '');

  const css = `
    @keyframes defeat-backdrop-in-${id} {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes defeat-button-pop-${id} {
      0%   { opacity: 0; transform: scale(0.6); }
      60%  { opacity: 1; transform: scale(1.06); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        animation: `defeat-backdrop-in-${id} 320ms cubic-bezier(.22,.61,.36,1) forwards`,
        willChange: 'opacity',
      }}
    >
      <style>{css}</style>

      <ZeroFade size={size} label={label} trigger={triggerKey} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
          minHeight: showReviewButton ? 88 : 44,
        }}
      >
        {buttonsIn && (
          <>
            <button
              onClick={onRevive}
              style={{
                padding: '10px 22px',
                background: reviveColor,
                color: reviveTextColor,
                border: reviveBorder ? `1px solid ${reviveBorder}` : 'none',
                borderRadius: 999,
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                opacity: 0,
                transform: 'scale(0.6)',
                animation: `defeat-button-pop-${id} 280ms cubic-bezier(.34,1.56,.64,1) 0ms forwards`,
                willChange: 'opacity, transform',
              }}
            >
              Revive
            </button>
            {showReviewButton && (
              <button
                onClick={onReview}
                style={{
                  padding: '8px 18px',
                  background: 'transparent',
                  color: reviewTextColor ?? reviveTextColor,
                  border: `1px solid ${reviewBorder ?? reviveBorder ?? 'rgba(226,184,88,0.18)'}`,
                  borderRadius: 999,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  transform: 'scale(0.6)',
                  animation: `defeat-button-pop-${id} 280ms cubic-bezier(.34,1.56,.64,1) 90ms forwards`,
                  willChange: 'opacity, transform',
                }}
              >
                Review Game
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
'@

Write-Host "Step 1: writing app\components\DefeatedOverlay.tsx ..." -ForegroundColor Cyan
Write-Utf8NoBom -Path (Join-Path $base 'app\components\DefeatedOverlay.tsx') -Content $overlay
Write-Host "  done" -ForegroundColor Green

# ============================================================================
# 2) Shared old/new snippets used across gridviews
# ============================================================================

# 2a. Add import line (all 4 files share this exact line)
$importOld = "import AuraLoaderG from '@/app/components/AuraLoaderG';"
$importNew = "import AuraLoaderG from '@/app/components/AuraLoaderG';`r`nimport { DefeatedOverlay } from '@/app/components/DefeatedOverlay';"

# 2b. The OLD "big" IIFE (used by NormalCell -- has gap:14)
$bigOld = @'
        const isLifeZero = (player.life ?? 1) <= 0;
        const isPoisoned = (player.counters?.poison || 0) >= 10;
        const isCmdrLethal = (player.cmdrDamage || []).some((d: any) => d.amount >= 21);
        if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
        const causes: string[] = [];
        if (isLifeZero) causes.push('Life');
        if (isPoisoned) causes.push('Poison');
        if (isCmdrLethal) causes.push('Commander');
        const reason = causes.join(' + ');
        return (
          <div style={{
            position:'absolute', inset:0, zIndex:20,
            background:'rgba(10,6,4,0.88)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
          }}>
            <div style={{
              fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
              letterSpacing:'0.20em', textTransform:'uppercase',
              color: DARK.ink2,
            }}>Defeated · {reason}</div>
            <button onClick={onRevive} style={{
              padding:'10px 22px',
              background: DARK.forest,
              color: DARK.ink,
              border:'none', borderRadius:999,
              fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700,
              letterSpacing:'0.16em', textTransform:'uppercase',
              cursor:'pointer', whiteSpace:'nowrap',
            }}>Revive</button>
          </div>
        );
'@

# Generates the NEW "big" replacement for any cell, with a configurable size
function Get-BigNew([int]$Size = 88) {
  $sizeLine = if ($Size -eq 88) { '' } else { "            size={$Size},`r`n" }
@"
        const isLifeZero = (player.life ?? 1) <= 0;
        const isPoisoned = (player.counters?.poison || 0) >= 10;
        const isCmdrLethal = (player.cmdrDamage || []).some((d: any) => d.amount >= 21);
        if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
        return (
          <DefeatedOverlay
            bgColor={DARK.bgCard}
            reviveColor={DARK.forest}
            reviveTextColor={DARK.ink}
            onRevive={onRevive}
            zIndex={20}
$sizeLine            triggerKey={`${isLifeZero ? 'L' : ''}${isPoisoned ? 'P' : ''}${isCmdrLethal ? 'C' : ''}`}
          />
        );
"@
}

# 2c. The OLD "empty" IIFE (used by SidewaysEmptyCell in 3p/4p/5p, indented 2 more spaces)
$emptyOldSideways = @'
          const isLifeZero = (life ?? 1) <= 0;
          const isPoisoned = (cellCounters?.poison || 0) >= 10;
          const isCmdrLethal = (cmdrDamage || []).some((d: any) => d.amount >= 21);
          if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
          const causes: string[] = [];
          if (isLifeZero) causes.push('Life');
          if (isPoisoned) causes.push('Poison');
          if (isCmdrLethal) causes.push('Commander');
          const reason = causes.join(' + ');
          return (
            <div style={{
              position:'absolute', inset:0, zIndex:25,
              background:'rgba(10,6,4,0.88)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12,
              padding:'8px 12px',
            }}>
              <div style={{
                fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700,
                letterSpacing:'0.20em', textTransform:'uppercase',
                color: DARK.ink2, textAlign:'center',
              }}>Defeated · {reason}</div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <button onClick={onRevive} style={{
                  padding:'8px 18px',
                  background: DARK.forest,
                  color: DARK.ink,
                  border:'none', borderRadius:999,
                  fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
                  letterSpacing:'0.14em', textTransform:'uppercase',
                  cursor:'pointer', whiteSpace:'nowrap',
                }}>Revive</button>
                <button onClick={onClaimSeat} style={{
                  padding:'6px 14px',
                  background:'transparent',
                  color: DARK.ink2,
                  border:`1px solid ${DARK.lineStrong}`, borderRadius:999,
                  fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700,
                  letterSpacing:'0.14em', textTransform:'uppercase',
                  cursor:'pointer', whiteSpace:'nowrap',
                }}>Review Game</button>
              </div>
            </div>
          );
'@

function Get-EmptySidewaysNew([int]$Size) {
@"
          const isLifeZero = (life ?? 1) <= 0;
          const isPoisoned = (cellCounters?.poison || 0) >= 10;
          const isCmdrLethal = (cmdrDamage || []).some((d: any) => d.amount >= 21);
          if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
          return (
            <DefeatedOverlay
              bgColor={DARK.bgDeep}
              reviveColor={DARK.forest}
              reviveTextColor={DARK.ink}
              reviewBorder={DARK.lineStrong}
              reviewTextColor={DARK.ink2}
              onRevive={onRevive}
              onReview={onClaimSeat}
              showReviewButton={true}
              zIndex={25}
              size={$Size}
              triggerKey={`${isLifeZero ? 'L' : ''}${isPoisoned ? 'P' : ''}${isCmdrLethal ? 'C' : ''}`}
            />
          );
"@
}

# 2d. The OLD 2p NormalEmptyCell IIFE (not sideways -- indented like big block, gap:14)
$empty2pOld = @'
        const isLifeZero = (life ?? 1) <= 0;
        const isPoisoned = (cellCounters?.poison || 0) >= 10;
        const isCmdrLethal = (cmdrDamage || []).some((d: any) => d.amount >= 21);
        if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
        const causes: string[] = [];
        if (isLifeZero) causes.push('Life');
        if (isPoisoned) causes.push('Poison');
        if (isCmdrLethal) causes.push('Commander');
        const reason = causes.join(' + ');
        return (
          <div style={{
            position:'absolute', inset:0, zIndex:25,
            background:'rgba(10,6,4,0.88)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
          }}>
            <div style={{
              fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
              letterSpacing:'0.20em', textTransform:'uppercase',
              color: DARK.ink2,
            }}>Defeated · {reason}</div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <button onClick={onRevive} style={{
                padding:'10px 22px',
                background: DARK.forest,
                color: DARK.ink,
                border:'none', borderRadius:999,
                fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700,
                letterSpacing:'0.16em', textTransform:'uppercase',
                cursor:'pointer', whiteSpace:'nowrap',
              }}>Revive</button>
              <button onClick={onClaimSeat} style={{
                padding:'8px 18px',
                background:'transparent',
                color: DARK.ink2,
                border:`1px solid ${DARK.lineStrong}`, borderRadius:999,
                fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
                letterSpacing:'0.16em', textTransform:'uppercase',
                cursor:'pointer', whiteSpace:'nowrap',
              }}>Review Game</button>
            </div>
          </div>
        );
'@

$empty2pNew = @'
        const isLifeZero = (life ?? 1) <= 0;
        const isPoisoned = (cellCounters?.poison || 0) >= 10;
        const isCmdrLethal = (cmdrDamage || []).some((d: any) => d.amount >= 21);
        if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
        return (
          <DefeatedOverlay
            bgColor={DARK.bgDeep}
            reviveColor={DARK.forest}
            reviveTextColor={DARK.ink}
            reviewBorder={DARK.lineStrong}
            reviewTextColor={DARK.ink2}
            onRevive={onRevive}
            onReview={onClaimSeat}
            showReviewButton={true}
            zIndex={25}
            triggerKey={`${isLifeZero ? 'L' : ''}${isPoisoned ? 'P' : ''}${isCmdrLethal ? 'C' : ''}`}
          />
        );
'@

# ============================================================================
# 3) Patch each gridview
# ============================================================================

Write-Host "`nStep 2: patching gridview-2p ..." -ForegroundColor Cyan
$f2 = Join-Path $base 'app\gridview-2p\page.tsx'
Replace-InFile $f2 $importOld   $importNew
Replace-InFile $f2 $bigOld      (Get-BigNew 88)
Replace-InFile $f2 $empty2pOld  $empty2pNew

Write-Host "`nStep 3: patching gridview-3p ..." -ForegroundColor Cyan
$f3 = Join-Path $base 'app\gridview-3p\page.tsx'
Replace-InFile $f3 $importOld         $importNew
# 3p has TWO big-IIFEs (sideways + normal) -- patch each replaces ONE; do the same string twice
Replace-InFile $f3 $bigOld            (Get-BigNew 88)
Replace-InFile $f3 $bigOld            (Get-BigNew 88)
Replace-InFile $f3 $emptyOldSideways  (Get-EmptySidewaysNew 72)

Write-Host "`nStep 4: patching gridview-4p ..." -ForegroundColor Cyan
$f4 = Join-Path $base 'app\gridview-4p\page.tsx'
Replace-InFile $f4 $importOld         $importNew
Replace-InFile $f4 $bigOld            (Get-BigNew 72)
Replace-InFile $f4 $emptyOldSideways  (Get-EmptySidewaysNew 64)

Write-Host "`nStep 5: patching gridview-5p ..." -ForegroundColor Cyan
$f5 = Join-Path $base 'app\gridview-5p\page.tsx'
Replace-InFile $f5 $importOld         $importNew
Replace-InFile $f5 $bigOld            (Get-BigNew 64)
Replace-InFile $f5 $bigOld            (Get-BigNew 64)
Replace-InFile $f5 $emptyOldSideways  (Get-EmptySidewaysNew 56)

Write-Host "`nAll done." -ForegroundColor Green
Write-Host "Next: run 'npx tsc --noEmit' to verify and 'npm run dev' to test." -ForegroundColor Yellow
