import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Replace golden-X SVG favicon with a circular crop of the live xentra.png
const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const faviconUrl = apiUrl + '/resources/xentra_logo/image/'
const link = document.querySelector('link[rel="icon"]')
if (link) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 0, 0, size, size)
      link.href = canvas.toDataURL('image/png')
      link.type = 'image/png'
    } catch {
      link.href = faviconUrl
      link.type = 'image/png'
    }
  }
  img.onerror = () => {
    link.href = faviconUrl
    link.type = 'image/png'
  }
  img.src = faviconUrl
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
