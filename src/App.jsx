import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const BannedPage = lazy(() => import('./pages/BannedPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

const Fallback = () => (
    <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
)

export default function App() {
    return (
        <Suspense fallback={<Fallback />}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/banned" element={<BannedPage />} />
                <Route path="/dashboard/*" element={<Dashboard />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    )
}
