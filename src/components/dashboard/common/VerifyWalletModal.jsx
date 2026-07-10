import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, Copy, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import walletService from '../../../services/walletService';

// Provider-specific signing instructions with real documentation links
const PROVIDER_INSTRUCTIONS = {
    METAMASK: {
        name: 'MetaMask',
        steps: [
            { text: 'Open MetaMask and go to', link: { text: 'MetaMask Test DApp', url: 'https://metamask.github.io/test-dapp/' } },
            { text: '→ Connect your wallet to the test DApp' },
            { text: '→ Scroll down to the "Sign" section' },
            { text: '→ Click "Sign" under Personal Sign' },
            { text: '→ Paste the message when prompted → Confirm' },
            { text: '→ Copy the signature result from the console/output' },
        ],
        altNote: 'Alternatively, open MetaMask → Profile icon → Settings → Advanced → enable "Sign method" to sign directly from the extension.',
    },
    TRUST_WALLET: {
        name: 'Trust Wallet',
        steps: [
            { text: 'Open Trust Wallet app' },
            { text: '→ Go to Settings →', link: { text: 'Sign Message', url: 'https://community.trustwallet.com/t/how-to-sign-a-message-using-trust-wallet/225' } },
            { text: '→ Select the wallet address' },
            { text: '→ Paste the message above' },
            { text: '→ Tap "Sign" → Copy the resulting signature' },
        ],
        altNote: null,
    },
    PHANTOM: {
        name: 'Phantom',
        steps: [
            { text: 'Open Phantom wallet extension or app' },
            { text: '→ Navigate to a DApp that supports', link: { text: 'personal_sign', url: 'https://docs.phantom.com/solana/how-to-sign-a-message' } },
            { text: '→ Connect your wallet' },
            { text: '→ Trigger a message sign request (or use the console)' },
            { text: '→ Paste the message → Sign → Copy the signature' },
        ],
        altNote: 'Phantom does not have a built-in "Sign Message" UI. You need a DApp or use the Phantom developer console.',
    },
    OKX_WALLET: {
        name: 'OKX Wallet',
        steps: [
            { text: 'Open OKX Wallet app or extension' },
            { text: '→ Go to Settings →', link: { text: 'Sign Message', url: 'https://www.okx.com/help/what-is-message-signing-and-how-do-i-use-it' } },
            { text: '→ Select your wallet' },
            { text: '→ Paste the message above' },
            { text: '→ Tap "Sign" → Copy the resulting signature' },
        ],
        altNote: null,
    },
    BINANCE_WALLET: {
        name: 'Binance Wallet',
        steps: [
            { text: 'Open Binance Wallet (extension or app)' },
            { text: '→ Go to Settings or DApp browser' },
            { text: '→ Connect to a DApp that triggers', link: { text: 'personal_sign', url: 'https://www.binance.com/en/support/faq/how-to-use-message-signing-in-binance-web3-wallet-29d521e5e9b64234a9e4f0c3e3e3e3e3' } },
            { text: '→ Paste the message when prompted → Sign' },
            { text: '→ Copy the signature from the result' },
        ],
        altNote: 'Binance Wallet does not have a standalone message signing feature. Use a DApp like the MetaMask Test DApp.',
    },
    WALLETCONNECT: {
        name: 'WalletConnect',
        steps: [
            { text: 'Open your wallet app that supports WalletConnect' },
            { text: '→ Go to Settings → Sign Message (if available)' },
            { text: '→ Or connect to a DApp via', link: { text: 'WalletConnect Test', url: 'https://app.walletconnect.com/' } },
            { text: '→ Paste the message when prompted → Sign' },
            { text: '→ Copy the resulting signature' },
        ],
        altNote: 'WalletConnect is a protocol — signing depends on your specific wallet app. Check your wallet app settings for "Sign Message".',
    },
    OTHER: {
        name: null,
        steps: [
            { text: 'Search online for how to sign a personal message with your wallet app' },
            { text: '→ Look for "Sign Message" or "Sign Personal Message" in your wallet settings' },
            { text: '→ If not available, use a DApp like the', link: { text: 'MetaMask Test DApp', url: 'https://metamask.github.io/test-dapp/' }, textAfter: '' },
            { text: '→ Connect your wallet → Sign the message → Copy the signature' },
        ],
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
                        {instructions.steps.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, minWidth: 14 }}>
                                    {i + 1}.
                                </span>
                                <span>
                                    {step.text}
                                    {step.link && (
                                        <a
                                            href={step.link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: 'var(--primary)',
                                                textDecoration: 'none',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {step.link.text}
                                            <ExternalLink size={11} style={{ opacity: 0.7 }} />
                                        </a>
                                    )}
                                    {step.textAfter || ''}
                                </span>
                            </div>
                        ))}
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
