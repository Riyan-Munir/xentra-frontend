import api from './api'

export const guildService = {
    getMyServers: async (forceRefresh) => {
        const { data } = await api.get('/guilds/my-servers/', { params: { force_refresh: forceRefresh } })
        return data
    },
    getServersWithBotInstalled: (servers) => servers.filter((s) => s.has_bot),
    getChannels: async (guildId) => {
        const { data } = await api.get(`/guilds/${guildId}/channels/`)
        return data
    },
    configureGuild: async (guildId, channelId) => {
        const { data } = await api.post('/guilds/configure/', { guild_id: guildId, channel_id: channelId })
        return data
    },
}
