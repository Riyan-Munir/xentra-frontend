import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('access_token')
    const banned = localStorage.getItem('is_banned') === 'true'

    if (!token) return <Navigate to="/login" replace />
    if (banned) return <Navigate to="/banned" replace />

    return children
}
