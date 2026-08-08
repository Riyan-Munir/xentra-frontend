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
     * Fetch the filtered transcript index (show_to-aware, premium-only).
     * Returns only the ordered transcript entries the viewer may see
     * (show_to === 'both' | role | missing), preserving the saved order.
     * Full record payloads are fetched lazily via getTranscriptRecords.
     * @param {string} roomId - The room ID
     * @param {string} role - 'client' or 'freelancer'
     */
    getTranscriptIndex: async (roomId, role) => {
        const res = await api.get(`rooms/${roomId}/transcript-index/`, {
            params: { role },
        });
        return res.data;
    },

    /**
     * Fetch the full records for a chunk of transcript ids (lazy loading).
     * @param {string} roomId - The room ID
     * @param {string} role - 'client' or 'freelancer'
     * @param {string[]} msgIds - message ids to fetch
     * @param {string[]} complainIds - complaint ids to fetch
     */
    getTranscriptRecords: async (roomId, role, msgIds = [], complainIds = []) => {
        const params = { role };
        if (msgIds.length) params.msg_ids = msgIds.join(',');
        if (complainIds.length) params.complain_ids = complainIds.join(',');
        const res = await api.get(`rooms/${roomId}/transcript-records/`, {
            params,
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
