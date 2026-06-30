import React, { memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('body-no-scroll');
    } else {
      document.body.classList.remove('body-no-scroll');
    }
    return () => document.body.classList.remove('body-no-scroll');
  }, [isOpen]);

  if (!isOpen) return null;

  const iconClass = type === 'danger' ? 'confirm-icon-danger' : type === 'warning' ? 'confirm-icon-warning' : 'confirm-icon-default';

  return createPortal(
    <div className="modal-overlay z-9999" onClick={onClose}>
      <div
        className="modal-content glass fade-in confirm-modal-card"
        onClick={e => e.stopPropagation()}
      >
        <div className={'confirm-icon-wrapper ' + iconClass}>
          <AlertTriangle size={32} />
        </div>

        <h3 className="modal-title text-center mb-12">
          {title}
        </h3>

        <p className="confirm-message">
          {message}
        </p>

        <div className="confirm-actions">
          <button
            className="btn btn-secondary confirm-btn"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`btn btn-primary confirm-btn ${type === 'danger' ? 'confirm-btn-danger' : ''}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default memo(ConfirmationModal);
