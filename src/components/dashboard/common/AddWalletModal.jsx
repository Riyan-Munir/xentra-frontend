import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, X, Info } from 'lucide-react';
import walletService from '../../../services/walletService';

// Wallet provider options
const PROVIDER_OPTIONS = [
  { value: 'METAMASK', label: 'MetaMask' },
  { value: 'TRUST_WALLET', label: 'Trust Wallet' },
  { value: 'PHANTOM', label: 'Phantom' },
  { value: 'OKX_WALLET', label: 'OKX Wallet' },
  { value: 'BINANCE_WALLET', label: 'Binance Wallet' },
  { value: 'WALLETCONNECT', label: 'WalletConnect' },
  { value: 'OTHER', label: 'Other' },
];

// BSC address regex: 0x + 40 hex chars
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const MAX_LABEL_LENGTH = 32;

const AddWalletModal = ({ isOpen, onClose, walletType, onSuccess, addNotification }) => {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [provider, setProvider] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddress('');
      setLabel('');
      setProvider('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showProviderDropdown) return;
    const handler = () => setShowProviderDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showProviderDropdown]);

  // Validate address field
  const validateAddress = useCallback((value) => {
    if (!value.trim()) return 'Wallet address is required';
    if (!ADDRESS_REGEX.test(value.trim())) return 'Invalid BSC address format (0x + 40 hex characters)';
    return '';
  }, []);

  // Validate label field
  const validateLabel = useCallback((value) => {
    if (value.length > MAX_LABEL_LENGTH) return `Label must be ${MAX_LABEL_LENGTH} characters or fewer`;
    return '';
  }, []);

  // Validate provider field
  const validateProvider = useCallback((value) => {
    if (!value) return 'Select a wallet provider';
    return '';
  }, []);

  // Handle address change with live validation
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddress(value);
    const error = validateAddress(value);
    setErrors((prev) => ({ ...prev, address: error }));
  };

  // Handle label change with live validation
  const handleLabelChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_LABEL_LENGTH + 1) {
      setLabel(value);
    }
    const error = validateLabel(value);
    setErrors((prev) => ({ ...prev, label: error }));
  };

  // Handle provider selection
  const handleProviderSelect = (value) => {
    setProvider(value);
    setShowProviderDropdown(false);
    setErrors((prev) => ({ ...prev, provider: '' }));
  };

  // Full form validation
  const validateForm = () => {
    const addrError = validateAddress(address);
    const lblError = validateLabel(label);
    const provError = validateProvider(provider);

    setErrors({
      address: addrError,
      label: lblError,
      provider: provError,
    });

    return !addrError && !lblError && !provError;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await walletService.create(walletType, {
        address: address.trim(),
        label: label.trim(),
      });
      addNotification?.('Wallet added successfully. Verify ownership to activate.', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to add wallet';
      addNotification?.(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  const selectedProvider = PROVIDER_OPTIONS.find((p) => p.value === provider);

  return createPortal(
    <div className="modal-overlay z-9999" onClick={onClose}>
      <div className="modal-content glass" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="modal-title">
          <Wallet size={22} />
          Add Wallet
        </h3>

        {/* Network info (locked) */}
        <div className="form-group">
          <div
            className="flex-row items-center gap-16"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              opacity: 0.6,
            }}
          >
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Network: BSC
            </span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Currency: USDT
            </span>
          </div>
        </div>

        {/* Address field */}
        <div className="form-group">
          <label className="form-label">Wallet Address *</label>
          <input
            type="text"
            className={`form-input ${errors.address ? 'input-error' : ''}`}
            placeholder="0x..."
            value={address}
            onChange={handleAddressChange}
            autoComplete="off"
            spellCheck={false}
          />
          {errors.address && <span className="error-text">{errors.address}</span>}
          {!errors.address && address && (
            <span className="text-xs" style={{ color: 'var(--success)' }}>
              Valid BSC address format
            </span>
          )}
        </div>

        {/* Label field with live counter */}
        <div className="form-group">
          <div className="flex-between mb-8">
            <label className="form-label m-0">Label (optional)</label>
            <span
              className="text-xs font-semibold"
              style={{ color: label.length > MAX_LABEL_LENGTH ? 'var(--error)' : 'var(--success)' }}
            >
              {label.length}/{MAX_LABEL_LENGTH}
            </span>
          </div>
          <input
            type="text"
            className={`form-input ${errors.label ? 'input-error' : ''}`}
            placeholder="e.g. My Trust Wallet"
            value={label}
            onChange={handleLabelChange}
            maxLength={MAX_LABEL_LENGTH + 1}
          />
          {errors.label && <span className="error-text">{errors.label}</span>}
        </div>

        {/* Provider dropdown */}
        <div className="form-group">
          <label className="form-label">Wallet Provider *</label>
          <div style={{ position: 'relative' }}>
            <button
              className={`form-input text-left flex-between items-center ${errors.provider ? 'input-error' : ''}`}
              style={{ cursor: 'pointer', width: '100%' }}
              onClick={(e) => {
                e.stopPropagation();
                setShowProviderDropdown(!showProviderDropdown);
              }}
              type="button"
            >
              <span style={{ opacity: selectedProvider ? 1 : 0.4 }}>
                {selectedProvider?.label || 'Select Provider'}
              </span>
              <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
            </button>
            {showProviderDropdown && (
              <div
                className="glass"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  marginTop: 4,
                  borderRadius: 8,
                  padding: '4px 0',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className="text-sm"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      opacity: provider === opt.value ? 1 : 0.7,
                      background: provider === opt.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProviderSelect(opt.value);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.provider && <span className="error-text">{errors.provider}</span>}
        </div>

        {/* Info box */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            marginBottom: 8,
          }}
        >
          <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            After adding, you will need to verify ownership by signing a message with your wallet. This proves you control the address.
          </span>
        </div>

        {/* Actions */}
        <div className="flex-row gap-12" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex-row items-center gap-8">
                <span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Adding...
              </span>
            ) : (
              'Add Wallet'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddWalletModal;
