import type { Clip } from '../model/editor-types'

export type SnapGuides = {
  vertical: number[]
  horizontal: number[]
}

export const EMPTY_SNAP_GUIDES: SnapGuides = { vertical: [], horizontal: [] }

export type SnapStickyState = {
  x: number | null
  y: number | null
}

export const INITIAL_SNAP_STICKY: SnapStickyState = { x: null, y: null }

type AxisResult = {
  delta: number
  matched: number[]
  stuckTo: number | null
}

function snapAxis(
  candidates: number[],
  targets: number[],
  enterThreshold: number,
  exitThreshold: number,
  prevStuck: number | null,
): AxisResult {
  if (prevStuck != null) {
    let bestDelta = 0
    let bestDist = Infinity
    for (const c of candidates) {
      const d = prevStuck - c
      const ad = Math.abs(d)
      if (ad < bestDist) {
        bestDist = ad
        bestDelta = d
      }
    }
    if (bestDist <= exitThreshold) {
      const matched = collectMatches(candidates, targets, bestDelta)
      return { delta: bestDelta, matched, stuckTo: prevStuck }
    }
  }

  let bestDelta = 0
  let bestDist = Infinity
  let bestTarget: number | null = null
  for (const c of candidates) {
    for (const t of targets) {
      const d = t - c
      const ad = Math.abs(d)
      if (ad < bestDist && ad <= enterThreshold) {
        bestDist = ad
        bestDelta = d
        bestTarget = t
      }
    }
  }
  if (bestTarget == null) {
    return { delta: 0, matched: [], stuckTo: null }
  }
  const matched = collectMatches(candidates, targets, bestDelta)
  return { delta: bestDelta, matched, stuckTo: bestTarget }
}

function collectMatches(candidates: number[], targets: number[], delta: number) {
  const set = new Set<number>()
  for (const c of candidates) {
    const moved = c + delta
    for (const t of targets) {
      if (Math.abs(t - moved) < 0.5) set.add(t)
    }
  }
  return Array.from(set)
}

export function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function computeDragSnap({
  clip,
  rawX,
  rawY,
  otherClips,
  compositionWidth,
  compositionHeight,
  enterThreshold,
  exitThreshold,
  sticky,
}: {
  clip: Clip
  rawX: number
  rawY: number
  otherClips: Clip[]
  compositionWidth: number
  compositionHeight: number
  enterThreshold: number
  exitThreshold: number
  sticky: SnapStickyState
}): { x: number; y: number; guides: SnapGuides; sticky: SnapStickyState } {
  const verticalTargets: number[] = [0, compositionWidth / 2, compositionWidth]
  const horizontalTargets: number[] = [0, compositionHeight / 2, compositionHeight]

  for (const c of otherClips) {
    if (c.id === clip.id) continue
    if (c.type === 'audio' || c.visible === false) continue
    verticalTargets.push(c.x, c.x + c.width / 2, c.x + c.width)
    horizontalTargets.push(c.y, c.y + c.height / 2, c.y + c.height)
  }

  const xCandidates = [rawX, rawX + clip.width / 2, rawX + clip.width]
  const yCandidates = [rawY, rawY + clip.height / 2, rawY + clip.height]

  const xSnap = snapAxis(xCandidates, verticalTargets, enterThreshold, exitThreshold, sticky.x)
  const ySnap = snapAxis(yCandidates, horizontalTargets, enterThreshold, exitThreshold, sticky.y)

  return {
    x: rawX + xSnap.delta,
    y: rawY + ySnap.delta,
    guides: {
      vertical: xSnap.matched,
      horizontal: ySnap.matched,
    },
    sticky: { x: xSnap.stuckTo, y: ySnap.stuckTo },
  }
}
