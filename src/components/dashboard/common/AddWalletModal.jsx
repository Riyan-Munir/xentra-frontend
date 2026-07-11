import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, X, Info, Plug, ChevronDown, Smartphone, QrCode } from 'lucide-react';

// ── Revocation Warning ───────────────────────────────────────────
const REVOCATION_WARNING =
  'Your wallet does not support permission revocation. It may auto-reconnect next time.';
import { QRCodeSVG } from 'qrcode.react';
import walletService from '../../../services/walletService';
import {
  connectWallet,
  disconnectWallet,
  detectProvider,
  isWalletAvailable,
  startProviderDiscovery,
  stopProviderDiscovery,
  getDiscoveredProviders,
  getProviderLabel,
  onProvidersChanged,
  switchToBSC,
  ensureCorrectChain,
  BSC_CHAIN_ID_DECIMAL,
} from '../../../services/web3Wallet';
import {
  initWalletConnect,
  connectWalletConnect,
  disconnectWalletConnect,
  getWCUri,
  isWCInitialized,
  isWCConnected as getWcConnected,
  onWcUri,
  getWCProvider,
  getWCAccounts,
} from '../../../services/walletConnectService';

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

  // WalletConnect state
  const [wcUri, setWcUri] = useState(null);
  const [showWc, setShowWc] = useState(false);
  const [wcConnecting, setWcConnecting] = useState(false);
  const [wcConnected, setWcConnected] = useState(false);

  // Chain validation state
  const [wrongChain, setWrongChain] = useState(false);
  const [chainMessage, setChainMessage] = useState('');
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

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
      setWrongChain(false);
      setChainMessage('');
      setIsSwitchingChain(false);
      // Reset WalletConnect state
      setWcUri(null);
      setShowWc(false);
      setWcConnecting(false);
      setWcConnected(false);

      // Start EIP-6963 discovery and subscribe to real-time updates
      startProviderDiscovery();
      const unsub = onProvidersChanged((wallets) => {
        setDiscoveredWallets(wallets);
      });
      // Also collect any wallets already discovered
      const wallets = getDiscoveredProviders();
      if (wallets.length > 0) {
        setDiscoveredWallets(wallets);
      }

      return () => {
        unsub();
        stopProviderDiscovery();
      };
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
    setWrongChain(false);
    setChainMessage('');

    try {
      const targetProvider = discoveredWallets.length === 1 ? discoveredWallets[0].provider : undefined;
      const result = await connectWallet(targetProvider);
      setAddress(result.address);
      setProvider(result.provider);
      setConnected(true);
      if (result.wrongChain) {
        setWrongChain(true);
        setChainMessage(result.chainMessage || `Connected to wrong network. Please switch to BSC Mainnet (Chain ID: ${BSC_CHAIN_ID_DECIMAL}).`);
      }
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
    setWrongChain(false);
    setChainMessage('');

    try {
      const result = await connectWallet(wallet.provider);
      setAddress(result.address);
      setProvider(result.provider);
      setConnected(true);
      if (result.wrongChain) {
        setWrongChain(true);
        setChainMessage(result.chainMessage || `Connected to wrong network. Please switch to BSC Mainnet (Chain ID: ${BSC_CHAIN_ID_DECIMAL}).`);
      }
      setErrors((prev) => ({ ...prev, address: '', connect: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, connect: err.message || 'Failed to connect wallet' }));
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle "Mobile Wallet" — initialise WalletConnect and show QR
  const handleConnectMobile = async () => {
    if (wcConnecting) return;

    setWcConnecting(true);
    setShowWc(true);
    setErrors((prev) => ({ ...prev, connect: '' }));

    try {
      // Initialise WalletConnect (idempotent — safe to call multiple times)
      await initWalletConnect();

      // Subscribe to URI events for QR code
      const unsub = onWcUri((uri) => {
        setWcUri(uri);
      });

      // Open session — this triggers the display_uri event
      const { address: addr, provider: wcProv } = await connectWalletConnect();
      unsub();

      // Ensure the WC URI was captured (should be by now)
      if (!wcUri) {
        // The URI may already be available from the provider
        const uri = getWCUri();
        if (uri) setWcUri(uri);
      }

      // Connected via WalletConnect — fill the address
      setAddress(addr);
      setProvider('WALLETCONNECT');
      setConnected(true);
      setWcConnected(true);
      setShowWc(false);
      setWcUri(null);
      setErrors((prev) => ({ ...prev, address: '', connect: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, connect: err.message || 'Failed to connect via mobile wallet' }));
      setShowWc(false);
      setWcUri(null);
    } finally {
      setWcConnecting(false);
    }
  };

  // Handle disconnect — revoke permissions from extension AND disconnect WalletConnect
  const handleDisconnect = async () => {
    // Disconnect WalletConnect if active
    if (wcConnected) {
      try {
        await disconnectWalletConnect();
      } catch (err) {
        console.warn('WalletConnect disconnect error:', err);
      }
      setWcConnected(false);
      setWcUri(null);
      setShowWc(false);
      setWcConnecting(false);
    }

    try {
      const { revoked, stillConnected } = await disconnectWallet();

      if (stillConnected) {
        // The wallet extension doesn't support wallet_revokePermissions (EIP-3326).
        // Clear local state but inform the user that the extension may auto-reconnect.
        addNotification?.(REVOCATION_WARNING, 'info');
      }

      setAddress('');
      setProvider('');
      setConnected(false);
    } catch (err) {
      console.error('Disconnect error:', err);
      // Still clear local state even if revoke threw unexpectedly
      setAddress('');
      setProvider('');
      setConnected(false);
    }
  };

  // Handle chain switch — called when user is connected to wrong network
  const handleSwitchChain = async () => {
    if (isSwitchingChain) return;

    setIsSwitchingChain(true);
    try {
      const result = await ensureCorrectChain();
      if (result.ok) {
        setWrongChain(false);
        setChainMessage('');
        addNotification?.('Switched to BSC Mainnet successfully.', 'success');
      } else {
        addNotification?.(result.message || 'Failed to switch network. Please switch manually in your wallet.', 'error');
      }
    } catch (err) {
      addNotification?.(err.message || 'Failed to switch network.', 'error');
    } finally {
      setIsSwitchingChain(false);
    }
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
            wrongChain ? (
              /* Connected but on wrong network — show warning with switch button */
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-xs font-semibold" style={{ color: 'var(--warning)', marginBottom: 2 }}>
                      ⚠ Wrong Network
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
                      {provider === 'WALLETCONNECT' && (
                        <span className="text-xs" style={{ color: 'rgba(99,102,241,0.6)', marginLeft: 8 }}>
                          (Mobile)
                        </span>
                      )}
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'rgba(251, 191, 36, 0.05)',
                  }}
                >
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 1.4 }}>
                    {chainMessage || `Connected to wrong network. Switch to BSC Mainnet (Chain ID: ${BSC_CHAIN_ID_DECIMAL}).`}
                  </span>
                  <button
                    className="btn btn-primary text-xs"
                    style={{ padding: '6px 12px', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}
                    onClick={handleSwitchChain}
                    disabled={isSwitchingChain}
                  >
                    {isSwitchingChain ? 'Switching...' : 'Switch to BSC'}
                  </button>
                </div>
              </div>
            ) : (
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
                    {provider === 'WALLETCONNECT' && (
                      <span className="text-xs" style={{ color: 'rgba(99,102,241,0.6)', marginLeft: 8 }}>
                        (Mobile)
                      </span>
                    )}
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
            )
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
          ) : showWc ? (
            /* WalletConnect QR display */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Scan with your mobile wallet app
              </span>
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: 'white',
                  display: 'inline-flex',
                }}
              >
                {wcUri ? (
                  <QRCodeSVG value={wcUri} size={200} level="M" />
                ) : (
                  <div
                    style={{
                      width: 200,
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 24,
                        height: 24,
                        border: '3px solid rgba(0,0,0,0.1)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }}
                    />
                  </div>
                )}
              </div>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.4 }}>
                Open your wallet app, tap "Connect" or "Scan", and scan this QR code.
              </span>
              <button
                className="btn btn-secondary text-xs"
                style={{ padding: '6px 10px', fontSize: 11 }}
                onClick={() => {
                  setShowWc(false);
                  setWcUri(null);
                  setWcConnecting(false);
                  disconnectWalletConnect().catch(() => { });
                }}
                disabled={wcConnecting}
              >
                ← Cancel
              </button>
            </div>
          ) : (
            <>
              {/* Connect Browser Extension Wallet */}
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

              {/* Connect via Mobile Wallet (WalletConnect) */}
              <button
                className="btn btn-secondary w-full"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  marginTop: 6,
                }}
                onClick={handleConnectMobile}
                disabled={wcConnecting}
              >
                {wcConnecting ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Smartphone size={16} />
                    Mobile Wallet (QR)
                  </>
                )}
              </button>

              {!isWalletAvailable() && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', display: 'block' }}>
                    Install MetaMask, Trust Wallet, or another EVM wallet extension to connect.
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', display: 'block', fontStyle: 'italic' }}>
                    On mobile? Tap "Mobile Wallet (QR)" above to connect via WalletConnect, or open this page inside your wallet's in-app browser.
                  </span>
                </div>
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
            {provider === 'WALLETCONNECT' ? 'WalletConnect (Mobile)' : provider ? getProviderLabel(provider) : 'Connect wallet to detect'}
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
