import React, { memo } from 'react';
import { LayoutDashboard, User, LogOut, Settings, Briefcase, FileText, MessageCircle, Wallet } from 'lucide-react';

const Sidebar = ({ activeSection, onSectionChange, onLogout, currentRole, isMobileOpen, onMobileClose, profile }) => {
  const isPremium = profile?.premium_tier === 'premium';

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'settings', label: 'Profile Settings', icon: User },
    ...(currentRole === 'client' ? [
      { id: 'jobs', label: 'Jobs', icon: Briefcase },
      { id: 'wallets', label: 'Wallets', icon: Wallet },
      { id: 'chatrooms', label: 'Chat Rooms', icon: MessageCircle, premium: true },
    ] : []),
    ...(currentRole === 'freelancer' ? [
      { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
      { id: 'applications', label: 'Applications', icon: FileText },
      { id: 'wallets', label: 'Wallets', icon: Wallet },
      { id: 'chatrooms', label: 'Chat Rooms', icon: MessageCircle, premium: true },
    ] : []),
    ...(currentRole === 'server_admin' ? [{ id: 'configure', label: 'Configure Bot', icon: Settings }] : []),
  ];

  const handleNavClick = (sectionId) => {
    onSectionChange(sectionId);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {isMobileOpen && <div className="sidebar-mobile-overlay" onClick={onMobileClose} />}
      <aside className={`sidebar glass${isMobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo-wrapper">
          <h2 className="sidebar-logo gradient-text-primary">
            Xentra
          </h2>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isLocked = item.premium && !isPremium;
            const isActive = activeSection === item.id;
            const isPremiumActive = item.premium && isPremium && isActive;
            const navClasses = [
              'nav-item',
              isActive ? 'active' : '',
              isLocked ? 'premium-locked' : '',
              isPremiumActive ? 'premium-nav-active' : ''
            ].filter(Boolean).join(' ');
            return (
              <div
                key={item.id}
                className={navClasses}
                onClick={() => handleNavClick(item.id)}
                title={isLocked ? 'Premium feature, upgrade to access' : undefined}
              >
                <Icon size={20} />
                {item.label}
                {isLocked && (
                  <span className="nav-premium-dust">
                    {[...Array(8)].map((_, i) => (
                      <span key={i} className="dust-particle" style={{ animationDelay: `${i * 0.7}s` }} />
                    ))}
                  </span>
                )}
                {isPremiumActive && (
                  <span className="premium-tag" style={{ marginLeft: 'auto', fontSize: '0.55rem' }}>
                    ✦
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item sidebar-logout" onClick={() => { onLogout(); if (onMobileClose) onMobileClose(); }}>
            <LogOut size={20} />
            Logout
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
