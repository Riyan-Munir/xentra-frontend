import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const roles = [
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'client', label: 'Client' },
    { value: 'server_admin', label: 'Server Admin' },
]

export default function Navbar({ profile, role, onRoleSwitch }) {
    const [open, setOpen] = useState(false)
    const ref = useRef()
    const navigate = useNavigate()

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleLogout = () => {
        localStorage.clear()
        navigate('/login')
    }

    return (
        <header className="h-14 glass rounded-none border-t-0 border-x-0 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                    {profile?.username || 'Dashboard'}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <div ref={ref} className="relative">
                    <button
                        onClick={() => setOpen(!open)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <User size={16} />
                        <span className="capitalize">{role}</span>
                    </button>
                    {open && (
                        <div className="absolute right-0 mt-1 w-44 glass border border-white/10 animate-fade-in z-30">
                            {roles.map((r) => (
                                <button
                                    key={r.value}
                                    onClick={() => { onRoleSwitch(r.value); setOpen(false) }}
                                    className={`w-full px-4 py-2 text-left text-sm transition-colors cursor-pointer
                    ${r.value === role ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/5'}`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </header>
    )
}
