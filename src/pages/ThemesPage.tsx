import { ArrowRight, Layers } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ArticleCard, EntityRow } from '@/components/cards.tsx'
import { KindIcon, THEME_ICON } from '@/components/kinds.tsx'
import { Breadcrumbs, PageContainer, SectionHeading } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import { articlesInTheme, startYear, themePath, type Indexed } from '@/data/index.ts'
import { entityInfo } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { astro } from '@/shared/dates.ts'
import type { ThemeNode } from '@/shared/types.ts'
import { DIRECTORIES } from './DirectoryPage.tsx'
import { useInternalLinks } from './EpochsPage.tsx'
import { NotFoundPage } from './NotFoundPage.tsx'

export function ThemesPage() {
  useTitle('Themen')
  return <WithData>{(index) => <ThemesOverview index={index} />}</WithData>
}

function ThemesOverview({ index }: { index: Indexed }) {
  return (
    <PageContainer className="pt-8 lg:pt-12">
      <p className="eyebrow mb-3">Themen</p>
      <h1 className="page-title">Geschichte quer durch die Epochen</h1>
      <p className="lead mt-4 max-w-3xl">
        Themenbereiche verbinden Artikel über Zeiten und Regionen hinweg: von Herrschaft und Recht über Handel und Religion bis zu Alltag, Umwelt und Massengewalt.
      </p>
      <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {index.rootThemes.map((t) => {
          const Icon = (t.icon && THEME_ICON[t.icon]) || Layers
          const count = articlesInTheme(index, t.id).length
          return (
            <li key={t.id}>
              <Link to={`/themen/${t.id}`} className="card-link p-5 h-full flex flex-col gap-2">
                <Icon size={22} className="text-[var(--gold)]" aria-hidden />
                <span className="font-display text-xl leading-tight">{t.title}</span>
                <span className="text-sm soft">{t.summary}</span>
                {t.children.length > 0 && <span className="text-xs muted">{t.children.map((c) => index.themeById.get(c)?.title).join(' · ')}</span>}
                <span className="text-xs text-[var(--gold)] mt-auto pt-2">{count > 0 ? `${count} Artikel` : 'Einträge im Wissensnetz'}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <SectionHeading>Verzeichnisse</SectionHeading>
      <p className="soft text-sm -mt-2 mb-4 max-w-2xl">Alle Einträge des Wissensnetzes – alphabetisch oder chronologisch, mit Filter.</p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {DIRECTORIES.map((d) => (
          <li key={d.slug}>
            <Link to={`/verzeichnis/${d.slug}`} className="card-link p-4 flex items-center gap-3">
              <KindIcon kind={d.kind} size={20} className="text-[var(--gold)]" />
              <span>
                <span className="block font-medium">{d.label}</span>
                <span className="text-xs muted">{d.count(index)} Einträge</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}

export function ThemePage() {
  const { id = '' } = useParams()
  return (
    <WithData>
      {(index) => {
        const theme = index.themeById.get(id)
        return theme ? <ThemeView index={index} theme={theme} /> : <NotFoundPage what="Thema" />
      }}
    </WithData>
  )
}

function ThemeView({ index, theme }: { index: Indexed; theme: ThemeNode }) {
  useTitle(theme.title)
  const onClick = useInternalLinks()
  const ids = new Set([theme.id, ...theme.children])
  const articles = articlesInTheme(index, theme.id).sort((a, b) => startYear(a.span) - startYear(b.span))
  const events = index.entities.events.filter((e) => e.themes.some((t) => ids.has(t))).sort((a, b) => astro(a.span.start) - astro(b.span.start))
  const persons = index.entities.persons.filter((p) => p.themes.some((t) => ids.has(t)))
  const terms = index.entities.terms.filter((t) => t.themes.some((x) => ids.has(x)))
  const Icon = (theme.icon && THEME_ICON[theme.icon]) || Layers
  return (
    <PageContainer className="pt-6 lg:pt-10 fade-in">
      <Breadcrumbs items={[{ label: 'Themen', to: '/themen' }, ...themePath(index, theme.id).map((t) => ({ label: t.title, to: `/themen/${t.id}` }))]} />
      <Icon size={26} className="text-[var(--gold)] mb-3" aria-hidden />
      <h1 className="page-title">{theme.title}</h1>
      <p className="lead mt-4 max-w-3xl">{theme.summary}</p>
      {theme.html.trim() && <div className="prose mt-6" onClick={onClick} dangerouslySetInnerHTML={{ __html: theme.html }} />}

      {theme.children.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {theme.children.map((c) => {
            const t = index.themeById.get(c)!
            return (
              <Link key={c} to={`/themen/${c}`} className="chip">
                {t.title}
              </Link>
            )
          })}
        </div>
      )}

      {articles.length > 0 && (
        <section>
          <SectionHeading>Artikel</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} index={index} />
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionHeading aside={<Link to={`/zeitleiste?thema=${theme.id}`} className="text-sm link inline-flex items-center gap-1">In der Zeitleiste <ArrowRight size={14} /></Link>}>
            Ereignisse
          </SectionHeading>
          <div className="card px-4 py-1">
            {events.slice(0, 30).map((e) => {
              const info = entityInfo(index, 'event', e.id)
              return info ? <EntityRow key={e.id} info={info} showKind={false} /> : null
            })}
          </div>
        </section>
      )}

      {persons.length > 0 && (
        <section>
          <SectionHeading>Persönlichkeiten</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {persons.map((p) => (
              <Link key={p.id} to={`/person/${p.id}`} className="chip">
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {terms.length > 0 && (
        <section>
          <SectionHeading>Begriffe</SectionHeading>
          <dl className="grid sm:grid-cols-2 gap-3">
            {terms.map((t) => (
              <Link key={t.id} to={`/begriff/${t.id}`} className="card-link p-4">
                <dt className="font-medium">{t.name}</dt>
                <dd className="text-sm soft mt-1 line-clamp-3">{t.definition}</dd>
              </Link>
            ))}
          </dl>
        </section>
      )}

      {articles.length === 0 && events.length === 0 && theme.planned.length > 0 && (
        <p className="soft mt-8">Geplant: {theme.planned.join(', ')}</p>
      )}
    </PageContainer>
  )
}
