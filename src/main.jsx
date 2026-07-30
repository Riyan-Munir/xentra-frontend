import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Replace golden-X SVG favicon with the live xentra.png from the backend
const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const faviconUrl = apiUrl + '/resources/xentra_logo/image/'
const link = document.querySelector('link[rel="icon"]')
if (link) {
  link.href = faviconUrl
  link.type = 'image/png'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
