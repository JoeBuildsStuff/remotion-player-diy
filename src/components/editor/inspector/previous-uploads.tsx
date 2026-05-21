import { useCallback, useEffect, useState } from 'react'
import {
  AudioLines,
  Image as ImageIcon,
  RefreshCw,
  Video,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from '../model/editor-context-value'
import {
  RENDERING_AVAILABLE,
} from '../model/render-mode'
import { inferClipType } from '../model/media-import'
import { listSources, type ListedSource } from '../model/upload-client'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function TypeIcon({ source }: { source: ListedSource }) {
  const type = inferClipType(source.name, source.contentType)
  if (type === 'image') return <ImageIcon className="size-4 text-muted-foreground" />
  if (type === 'audio') return <AudioLines className="size-4 text-muted-foreground" />
  if (type === 'video') return <Video className="size-4 text-muted-foreground" />
  return <ImageIcon className="size-4 text-muted-foreground" />
}

function PreviousUploadThumbnail({ source }: { source: ListedSource }) {
  const type = inferClipType(source.name, source.contentType)
  return (
    <span className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary/70">
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
        <TypeIcon source={source} />
      )}
    </span>
  )
}

export function PreviousUploads() {
  const { addExistingSource } = useEditor()
  const [sources, setSources] = useState<ListedSource[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(RENDERING_AVAILABLE)
  const [adding, setAdding] = useState<string | null>(null)

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

  useEffect(() => {
    if (!RENDERING_AVAILABLE) return
    let cancelled = false
    listSources()
      .then((list) => {
        if (!cancelled) setSources(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!RENDERING_AVAILABLE) {
    return (
      <p className="text-xs text-muted-foreground">
        Previous uploads require server-side rendering to be enabled.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {sources ? `${sources.length} file${sources.length === 1 ? '' : 's'}` : ' '}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh previous uploads"
            >
              <RefreshCw className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : sources && sources.length === 0 ? (
        <Empty className="border-0 p-2">
          <EmptyHeader>
            <EmptyTitle className="text-sm">No previous uploads</EmptyTitle>
            <EmptyDescription className="text-xs">
              Files you upload will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-1">
          {(sources ?? []).map((source) => (
            <li key={source.pathname}>
              <button
                type="button"
                disabled={adding === source.pathname}
                onClick={async () => {
                  setAdding(source.pathname)
                  try {
                    await addExistingSource({
                      url: source.url,
                      name: source.name,
                      contentType: source.contentType,
                      size: source.size,
                    })
                  } finally {
                    setAdding(null)
                  }
                }}
                className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent disabled:opacity-50"
              >
                <PreviousUploadThumbnail source={source} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs">{source.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {formatBytes(source.size)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
