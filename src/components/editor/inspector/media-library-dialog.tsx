import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioLines,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Video,
  type LucideIcon,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { MediaEmptyState } from '../media/media-empty-state'
import { useEditor } from '../model/editor-context-value'
import { RENDERING_AVAILABLE } from '../model/render-mode'
import { inferClipType } from '../model/media-import'
import {
  deleteSource,
  listSources,
  type ListedSource,
} from '../model/upload-client'

type Filter = 'all' | 'video' | 'image' | 'audio'

const FILTER_OPTIONS: {
  value: Filter
  label: string
  icon: LucideIcon
}[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'audio', label: 'Audio', icon: AudioLines },
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function relativeTime(uploadedAt: number) {
  const now = Date.now()
  const diff = Math.max(0, now - uploadedAt)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(uploadedAt).toLocaleDateString()
}

function TypeIcon({
  type,
  className,
}: {
  type: ReturnType<typeof inferClipType>
  className?: string
}) {
  const option = FILTER_OPTIONS.find((item) => item.value === type)
  const Icon = option?.icon ?? ImageIcon
  return <Icon className={cn('size-5 text-muted-foreground', className)} />
}

function DeleteMediaDialog({
  source,
  onOpenChange,
  onConfirm,
}: {
  source: ListedSource | null
  onOpenChange: (open: boolean) => void
  onConfirm: (source: ListedSource) => void
}) {
  const displayedSource = useRef(source)
  if (source) displayedSource.current = source
  const name = (source ?? displayedSource.current)?.name

  return (
    <AlertDialog open={source !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <Empty className="flex-none border-0 bg-transparent p-6">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="bg-destructive/10 text-destructive"
            >
              <Trash2 />
            </EmptyMedia>
            <EmptyTitle>
              <AlertDialogTitle className="text-sm font-medium tracking-tight">
                Delete this file?
              </AlertDialogTitle>
            </EmptyTitle>
            <EmptyDescription className="break-words">
              <AlertDialogDescription>
                &ldquo;{name}&rdquo; will be permanently deleted. This cannot
                be undone.
              </AlertDialogDescription>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (source) onConfirm(source)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Thumbnail({ source }: { source: ListedSource }) {
  const type = inferClipType(source.name, source.contentType)
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-secondary/70">
      {type === 'image' ? (
        <img
          src={source.url}
          alt={source.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : type === 'video' ? (
        <video
          src={source.url}
          muted
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <TypeIcon type={type} className="size-8" />
        </div>
      )}
    </div>
  )
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onAddMedia,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMedia?: () => void
}) {
  const { addExistingSource, addFiles } = useEditor()
  const [sources, setSources] = useState<ListedSource[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ListedSource | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listSources()
      setSources(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Only fetch when the dialog opens — avoids hammering /api/sources on
  // every render of the editor, and keeps the list fresh between visits.
  useEffect(() => {
    if (!open || !RENDERING_AVAILABLE) return
    // The set-state-in-effect rule doesn't fit "kick off a fetch each time
    // this transitions to open" — the setState happens inside the async
    // resolution, not synchronously. Defer to escape the linter heuristic.
    queueMicrotask(() => {
      void load()
    })
  }, [open, load])

  const filtered = useMemo(() => {
    if (!sources) return null
    const q = query.trim().toLowerCase()
    return sources.filter((source) => {
      const type = inferClipType(source.name, source.contentType)
      if (filter !== 'all' && type !== filter) return false
      if (q && !source.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [filter, query, sources])

  const handleDropFiles = useCallback(
    async (files: FileList) => {
      await addFiles(files)
      void load()
    },
    [addFiles, load],
  )

  const handleAdd = async (source: ListedSource) => {
    setAdding(source.pathname)
    try {
      await addExistingSource({
        url: source.url,
        name: source.name,
        contentType: source.contentType,
        size: source.size,
      })
      onOpenChange(false)
    } finally {
      setAdding(null)
    }
  }

  const handleDelete = async (source: ListedSource) => {
    setPendingDelete(null)
    setDeleting(source.pathname)
    try {
      await deleteSource({ url: source.url, pathname: source.pathname })
      setSources((prev) =>
        prev ? prev.filter((s) => s.pathname !== source.pathname) : prev,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPendingDelete(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[95vw] max-w-[calc(100%-2rem)] flex-col gap-4 text-sm sm:max-w-5xl lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-base">Media Library</DialogTitle>
          <DialogDescription>
            Previously uploaded media. Click an item to add it to the timeline.
          </DialogDescription>
        </DialogHeader>

        {!RENDERING_AVAILABLE ? (
          <p className="text-sm text-muted-foreground">
            The media library requires server-side rendering to be enabled.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ToggleGroup
                type="single"
                value={filter}
                onValueChange={(v) => v && setFilter(v as Filter)}
                variant="outline"
                size="sm"
              >
                {FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <ToggleGroupItem key={value} value={value}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      {label}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void load()}
                    disabled={loading}
                    aria-label="Refresh"
                  >
                    <RefreshCw
                      className={loading ? 'size-4 animate-spin' : 'size-4'}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
              {loading && !sources ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered && filtered.length === 0 ? (
                <div className="flex justify-center pt-8">
                  {sources && sources.length === 0 ? (
                    <MediaEmptyState
                      className="max-w-sm flex-none justify-start"
                      title="No previous uploads yet"
                      description="Drop a file here or use the Add media button to upload."
                      actionLabel={onAddMedia ? 'Add media' : undefined}
                      onAction={
                        onAddMedia
                          ? () => {
                              onOpenChange(false)
                              onAddMedia()
                            }
                          : undefined
                      }
                      onDropFiles={handleDropFiles}
                    />
                  ) : (
                    <MediaEmptyState
                      className="max-w-sm flex-none justify-start"
                      title="No results match your filters"
                      description="Try a different search term or media type."
                    />
                  )}
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {(filtered ?? []).map((source) => {
                    const type = inferClipType(source.name, source.contentType)
                    const isAdding = adding === source.pathname
                    const isDeleting = deleting === source.pathname
                    return (
                      <li
                        key={source.pathname}
                        className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-2"
                      >
                        <button
                          type="button"
                          disabled={isAdding || isDeleting}
                          onClick={() => void handleAdd(source)}
                          className="flex flex-col gap-2 text-left disabled:opacity-50"
                        >
                          <Thumbnail source={source} />
                          <div className="flex items-start gap-1.5">
                            <TypeIcon type={type} className="mt-0.5 size-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">
                                {source.name}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {formatBytes(source.size)} · {relativeTime(source.uploadedAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={isDeleting}
                              onClick={() => setPendingDelete(source)}
                              aria-label={`Delete ${source.name}`}
                              className="absolute top-3 right-3 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              {isDeleting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    <DeleteMediaDialog
      source={open ? pendingDelete : null}
      onOpenChange={(next) => {
        if (!next) setPendingDelete(null)
      }}
      onConfirm={(source) => void handleDelete(source)}
    />
    </>
  )
}
