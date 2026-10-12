import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { registerServiceWorker } from './offline/sw-register.ts'
import { applySettings, useSettings } from './store/settings.ts'
import './styles/app.css'
import './styles/prose.css'

applySettings(useSettings.getState())
useSettings.subscribe((s) => applySettings(s))
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applySettings(useSettings.getState()))
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
