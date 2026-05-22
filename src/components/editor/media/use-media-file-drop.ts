import { useCallback, useState } from 'react'

export function hasExternalFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes('Files')
}

type UseMediaFileDropOptions = {
  onDropFiles: (files: FileList) => void | Promise<void>
  enabled?: boolean
}

export function useMediaFileDrop({
  onDropFiles,
  enabled = true,
}: UseMediaFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false)

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled || !hasExternalFiles(e.dataTransfer)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragging(true)
    },
    [enabled],
  )

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled) return
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setIsDragging(false)
      }
    },
    [enabled],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled || !e.dataTransfer.files.length) return
      e.preventDefault()
      setIsDragging(false)
      void onDropFiles(e.dataTransfer.files)
    },
    [enabled, onDropFiles],
  )

  return {
    isDragging,
    dropZoneProps: { onDragOver, onDragLeave, onDrop },
  }
}
