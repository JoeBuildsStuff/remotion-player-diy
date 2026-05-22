import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getProject } from '@/lib/project-client'
import type { Project } from '../../../shared/project-schema'

import { Editor } from './editor'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; project: Project }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    if (!projectId) {
      setState({ kind: 'missing' })
      return
    }
    let cancelled = false
    setState({ kind: 'loading' })
    getProject(projectId)
      .then((project) => {
        if (cancelled) return
        if (!project) setState({ kind: 'missing' })
        else setState({ kind: 'ready', project })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (state.kind === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }
  if (state.kind === 'missing') {
    return <EditorErrorView title="Project not found" />
  }
  if (state.kind === 'error') {
    return <EditorErrorView title="Failed to load project" detail={state.message} />
  }
  return <Editor projectId={state.project.id} initialProject={state.project} />
}

function EditorErrorView({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-xl font-semibold">{title}</h1>
      {detail && (
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {detail}
        </p>
      )}
      <Button asChild variant="outline">
        <Link to="/">Back to projects</Link>
      </Button>
    </div>
  )
}
