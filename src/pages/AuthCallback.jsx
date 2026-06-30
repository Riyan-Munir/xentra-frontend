import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [step, setStep] = useState('Authenticating...')
    const [username, setUsername] = useState('')
    const [needUsername, setNeedUsername] = useState(false)
    const called = useRef(false)

    useEffect(() => {
        if (called.current) return
        called.current = true

        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const role = localStorage.getItem('selected_role') || 'freelancer'

        if (error) { navigate('/login'); return }

        const exchange = async () => {
            try {
                setStep('Exchanging token...')
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
                const backendUrl = new URL(apiUrl).origin
                const res = await fetch(`${backendUrl}/auth/discord/callback/?code=${code}&role=${role}`)
                const data = await res.json()

                if (!res.ok) {
                    if (data.need_username) { setNeedUsername(true); setStep('') }
                    else { navigate('/login') }
                    return
                }

                localStorage.setItem('access_token', data.access_token)
                localStorage.setItem('refresh_token', data.refresh_token || '')
                localStorage.setItem('is_superuser', data.is_superuser || 'false')
                localStorage.setItem('is_banned', data.is_banned || 'false')

                // Register for guild if needed
                if (data.guild_registration) {
                    setStep('Joining guild...')
                    await fetch(`${apiUrl}/guilds/register/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${data.access_token}` }
                    })
                }

                navigate('/dashboard')
            } catch {
                navigate('/login')
            }
        }

        exchange()
    }, [searchParams, navigate])

    const handleUsernameSubmit = async (e) => {
        e.preventDefault()
        if (!username.trim()) return

        try {
            setStep('Setting username...')
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
            const backendUrl = new URL(apiUrl).origin
            const code = searchParams.get('code')
            const role = localStorage.getItem('selected_role') || 'freelancer'
            const res = await fetch(`${backendUrl}/auth/discord/callback/?code=${code}&role=${role}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() })
            })
            const data = await res.json()

            if (res.ok) {
                localStorage.setItem('access_token', data.access_token)
                localStorage.setItem('refresh_token', data.refresh_token || '')
                navigate('/dashboard')
            }
        } catch {
            navigate('/login')
        }
    }

    if (needUsername) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center p-4">
                <div className="glass w-full max-w-sm p-8 space-y-4 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-100">Choose a Username</h2>
                    <form onSubmit={handleUsernameSubmit} className="space-y-4">
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username..."
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50"
                            required
                            minLength={3}
                        />
                        <button
                            type="submit"
                            className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-gray-400">{step}</p>
            </div>
        </div>
    )
}
