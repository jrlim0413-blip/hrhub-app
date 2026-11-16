import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAntiInspectLockdown } from './lib/antiInspectLockdown'

// Silently run anti-inspect lockdown in background (zero frontend UI)
initAntiInspectLockdown();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
