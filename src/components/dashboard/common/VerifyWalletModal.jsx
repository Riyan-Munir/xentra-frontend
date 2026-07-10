import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, Copy, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import walletService from '../../../services/walletService';

// Provider-specific signing instructions with real documentation links
const PROVIDER_INSTRUCTIONS = {
    METAMASK: {
        name: 'MetaMask',
        steps: [
            'Open the MetaMask Test DApp linked below',
            'Click "Connect" to connect your wallet',
            'Scroll to the "Sign" section → click "Sign" under Personal Sign',
            'MetaMask popup will appear → confirm the signature',
            'Copy the resulting signature from the output',
        ],
        link: { text: 'MetaMask Test DApp', url: 'https://metamask.github.io/test-dapp/' },
        linkSecondary: { text: 'How to sign data (docs)', url: 'https://docs.metamask.io/wallet/how-to/sign-data/' },
        altNote: null,
    },
    TRUST_WALLET: {
        name: 'Trust Wallet',
        steps: [
            'Open Trust Wallet app',
            'Go to Settings → Sign Message',
            'Select the wallet address you registered',
            'Paste the message above into the text field',
            'Tap "Sign" → copy the resulting signature',
        ],
        link: { text: 'Trust Wallet Help Center', url: 'https://community.trustwallet.com/' },
        linkSecondary: null,
        altNote: null,
    },
    PHANTOM: {
        name: 'Phantom',
        steps: [
            'Open Phantom wallet extension or mobile app',
            'Go to a DApp that supports personal_sign (see link below)',
            'Connect your Phantom wallet',
            'Trigger a message sign request and paste the message',
            'Approve the signature → copy the result',
        ],
        link: { text: 'Phantom Documentation', url: 'https://docs.phantom.app/' },
        linkSecondary: null,
        altNote: 'Phantom does not have a standalone "Sign Message" UI. You need to use a DApp or the developer console.',
    },
    OKX_WALLET: {
        name: 'OKX Wallet',
        steps: [
            'Open OKX Wallet app or browser extension',
            'Go to Settings → Sign Message',
            'Select your wallet',
            'Paste the message above',
            'Tap "Sign" → copy the resulting signature',
        ],
        link: { text: 'OKX Help Center', url: 'https://www.okx.com/help/' },
        linkSecondary: null,
        altNote: null,
    },
    BINANCE_WALLET: {
        name: 'Binance Wallet',
        steps: [
            'Open Binance Wallet (extension or mobile app)',
            'Connect to a DApp that supports personal_sign',
            'Approve the connection request',
            'Paste the message when prompted to sign',
            'Confirm → copy the signature from the result',
        ],
        link: { text: 'Binance Wallet Guide', url: 'https://www.binance.com/en/wallet' },
        linkSecondary: null,
        altNote: 'Binance Wallet does not have a standalone message signing feature. Use a DApp like the MetaMask Test DApp.',
    },
    WALLETCONNECT: {
        name: 'WalletConnect',
        steps: [
            'WalletConnect is a protocol — signing depends on your wallet app',
            'Open your wallet app that supports WalletConnect',
            'Go to Settings → Sign Message (if available)',
            'Or connect to a DApp via the WalletConnect modal',
            'Paste the message → Sign → copy the result',
        ],
        link: { text: 'WalletConnect Docs', url: 'https://docs.walletconnect.com/' },
        linkSecondary: null,
        altNote: null,
    },
    OTHER: {
        name: null,
        steps: [
            'Search your wallet app\'s documentation for "Sign Message"',
            'Look in Settings for "Sign Message" or "Sign Personal Message"',
            'If not available, use a DApp like the MetaMask Test DApp (link below)',
            'Connect your wallet → sign the message → copy the signature',
        ],
        link: { text: 'MetaMask Test DApp (universal fallback)', url: 'https://metamask.github.io/test-dapp/' },
        linkSecondary: null,
        altNote: null,
    },
};

