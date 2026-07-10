import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, X, Info, Plug, ChevronDown } from 'lucide-react';
import walletService from '../../../services/walletService';
import {
  connectWallet,
  disconnectWallet,
  detectProvider,
  isWalletAvailable,
  startProviderDiscovery,
  getDiscoveredProviders,
  getProviderLabel,
} from '../../../services/web3Wallet';

const MAX_LABEL_LENGTH = 32;

const AddWalletModal = ({ isOpen, onClose, walletType, onSuccess, addNotification }) => {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [provider, setProvider] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [discoveredWallets, setDiscoveredWallets] = useState([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when modal opens — do NOT auto-connect
  useEffect(() => {
    if (isOpen) {
      setAddress('');
      setLabel('');
      setProvider('');
      setErrors({});
      setIsSubmitting(false);
      setIsConnecting(false);
      setConnected(false);
      setShowWalletPicker(false);

      // Start EIP-6963 discovery and collect wallets after a short delay
      startProviderDiscovery();
      const timer = setTimeout(() => {
        const wallets = getDiscoveredProviders();
        setDiscoveredWallets(wallets);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle "Connect Wallet" — if multiple wallets, show picker; otherwise connect directly
  const handleConnectWallet = async () => {
    if (isConnecting) return;

    // If we have multiple discovered wallets, show the picker
    if (discoveredWallets.length > 1) {
      setShowWalletPicker(true);
      return;
    }

    // Single wallet or fallback to window.ethereum
    setIsConnecting(true);
    setErrors((prev) => ({ ...prev, connect: '' }));

    try {
      const targetProvider = discoveredWallets.length === 1 ? discoveredWallets[0].provider : undefined;
      const { address: addr, provider: prov } = await connectWallet(targetProvider);
      setAddress(addr);
      setProvider(prov);
      setConnected(true);
      setErrors((prev) => ({ ...prev, address: '', connect: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, connect: err.message || 'Failed to connect wallet' }));
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect to a specific wallet from the picker
  const handlePickWallet = async (wallet) => {
    setShowWalletPicker(false);
    setIsConnecting(true);
    setErrors((prev) => ({ ...prev, connect: '' }));

    try {
      const { address: addr, provider: prov } = await connectWallet(wallet.provider);
      setAddress(addr);
      setProvider(prov);
      setConnected(true);
      setErrors((prev) => ({ ...prev, address: '', connect: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, connect: err.message || 'Failed to connect wallet' }));
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnect — revoke permissions from the extension
  const handleDisconnect = async () => {
    await disconnectWallet();
    setAddress('');
    setProvider('');
    setConnected(false);
  };

  // Handle label change with live validation
  const handleLabelChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_LABEL_LENGTH + 1) {
      setLabel(value);
    }
  };

  // Full form validation
  const validateForm = () => {
    const newErrors = {};

    if (!address.trim()) {
      newErrors.address = 'Connect your wallet to auto-fill the address';
    } else if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim())) {
      newErrors.address = 'Invalid BSC address format';
    }

    if (label.length > MAX_LABEL_LENGTH) {
      newErrors.label = `Label must be ${MAX_LABEL_LENGTH} characters or fewer`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        provider: provider,
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
    if (e.key === 'Enter' && !isSubmitting && !isConnecting) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

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

        {/* Connect Wallet / Connected State */}
        <div className="form-group">
          <label className="form-label">Wallet Address *</label>
          {connected ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--success)', marginBottom: 2 }}>
                  ✓ Wallet Connected
                </div>
                <div
                  className="text-xs"
                  style={{
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.7)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {address}
                </div>
              </div>
              <button
                className="btn btn-secondary text-xs"
                style={{ padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          ) : showWalletPicker ? (
            /* Wallet picker — shown when multiple extensions detected */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                Multiple wallets detected — choose one:
              </span>
              {discoveredWallets.map((w) => (
                <button
                  key={w.uuid}
                  className="btn btn-secondary w-full"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    justifyContent: 'flex-start',
                  }}
                  onClick={() => handlePickWallet(w)}
                >
                  {w.icon && (
                    <img
                      src={w.icon}
                      alt={w.name}
                      style={{ width: 20, height: 20, borderRadius: 4 }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span>{w.name}</span>
                </button>
              ))}
              <button
                className="btn btn-secondary text-xs"
                style={{ padding: '6px 10px', fontSize: 11, marginTop: 4 }}
                onClick={() => setShowWalletPicker(false)}
              >
                ← Back
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-secondary w-full"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
                onClick={handleConnectWallet}
                disabled={isConnecting || !isWalletAvailable()}
              >
                {isConnecting ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plug size={16} />
                    {isWalletAvailable() ? 'Connect Wallet' : 'No Wallet Detected'}
                    {discoveredWallets.length > 1 && <ChevronDown size={14} />}
                  </>
                )}
              </button>
              {!isWalletAvailable() && (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', marginTop: 6, display: 'block' }}>
                  Install MetaMask, Trust Wallet, or another EVM wallet extension to connect.
                </span>
              )}
            </>
          )}
          {errors.connect && <span className="error-text">{errors.connect}</span>}
          {errors.address && <span className="error-text">{errors.address}</span>}
        </div>

        {/* Provider — auto-detected, read-only */}
        <div className="form-group">
          <label className="form-label">Wallet Provider</label>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: provider ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              opacity: provider ? 1 : 0.5,
              fontFamily: 'monospace',
              fontSize: 13,
              color: provider ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
            }}
          >
            {provider ? getProviderLabel(provider) : 'Connect wallet to detect'}
          </div>
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
            After adding, click "Verify Wallet" to sign a message with your wallet — Xentra handles it automatically.
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
            disabled={isSubmitting || !connected}
          >
            {isSubmitting ? (
              <span className="flex-row items-center gap-8">
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
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
