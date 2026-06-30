import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, HelpCircle, AlertOctagon, Terminal } from 'lucide-react';

const BannedPage = () => {
  const navigate = useNavigate();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="banned-classic-root">
      {/* Background Decorative Elements */}
      <div className="classic-bg-overlay"></div>
      <div className="classic-glow top-right"></div>
      <div className="classic-glow bottom-left"></div>
      
      <div className="classic-content-wrapper banned-fade-in">
        <div className="classic-main-section">
          <div className="icon-badge-outer">
            <div className="icon-badge-inner">
              <ShieldAlert size={48} color="var(--error)" />
            </div>
          </div>

          <div className="banned-header-text">
            <h1 className={`banned-main-title ${glitch ? 'glitch-active' : ''}`} data-text="ACCESS_DENIED">
              ACCESS_DENIED
            </h1>
            <div className="banned-divider">
              <div className="divider-line"></div>
              <AlertOctagon size={16} className="divider-icon" />
              <div className="divider-line"></div>
            </div>
            <p className="banned-error-code">ERROR_CODE: 403_RESTRICTED_IDENTITY</p>
          </div>

          <div className="banned-message-card glass">
            <div className="message-content">
              <Terminal size={20} className="message-icon" />
              <p>
                Your account has been suspended for violating our terms of service.
                Contact <a href="/support" className="support-link">Support</a> for further assistance.
              </p>
            </div>
          </div>

          <div className="classic-actions">
            <button onClick={handleLogout} className="classic-btn btn-terminate">
              <LogOut size={20} />
              <span>TERMINATE SESSION</span>
            </button>
            <a href="/support" className="classic-btn btn-appeal">
              <HelpCircle size={20} />
              <span>SUBMIT APPEAL</span>
            </a>
          </div>
        </div>

        {/* Bottom Technical Info */}
        <div className="technical-footer">
          <div className="footer-item">
            <span className="label">STATUS:</span>
            <span className="value error">SUSPENDED</span>
          </div>
          <div className="footer-item">
            <span className="label">SECURITY_NODE:</span>
            <span className="value">AMS-04</span>
          </div>
          <div className="footer-item">
            <span className="label">PROTOCOL:</span>
            <span className="value">BANNED_IDENTITY_v1.2</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannedPage;
