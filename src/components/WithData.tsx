import type { ReactNode } from 'react'
import type { Indexed } from '@/data/index.ts'
import { retryCore, useCore } from '@/data/useData.ts'
import { ErrorBlock, LoadingBlock, PageContainer } from './ui.tsx'

/** Rendert Kinder erst, wenn die Kerndaten geladen sind; zeigt sonst Ladezustand oder Fehler. */
export function WithData({ children }: { children: (index: Indexed) => ReactNode }) {
  const core = useCore()
  if (core.status === 'loading')
    return (
      <PageContainer>
        <LoadingBlock />
      </PageContainer>
    )
  if (core.status === 'error')
    return (
      <PageContainer>
        <ErrorBlock error={core.error} onRetry={retryCore} />
      </PageContainer>
    )
  return <>{children(core.data)}</>
}
