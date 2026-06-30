import { useState, useEffect, useCallback } from 'react'

export default function useHackingAlert() {
    const [hacking, setHacking] = useState({ active: false, tier: 1, message: '' })

    const handler = useCallback((e) => {
        setHacking({ active: true, tier: e.detail.tier || 1, message: e.detail.message || '' })
    }, [])

    const dismiss = useCallback(() => {
        setHacking({ active: false, tier: 1, message: '' })
    }, [])

    useEffect(() => {
        document.addEventListener('xentra:hacking_alert', handler)
        return () => document.removeEventListener('xentra:hacking_alert', handler)
    }, [handler])

    return { ...hacking, dismiss }
}
