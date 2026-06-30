import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardLayout from '../components/layout/DashboardLayout'
import Toast from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import useNotifications from '../hooks/useNotifications'
import useActivityTimer from '../hooks/useActivityTimer'
import useHackingAlert from '../hooks/useHackingAlert'
import useCaptcha from '../hooks/useCaptcha'
import { profileService } from '../services/profileService'

// Lazy-loaded section components
import ProfileCard from '../components/features/ProfileCard'
import ProfileForm from '../components/features/ProfileForm'
import Overview from '../components/features/Overview'
import Portfolio from '../components/features/Portfolio'
import Applications from '../components/features/Applications'
import Jobs from '../components/features/Jobs'
import AdminOverview from '../components/features/AdminOverview'
import Configure from '../components/features/Configure'

const ROLE_ORDER = { freelancer: 0, client: 1, server_admin: 2 }

export default function Dashboard() {
    const navigate = useNavigate()
    const { notifications, addNotification, removeNotification } = useNotifications()
    const hacking = useHackingAlert()
    const captcha = useCaptcha()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [currentRole, setCurrentRole] = useState(() => {
        return localStorage.getItem('selected_role') || 'freelancer'
    })

    useActivityTimer(useCallback(() => {
        addNotification('error', 'Session expired due to inactivity')
        localStorage.clear()
        navigate('/login')
    }, [addNotification, navigate]))

    const fetchProfile = useCallback(async () => {
        try {
            const data = await profileService.getMe()
            setProfile(data)
            return data
        } catch {
            addNotification('error', 'Failed to load profile')
        } finally {
            setLoading(false)
        }
    }, [addNotification])

    useEffect(() => { fetchProfile() }, [fetchProfile])

    const handleRoleSwitch = (newRole) => {
        if (newRole === currentRole) return
        localStorage.setItem('selected_role', newRole)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
        const baseUrl = new URL(apiUrl).origin
        window.location.href = `${baseUrl}/auth/discord/login/?role=${newRole}`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <Skeleton variant="card" className="w-80" />
                </div>
            </div>
        )
    }

    const sectionProps = { profile, addNotification, fetchProfile }
    const tier = profile?.tier || 0
    const isPremium = tier >= 10

    return (
        <ProtectedRoute>
            <DashboardLayout profile={profile} role={currentRole} onRoleSwitch={handleRoleSwitch}>
                <Routes>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={
                        currentRole === 'server_admin'
                            ? <AdminOverview {...sectionProps} />
                            : <Overview {...sectionProps} role={currentRole} />
                    } />
                    <Route path="settings" element={<ProfileForm {...sectionProps} />} />
                    {currentRole === 'freelancer' && (
                        <>
                            <Route path="portfolio" element={<Portfolio {...sectionProps} />} />
                            <Route path="applications" element={<Applications {...sectionProps} />} />
                        </>
                    )}
                    {currentRole === 'client' && (
                        <Route path="jobs" element={<Jobs {...sectionProps} />} />
                    )}
                    {currentRole === 'server_admin' && (
                        <Route path="configure" element={<Configure {...sectionProps} />} />
                    )}
                    <Route path="*" element={<Navigate to="overview" replace />} />
                </Routes>
            </DashboardLayout>

            <Toast notifications={notifications} onRemove={removeNotification} />

            {hacking.active && (
                <Modal isOpen={true} onClose={hacking.dismiss} title="Security Alert" variant="danger">
                    <p className="text-sm text-gray-300 mb-4">{hacking.message}</p>
                    <button onClick={hacking.dismiss} className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm cursor-pointer">
                        Acknowledge
                    </button>
                </Modal>
            )}

            {captcha.required && (
                <Modal isOpen={true} onClose={() => { }} title="Verification Required">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                </Modal>
            )}
        </ProtectedRoute>
    )
}
