import React, { memo, useState } from 'react';
import Skeleton from '../../common/Skeleton';
import { Shield, Plus, Settings, ExternalLink, RefreshCw, BarChart2, X, Users, Award, Briefcase, Globe } from 'lucide-react';
import RoleProfile from '../common/RoleProfile';

const Overview = ({ profile, avatarUrl, servers, onConfigure, onRefreshServers, isRefreshing, isServersLoading }) => {
  const [selectedGuild, setSelectedGuild] = useState(null);

  const inviteUrl = (guildId) => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('bot applications.commands identify guilds');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&response_type=code&permissions=8&scope=${scope}&guild_id=${guildId}&disable_guild_select=true&redirect_uri=${redirectUri}`;
  };

  return (
    <React.Fragment>
      <div className="layout-middle">
        <RoleProfile
          profile={profile}
          avatarUrl={avatarUrl}
          role="server_admin"
        />

        <div className="stats-grid-right">
          <div className="compact-stat-card">
            <div className="compact-stat-label">Admin ID</div>
            <div className="compact-stat-value primary-text">{profile.server_admin_id}</div>
          </div>
          <div className="compact-stat-card">
            <div className="compact-stat-label">Managed Servers</div>
            <div className="compact-stat-value">{servers.length}</div>
          </div>
          <div className="compact-stat-card">
            <div className="compact-stat-label">Status</div>
            <div className="compact-stat-value success-text">Active</div>
          </div>
          <div className="compact-stat-card">
            <div className="compact-stat-label">Permissions</div>
            <div className="compact-stat-value">System Admin</div>
          </div>
        </div>
      </div>

      <div className="layout-bottom">
        <div className="scrollable-content-card">
          <h3 className="server-section-header">
            <span className="server-heading-icon">
              <Shield size={20} className="primary-text" />
              Server Management
            </span>
            {onRefreshServers && (
              <button
                className={'btn btn-secondary py-6 px-12 text-sm flex-row items-center gap-6' + (isRefreshing ? ' opacity-60' : '')}
                onClick={onRefreshServers}
                disabled={isRefreshing}
                title="Refresh server list"
              >
                <RefreshCw size={14} className={isRefreshing ? "spin-animation" : ""} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </h3>

          {isServersLoading && servers.length === 0 ? (
            <div className="server-card-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card server-card">
                  <div className="server-card-row">
                    <Skeleton template="circle" />
                    <div className="flex-1">
                      <Skeleton template="text" lines={2} />
                    </div>
                  </div>
                  <div className="server-card-actions flex-row gap-8">
                    <Skeleton template="text" lines={1} />
                    <Skeleton template="circle" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="server-card-grid">
              {servers.map((server) => (
                <div key={server.id} className="card server-card">
                  <div className="server-card-row">
                    {server.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                        alt={server.name}
                        className="server-icon"
                      />
                    ) : (
                      <div className="server-icon-placeholder">
                        {server.name.charAt(0)}
                      </div>
                    )}
                    <div className="server-card-info">
                      <div className="flex-row items-flex-start flex-between">
                        <h4 className="server-card-name">{server.name}</h4>
                        {server.has_bot && (
                          <button
                            onClick={() => setSelectedGuild(server)}
                            className="bg-none border-none cursor-pointer primary-text p-4"
                            title="Show Stats"
                          >
                            <BarChart2 size={16} />
                          </button>
                        )}
                      </div>
                      <p className="server-card-role">
                        {server.is_owner ? 'Owner' : 'Moderator'}
                      </p>
                    </div>
                  </div>

                  <div className="server-card-actions">
                    {server.has_bot ? (
                      <button
                        className="btn btn-primary server-btn-full"
                        onClick={() => onConfigure(server.id)}
                      >
                        <Settings size={14} />
                        Configure
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary server-btn-full"
                        onClick={() => {
                          window.open(inviteUrl(server.id), '_blank');
                          if (onRefreshServers) setTimeout(onRefreshServers, 5000);
                        }}
                      >
                        <Plus size={14} />
                        Invite Bot
                      </button>
                    )}
                    <button className="btn btn-secondary server-btn-icon" title="Server Logs">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guild Stats Modal */}
      {selectedGuild && (
        <div className="modal-overlay z-9999 pos-fixed" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedGuild(null)}>
          <div className="card modal-content pos-relative" style={{ maxWidth: '450px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedGuild(null)}>
              <X size={20} />
            </button>

            <div className="modal-title">
              <BarChart2 size={24} className="primary-text" />
              <span>{selectedGuild.name} Stats</span>
            </div>

            <div className="guild-stats-grid">
              <div className="card glass guild-stat-card">
                <div className="guild-stat-header">
                  <Award size={18} className="warning-text" />
                  <span className="stats-label">Points</span>
                </div>
                <div className="guild-stat-value">{selectedGuild.guild_points || 0}</div>
              </div>

              <div className="card glass guild-stat-card">
                <div className="guild-stat-header">
                  <Users size={18} className="primary-text" />
                  <span className="stats-label">Total</span>
                </div>
                <div className="guild-stat-value">
                  {(selectedGuild.clients_count || 0) + (selectedGuild.freelancers_count || 0)}
                </div>
              </div>

              <div className="card glass guild-stat-card">
                <div className="guild-stat-header">
                  <Briefcase size={18} className="success-text" />
                  <span className="stats-label">Clients</span>
                </div>
                <div className="guild-stat-value">{selectedGuild.clients_count || 0}</div>
              </div>

              <div className="card glass guild-stat-card">
                <div className="guild-stat-header">
                  <Globe size={18} className="accent-text" />
                  <span className="stats-label">Freelancers</span>
                </div>
                <div className="guild-stat-value">{selectedGuild.freelancers_count || 0}</div>
              </div>
            </div>

            <div className="guild-modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedGuild(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default memo(Overview);
