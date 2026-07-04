/**
 * Packet validation utilities for verifying packet integrity and security in the frontend.
 */
import { FrontendPacket } from './frontend_packet.js';

export class FrontendPacketValidator {
    /**
     * Validate a packet for integrity and security
     * @param {FrontendPacket} packet - Packet to validate
     * @param {string} secretKey - Secret key for signature validation (if needed)
     * @param {Array} allowedProviders - List of allowed packet providers
     * @returns {Object} Validation results
     */
    static validatePacket(packet, secretKey = null, allowedProviders = null) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Validate headers
        if (!packet.validateHeaders()) {
            result.valid = false;
            result.errors.push("Invalid packet headers");
        }

        // Validate timestamp
        if (!packet.validateTimestamp()) {
            result.valid = false;
            result.errors.push("Packet timestamp is outside acceptable range");
        }

        // Validate provider if allowed providers specified
        if (allowedProviders && packet.provider) {
            if (!allowedProviders.includes(packet.provider)) {
                result.valid = false;
                result.errors.push(`Unauthorized packet provider: ${packet.provider}`);
            }
        }

        return result;
    }

    /**
     * Validate a packet from JSON string
     * @param {string} jsonStr - JSON string representation of packet
     * @param {string} secretKey - Secret key for signature validation (if needed)
     * @param {Array} allowedProviders - List of allowed packet providers
     * @returns {Object} Validation results
     */
    static validatePacketJSON(jsonStr, secretKey = null, allowedProviders = null) {
        try {
            const packetData = JSON.parse(jsonStr);
            const packet = FrontendPacket.fromDict(packetData);
            return this.validatePacket(packet, secretKey, allowedProviders);
        } catch (error) {
            return {
                valid: false,
                errors: [`Failed to parse packet: ${error.message}`],
                warnings: []
            };
        }
    }
}
