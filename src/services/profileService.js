import api from './api';

export const profileService = {
  /**
   * Fetch the current user's profile data for a specific role.
   * Uses cached GET for instantaneous section switches.
   */
  getMe: async (role, skipCache = false) => {
    const res = await api.cachedGet(`profiles/me/?role=${role}`, { skipCache });
    return res.data;
  },

  /**
   * Update the current user's profile data for a specific role.
   * Invalidates the profile cache after mutation.
   */
  updateMe: async (role, data) => {
    const res = await api.patch(`profiles/me/?role=${role}`, data);
    // Invalidate all cached profile data after update
    api.invalidateCache('profiles/me');
    return res.data;
  }
};
