import React, { lazy, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Route-level code splitting, each page is a separate chunk loaded on demand
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const BannedPage = lazy(() => import('./pages/BannedPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

// Minimal loading state, zero layout shift, pure skeleton placeholder
const RouteFallback = memo(() => (
  <div className="dashboard-layout">
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 480, padding: 40 }}>
        <div className="skeleton-box pulse" style={{ height: 48, marginBottom: 24, borderRadius: 12 }} />
        <div className="skeleton-box pulse" style={{ height: 24, marginBottom: 16, width: '60%', borderRadius: 8 }} />
        <div className="skeleton-box pulse" style={{ height: 200, borderRadius: 12 }} />
      </div>
    </main>
  </div>
));

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/banned" element={<BannedPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment/:callback_token"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default memo(App);
