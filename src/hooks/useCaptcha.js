import { useState, useEffect, useCallback } from 'react'

export default function useCaptcha(onVerify) {
    const [captcha, setCaptcha] = useState({ required: false, onVerify: null })

    const handler = useCallback((e) => {
        setCaptcha({ required: true, onVerify: e.detail.onVerify || null })
    }, [])

    const dismiss = useCallback(() => {
        setCaptcha({ required: false, onVerify: null })
    }, [])

    useEffect(() => {
        document.addEventListener('xentra:captcha_required', handler)
        return () => document.removeEventListener('xentra:captcha_required', handler)
    }, [handler])

    return { ...captcha, dismiss }
}
