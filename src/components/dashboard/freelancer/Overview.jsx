import React, { memo } from 'react';
import RoleOverview from '../common/RoleOverview';
import { TrendingUp } from 'lucide-react';

const Overview = ({ profile, avatarUrl }) => {
  const statItems = [
    { label: 'Profile Views', value: profile.stats?.profile_views || 0 },
    { 
      label: 'Freelancer ID', 
      value: profile.freelancer_id,
      premium: !!(profile.premium_tier === 'premium' && profile.prem_freelancer_id),
    },
    { label: 'Revenue', value: `$${profile.stats?.total_revenue || '0.00'}` },
    { 
      label: 'Tier', 
      value: profile.premium_tier === 'premium' ? 'Premium' : 'Free',
      premium: profile.premium_tier === 'premium',
    },
  ];

  return (
    <RoleOverview
      profile={profile}
      avatarUrl={avatarUrl}
      role="freelancer"
      availability={profile?.availability}
      statItems={statItems}
      bottomIcon={TrendingUp}
      bottomTitle="Performance History"
      bottomText="No revenue data available yet."
    />
  );
};

export default memo(Overview);
