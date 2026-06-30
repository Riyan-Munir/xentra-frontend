import React, { memo } from 'react';
import { LayoutDashboard, User, LogOut, Settings, Briefcase, FileText } from 'lucide-react';

const Sidebar = ({ activeSection, onSectionChange, onLogout, currentRole }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'settings', label: 'Profile Settings', icon: User },
    ...(currentRole === 'client' ? [{ id: 'jobs', label: 'Jobs', icon: Briefcase }] : []),
    ...(currentRole === 'freelancer' ? [
      { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
      { id: 'applications', label: 'Applications', icon: FileText }
    ] : []),
    ...(currentRole === 'server_admin' ? [{ id: 'configure', label: 'Configure Bot', icon: Settings }] : []),
  ];

  return (
    <aside className="sidebar glass">
      <div className="sidebar-logo-wrapper">
        <h2 className="sidebar-logo gradient-text-primary">
          Xentra
        </h2>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon size={20} />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item sidebar-logout" onClick={onLogout}>
          <LogOut size={20} />
          Logout
        </div>
      </div>
    </aside>
  );
};

export default memo(Sidebar);
