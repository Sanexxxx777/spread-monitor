import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { engine } from './lib/engine'

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__engine = engine
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
