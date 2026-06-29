import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('access_token');
  const isSuperuser = localStorage.getItem('is_superuser') === 'true';
  const location = useLocation();

  if (!token) {
    // Redirect to login but save the current location to return after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isBanned = localStorage.getItem('is_banned') === 'true';
  if (isBanned && location.pathname !== '/banned') {
    return <Navigate to="/banned" replace />;
  }

  if (adminOnly && !isSuperuser) {
    // If route requires admin but user is not admin, send to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
