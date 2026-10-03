import { useLayoutEffect, useRef, type CSSProperties, type MutableRefObject } from 'react'

import type { Clip } from '../model/editor-types'
import { clipTextAlignJustify, clipTextStyle } from './clip-renderer'

export function TextCanvasEditor({
  clip,
  commitRef,
  onCommit,
  onCancel,
}: {
  clip: Clip
  commitRef: MutableRefObject<(() => void) | null>
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const initialTextRef = useRef(clip.text ?? '')
  const cancelledRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  const onCancelRef = useRef(onCancel)
  onCommitRef.current = onCommit
  onCancelRef.current = onCancel

  useLayoutEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  useLayoutEffect(() => {
    const el = editorRef.current
    if (!el) return

    const commit = () => {
      if (cancelledRef.current) return
      onCommitRef.current(el.value)
    }
    const onFocusOut = () => {
      commit()
    }
    const onPointerDown = (event: PointerEvent) => {
      const frame = frameRef.current
      if (frame?.contains(event.target as Node)) return
      commit()
    }

    commitRef.current = commit
    el.addEventListener('focusout', onFocusOut)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      commitRef.current = null
      el.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [commitRef])

  const style: CSSProperties = {
    ...clipTextStyle(clip),
    background: 'transparent',
    border: 'none',
    resize: 'none',
    outline: 'none',
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    display: 'block',
    cursor: 'text',
    userSelect: 'text',
    fieldSizing: 'content',
  }

  return (
    <div
      ref={frameRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: clipTextAlignJustify(clip),
        paddingInline: clip.backgroundPaddingX ?? 0,
        boxSizing: 'border-box',
        cursor: 'text',
        userSelect: 'text',
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <textarea
        ref={editorRef}
        defaultValue={initialTextRef.current}
        aria-label="Edit text"
        spellCheck
        rows={Math.max(1, initialTextRef.current.split('\n').length)}
        style={style}
        onBlur={() => {
          if (cancelledRef.current) return
          const el = editorRef.current
          if (!el) return
          onCommitRef.current(el.value)
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape') {
            event.preventDefault()
            cancelledRef.current = true
            onCancelRef.current()
          }
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            onCommitRef.current(event.currentTarget.value)
          }
        }}
      />
    </div>
  )
}
