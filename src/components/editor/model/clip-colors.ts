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
  if (type === 'audio') return 'bg-editor-audio-fill border-editor-audio-border'
  if (type === 'image') return 'bg-editor-image-fill border-editor-image-border'
  if (type === 'text') return 'bg-editor-text-fill border-editor-text-border'
  return 'bg-editor-selection-fill border-editor-selection-border'
}
