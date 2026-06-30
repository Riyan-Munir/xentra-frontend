import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Select({ options, value, onChange, placeholder = 'Select...', className = '' }) {
    const [open, setOpen] = useState(false)
    const ref = useRef()

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const selected = options.find(o => (o.value ?? o) === value)
    const display = selected ? (selected.label ?? selected) : placeholder

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full glass px-4 py-2.5 text-left text-sm text-gray-300 flex items-center justify-between cursor-pointer"
            >
                <span className={selected ? 'text-gray-100' : 'text-gray-500'}>{display}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-40 mt-1 w-full glass border border-white/10 max-h-48 overflow-y-auto animate-fade-in">
                    {options.map((opt, i) => {
                        const val = opt.value ?? opt
                        const label = opt.label ?? opt
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { onChange(val); setOpen(false) }}
                                className={`w-full px-4 py-2 text-left text-sm cursor-pointer transition-colors
                  ${val === value ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/5'}`}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
