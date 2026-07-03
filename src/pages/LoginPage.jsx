import React, { useState, useCallback } from 'react';
import { Disc as Discord, Shield, Briefcase, Globe, Clock, LogOut, ShieldCheck } from 'lucide-react';
import CaptchaChallenge from '../components/dashboard/common/CaptchaChallenge';
import { fetchCaptchaChallenge, captchaVerify } from '../services/api';

const LoginPage = () => {
  const [role, setRole] = useState('freelancer');
  const [isExpired] = useState(() => {
    const expired = sessionStorage.getItem('session_expired') === 'true';
    sessionStorage.removeItem('session_expired');
    return expired;
  });

  // ── Captcha state ────────────────────────────────────────────────
  const [captcha, setCaptcha] = useState({
    required: false,
    siteKey: '',
    error: null,
    isLoading: false,
  });

  const redirectToDiscord = useCallback(() => {
    localStorage.setItem('selected_role', role);
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email guilds');
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${role}`;
  }, [role]);

  const handleDiscordLogin = async () => {
    // Fetch the public captcha site key, then show the widget.
    setCaptcha((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchCaptchaChallenge();
      const siteKey = data.site_key || '';
      if (siteKey) {
        setCaptcha({ required: true, siteKey, error: null, isLoading: false });
      } else {
        // No site key configured — skip captcha and redirect directly.
        redirectToDiscord();
      }
    } catch {
      // Backend unreachable or error — graceful degradation: skip captcha.
      redirectToDiscord();
    }
  };

  const handleCaptchaVerified = useCallback(async (token) => {
    try {
      await captchaVerify(token);
      // Verification succeeded — close modal and proceed to Discord OAuth.
      setCaptcha({ required: false, siteKey: '', error: null, isLoading: false });
      redirectToDiscord();
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed. Please try again.';
      setCaptcha((prev) => ({ ...prev, error: msg }));
    }
  }, [redirectToDiscord]);

  const handleCaptchaDismiss = useCallback(() => {
    setCaptcha({ required: false, siteKey: '', error: null, isLoading: false });
  }, []);

  if (isExpired) {
    return (
      <div className="login-page-container">
        <div className="auth-callback-grid-lines"></div>
        <div className="hacking-modal">
          <div className="hacking-modal-icon">
            <Clock size={48} />
          </div>
          <h2 className="hacking-modal-title">Session Expired</h2>
          <p className="hacking-modal-text">Your session has expired. Please log in again to continue.</p>
          <button onClick={() => window.location.reload()} className="hacking-modal-btn">
            <LogOut size={20} />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      {/* Decorative Grid Lines */}
      <div className="auth-callback-grid-lines"></div>

      <div className="card glass fade-in login-page-card">
        <div className="mb-40">
          <h1 className="login-page-title">
            Xentra
          </h1>
          <p className="login-subtitle">The future of decentralized freelancing.</p>
        </div>

        <div className="login-page-select-wrapper">
          <label className="form-label">Select Your Identity</label>
          <div className="login-page-grid">
            <div
              onClick={() => setRole('client')}
              className={`nav-item login-role-item ${role === 'client' ? 'active' : ''}`}
            >
              <Briefcase size={20} />
              <span>Client</span>
            </div>
            <div
              onClick={() => setRole('freelancer')}
              className={`nav-item login-role-item ${role === 'freelancer' ? 'active' : ''}`}
            >
              <Globe size={20} />
              <span>Freelancer</span>
            </div>
            <div
              onClick={() => setRole('server_admin')}
              className={`nav-item login-role-item ${role === 'server_admin' ? 'active' : ''}`}
            >
              <Shield size={20} />
              <span>Server Admin</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDiscordLogin}
          className="btn btn-primary login-page-btn-discord"
          disabled={captcha.isLoading}
        >
          <Discord size={24} />
          {captcha.isLoading ? 'Verifying...' : 'Continue with Discord'}
        </button>

        <p className="text-075rem text-dim mt-24">
          By continuing, you agree to our terms and conditions.
        </p>
      </div>

      {/* ── Captcha Challenge Modal ──────────────────────────────── */}
      {captcha.required && (
        <CaptchaChallenge
          siteKey={captcha.siteKey}
          error={captcha.error}
          onVerified={handleCaptchaVerified}
          onDismiss={handleCaptchaDismiss}
          title="Let's Verify It's You"
          description="Before we proceed, please complete the quick check below to confirm you're not a robot."
          icon={ShieldCheck}
        />
      )}
    </div>
  );
};

export default LoginPage;