const VerifyWalletModal = ({ isOpen, onClose, wallet, walletType, onSuccess, addNotification }) => {
    const [challenge, setChallenge] = useState('');
    const [challengeMessage, setChallengeMessage] = useState('');
    const [signature, setSignature] = useState('');
    const [step, setStep] = useState(1); // 1: loading/copy, 2: paste signature, 3: verifying
    const [isVerifying, setIsVerifying] = useState(false);
    const [copied, setCopied] = useState(false);
    const [signatureError, setSignatureError] = useState('');

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Fetch challenge when modal opens
    useEffect(() => {
        if (!isOpen || !wallet?.id) return;

        const fetchChallenge = async () => {
            setStep(1);
            setChallenge('');
            setChallengeMessage('');
            setSignature('');
            setCopied(false);
            setSignatureError('');

            try {
                const res = await walletService.getChallenge(walletType, wallet.id);
                const token = res.data?.verification_token || '';
                const msg = res.data?.message || '';
                setChallenge(token);
                setChallengeMessage(msg);
            } catch (err) {
                const msg = err?.response?.data?.error || 'Failed to generate challenge';
                addNotification?.(msg, 'error');
                onClose();
            }
        };

        fetchChallenge();
    }, [isOpen, wallet, walletType, addNotification, onClose]);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setChallenge('');
            setChallengeMessage('');
            setSignature('');
            setStep(1);
            setIsVerifying(false);
            setCopied(false);
            setSignatureError('');
        }
    }, [isOpen]);

    // Copy challenge to clipboard
    const handleCopyChallenge = useCallback(async () => {
        if (!challenge) return;
        try {
            await navigator.clipboard.writeText(challenge);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addNotification?.('Failed to copy to clipboard', 'error');
        }
    }, [challenge, addNotification]);

    // Validate signature format
    const validateSignature = (sig) => {
        if (!sig.trim()) return 'Signature is required';
        if (!sig.startsWith('0x')) return 'Signature must start with 0x';
        if (sig.length < 10) return 'Signature is too short';
        if (!/^0x[0-9a-fA-F]+$/.test(sig.trim())) return 'Invalid hex characters in signature';
        return '';
    };

    // Handle signature input
    const handleSignatureChange = (e) => {
        const value = e.target.value;
        setSignature(value);
        const error = validateSignature(value);
        setSignatureError(error);
    };

    // Submit verification
    const handleVerify = async () => {
        const error = validateSignature(signature);
        if (error) {
            setSignatureError(error);
            return;
        }
        if (isVerifying) return;

        setIsVerifying(true);
        setStep(3);
        try {
            await walletService.verify(walletType, wallet.id, signature.trim());
            addNotification?.('Wallet verified successfully!', 'success');
            onSuccess?.();
            onClose();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Verification failed. Please try again.';
            setSignatureError(msg);
            setStep(2);
            addNotification?.(msg, 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    // Handle Enter key on signature input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isVerifying && step === 2) {
            e.preventDefault();
            handleVerify();
        }
    };

    if (!isOpen || !wallet) return null;

    const truncatedAddress = wallet.address
        ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
        : '';

    // Get provider-specific instructions
    const providerKey = (wallet.provider || 'OTHER').toUpperCase();
    const instructions = PROVIDER_INSTRUCTIONS[providerKey] || PROVIDER_INSTRUCTIONS.OTHER;
    const providerDisplayName = instructions.name || wallet.provider || 'your wallet';

    return createPortal(
        <div className="modal-overlay z-9999" onClick={onClose}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <h3 className="modal-title">
                    <Shield size={22} />
                    Verify Wallet Ownership
                </h3>

                {/* Wallet address display */}
                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        marginBottom: 16,
                    }}
                >
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Verifying:{' '}
                    </span>
                    <span className="text-sm font-semibold" style={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                        {truncatedAddress}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                        ({providerDisplayName})
                    </span>
                </div>

                {/* Step 1: Copy challenge */}
                <div className="form-group">
                    <label className="form-label">
                        <span style={{ color: 'var(--primary)', marginRight: 6 }}>1</span>
                        Copy this message
                    </label>
                    <div
                        style={{
                            position: 'relative',
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            fontFamily: 'monospace',
                            fontSize: 12,
                            wordBreak: 'break-all',
                            lineHeight: 1.6,
                            color: 'rgba(255,255,255,0.8)',
                        }}
                    >
                        {challenge ? (
                            <>
                                <span style={{ opacity: 0.6 }}>Xentra wallet verification{'\n'}</span>
                                <span>nonce: {challenge}</span>
                            </>
                        ) : (
                            <span style={{ opacity: 0.4 }}>Loading challenge...</span>
                        )}
                        {challenge && (
                            <button
                                className="btn btn-secondary text-xs"
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                }}
                                onClick={handleCopyChallenge}
                            >
                                {copied ? (
                                    <><CheckCircle size={12} /> Copied</>
                                ) : (
                                    <><Copy size={12} /> Copy</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Step 2: Provider-specific signing instructions */}
                <div className="form-group">
                    <label className="form-label">
                        <span style={{ color: 'var(--primary)', marginRight: 6 }}>2</span>
                        Sign with {providerDisplayName}
                    </label>
                    <div
                        style={{
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)',
                            fontSize: 13,
                            lineHeight: 1.7,
                            color: 'rgba(255,255,255,0.5)',
                        }}
                    >
                        {instructions.steps.map((text, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, minWidth: 14 }}>
                                    {i + 1}.
                                </span>
                                <span>{text}</span>
                            </div>
                        ))}

                        {/* Primary link */}
                        {instructions.link && (
                            <div style={{ marginTop: 10 }}>
                                <a
                                    href={instructions.link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--primary)',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontWeight: 500,
                                        fontSize: 12,
                                    }}
                                >
                                    {instructions.link.text}
                                    <ExternalLink size={11} style={{ opacity: 0.7 }} />
                                </a>
                            </div>
                        )}

                        {/* Secondary link */}
                        {instructions.linkSecondary && (
                            <div style={{ marginTop: 4 }}>
                                <a
                                    href={instructions.linkSecondary.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--primary)',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontWeight: 500,
                                        fontSize: 12,
                                        opacity: 0.7,
                                    }}
                                >
                                    {instructions.linkSecondary.text}
                                    <ExternalLink size={11} style={{ opacity: 0.7 }} />
                                </a>
                            </div>
                        )}

                        {/* Alt note */}
                        {instructions.altNote && (
                            <div
                                style={{
                                    marginTop: 8,
                                    padding: '8px 10px',
                                    borderRadius: 6,
                                    background: 'rgba(255,255,255,0.04)',
                                    fontSize: 11,
                                    lineHeight: 1.5,
                                    color: 'rgba(255,255,255,0.35)',
                                }}
                            >
                                💡 {instructions.altNote}
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 3: Paste signature */}
                <div className="form-group">
                    <label className="form-label">
                        <span style={{ color: 'var(--primary)', marginRight: 6 }}>3</span>
                        Paste signature
                    </label>
                    <input
                        type="text"
                        className={`form-input ${signatureError ? 'input-error' : ''}`}
                        placeholder="0x..."
                        value={signature}
                        onChange={handleSignatureChange}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {signatureError && <span className="error-text">{signatureError}</span>}
                </div>

                {/* Warning about expiry */}
                <div
                    style={{
                        display: 'flex',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                        marginBottom: 8,
                    }}
                >
                    <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                        The challenge token expires in 30 minutes. If it expires, close and reopen this modal to get a new one.
                    </span>
                </div>

                {/* Actions */}
                <div className="flex-row gap-12" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isVerifying}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleVerify}
                        disabled={isVerifying || !challenge || !signature.trim()}
                    >
                        {isVerifying ? (
                            <span className="flex-row items-center gap-8">
                                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                Verifying...
                            </span>
                        ) : (
                            <><Shield size={14} /> Verify</>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VerifyWalletModal;
