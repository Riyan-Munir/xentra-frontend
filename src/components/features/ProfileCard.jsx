export default function ProfileCard({ profile, role, compact }) {
    const cfg = {
        freelancer: { statLabel: 'XP', showAvailability: true },
        client: { statLabel: 'Score' },
        server_admin: { badge: 'System Administrator', noExp: true },
    }[role] || {}

    return (
        <div className={`glass ${compact ? 'p-3' : 'p-4'} flex items-center gap-4`}>
            <img
                src={profile?.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt="avatar"
                className="h-12 w-12 rounded-full ring-2 ring-white/10"
            />
            <div className="flex-1 min-w-0">
                <p className="text-gray-100 font-semibold truncate">{profile?.username || 'Unknown'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {cfg.statLabel && (
                        <span className="text-xs text-gray-400">{cfg.statLabel}: {profile?.exp || profile?.score || 0}</span>
                    )}
                    {cfg.showAvailability && (
                        <span className={`h-2 w-2 rounded-full ${profile?.availability ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    )}
                    {cfg.badge && (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400 font-medium">{cfg.badge}</span>
                    )}
                </div>
            </div>
            {profile?.tier >= 10 && (
                <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-400 font-medium">PREMIUM</span>
            )}
        </div>
    )
}
