import React, { memo, useState } from 'react';
import { DollarSign } from 'lucide-react';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import Skeleton from '../../common/Skeleton';
import { useProfileForm } from '../../../hooks/useProfileForm';

const ProfileSettings = ({ profile, onUpdate, setHasUnsavedChanges, triggerTremble, addNotification, isSubmitting, isProfileLoading }) => {
  const { fields, setField, hasChanges, handleCancel, handleSave } = useProfileForm(
    profile, onUpdate, addNotification, setHasUnsavedChanges, {
    usernameField: 'username',
    customIdField: 'premium_id',
    customIdFallback: 'client_id',
    extraFields: [['minProjectBudget', 'min_project_budget']],
  }
  );

  const [focusedField, setFocusedField] = useState(null);
  const isPremium = profile.premium_tier === 'premium';

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
      </div>
    );
  }

  return (
    <div className={`fade-in settings-grid ${isSubmitting ? 'form-submitting' : ''}`}>
      <div className="card">
        <div className="form-header-row">
          <h3 className="section-heading-h3">Display Name</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Client Display Name</label>
          <input
            type="text"
            className="form-input"
            value={fields.username}
            onChange={(e) => setField('username', e.target.value)}
            placeholder="e.g. Acme Corp"
            disabled={isSubmitting}
          />
          <p className="helper-text">
            Max 16 chars. No dots. A-Z, 0-9, _, -, space.
          </p>
        </div>
      </div>

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
          <h3 className="section-heading-h3">Min. Project Budget</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Minimum Payout ($)</label>
          <div className="pos-relative">
            <input
              type="text"
              inputMode="numeric"
              className="form-input"
              style={{ paddingLeft: '44px' }}
              placeholder="0"
              value={focusedField === 'minProjectBudget' ? String(fields.minProjectBudget).replace(/\.00$/, '') : (fields.minProjectBudget ? parseFloat(fields.minProjectBudget).toFixed(2) : '')}
              onFocus={() => setFocusedField('minProjectBudget')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setField('minProjectBudget', val ? val : '');
              }}
              disabled={isSubmitting}
            />
            <DollarSign size={16} className="pos-absolute primary-text" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <p className="helper-text">
            The base minimum you offer for any project.
          </p>
        </div>
      </div>

      {hasChanges && (
        <UnsavedChangesBar
          onSave={() => handleSave({
            min_project_budget: parseFloat(fields.minProjectBudget) || 0
          })}
          onCancel={handleCancel}
          triggerTremble={triggerTremble}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default memo(ProfileSettings);
