import React, { memo } from 'react';
import UnsavedChangesBar from '../common/UnsavedChangesBar';
import DisplayNameCard from '../common/DisplayNameCard';
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
      <DisplayNameCard fields={fields} setField={setField} role="server_admin" isSubmitting={isSubmitting} />

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
