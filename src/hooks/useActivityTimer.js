import { useEffect, useRef, useCallback } from 'react'

const TIMEOUT = 15 * 60 * 1000 // 15 minutes

export default function useActivityTimer(onTimeout) {
    const timerRef = useRef()

    const reset = useCallback(() => {
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(onTimeout, TIMEOUT)
    }, [onTimeout])

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
        reset()
        events.forEach(e => document.addEventListener(e, reset))
        return () => {
            clearTimeout(timerRef.current)
            events.forEach(e => document.removeEventListener(e, reset))
        }
    }, [reset])

    return { reset }
}
