import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, AlertTriangle, ExternalLink, Plug } from 'lucide-react';
import walletService from '../../../services/walletService';
import { signMessage, connectWallet, getConnectedAddress, detectProvider, isWalletAvailable, onAccountChange } from '../../../services/web3Wallet';

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
    const [isSigning, setIsSigning] = useState(false);
    const [signError, setSignError] = useState('');
    const [connectedAddress, setConnectedAddress] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [provider, setProvider] = useState('');

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Fetch challenge + check wallet connection when modal opens
    useEffect(() => {
        if (!isOpen || !wallet?.id) return;

        const init = async () => {
            setChallenge('');
            setSignError('');
            setIsSigning(false);
            setConnectedAddress('');
            setIsConnecting(false);

            // Check if wallet is already connected
            const addr = await getConnectedAddress();
            if (addr) {
                setConnectedAddress(addr);
                setProvider(detectProvider());
            }

            // Fetch challenge
            try {
                const res = await walletService.getChallenge(walletType, wallet.id);
                const token = res.data?.verification_token || '';
                setChallenge(token);
            } catch (err) {
                const msg = err?.response?.data?.error || 'Failed to generate challenge';
                addNotification?.(msg, 'error');
                onClose();
            }
        };

        init();
    }, [isOpen, wallet, walletType, addNotification, onClose]);

    // Listen for account changes
    useEffect(() => {
        if (!isOpen) return;
        const unsub = onAccountChange((addr) => {
            if (addr) {
                setConnectedAddress(addr);
                setProvider(detectProvider());
                setSignError('');
            } else {
                setConnectedAddress('');
                setProvider('');
            }
        });
        return unsub;
    }, [isOpen]);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setChallenge('');
            setIsSigning(false);
            setSignError('');
            setConnectedAddress('');
            setIsConnecting(false);
            setProvider('');
        }
    }, [isOpen]);

    // Handle "Connect Wallet" button
    const handleConnect = async () => {
        if (isConnecting) return;
        setIsConnecting(true);
        setSignError('');
        try {
            const { address, provider: prov } = await connectWallet();
            setConnectedAddress(address);
            setProvider(prov);
        } catch (err) {
            setSignError(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    // Handle "Sign & Verify" button — triggers in-app personal_sign
    const handleSignAndVerify = async () => {
        if (!challenge || !connectedAddress || isSigning) return;

        setIsSigning(true);
        setSignError('');

        try {
            // Wrap the challenge with a text prefix so MetaMask treats it as
            // UTF-8 text (not hex bytes). Backend verifies the same wrapping.
            const message = `Xentra verify:${challenge}`;
            const signature = await signMessage(message, connectedAddress);

            // Submit signature to backend
            await walletService.verify(walletType, wallet.id, signature);
            addNotification?.('Wallet verified successfully!', 'success');
            onSuccess?.();
            onClose();
        } catch (err) {
            const msg = err?.message || 'Verification failed. Please try again.';
            setSignError(msg);
            addNotification?.(msg, 'error');
        } finally {
            setIsSigning(false);
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

    const isConnected = !!connectedAddress;
    const addressMatches = connectedAddress &&
        connectedAddress.toLowerCase() === (wallet.address || '').toLowerCase();

    return createPortal(
        <div className="modal-overlay z-9999" onClick={onClose}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
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

                {/* Step 1: Connect Wallet */}
                <div className="form-group">
                    <label className="form-label">
                        <span style={{ color: 'var(--primary)', marginRight: 6 }}>1</span>
                        Connect your wallet
                    </label>
                    {isConnected ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: addressMatches
                                    ? 'rgba(34, 197, 94, 0.08)'
                                    : 'rgba(251, 191, 36, 0.08)',
                                border: addressMatches
                                    ? '1px solid rgba(34, 197, 94, 0.2)'
                                    : '1px solid rgba(251, 191, 36, 0.2)',
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    className="text-xs font-semibold"
                                    style={{ color: addressMatches ? 'var(--success)' : 'var(--warning)', marginBottom: 2 }}
                                >
                                    {addressMatches ? '✓ Connected' : '⚠ Connected (different address)'}
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
                                    {connectedAddress}
                                </div>
                            </div>
                        </div>
                    ) : (
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
                            onClick={handleConnect}
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
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Step 2: Sign & Verify */}
                <div className="form-group">
                    <label className="form-label">
                        <span style={{ color: 'var(--primary)', marginRight: 6 }}>2</span>
                        Sign & Verify
                    </label>
                    <button
                        className="btn btn-primary w-full"
                        style={{
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontSize: 13,
                        }}
                        onClick={handleSignAndVerify}
                        disabled={!isConnected || !addressMatches || isSigning || !challenge}
                    >
                        {isSigning ? (
                            <>
                                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                Waiting for wallet signature...
                            </>
                        ) : (
                            <>
                                <Shield size={16} />
                                Sign & Verify
                            </>
                        )}
                    </button>
                    {!isConnected && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', marginTop: 6, display: 'block' }}>
                            Connect your wallet first to enable signing.
                        </span>
                    )}
                    {isConnected && !addressMatches && (
                        <span className="text-xs" style={{ color: 'var(--warning)', marginTop: 6, display: 'block' }}>
                            ⚠ Connected address does not match the wallet you registered. Switch to the correct account in your wallet.
                        </span>
                    )}
                    {signError && <span className="error-text" style={{ marginTop: 6, display: 'block' }}>{signError}</span>}
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

                {/* Provider-specific instructions (collapsible) */}
                <details style={{ marginBottom: 8 }}>
                    <summary
                        style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            padding: '6px 0',
                            userSelect: 'none',
                        }}
                    >
                        Need help signing with {providerDisplayName}?
                    </summary>
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)',
                            fontSize: 12,
                            lineHeight: 1.7,
                            color: 'rgba(255,255,255,0.45)',
                            marginTop: 6,
                        }}
                    >
                        {instructions.steps.map((text, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, minWidth: 14 }}>
                                    {i + 1}.
                                </span>
                                <span>{text}</span>
                            </div>
                        ))}
                        {instructions.link && (
                            <div style={{ marginTop: 8 }}>
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
                                        fontSize: 11,
                                    }}
                                >
                                    {instructions.link.text}
                                    <ExternalLink size={10} style={{ opacity: 0.7 }} />
                                </a>
                            </div>
                        )}
                        {instructions.linkSecondary && (
                            <div style={{ marginTop: 3 }}>
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
                                        fontSize: 11,
                                        opacity: 0.7,
                                    }}
                                >
                                    {instructions.linkSecondary.text}
                                    <ExternalLink size={10} style={{ opacity: 0.7 }} />
                                </a>
                            </div>
                        )}
                        {instructions.altNote && (
                            <div
                                style={{
                                    marginTop: 6,
                                    padding: '6px 8px',
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
                </details>

                {/* Actions */}
                <div className="flex-row gap-12" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSigning}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VerifyWalletModal;
