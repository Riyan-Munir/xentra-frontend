/**
 * Packet factory for creating different types of packets in the frontend.
 */
import { FrontendPacket } from './frontend_packet.js';

export class FrontendPacketFactory {
    /**
     * Create a packet of the specified type
     * @param {string} packetType - Type of packet to create
     * @param {Object} data - Data to include in the packet
     * @param {string} provider - Provider of the packet
     * @returns {FrontendPacket} Created packet instance
     */
    static createPacket(packetType, data = null, provider = "frontend") {
        return new FrontendPacket(packetType, data, provider);
    }

    /**
     * Create a user-related packet
     * @param {Object} userData - User data to include
     * @param {string} action - Action type (create, update, delete, etc.)
     * @returns {FrontendPacket} User packet instance
     */
    static createUserPacket(userData, action) {
        return new FrontendPacket(
            `user_${action}`,
            userData,
            "frontend"
        );
    }

    /**
     * Create a job-related packet
     * @param {Object} jobData - Job data to include
     * @param {string} action - Action type (create, update, delete, etc.)
     * @returns {FrontendPacket} Job packet instance
     */
    static createJobPacket(jobData, action) {
        return new FrontendPacket(
            `job_${action}`,
            jobData,
            "frontend"
        );
    }

    /**
     * Create a guild-related packet
     * @param {Object} guildData - Guild data to include
     * @param {string} action - Action type (create, update, delete, etc.)
     * @returns {FrontendPacket} Guild packet instance
     */
    static createGuildPacket(guildData, action) {
        return new FrontendPacket(
            `guild_${action}`,
            guildData,
            "frontend"
        );
    }
}
