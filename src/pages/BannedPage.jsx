import { useNavigate } from 'react-router-dom'

export default function BannedPage() {
    const navigate = useNavigate()

    const handleTerminate = () => {
        localStorage.clear()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="glass w-full max-w-md p-8 space-y-6 text-center animate-fade-in border-red-500/20">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-red-400">ACCESS DENIED</h1>
                    <div className="h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                </div>

                <div className="space-y-2">
                    <p className="text-red-300/80 text-sm">
                        Your account has been banned from accessing the dashboard.
                    </p>
                    <p className="text-gray-500 text-xs">
                        If you believe this is a mistake, please appeal through the support server.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={handleTerminate}
                        className="px-6 py-2.5 glass text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors cursor-pointer"
                    >
                        Terminate Session
                    </button>
                    <button
                        onClick={() => window.open('https://discord.gg/xentra', '_blank')}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm transition-colors cursor-pointer"
                    >
                        Appeal
                    </button>
                </div>
            </div>
        </div>
    )
}
