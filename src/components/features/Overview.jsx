import { useState, useEffect } from 'react'
import Skeleton from '../ui/Skeleton'
import ProfileCard from './ProfileCard'
import { profileService } from '../../services/profileService'

const statConfigs = {
    freelancer: [
        { label: 'Profile Views', key: 'profile_views' },
        { label: 'Freelancer ID', key: 'freelancer_id', premium: true, fallback: (p) => `#${p?.id || '—'}` },
        { label: 'Revenue', key: 'revenue', render: (v) => `$${v || 0}` },
        { label: 'Tier', key: 'tier' },
    ],
    client: [
        { label: 'Profile Views', key: 'profile_views' },
        { label: 'Client ID', key: 'client_id', premium: true, fallback: (p) => `#${p?.id || '—'}` },
        { label: 'Total Spend', key: 'total_spend', render: (v) => `$${v || 0}` },
        { label: 'Tier', key: 'tier' },
    ],
}

export default function Overview({ profile, role, addNotification }) {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      profileService.getMe(role, true).then(setStats).catch(() => setStats(profile)).finally(() => setLoading(false))
    }, [role, profile])

    const configs = statConfigs[role] || statConfigs.freelancer

    return (
        <div className="space-y-6 animate-fade-in">
            <ProfileCard profile={profile} role={role} />

            <div className="grid grid-cols-2 gap-4">
                {configs.map(({ label, key, render, premium, fallback }) => {
                    const val = stats?.[key]
                    const isPremium = profile?.tier >= 10
                    if (premium && !isPremium) {
                        return (
                            <div key={key} className="glass p-4">
                                <p className="text-xs text-gray-500 mb-1">{label}</p>
                                <p className="text-lg font-semibold text-gray-400">{fallback ? fallback(profile) : '—'}</p>
                            </div>
                        )
                    }
                    return (
                        <div key={key} className="glass p-4">
                            <p className="text-xs text-gray-500 mb-1">{label}</p>
                            {loading ? (
                                <Skeleton variant="stat" />
                            ) : (
                                <p className="text-lg font-semibold text-gray-100">{render ? render(val) : val ?? '—'}</p>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
