import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ArticleBody, ArticleMeta } from '@/shared/types.ts'
import { buildIndex, type Indexed } from './index.ts'
import { LoadError, loadArticleBody, loadCore } from './load.ts'

type State = { status: 'loading' } | { status: 'ready'; data: Indexed } | { status: 'error'; error: LoadError | Error }

let state: State = { status: 'loading' }
const listeners = new Set<() => void>()
let started = false

function start() {
  if (started) return
  started = true
  loadCore()
    .then((core) => {
      state = { status: 'ready', data: buildIndex(core) }
    })
    .catch((error: Error) => {
      state = { status: 'error', error }
      started = false
    })
    .finally(() => listeners.forEach((l) => l()))
}

export function retryCore() {
  state = { status: 'loading' }
  listeners.forEach((l) => l())
  start()
}

/** Kerndaten (Katalog, Taxonomie, Wissensnetz). Wird einmal geladen und dann geteilt. */
export function useCore(): State {
  start()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}

export function useArticleBody(meta: ArticleMeta | undefined) {
  const [result, setResult] = useState<{ file: string; body?: ArticleBody; error?: Error } | null>(null)
  useEffect(() => {
    if (!meta) return
    let cancelled = false
    loadArticleBody(meta)
      .then((body) => !cancelled && setResult({ file: meta.file, body }))
      .catch((error: Error) => !cancelled && setResult({ file: meta.file, error }))
    return () => {
      cancelled = true
    }
  }, [meta])
  if (!meta || !result || result.file !== meta.file) return { loading: true as const }
  return { loading: false as const, body: result.body, error: result.error }
}
