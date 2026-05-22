import { ImageIcon, Music, Video } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'

import { useMediaFileDrop } from './use-media-file-drop'

type MediaEmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  onDropFiles?: (files: FileList) => void | Promise<void>
  className?: string
  iconVariant?: 'solid' | 'glass'
}

function MediaEmptyStateIcons({
  variant = 'solid',
}: {
  variant?: MediaEmptyStateProps['iconVariant']
}) {
  const isGlass = variant === 'glass'
  const iconShellClass = cn(
    'absolute top-1/2 flex size-8 items-center justify-center rounded-md border shadow-sm',
    isGlass
      ? 'border-border/60 bg-background/60 backdrop-blur-sm'
      : 'border-border bg-background',
  )

  return (
    <EmptyMedia className="relative mb-2 h-10 w-20" aria-hidden>
      <div
        className={cn(
          iconShellClass,
          'left-0 z-10 translate-y-[-40%] -rotate-12 text-muted-foreground',
        )}
      >
        <ImageIcon className="size-4" />
      </div>
      <div
        className={cn(
          iconShellClass,
          'left-1/2 z-20 -translate-x-1/2 translate-y-[-60%] text-foreground',
        )}
      >
        <Video className="size-4" />
      </div>
      <div
        className={cn(
          iconShellClass,
          'right-0 z-10 translate-y-[-40%] rotate-12 text-muted-foreground',
        )}
      >
        <Music className="size-4" />
      </div>
    </EmptyMedia>
  )
}

export function MediaEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  onDropFiles,
  className,
  iconVariant = 'solid',
}: MediaEmptyStateProps) {
  const showAction = Boolean(actionLabel && onAction)
  const isDropTarget = Boolean(onDropFiles)
  const { isDragging, dropZoneProps } = useMediaFileDrop({
    onDropFiles: onDropFiles ?? (() => {}),
    enabled: isDropTarget,
  })

  return (
    <Empty
      className={cn(
        'gap-2 rounded-lg border-0 bg-background px-3 py-4',
        isDropTarget &&
          isDragging &&
          'border-2 border-dashed border-editor-selection bg-secondary/30',
        className,
      )}
      {...(isDropTarget ? dropZoneProps : {})}
    >
      <EmptyHeader className="gap-1">
        <MediaEmptyStateIcons variant={iconVariant} />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {showAction ? (
        <EmptyContent>
          <Button type="button" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
