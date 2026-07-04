/**
 * Frontend packet template with headers and timestamps.
 * Fully browser-native (no Node.js crypto dependency).
 * Design note: The signature field is included for API contract compatibility,
 * but frontend packets are not cryptographically signed since there's no
 * shared HMAC secret in the browser. The backend middleware only inspects
 * the packet shape (type + data) and unwraps the payload.
 */

// Synchronous hex nonce generator using browser Web Crypto API
function generateNonce(length = 16) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export class FrontendPacket {
    /**
     * Create a frontend packet
     * @param {string} packetType - Type of packet
     * @param {Object} data - Data to include in packet
     * @param {string} provider - Provider of the packet
     */
    constructor(packetType, data = null, provider = "frontend") {
        this.packetType = packetType;
        this.provider = provider;
        this.timestamp = new Date().toISOString();
        this.data = data || {};
        this.version = "1.0";
        this.nonce = generateNonce(16);
        this.signature = "";
    }

    /**
     * Convert packet to dictionary format (synchronous)
     * @returns {Object} Packet as dictionary
     */
    toDict() {
        return {
            type: this.packetType,
            provider: this.provider,
            timestamp: this.timestamp,
            version: this.version,
            nonce: this.nonce,
            signature: this.signature,
            data: this.data
        };
    }

    /**
     * Convert packet to JSON string
     * @returns {string} Packet as JSON string
     */
    toJSON() {
        return JSON.stringify(this.toDict());
    }

    /**
     * Create packet from dictionary
     * @param {Object} data - Packet data
     * @returns {FrontendPacket} New packet instance
     */
    static fromDict(data) {
        const packet = new FrontendPacket(
            data.type,
            data.data,
            data.provider || "frontend"
        );

        // Set additional fields from data
        packet.timestamp = data.timestamp;
        packet.version = data.version;
        packet.nonce = data.nonce;
        packet.signature = data.signature;

        return packet;
    }

    /**
     * Create packet from JSON string
     * @param {string} jsonStr - JSON string representation of packet
     * @returns {FrontendPacket} New packet instance
     */
    static fromJSON(jsonStr) {
        const data = JSON.parse(jsonStr);
        return this.fromDict(data);
    }
}
