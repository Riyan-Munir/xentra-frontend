import { useState, useCallback } from 'react'

let nextId = 0

export default function useNotifications() {
    const [notifications, setNotifications] = useState([])

    const addNotification = useCallback((type, message) => {
        const id = ++nextId
        setNotifications(prev => [...prev.slice(-2), { id, type, message }])
    }, [])

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    return { notifications, addNotification, removeNotification }
}
