import React from 'react';

const ROLE_CONFIG = {
  client: {
    defaultName: 'User',
    statusText: 'Operational',
    roleTag: null, // uses level-based tags
    showExpBar: true,
    expLabel: 'Score',
  },
  freelancer: {
    defaultName: 'User',
    statusText: null, // dynamically resolved from availability
    roleTag: null,
    showExpBar: true,
    expLabel: 'XP',
  },
  server_admin: {
    defaultName: 'Admin',
    statusText: 'System Active',
    roleTag: 'System Administrator',
    showExpBar: false,
    expLabel: '',
  },
};

const getAvailabilityStyle = (availability) => {
  switch (availability) {
    case 'available':
      return { background: 'var(--success)', boxShadow: '0 0 8px var(--success)' };
    case 'busy':
      return { background: 'var(--error)', boxShadow: '0 0 8px var(--error)' };
    default:
      return { background: 'var(--text-dim)', boxShadow: 'none' };
  }
};

const RoleProfile = ({ profile, avatarUrl, role, availability }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.client;
  const stats = profile?.stats || {};
  const exp = stats.exp || 0;
  const level = stats.level || 1;
  const experienceLevel = stats.experience_level || (role === 'freelancer' ? 'Novice' : 'Starter');
  const nextLevelExp = 1000;
  const expPercentage = Math.min((exp % nextLevelExp) / (nextLevelExp / 100), 100);

  const resolvedStatusText = config.statusText || (availability || 'Available');
  const resolvedDefaultName = config.defaultName;

  return (
    <div className={`profile-card-horizontal ${profile?.premium_tier === 'premium' ? 'premium-card premium-glow' : ''}`}>
      <img 
        src={avatarUrl} 
        alt="Avatar" 
        className="profile-avatar-horizontal" 
      />
      <div className="profile-info-horizontal">
        <div className="profile-header-row">
          <h2 className="profile-username-horizontal">{profile?.username || resolvedDefaultName}</h2>
          <div className="status-badge">
            {role === 'freelancer' ? (
              <>
                <span 
                  className="status-circle-small" 
                  style={getAvailabilityStyle(availability)}
                ></span>
                <span style={{ textTransform: 'capitalize' }}>
                  {resolvedStatusText}
                </span>
              </>
            ) : (
              <>
                <span className="status-circle-small"></span>
                {resolvedStatusText}
              </>
            )}
          </div>
        </div>

        <div className="level-meta-row">
          {role === 'server_admin' ? (
            <span className="level-tag-compact">{config.roleTag}</span>
          ) : (
            <>
              <span className="level-tag-compact">Level {level}</span>
              <span className="tier-tag-compact">{experienceLevel}</span>
            </>
          )}
        </div>

        {config.showExpBar && (
          <div className="exp-row-container">
            <div className="exp-bar-compact">
              <div className="exp-bar-fill" style={{ width: `${expPercentage}%` }}></div>
            </div>
            <span className="exp-text-right">{exp % nextLevelExp} / {nextLevelExp} {config.expLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleProfile;
