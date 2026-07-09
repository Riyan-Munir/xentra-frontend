import React, { memo, useState, useEffect } from 'react';
import { Wallet, Plus } from 'lucide-react';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import CustomSelect from '../common/CustomSelect';
import DisplayNameCard from '../common/DisplayNameCard';
import Skeleton from '../../common/Skeleton';
import { useProfileForm } from '../../../hooks/useProfileForm';
import walletService from '../../../services/walletService';

const ProfileSettings = ({ profile, onUpdate, setHasUnsavedChanges, triggerTremble, addNotification, isSubmitting, isProfileLoading, onNavigate }) => {
  const { fields, setField, hasChanges, handleCancel, handleSave } = useProfileForm(
    profile, onUpdate, addNotification, setHasUnsavedChanges, {
    usernameField: 'username',
    customIdField: 'premium_id',
    customIdFallback: 'client_id',
    extraFields: ['availability'],
  }
  );

  const isPremium = profile.premium_tier === 'premium';

  // ── Wallet verification status ───────────────────────────────
  const [hasVerifiedWallet, setHasVerifiedWallet] = useState(false);
  const [walletsLoading, setWalletsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await walletService.list('client');
        const wallets = res.data?.results || res.data || [];
        if (!cancelled) {
          setHasVerifiedWallet(wallets.some(w => w.is_verified && w.status !== 'DISABLED'));
        }
      } catch {
        if (!cancelled) setHasVerifiedWallet(false);
      } finally {
        if (!cancelled) setWalletsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile]);

  if (isProfileLoading) {
    return (
      <div className="fade-in settings-grid">
        <div className="card">
          <div className="form-header-row">
            <Skeleton template="text" lines={1} />
          </div>
          <div className="form-group skeleton-setting-grid">
            <Skeleton template="form" />
          </div>
        </div>
        <div className="card">
          <div className="form-header-row">
            <Skeleton template="text" lines={1} />
            <Skeleton template="text" lines={1} />
          </div>
          <div className="form-group skeleton-setting-grid">
            <Skeleton template="form" />
          </div>
        </div>
        <div className="card">
          <div className="form-header-row">
            <Skeleton template="text" lines={1} />
          </div>
          <div className="form-group skeleton-setting-grid">
            <Skeleton template="form" />
          </div>
        </div>
        <div className="card">
          <div className="form-header-row">
            <Skeleton template="text" lines={1} />
          </div>
          <div className="form-group skeleton-setting-grid">
            <Skeleton template="form" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fade-in settings-grid ${isSubmitting ? 'form-submitting' : ''}`}>
      <DisplayNameCard fields={fields} setField={setField} role="client" isSubmitting={isSubmitting} />

      <div className="card">
        <div className="form-header-row">
          <h3 className="section-heading-h3">Client ID</h3>
          <span className="premium-tag">Premium</span>
        </div>

        <div className="form-group">
          <label className="form-label">Custom ID</label>
          <input
            type="text"
            className={`form-input ${!isPremium && fields.customId !== profile.premium_id && fields.customId !== profile.client_id ? 'input-border-warning' : ''}`}
            value={fields.customId}
            onChange={(e) => setField('customId', e.target.value.toLowerCase())}
            placeholder="e.g. acme_official"
            disabled={isSubmitting}
          />
          <p className="helper-text">
            Unique identifier. Small letters, numbers, underscores only.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="form-header-row">
          <h3 className="section-heading-h3">Availability</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Set Your Status</label>
          <CustomSelect
            options={[
              { label: 'Available (Accepting Jobs)', value: 'available' },
              { label: 'Busy (Currently Working)', value: 'busy' },
              { label: 'Offline (Away)', value: 'offline' }
            ]}
            value={fields.availability}
            onChange={(val) => setField('availability', val)}
            placeholder="Select Availability"
            disabled={isSubmitting}
          />
          <p className="helper-text">
            Informs freelancers if you are ready to take on new projects.
          </p>
        </div>
      </div>

      {/* ── Payment Method Card ──────────────────────────────── */}
      <div className="card">
        <div className="form-header-row">
          <h3 className="section-heading-h3">Payment Method</h3>
          {walletsLoading ? (
            <Skeleton template="text" lines={1} />
          ) : hasVerifiedWallet ? (
            <span style={{ color: 'var(--success, #22c55e)', fontSize: '0.85rem', fontWeight: 600 }}>✅ Verified</span>
          ) : (
            <span style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.85rem', fontWeight: 600 }}>⚠ Not Verified</span>
          )}
        </div>

        {walletsLoading ? (
          <div className="form-group skeleton-setting-grid">
            <Skeleton template="form" />
          </div>
        ) : hasVerifiedWallet ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim, #94a3b8)' }}>
              Your payment method is verified and ready for escrow transactions.
            </p>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', width: 'fit-content' }}
              onClick={() => onNavigate && onNavigate('wallets')}
              disabled={isSubmitting}
            >
              <Wallet size={16} /> Manage Wallets
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim, #94a3b8)' }}>
              Add and verify a BSC wallet to enable payments and escrow transactions.
            </p>
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', width: 'fit-content' }}
              onClick={() => onNavigate && onNavigate('wallets')}
              disabled={isSubmitting}
            >
              <Plus size={16} /> Add Wallet to Verify
            </button>
          </div>
        )}
      </div>

      {hasChanges && (
        <UnsavedChangesBar
          onSave={() => handleSave()}
          onCancel={handleCancel}
          triggerTremble={triggerTremble}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default memo(ProfileSettings);
