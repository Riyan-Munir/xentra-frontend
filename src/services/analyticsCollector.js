import api from './api'

export async function captchaVerify(token) {
    const { data } = await api.post('/system-audits/captcha/verify/', { token })
    return data
}
