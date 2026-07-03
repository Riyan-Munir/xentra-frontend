import React, { memo } from 'react';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import CustomSelect from '../common/CustomSelect';
import DisplayNameCard from '../common/DisplayNameCard';
import Skeleton from '../../common/Skeleton';
import { useProfileForm } from '../../../hooks/useProfileForm';

const ProfileSettings = ({ profile, onUpdate, setHasUnsavedChanges, triggerTremble, addNotification, isSubmitting, isProfileLoading }) => {
  const { fields, setField, hasChanges, handleCancel, handleSave } = useProfileForm(
    profile, onUpdate, addNotification, setHasUnsavedChanges, {
    usernameField: 'username',
    customIdField: 'premium_id',
    customIdFallback: 'freelancer_id',
    extraFields: ['availability'],
  }
  );

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
      <DisplayNameCard fields={fields} setField={setField} role="freelancer" isSubmitting={isSubmitting} />

      <div className="card">
        <div className="form-header-row">
          <h3 className="section-heading-h3">Freelancer ID</h3>
          <span className="premium-tag">Premium</span>
        </div>

        <div className="form-group">
          <label className="form-label">Custom ID</label>
          <input
            type="text"
            className={`form-input ${!isPremium && fields.customId !== profile.premium_id && fields.customId !== profile.freelancer_id ? 'input-border-warning' : ''}`}
            value={fields.customId}
            onChange={(e) => setField('customId', e.target.value.toLowerCase())}
            placeholder="e.g. shadow_123"
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
            Informs clients if you are ready to take on new projects.
          </p>
        </div>
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
