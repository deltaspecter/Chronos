import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { LoadingBlock, PageContainer } from './components/ui.tsx'
import { ArticlePage } from './pages/ArticlePage.tsx'
import { DirectoryPage } from './pages/DirectoryPage.tsx'
import { EntityPage } from './pages/EntityPage.tsx'
import { EpochPage, EpochsPage } from './pages/EpochsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { InfoPage } from './pages/InfoPage.tsx'
import { LibraryPage } from './pages/LibraryPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { SearchPage } from './pages/SearchPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { ThemePage, ThemesPage } from './pages/ThemesPage.tsx'

// Zeitleiste und Atlas laden ihre Grafikbibliotheken und Kartendaten erst bei Bedarf
const TimelinePage = lazy(() => import('./pages/TimelinePage.tsx'))
const AtlasPage = lazy(() => import('./pages/AtlasPage.tsx'))

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingBlock />
        </PageContainer>
      }
    >
      {children}
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/epochen', element: <EpochsPage /> },
      { path: '/epochen/:id', element: <EpochPage /> },
      { path: '/themen', element: <ThemesPage /> },
      { path: '/themen/:id', element: <ThemePage /> },
      { path: '/artikel/:slug', element: <ArticlePage /> },
      { path: '/person/:id', element: <EntityPage kind="person" /> },
      { path: '/ort/:id', element: <EntityPage kind="place" /> },
      { path: '/ereignis/:id', element: <EntityPage kind="event" /> },
      { path: '/staat/:id', element: <EntityPage kind="polity" /> },
      { path: '/kultur/:id', element: <EntityPage kind="culture" /> },
      { path: '/begriff/:id', element: <EntityPage kind="term" /> },
      { path: '/quelle/:id', element: <EntityPage kind="source" /> },
      { path: '/route/:id', element: <EntityPage kind="route" /> },
      { path: '/verzeichnis', element: <DirectoryPage /> },
      { path: '/verzeichnis/:kind', element: <DirectoryPage /> },
      {
        path: '/zeitleiste',
        element: (
          <Lazy>
            <TimelinePage />
          </Lazy>
        ),
      },
      {
        path: '/atlas',
        element: (
          <Lazy>
            <AtlasPage />
          </Lazy>
        ),
      },
      { path: '/suche', element: <SearchPage /> },
      { path: '/lesezeichen', element: <LibraryPage /> },
      { path: '/einstellungen', element: <SettingsPage /> },
      { path: '/info', element: <InfoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
