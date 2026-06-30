import { useState } from 'react'
import { Briefcase, Building2, Shield, Circle } from 'lucide-react'

const roles = [
    { value: 'freelancer', label: 'Freelancer', desc: 'Find work and manage gigs', icon: Briefcase },
    { value: 'client', label: 'Client', desc: 'Hire talent and post jobs', icon: Building2 },
    { value: 'server_admin', label: 'Server Admin', desc: 'Manage servers and guilds', icon: Shield },
]

export default function LoginPage() {
    const [selected, setSelected] = useState('freelancer')

    const handleLogin = () => {
        localStorage.setItem('selected_role', selected)
        const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
        const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/callback'
        window.location.href = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds.join`
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
                    {roles.map((r) => {
                        const Icon = r.icon
                        return (
                            <button
                                key={r.value}
                                onClick={() => setSelected(r.value)}
                                className={`w-full glass px-4 py-3 flex items-center gap-3 text-left cursor-pointer transition-all
                                    ${selected === r.value
                                        ? 'border-primary/50 ring-1 ring-primary/30'
                                        : 'hover:border-white/20'}`}
                            >
                                <Icon className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm font-medium text-gray-100">{r.label}</p>
                                    <p className="text-xs text-gray-500">{r.desc}</p>
                                </div>
                                {selected === r.value && (
                                    <Circle className="ml-auto h-4 w-4 fill-primary text-primary" />
                                )}
                            </button>
                        )
                    })}
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
