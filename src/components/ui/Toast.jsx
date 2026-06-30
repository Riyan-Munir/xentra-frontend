import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

export default function Toast({ notifications, onRemove }) {
    if (!notifications?.length) return null

    return (
        <div className="fixed top-4 right-4 z-[60] space-y-2">
            {notifications.map((n) => (
                <ToastItem key={n.id} notification={n} onRemove={onRemove} />
            ))}
        </div>
    )
}

function ToastItem({ notification, onRemove }) {
    const [exiting, setExiting] = useState(false)

    useEffect(() => {
        const t1 = setTimeout(() => setExiting(true), 1200)
        const t2 = setTimeout(() => onRemove(notification.id), 2000)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [notification.id, onRemove])

    const colors = {
        success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
        error: 'bg-red-500/20 border-red-500/30 text-red-400',
    }

    return (
        <div
            className={`glass px-4 py-3 text-sm min-w-[280px] border-l-4 ${exiting ? 'animate-toast-out' : 'animate-toast-in'
                }`}
        >
            <div className="flex items-center gap-2">
                <span className={colors[notification.type]?.split(' ')[2]}>
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <span className={colors[notification.type]?.split(' ')[2]}>
                    {notification.message}
                </span>
            </div>
        </div>
    )
}
