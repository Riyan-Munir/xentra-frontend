import React, { memo } from 'react';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import Skeleton from '../../common/Skeleton';
import { useProfileForm } from '../../../hooks/useProfileForm';

const ProfileSettings = ({ profile, onUpdate, setHasUnsavedChanges, triggerTremble, addNotification, isSubmitting, isProfileLoading }) => {
  const { fields, setField, hasChanges, handleCancel, handleSave } = useProfileForm(
    profile, onUpdate, addNotification, setHasUnsavedChanges, {
      usernameField: 'username',
    }
  );

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
        <div></div>
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
          <label className="form-label">Admin Display Name</label>
          <input
            type="text"
            className="form-input"
            value={fields.username}
            onChange={(e) => setField('username', e.target.value)}
            placeholder="e.g. Server Owner"
            disabled={isSubmitting}
          />
          <p className="helper-text">
            This name will be displayed in server management logs.
          </p>
        </div>
      </div>

      {/* Empty space to keep card at half width in grid */}
      <div></div>

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
