import { useState, useEffect } from 'react'
import Skeleton from '../ui/Skeleton'
import Modal from '../ui/Modal'
import ProfileCard from './ProfileCard'
import { guildService } from '../../services/guildService'

export default function AdminOverview({ profile, addNotification, fetchProfile }) {
    const [servers, setServers] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [guildModal, setGuildModal] = useState(null)

    const fetchServers = async (force) => {
        try {
            const data = await guildService.getMyServers(force)
            setServers(data?.results || data || [])
        } catch { addNotification('error', 'Failed to load servers') }
        finally { setLoading(false); setRefreshing(false) }
    }

    useEffect(() => { fetchServers() }, [])

    const stats = [
        { label: 'Servers', value: servers.length },
        { label: 'With Bot', value: servers.filter((s) => s.has_bot).length },
        { label: 'Available', value: servers.filter((s) => !s.has_bot).length },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <ProfileCard profile={profile} role="server_admin" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="glass p-4 text-center">
                        <p className="text-2xl font-bold text-gray-100">{s.value}</p>
                        <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot', '_blank')}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg cursor-pointer"
                >
                    Invite Bot
                </button>
                <button
                    onClick={() => { setRefreshing(true); fetchServers(true) }}
                    disabled={refreshing}
                    className="px-4 py-2 text-sm glass text-gray-300 hover:text-white cursor-pointer disabled:opacity-50"
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Server Cards */}
            <h3 className="text-sm font-semibold text-gray-300">Servers</h3>
            {loading ? (
                <Skeleton variant="card" count={4} />
            ) : servers.length === 0 ? (
                <p className="text-sm text-gray-500">No servers found</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {servers.map((s) => (
                        <div key={s.id} className={`glass p-4 space-y-2 ${s.has_bot ? 'border-emerald-500/20' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {s.icon && <img src={s.icon} alt="" className="h-8 w-8 rounded-full" />}
                                    <p className="text-sm font-medium text-gray-100">{s.name}</p>
                                </div>
                                {s.has_bot ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Bot Active</span>
                                ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">No Bot</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setGuildModal(s)} className="px-3 py-1 text-xs glass text-primary hover:text-white cursor-pointer">Stats</button>
                                {!s.has_bot && (
                                    <button onClick={() => window.open(`https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot&guild_id=${s.id}`, '_blank')} className="px-3 py-1 text-xs glass text-gray-400 hover:text-white cursor-pointer">
                                        Add Bot
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {guildModal && (
                <Modal isOpen={true} onClose={() => setGuildModal(null)} title={guildModal.name}>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-300">Server ID: {guildModal.id}</p>
                        <p className="text-xs text-gray-500">Member count and detailed stats coming soon.</p>
                    </div>
                </Modal>
            )}
        </div>
    )
}
