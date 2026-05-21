import type { ClipType } from './editor-types'

type ClipColorVars = {
  color: string
  fill: string
  border: string
}

export function clipColorVars(type: ClipType): ClipColorVars {
  if (type === 'audio') {
    return {
      color: 'var(--editor-audio)',
      fill: 'var(--editor-audio-fill)',
      border: 'var(--editor-audio-border)',
    }
  }

  if (type === 'image') {
    return {
      color: 'var(--editor-image)',
      fill: 'var(--editor-image-fill)',
      border: 'var(--editor-image-border)',
    }
  }

  if (type === 'text') {
    return {
      color: 'var(--editor-text)',
      fill: 'var(--editor-text-fill)',
      border: 'var(--editor-text-border)',
    }
  }

  return {
    color: 'var(--editor-selection)',
    fill: 'var(--editor-selection-fill)',
    border: 'var(--editor-selection-border)',
  }
}

export function timelineClipColorClass(type: ClipType): string {
  if (type === 'audio') return 'bg-background border-emerald-300/20'
  if (type === 'image') return 'bg-background border-violet-300/20'
  if (type === 'text') return 'bg-background border-slate-200/20'
  return 'bg-background border-sky-300/20'
}
