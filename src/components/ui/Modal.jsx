import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, variant = 'default' }) {
  const overlayRef = useRef()

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`glass w-full max-w-lg mx-4 p-6 animate-slide-up
          ${variant === 'danger' ? 'border-red-500/30' : 'border-white/10'}`}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${variant === 'danger' ? 'text-red-400' : 'text-gray-100'
              }`}>{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 cursor-pointer p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
