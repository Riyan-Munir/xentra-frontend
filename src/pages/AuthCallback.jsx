import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [step, setStep] = useState('Authenticating...')
    const [username, setUsername] = useState('')
    const [needUsername, setNeedUsername] = useState(false)
    const [regId, setRegId] = useState(null)
    const called = useRef(false)

    useEffect(() => {
        if (called.current) return
        called.current = true

        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const role = localStorage.getItem('selected_role') || 'freelancer'

        if (error) { navigate('/login'); return }
        if (!code) { navigate('/login'); return }

        const exchange = async () => {
            try {
                setStep('Exchanging token...')
                const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/').replace(/\/+$/, '')
                const res = await fetch(`${apiUrl}/users/auth/discord/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, role })
                })
                const data = await res.json()

                // Backend returns 200 with status: 'need_username' for new users
                if (data.status === 'need_username') {
                    setRegId(data.registration_id)
                    setNeedUsername(true)
                    setStep('')
                    return
                }

                if (!res.ok) {
                    navigate('/login')
                    return
                }

                // Map backend serializer fields: {access, refresh, user: {...}}
                localStorage.setItem('access_token', data.access)
                localStorage.setItem('refresh_token', data.refresh || '')
                localStorage.setItem('is_superuser', data.user?.is_superuser || 'false')
                localStorage.setItem('is_banned', data.user?.is_banned || 'false')

                // Register for guild if needed (guild_registration flag on response)
                if (data.guild_registration) {
                    setStep('Joining guild...')
                    await fetch(`${apiUrl}/guilds/register/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${data.access}` }
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
            const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/').replace(/\/+$/, '')
            const role = localStorage.getItem('selected_role') || 'freelancer'
            const res = await fetch(`${apiUrl}/users/auth/discord/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_id: regId, role, bot_username: username.trim() })
            })
            const data = await res.json()

            if (res.ok) {
                localStorage.setItem('access_token', data.access)
                localStorage.setItem('refresh_token', data.refresh || '')
                localStorage.setItem('is_superuser', data.user?.is_superuser || 'false')
                localStorage.setItem('is_banned', data.user?.is_banned || 'false')
                navigate('/dashboard')
            } else {
                navigate('/login')
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
