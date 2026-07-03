import React, { memo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Briefcase, Globe, Shield, RefreshCw } from 'lucide-react';

const RoleSwitcher = ({ currentRole, onSwitch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    // Delay to avoid closing on the same click that opened the dropdown
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const roles = [
    { id: 'client', label: 'Client', icon: Briefcase },
    { id: 'freelancer', label: 'Freelancer', icon: Globe },
    { id: 'server_admin', label: 'Server Admin', icon: Shield },
  ];

  return (
    <div className="role-switcher-container pos-relative" ref={dropdownRef}>
      <button
        className="btn btn-secondary role-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="role-switcher-trigger">
          <RefreshCw size={16} />
          <span className="role-switcher-label">{roles.find(r => r.id === currentRole)?.label}</span>
        </div>
        <ChevronDown size={16} className={`custom-select-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="role-switcher-dropdown">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className={`nav-item role-switcher-item ${currentRole === role.id ? 'active' : ''}`}
                onClick={() => {
                  onSwitch(role.id);
                  setIsOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{role.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(RoleSwitcher);
