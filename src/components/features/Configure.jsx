import { useState, useEffect } from 'react'
import Skeleton from '../ui/Skeleton'
import Select from '../ui/Select'
import UnsavedBar from '../ui/UnsavedBar'
import { guildService } from '../../services/guildService'

export default function Configure({ profile, addNotification, fetchProfile }) {
    const [servers, setServers] = useState([])
    const [channels, setChannels] = useState([])
    const [selectedServer, setSelectedServer] = useState('')
    const [selectedChannel, setSelectedChannel] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        guildService.getMyServers().then((data) => {
            const list = data?.results || data || []
            setServers(list)
            const withBot = list.filter((s) => s.has_bot)
            if (withBot.length > 0) {
                setSelectedServer(withBot[0].id)
                guildService.getChannels(withBot[0].id).then((ch) => {
                    setChannels(ch?.results || ch || [])
                }).catch(() => { })
            }
        }).catch(() => addNotification('error', 'Failed to load servers'))
            .finally(() => setLoading(false))
    }, [addNotification])

    const handleServerChange = async (serverId) => {
        setSelectedServer(serverId)
        setSelectedChannel('')
        try {
            const data = await guildService.getChannels(serverId)
            setChannels(data?.results || data || [])
        } catch { setChannels([]) }
    }

    const handleSave = async () => {
        if (!selectedServer || !selectedChannel) { addNotification('error', 'Select server and channel'); return }
        setSaving(true)
        try {
            await guildService.configureGuild(selectedServer, selectedChannel)
            addNotification('success', 'Configuration saved')
        } catch { addNotification('error', 'Failed to save') }
        finally { setSaving(false) }
    }

    const serverOpts = servers.filter((s) => s.has_bot).map((s) => ({ value: s.id, label: s.name }))
    const channelOpts = channels.map((c) => ({ value: c.id, label: c.name }))

    if (loading) return <div className="space-y-4 animate-fade-in"><h2 className="text-lg font-bold text-gray-100">Configure</h2><Skeleton variant="form" count={3} /></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-100">Server Configuration</h2>

            <div className="glass p-5 space-y-4 max-w-lg">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Discord Server</label>
                    <Select
                        options={serverOpts}
                        value={selectedServer}
                        onChange={handleServerChange}
                        placeholder="Select a server with bot..."
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Notification Channel</label>
                    <Select
                        options={channelOpts}
                        value={selectedChannel}
                        onChange={setSelectedChannel}
                        placeholder={selectedServer ? 'Select a channel...' : 'Select a server first'}
                    />
                </div>
            </div>

            <UnsavedBar show={!!(selectedServer && selectedChannel)} onSave={handleSave} onCancel={() => { setSelectedChannel('') }} />
        </div>
    )
}
