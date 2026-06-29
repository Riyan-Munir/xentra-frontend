import api from './api';

export const guildService = {
  /**
   * Fetch all servers for the current user.
   * Uses cached GET to avoid redundant re-fetches.
   */
  getMyServers: async (forceRefresh = false) => {
    const url = `guilds/my-servers/${forceRefresh ? '?refresh=true' : ''}`;
    const res = await api.cachedGet(url, { skipCache: forceRefresh });
    return res.data;
  },
  
  /**
   * Helper to format/filter data strictly for UI display logic
   */
  getServersWithBotInstalled: (servers) => {
    return servers.filter(s => s.has_bot);
  },

  /**
   * Fetch available channels for a specific guild where the bot is installed.
   */
  getChannels: async (guildId) => {
    if (!guildId) return [];
    const res = await api.get(`guilds/${guildId}/channels/`);
    return res.data;
  },

  /**
   * Save bot configuration for a specific guild.
   */
  configureGuild: async (guildId, channelId) => {
    const res = await api.post('guilds/configure/', {
      guild_id: guildId,
      channel_id: channelId
    });
    return res.data;
  }
};
