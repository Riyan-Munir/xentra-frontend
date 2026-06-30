import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needUsername, setNeedUsername] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [registrationId, setRegistrationId] = useState(null); 
  const hasCalled = React.useRef(false);

  const code = searchParams.get('code');
  const guildId = searchParams.get('guild_id');
  const stateRole = searchParams.get('state'); 
  const role = stateRole || searchParams.get('role') || localStorage.getItem('selected_role') || 'client';

  console.log('--- AuthCallback Logic ---', { code, guildId, role });

  const registerGuild = async (gId) => {
    console.log('Registering guild in backend:', gId);
    try {
      await api.post(`guilds/register/`, { guild_id: gId });
      navigate('/dashboard');
    } catch (err) {
      console.error('Guild registration failed:', err);
      alert('Guild registration failed. Please ensure you are logged in correctly and try again.');
      navigate('/dashboard');
    }
  };

  const exchangeCode = async (username = null, shouldNavigate = true) => {
    try {
      setLoading(true);
      const payload = {
        role,
        bot_username: username
      };

      if (registrationId) {
        payload.registration_id = registrationId;
      } else {
        payload.code = code;
      }

      const res = await api.post(`users/auth/discord/`, payload);

      if (res.data.status === 'need_username') {
        setNeedUsername(true);
        setRegistrationId(res.data.registration_id);
        setLoading(false);
        return { status: 'need_username' };
      }

      const savedRole = res.data.user.role || role || 'freelancer';
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user_role', savedRole);
      localStorage.setItem('username', res.data.user.username);
      localStorage.setItem('discord_avatar', res.data.user.discord_avatar);
      localStorage.setItem('discord_id', res.data.user.discord_id);
      localStorage.setItem('is_superuser', res.data.user.is_superuser);
      localStorage.setItem('selected_role', savedRole);
      localStorage.setItem('active_role', res.data.user.active_role);
      localStorage.setItem('is_banned', res.data.user.is_banned);
      
      if (guildId) {
        await registerGuild(guildId);
      } else if (shouldNavigate) {
        navigate('/dashboard');
      }
      return { status: 'success' };
    } catch (err) {
      console.error('Auth Error:', err.response?.data);
      setError(err.response?.data?.error || 'Authentication failed');
      setLoading(false);
      return { status: 'error' };
    }
  };

  useEffect(() => {
    const oauthError = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    if (oauthError) {
      setLoading(false);
      if (oauthError === 'access_denied') {
        setError('Login cancelled: You denied the connection request to Discord.');
      } else {
        setError(errorDescription || 'Authentication failed');
      }
      return;
    }

    if (!hasCalled.current) {
      if (code) {
        hasCalled.current = true;
        const handleFlow = async () => {
          const result = await exchangeCode(null, false);
          if (guildId && result.status !== 'need_username' && (result.status === 'success' || localStorage.getItem('access_token'))) {
            await registerGuild(guildId);
          } else if (!guildId && result.status === 'success') {
            navigate('/dashboard');
          }
        };
        handleFlow();
      } else if (guildId) {
        hasCalled.current = true;
        registerGuild(guildId);
      } else {
        setLoading(false);
        setError('Missing authentication code. Please try logging in again.');
      }
    }
  }, [code, guildId, searchParams]);

  if (loading) return (
    <div className="auth-callback-container loading-bg">
      <div className="auth-callback-grid-lines"></div>
      
      <div className="fade-in text-center z-2">
        <div className="auth-callback-loader-wrapper">
          <div className="auth-callback-loader-outer"></div>
          <div className="auth-callback-loader-inner"></div>
          <div className="auth-callback-loader-center"></div>
        </div>
        <p className="auth-loading-text">SECURE AUTHENTICATION</p>
        <p className="auth-subtitle">Verifying credentials with Discord...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="auth-callback-container error-bg">
      <div className="auth-callback-grid-lines"></div>
      
      <div className="auth-callback-card error fade-in">
        <div className="auth-callback-error-icon-wrapper">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <h3 className="auth-error-heading">Authentication Blocked</h3>
        <p className="auth-error-description">{error}</p>
        
        <button 
          onClick={() => navigate('/login')} 
          className="btn btn-primary auth-callback-btn-error"
        >
          Return to Login
        </button>
      </div>
    </div>
  );

  if (needUsername) {
    const isFreelancer = role === 'freelancer';
    return (
      <div className={`auth-callback-container ${isFreelancer ? 'freelancer-bg' : 'client-bg'}`}>
        <div className="auth-callback-grid-lines"></div>
        
        <div className={`auth-callback-card ${isFreelancer ? 'username-freelancer' : 'username-client'} fade-in`}>
          <div className="auth-username-section">
            <h2 className="auth-username-heading">One Last Step!</h2>
            <p className="auth-username-subtitle">
              Choose your display name for the{' '}
              <span className={isFreelancer ? 'role-text-gradient-freelancer' : 'role-text-gradient-client'}>
                {role.replace('_', ' ')}
              </span>{' '}
              role.
            </p>
          </div>
          
          <div className="auth-username-group">
            <label className="form-label auth-username-label">Display Name</label>
            <input 
              type="text"
              value={botUsername}
              onChange={(e) => setBotUsername(e.target.value)}
              placeholder="e.g. Shadow Hunter"
              className={'form-input auth-username-input' + (isFreelancer ? ' border-freelancer' : ' border-client')}
              autoFocus
            />
            <p className="auth-helper-text">
              Max 16 characters. Allowed: letters, numbers, spaces, underscores, and hyphens. No dots.
            </p>
          </div>
          
          <button 
            onClick={() => exchangeCode(botUsername)} 
            className={`btn btn-primary ${isFreelancer ? 'auth-callback-btn-username-freelancer' : 'auth-callback-btn-username-client'}`}
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
