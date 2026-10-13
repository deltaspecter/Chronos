import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { PageContainer } from '@/components/ui.tsx'
import { useTitle } from '@/lib/useTitle.ts'

export function NotFoundPage({ what = 'Seite' }: { what?: string }) {
  useTitle('Nicht gefunden')
  return (
    <PageContainer className="pt-16 max-w-xl">
      <Compass size={32} className="text-[var(--gold)] mb-4" aria-hidden />
      <h1 className="page-title">{what} nicht gefunden</h1>
      <p className="soft mt-4">Diese Adresse führt zu keinem Eintrag. Vielleicht wurde er umbenannt – im Inhaltsverzeichnis finden Sie alle Artikel und Register.</p>
      <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/inhalt" className="link">
          Zum Inhaltsverzeichnis
        </Link>
        <Link to="/" className="link">
          Zur Startseite
        </Link>
      </p>
    </PageContainer>
  )
}
