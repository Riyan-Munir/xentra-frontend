import api from './api';

export const roomService = {
    /**
     * Fetch all rooms for the authenticated user.
     * @param {string} role - 'client' or 'freelancer'
     * @param {string} status - 'open', 'closed', or 'all' (default: 'all')
     * @param {string} type - 'interview' or 'job' (default: 'interview')
     */
    getMyRooms: async (role, status = 'all', type = 'interview') => {
        const res = await api.get('rooms/my-rooms/', {
            params: { role, status, type },
        });
        return res.data;
    },

    /**
     * Fetch the full transcript for a specific room.
     * @param {string} roomId - The room ID
     * @param {string} role - 'client' or 'freelancer'
     */
    getTranscript: async (roomId, role) => {
        const res = await api.get(`rooms/${roomId}/transcript/`, {
            params: { role },
        });
        return res.data;
    },

    /**
     * Fetch room stats and metadata for the info panel.
     * @param {string} roomId - The room ID
     * @param {string} role - 'client' or 'freelancer'
     */
    getRoomStats: async (roomId, role) => {
        const res = await api.get(`rooms/${roomId}/stats/`, {
            params: { role },
        });
        return res.data;
    },
};
