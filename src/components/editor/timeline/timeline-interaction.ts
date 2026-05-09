import { useSyncExternalStore } from 'react'

let interactionCount = 0
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function beginTimelineInteraction() {
  interactionCount += 1
  if (interactionCount === 1) notify()
}

export function endTimelineInteraction() {
  if (interactionCount === 0) return
  interactionCount -= 1
  if (interactionCount === 0) notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return interactionCount > 0
}

function getServerSnapshot() {
  return false
}

export function useIsTimelineInteracting() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
