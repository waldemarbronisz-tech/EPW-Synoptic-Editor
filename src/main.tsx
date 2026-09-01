import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyScadaCssVariables } from './theme/ScadaTheme'

// Must run before the first paint, so the interface CSS (which reads these
// as var(--scada-*)) never has a chance to render with stale fallback
// colors.
applyScadaCssVariables()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
