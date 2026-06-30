import React, { memo } from 'react';
import RoleOverview from '../common/RoleOverview';
import { Briefcase } from 'lucide-react';

const Overview = ({ profile, avatarUrl }) => {
  const statItems = [
    { label: 'Profile Views', value: profile.stats?.profile_views || 0 },
    { 
      label: 'Client ID', 
      value: profile.client_id,
      premium: !!(profile.premium_tier === 'premium' && profile.prem_client_id),
    },
    { label: 'Total Spend', value: `$${profile.stats?.total_spend || '0.00'}` },
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
      role="client"
      availability={profile?.availability}
      statItems={statItems}
      bottomIcon={Briefcase}
      bottomTitle="Project History"
      bottomText="You currently have no active project history."
    />
  );
};

export default React.memo(Overview);
