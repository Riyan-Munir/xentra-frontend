import React, { memo } from 'react';
import { Shield, Star, X, CheckCircle, Clock } from 'lucide-react';

/**
 * Truncate a BSC wallet address for display on the ATM card.
 * Input:  0x7a3B9c2D1e4F5a6B7c8D9e0F1a2B3c4D5e6F7b3C
 * Output: 0x7a3B •••• •••• •••• •••• 7b3C
 */
const formatAddress = (addr) => {
  if (!addr || addr.length < 20) return addr || '';
  const prefix = addr.slice(0, 6);
  const suffix = addr.slice(-4);
  return `${prefix} •••• •••• •••• •••• ${suffix}`;
};

const WalletCard = ({
  wallet,
  isDefault,
  onSetDefault,
  onVerify,
  onRemove,
  index = 0,
  canRemove = true,
}) => {
  // Determine card variant
  const variant = isDefault
    ? 'default'
    : wallet.is_verified
      ? 'verified'
      : 'pending';

  const isPending = wallet.status === 'pending_verification' || !wallet.is_verified;

  return (
    <div className="wallet-card-group" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ATM Card */}
      <div
        className={`wallet-card wallet-card--${variant} wallet-card-animate`}
        style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
      >
        {/* Badge: top-right */}
        {isDefault ? (
          <span className="wallet-badge-default">
            <Star size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            DEFAULT
          </span>
        ) : (
          <span className="wallet-badge-set-default">
            <button
              className="btn btn-secondary text-xs"
              style={{ padding: '4px 8px', fontSize: 10 }}
              onClick={() => onSetDefault?.(wallet)}
            >
              Set as Default
            </button>
          </span>
        )}

        <div className="wallet-card-inner">
          {/* Top row: Xentra logo + chip */}
          <div className="flex-row items-center gap-10" style={{ justifyContent: 'space-between' }}>
            <div className="flex-row items-center gap-8">
              <div className="wallet-card-chip" />
              <span
                className="text-xs font-bold"
                style={{ opacity: 0.6, letterSpacing: 2, fontSize: 11 }}
              >
                XENTRA
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="wallet-card-address">
            {formatAddress(wallet.address)}
          </div>

          {/* Divider */}
          <div className="wallet-card-divider" />

          {/* Footer */}
          <div className="wallet-card-footer">
            <div className="flex-col gap-2">
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {wallet.label || 'Wallet'}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {wallet.network || 'BSC'} · {wallet.currency || 'USDT'} · {wallet.provider}
              </span>
            </div>
            {wallet.is_verified ? (
              <span
                className="text-xs wallet-status-verified"
                style={{ color: 'var(--success)' }}
              >
                <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Verified
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--warning)' }}>
                <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Pending
              </span>
            )}
          </div>

          {/* Action buttons inside card */}
          <div className="wallet-card-actions">
            {isPending && (
              <button
                className="btn btn-primary text-xs"
                style={{ padding: '5px 10px' }}
                onClick={() => onVerify?.(wallet)}
              >
                <Shield size={14} /> Verify
              </button>
            )}
            <button
              className="btn btn-secondary text-xs"
              style={{ padding: '5px 10px', opacity: canRemove ? 1 : 0.4 }}
              disabled={!canRemove}
              onClick={() => canRemove && onRemove?.(wallet)}
            >
              <X size={14} /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(WalletCard);
