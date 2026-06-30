import { useState, useEffect } from 'react'
import Skeleton from '../ui/Skeleton'
import UnsavedBar from '../ui/UnsavedBar'
import { profileService } from '../../services/profileService'

export default function ProfileForm({ profile, addNotification, fetchProfile }) {
    const [fields, setFields] = useState({ username: '', customId: '', availability: null, minBudget: '' })
    const [original, setOriginal] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const role = localStorage.getItem('selected_role') || 'freelancer'

    useEffect(() => {
        if (!profile) return
        const vals = {
            username: profile.username || '',
            customId: profile.client_id || profile.freelancer_id || '',
            availability: profile.availability ?? null,
            minBudget: profile.min_budget || '',
        }
        setFields(vals)
        setOriginal(vals)
        setLoading(false)
    }, [profile])

    const hasChanges = JSON.stringify(fields) !== JSON.stringify(original)

    const handleSave = async () => {
        if (!fields.username.trim()) { addNotification('error', 'Username cannot be empty'); return }
        setSaving(true)
        try {
            const payload = { username: fields.username.trim() }
            if (fields.customId !== original.customId && fields.customId) payload.custom_id = fields.customId
            if (fields.availability !== null) payload.availability = fields.availability
            if (fields.minBudget) payload.min_budget = fields.minBudget
            await profileService.updateMe(role, payload)
            addNotification('success', 'Profile updated')
            setOriginal({ ...fields })
            fetchProfile()
        } catch { addNotification('error', 'Failed to update profile') }
        finally { setSaving(false) }
    }

    const handleCancel = () => { setFields({ ...original }) }

    if (loading) return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-100">Settings</h2>
            <Skeleton variant="form" count={4} />
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-100">Settings</h2>

            <div className="glass p-5 space-y-4 max-w-lg">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Username</label>
                    <input
                        value={fields.username}
                        onChange={(e) => setFields({ ...fields, username: e.target.value })}
                        className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50"
                        placeholder="Your display name"
                    />
                </div>

                {role !== 'server_admin' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">
                            Custom ID {profile?.tier < 10 && <span className="text-amber-400">(Premium)</span>}
                        </label>
                        <input
                            value={fields.customId}
                            onChange={(e) => setFields({ ...fields, customId: e.target.value })}
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50"
                            placeholder={profile?.tier >= 10 ? 'Custom identifier' : 'Upgrade to premium'}
                            disabled={profile?.tier < 10}
                        />
                    </div>
                )}

                {role === 'freelancer' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Availability</label>
                        <select
                            value={fields.availability === null ? '' : fields.availability ? 'true' : 'false'}
                            onChange={(e) => setFields({ ...fields, availability: e.target.value === '' ? null : e.target.value === 'true' })}
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            <option value="">Not set</option>
                            <option value="true">Available</option>
                            <option value="false">Unavailable</option>
                        </select>
                    </div>
                )}

                {role === 'client' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Min Budget ($)</label>
                        <input
                            value={fields.minBudget}
                            onChange={(e) => setFields({ ...fields, minBudget: e.target.value })}
                            className="w-full glass px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary/50"
                            placeholder="0.00"
                            type="number"
                            min="0"
                        />
                    </div>
                )}
            </div>

            <UnsavedBar show={hasChanges} onSave={handleSave} onCancel={handleCancel} />
        </div>
    )
}
