// Client wrappers around /api/projects. Same shared-secret pattern as
// upload-client.ts — both Vercel and self-hosted gate these routes behind
// VITE_RENDER_SHARED_SECRET.

import {
  RENDERING_AVAILABLE,
  RENDERING_DISABLED_MESSAGE,
} from '@/components/editor/model/render-mode'
import type { Project, ProjectSummary } from '../../shared/project-schema'

const SHARED_SECRET = import.meta.env.VITE_RENDER_SHARED_SECRET as
  | string
  | undefined

function authHeaders(extra?: HeadersInit): HeadersInit {
  if (!SHARED_SECRET) {
    throw new Error(
      'VITE_RENDER_SHARED_SECRET is not set — cannot reach /api/projects.',
    )
  }
  return {
    'x-render-secret': SHARED_SECRET,
    ...(extra ?? {}),
  }
}

function ensureAvailable() {
  if (!RENDERING_AVAILABLE) throw new Error(RENDERING_DISABLED_MESSAGE)
}

export async function listProjects(): Promise<ProjectSummary[]> {
  ensureAvailable()
  const res = await fetch('/api/projects', { headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to list projects (${res.status})`)
  const json = (await res.json()) as { projects: ProjectSummary[] }
  return json.projects
}

export async function createProject(name?: string): Promise<Project> {
  ensureAvailable()
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(name ? { name } : {}),
  })
  if (!res.ok) throw new Error(`Failed to create project (${res.status})`)
  return (await res.json()) as Project
}

export async function getProject(id: string): Promise<Project | null> {
  ensureAvailable()
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load project (${res.status})`)
  return (await res.json()) as Project
}

export async function saveProject(project: Project): Promise<Project> {
  ensureAvailable()
  const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(project),
  })
  if (!res.ok) throw new Error(`Failed to save project (${res.status})`)
  return (await res.json()) as Project
}

export async function deleteProject(id: string): Promise<void> {
  ensureAvailable()
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete project (${res.status})`)
  }
}
