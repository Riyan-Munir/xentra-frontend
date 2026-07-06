import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const UnsavedChangesBar = ({ onSave, onCancel, triggerTremble, isSubmitting }) => {
  const [tremble, setTremble] = useState(false);

  useEffect(() => {
    if (triggerTremble) {
      setTremble(true);
      const timer = setTimeout(() => setTremble(false), 400); // Duration of tremble animation
      return () => clearTimeout(timer);
    }
  }, [triggerTremble]);

  const barContent = (
    <div
      className={`unsaved-changes-bar glass fade-in ${tremble ? 'tremble' : ''}`}
    >
      <div className="unsaved-bar-text">
        Careful, you have unsaved changes!
      </div>
      <div className="unsaved-bar-actions">
        <button
          className="btn btn-secondary unsaved-bar-btn"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className={`btn btn-primary unsaved-bar-save ${isSubmitting ? 'btn-loading' : ''}`}
          onClick={onSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return createPortal(barContent, document.body);
};

export default memo(UnsavedChangesBar);
