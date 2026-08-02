import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import userService from '../services/userService';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const location = useLocation();

  // ── Server-verified status (null = not yet checked) ──────────────
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    userService.getStatus()
      .then((data) => {
        if (cancelled) return;
        // Sync localStorage with server truth
        localStorage.setItem('is_banned', String(data.is_banned));
        setServerStatus(data);
      })
      .catch(() => {
        // If the request fails (e.g. expired token), treat as unverified
        // The existing JWT interceptor handles 401 → refresh → retry
        if (!cancelled) setServerStatus({ is_banned: false });
      });

    return () => { cancelled = true; };
  }, [token]);

  // ── Gate: no token ──────────────────────────────────────────────
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Gate: still verifying — render nothing (prevents flash) ─────
  if (serverStatus === null) {
    return (
      <div className="dashboard-layout">
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fade-in" style={{ width: '100%', maxWidth: 480, padding: 40 }}>
            <div className="skeleton-box pulse" style={{ height: 48, marginBottom: 24, borderRadius: 12 }} />
            <div className="skeleton-box pulse" style={{ height: 24, marginBottom: 16, width: '60%', borderRadius: 8 }} />
          </div>
        </main>
      </div>
    );
  }

  // ── Gate: banned (server-verified) ──────────────────────────────
  if (serverStatus.is_banned && location.pathname !== '/banned') {
    return <Navigate to="/banned" replace />;
  }

  return children;
};

export default ProtectedRoute;
