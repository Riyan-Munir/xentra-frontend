export function validatePacket(packet) {
    if (!packet || !packet.payload) return false
    if (!packet.timestamp) return false
    if (Date.now() - packet.timestamp > 60000) return false
    return true
}

export function sanitizeString(str) {
    if (typeof str !== 'string') return ''
    return str.trim().slice(0, 500)
}
