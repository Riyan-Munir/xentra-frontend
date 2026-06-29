import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

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
 * - onVerified: () => void — called when captcha is solved
 * - onDismiss: () => void — called if user closes without solving
 * - error: string | null — optional error message to display
 */
const CaptchaChallenge = ({ siteKey, onVerified, onDismiss, error }) => {
  const widgetRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

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
      window.turnstile.remove(widgetRef.current);
    }

    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      callback: (token) => {
        // User completed the challenge — notify parent
        setIsExpired(false);
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
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [isLoaded, siteKey, onVerified]);

  return (
    <div className="hacking-overlay">
      <div className="hacking-modal" style={{ maxWidth: 420 }}>
        <div className="hacking-modal-icon">
          <ShieldAlert size={48} />
        </div>
        <h2 className="hacking-modal-title">Security Verification</h2>
        <p className="hacking-modal-text">
          Our system detected unusual activity from your IP.
          Please complete the security check to continue.
        </p>

        {error && (
          <p className="hacking-modal-detail" style={{ color: 'var(--error)', marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* Turnstile widget container */}
        <div
          ref={containerRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '16px 0',
            minHeight: 72,
          }}
        />

        {!isLoaded && (
          <div className="flex-center gap-8" style={{ margin: '16px 0', color: 'var(--text-dim)' }}>
            <RefreshCw size={18} className="spin" />
            <span>Loading verification...</span>
          </div>
        )}

        {isExpired && (
          <p className="hacking-modal-detail" style={{ marginBottom: 12 }}>
            Challenge expired. Please try again.
          </p>
        )}

        <button
          className="hacking-modal-btn"
          onClick={onDismiss}
          style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CaptchaChallenge;
