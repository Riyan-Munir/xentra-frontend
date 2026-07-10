import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, Copy, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import walletService from '../../../services/walletService';

// Provider-specific signing instructions with real documentation links
const PROVIDER_INSTRUCTIONS = {
    METAMASK: {
        name: 'MetaMask',
        steps: [
            'Install the MetaMask extension or mobile app.',
            'Click "Connect Wallet" on Xentra.',
            'Select MetaMask and approve the connection request.',
            'Click "Verify Wallet".',
            'MetaMask will automatically open a signature request.',
            'Review the message carefully.',
            'Click "Sign" to complete verification.',
        ],
        link: { text: 'MetaMask Test DApp (Troubleshooting Only)', url: 'https://metamask.github.io/test-dapp/' },
        linkSecondary: { text: 'MetaMask Sign Data Documentation', url: 'https://docs.metamask.io/wallet/how-to/sign-data/' },
        altNote: 'You should never need to manually paste a message. Xentra automatically sends the signing request.',
    },
    TRUST_WALLET: {
        name: 'Trust Wallet',
        steps: [
            'Open Xentra in a browser or connect using WalletConnect.',
            'Click "Connect Wallet".',
            'Select Trust Wallet.',
            'Approve the wallet connection.',
            'Click "Verify Wallet".',
            'Trust Wallet will automatically display the signing request.',
            'Review the message.',
            'Tap "Sign".',
        ],
        link: { text: 'Trust Wallet Browser Extension', url: 'https://trustwallet.com/browser-extension' },
        linkSecondary: { text: 'Trust Wallet Support', url: 'https://support.trustwallet.com/' },
        altNote: 'Trust Wallet does not have a Settings → Sign Message screen. All message signing is initiated by the website.',
    },
    PHANTOM: {
        name: 'Phantom',
        steps: [
            'Install Phantom.',
            'Click "Connect Wallet" on Xentra.',
            'Select Phantom.',
            'Approve the connection.',
            'Click "Verify Wallet".',
            'Phantom will display the signature request.',
            'Review the message.',
            'Click "Sign".',
        ],
        link: { text: 'Phantom Documentation', url: 'https://docs.phantom.com/' },
        linkSecondary: null,
        altNote: 'For EVM wallets, Phantom signs messages directly from the popup. There is no manual Sign Message page.',
    },
    RABBY: {
        name: 'Rabby Wallet',
        steps: [
            'Install Rabby Wallet.',
            'Click "Connect Wallet" on Xentra.',
            'Select Rabby.',
            'Approve the connection.',
            'Click "Verify Wallet".',
            'Rabby will automatically display the signing request.',
            'Review the message.',
            'Click "Sign".',
        ],
        link: { text: 'Rabby Wallet', url: 'https://rabby.io/' },
        linkSecondary: null,
        altNote: 'Rabby follows the standard Ethereum signing flow.',
    },
    COINBASE_WALLET: {
        name: 'Coinbase Wallet',
        steps: [
            'Install Coinbase Wallet.',
            'Click "Connect Wallet" on Xentra.',
            'Select Coinbase Wallet.',
            'Approve the connection request.',
            'Click "Verify Wallet".',
            'Coinbase Wallet will display the signing request.',
            'Review the message.',
            'Tap or click "Sign".',
        ],
        link: { text: 'Coinbase Wallet', url: 'https://www.coinbase.com/wallet' },
        linkSecondary: null,
        altNote: 'Signing a message does not require gas fees.',
    },
    OKX_WALLET: {
        name: 'OKX Wallet',
        steps: [
            'Install OKX Wallet.',
            'Click "Connect Wallet" on Xentra.',
            'Select OKX Wallet.',
            'Approve the connection.',
            'Click "Verify Wallet".',
            'OKX Wallet will display the signing request.',
            'Review the message.',
            'Click "Sign".',
        ],
        link: { text: 'OKX Wallet', url: 'https://www.okx.com/web3' },
        linkSecondary: null,
        altNote: 'OKX Wallet does not include a standalone Sign Message page.',
    },
    BINANCE_WALLET: {
        name: 'Binance Wallet',
        steps: [
            'Install Binance Wallet.',
            'Click "Connect Wallet" on Xentra.',
            'Select Binance Wallet.',
            'Approve the connection.',
            'Click "Verify Wallet".',
            'Binance Wallet will display the signing request.',
            'Review the message.',
            'Click "Sign".',
        ],
        link: { text: 'Binance Wallet', url: 'https://www.binance.com/en/web3wallet' },
        linkSecondary: null,
        altNote: 'Binance Wallet follows the standard EVM signing flow.',
    },
    WALLETCONNECT: {
        name: 'WalletConnect',
        steps: [
            'Click "Connect Wallet".',
            'Choose WalletConnect.',
            'Scan the QR code or open your wallet from the list.',
            'Approve the wallet connection.',
            'Return to Xentra.',
            'Click "Verify Wallet".',
            'Your wallet will display the signing request.',
            'Review the message.',
            'Tap "Sign".',
        ],
        link: { text: 'WalletConnect', url: 'https://walletconnect.network/' },
        linkSecondary: { text: 'Supported Wallets', url: 'https://explorer.walletconnect.com/' },
        altNote: 'WalletConnect is a connection protocol, not a wallet. The signing experience depends on the wallet you choose.',
    },
    OTHER: {
        name: 'Other EVM Wallet',
        steps: [
            'Click "Connect Wallet" on Xentra.',
            'Choose your wallet or connect using WalletConnect.',
            'Approve the connection.',
            'Click "Verify Wallet".',
            'Your wallet will display the signing request.',
            'Review the message.',
            'Click or tap "Sign".',
        ],
        link: { text: 'WalletConnect Supported Wallets', url: 'https://explorer.walletconnect.com/' },
        linkSecondary: null,
        altNote: 'Most Ethereum-compatible wallets follow the same message-signing process.',
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
