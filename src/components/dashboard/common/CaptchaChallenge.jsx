import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';

/**
 * CaptchaChallenge — Cloudflare Turnstile widget overlay.
 *
 * Renders a modal overlay containing the Turnstile challenge widget.
 * When the user completes the challenge successfully, calls `onVerified`
 * so the parent can retry the original request.
 *
 * Props
 * -----
 * - siteKey: string — Turnstile site key (from backend 403 response)
 * - onVerified: (token) => void — called when captcha is solved
 * - onDismiss: () => void — called if user closes without solving
 * - error: string | null — optional error message to display
 * - title: string — modal title (default: "Security Verification")
 * - description: string — modal description text
 * - icon: React.ComponentType — icon component to display (default: ShieldAlert)
 */
const CaptchaChallenge = ({
  siteKey,
  onVerified,
  onDismiss,
  error,
  title = 'Security Verification',
  description = 'Our system detected unusual activity from your IP. Please complete the security check to continue.',
  icon: IconComponent = ShieldAlert,
}) => {
  const widgetRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Load Turnstile script if not already loaded
  useEffect(() => {
    if (window.turnstile) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Don't remove the script — it may be needed if component re-mounts
    };
  }, []);

  // Render the Turnstile widget once the script is loaded
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.turnstile) return;

    // Reset any previously rendered widget
    if (widgetRef.current) {
      try { window.turnstile.remove(widgetRef.current); } catch (_) { /* noop */ }
      widgetRef.current = null;
    }

    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      'retry': 'auto',
      'refresh-expired': 'auto',
      callback: (token) => {
        // User completed the challenge — show verifying state, then notify parent
        setIsExpired(false);
        setVerifying(true);
        onVerified(token);
      },
      'expired-callback': () => {
        setIsExpired(true);
      },
      'error-callback': () => {
        setIsExpired(true);
      },
    });

    return () => {
      if (widgetRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetRef.current); } catch (_) { /* noop */ }
        widgetRef.current = null;
      }
    };
  }, [isLoaded, siteKey, onVerified, retryKey]);

  // Reset verifying state when parent signals an error
  useEffect(() => {
    if (error) setVerifying(false);
  }, [error]);

  // Retry handler — re-mounts the widget by bumping retryKey
  const handleRetry = useCallback(() => {
    setIsExpired(false);
    setVerifying(false);
    setRetryKey((k) => k + 1);
  }, []);

  return (
    <div className="hacking-overlay">
      <div className="hacking-modal" style={{ maxWidth: 420 }}>
        <div className="hacking-modal-icon">
          <IconComponent size={48} />
        </div>
        <h2 className="hacking-modal-title">{title}</h2>
        <p className="hacking-modal-text">
          {description}
        </p>

        {error && (
          <p className="hacking-modal-detail" style={{ color: 'var(--error)', marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* Turnstile widget container — hidden while verifying */}
        {!verifying && (
          <div
            ref={containerRef}
            style={{
              display: 'flex',
              justifyContent: 'center',
              margin: '16px 0',
              minHeight: 72,
            }}
          />
        )}

        {/* ── Verifying / success state ──────────────────────────── */}
        {verifying && (
          <div className="flex-center gap-8" style={{ margin: '20px 0', color: 'var(--success, #22c55e)' }}>
            <RefreshCw size={20} className="spin" />
            <span style={{ fontWeight: 600 }}>Verification successful! Redirecting to login...</span>
          </div>
        )}

        {!isLoaded && !verifying && (
          <div className="flex-center gap-8" style={{ margin: '16px 0', color: 'var(--text-dim)' }}>
            <RefreshCw size={18} className="spin" />
            <span>Loading verification...</span>
          </div>
        )}

        {isExpired && !verifying && (
          <button
            className="hacking-modal-btn"
            onClick={handleRetry}
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', marginBottom: 12 }}
          >
            <RefreshCw size={16} />
            Challenge expired — Tap to retry
          </button>
        )}

        {!verifying && (
          <button
            className="hacking-modal-btn"
            onClick={onDismiss}
            style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default CaptchaChallenge;
