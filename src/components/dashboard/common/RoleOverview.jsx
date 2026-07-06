import React from 'react';
import RoleProfile from './RoleProfile';

/**
 * Shared overview layout for client and freelancer roles.
 * Renders a profile card + stats grid in layout-middle, and a placeholder
 * section in layout-bottom.
 *
 * Props:
 * - profile, avatarUrl, role, forwarded to RoleProfile
 * - statItems, array of { label, value, premium? } for the stats grid
 * - bottomIcon, lucide icon component for the bottom placeholder
 * - bottomTitle, title text for the bottom placeholder
 * - bottomText, description text for the bottom placeholder
 */
const RoleOverview = ({ profile, avatarUrl, role, statItems = [], bottomIcon: BottomIcon, bottomTitle, bottomText }) => {
  return (
    <React.Fragment>
      <div className="layout-middle">
        <RoleProfile 
          profile={profile} 
          avatarUrl={avatarUrl} 
          role={role}
          availability={profile?.availability}
        />

        <div className="stats-grid-right">
          {statItems.map((item, idx) => {
            const isPremium = item.premium && profile?.premium_tier === 'premium';
            return (
              <div
                key={idx}
                className={'compact-stat-card' + (isPremium ? ' premium-card premium-glow' : '')}
              >
                <div className="compact-stat-label">{item.label}</div>
                <div
                  className={'compact-stat-value' + (isPremium ? ' premium-text' : '') + (item.color ? ' ' + item.color : '')}
                >
                  {typeof item.value === 'function' ? item.value(profile) : item.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="layout-bottom">
        <div className="scrollable-content-card flex-col">
          <h3 className="text-xl mb-20">{bottomTitle}</h3>
          <div className="flex-1 flex-col flex-center opacity-50 py-40">
            {BottomIcon && <BottomIcon size={48} className="mb-16" />}
            <p className="text-dim text-sm">{bottomText}</p>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default RoleOverview;
