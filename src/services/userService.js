import api from './api';

const userService = {
    /**
     * Lightweight server-side verification of ban status.
     * Called by ProtectedRoute on mount to verify localStorage values.
     * NOTE: The backend deliberately does NOT expose admin/superuser
     * status to the frontend.
     */
    getStatus: () => api.get('/users/status/').then(res => res.data),
};

export default userService;
