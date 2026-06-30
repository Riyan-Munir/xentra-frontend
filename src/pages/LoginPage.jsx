import { useState } from 'react'

const roles = [
    { value: 'freelancer', label: 'Freelancer', desc: 'Find work and manage gigs', icon: '💼' },
    { value: 'client', label: 'Client', desc: 'Hire talent and post jobs', icon: '🏢' },
    { value: 'server_admin', label: 'Server Admin', desc: 'Manage servers and guilds', icon: '🛡️' },
]

export default function LoginPage() {
    const [selected, setSelected] = useState('freelancer')

    const handleLogin = () => {
        localStorage.setItem('selected_role', selected)
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
        window.location.href = `${backendUrl}/auth/discord/login/?role=${selected}`
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="glass w-full max-w-md p-8 space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Xentra
                    </h1>
                    <p className="text-sm text-gray-400">Choose your role to continue</p>
                </div>

                <div className="space-y-3">
                    {roles.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setSelected(r.value)}
                            className={`w-full glass px-4 py-3 flex items-center gap-3 text-left cursor-pointer transition-all
                ${selected === r.value
                                    ? 'border-primary/50 ring-1 ring-primary/30'
                                    : 'hover:border-white/20'}`}
                        >
                            <span className="text-2xl">{r.icon}</span>
                            <div>
                                <p className="text-sm font-medium text-gray-100">{r.label}</p>
                                <p className="text-xs text-gray-500">{r.desc}</p>
                            </div>
                            {selected === r.value && (
                                <span className="ml-auto text-primary text-lg">●</span>
                            )}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-medium transition-colors cursor-pointer"
                >
                    Continue with Discord
                </button>

                <p className="text-xs text-center text-gray-500">
                    By continuing, you agree to the Terms of Service
                </p>
            </div>
        </div>
    )
}
