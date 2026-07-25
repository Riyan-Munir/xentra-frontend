import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ShieldCheck,
    Clock,
    Lock,
    ChevronDown,
    ArrowRight,
    Sun,
    Moon,
    Menu,
    Wallet,
    AlertCircle,
    LogOut,
    RefreshCw,
    AlertTriangle,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';
import styles from './Payment.module.css';
import callbackService from '../services/callbackService';
import paymentSessionService from '../services/paymentSessionService';
import {
    detectProvider,
    ensureCorrectChain,
    sendPaymentTransaction,
    getBscScanUrl,
} from '../services/web3Wallet';

/* ═══════════════════════════════════════════════════════════════════════════
   Utility: Format address for display
   ═══════════════════════════════════════════════════════════════════════════ */

function formatAddress(addr) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBalance(balance, currency) {
    const val = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
    return `${val.toFixed(2)} ${currency || 'USDT'}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: PaymentTopBar
   ═══════════════════════════════════════════════════════════════════════════ */

const PaymentTopBar = memo(function PaymentTopBar({ theme, onToggleTheme, username, avatarUrl, role }) {
    const roleLabel = role === 'freelancer' ? 'Freelancer' : role === 'client' ? 'Client' : 'Member';
    return (
        <div className={styles.topbar}>
            {/* Logo */}
            <div className={styles.topbarLogo}>
                <div className={styles.topbarLogoIcon}>X</div>
                <span className={styles.topbarLogoText}>Xentra</span>
            </div>

            {/* Theme Toggle */}
            <div className={styles.topbarCenter}>
                <span className={styles.topbarThemeLabel}>Theme</span>
                <button
                    className={styles.themeToggle}
                    onClick={onToggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    <div
                        className={`${styles.themeToggleKnob} ${theme === 'light' ? styles.themeToggleKnobShifted : ''}`}
                    >
                        {theme === 'dark' ? (
                            <Moon className={styles.themeToggleIcon} />
                        ) : (
                            <Sun className={styles.themeToggleIcon} />
                        )}
                    </div>
                </button>
            </div>

            {/* User Profile */}
            <div className={styles.topbarUser}>
                {avatarUrl ? (
                    <img
                        className={styles.topbarAvatar}
                        src={avatarUrl}
                        alt={username || 'User'}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                ) : null}
                <div
                    className={styles.topbarAvatarFallback}
                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                >
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className={styles.topbarUserInfo}>
                    <span className={styles.topbarUsername}>{username || 'User'}</span>
                    <span className={styles.topbarUserRole}>{roleLabel}</span>
                </div>
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: PaymentSummaryCard
   ═══════════════════════════════════════════════════════════════════════════ */

const PaymentSummaryCard = memo(function PaymentSummaryCard({ data }) {
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    const networkFee = typeof data.networkFee === 'number' ? data.networkFee : 0;
    const totalPayable = typeof data.totalPayable === 'number' ? data.totalPayable : amount + networkFee;
    const currency = data.amountCurrency || 'USDT';

    return (
        <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Payment Summary</h2>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Plan</span>
                <span className={styles.summaryValue}>{data.plan || 'Premium'}</span>
            </div>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Duration</span>
                <span className={styles.summaryValue}>{data.duration || 'N/A'}</span>
            </div>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Amount</span>
                <span className={styles.summaryValue}>
                    {amount.toFixed(2)} {currency}
                </span>
            </div>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Network Fee</span>
                <span className={styles.summaryValue}>
                    {networkFee.toFixed(2)} {currency}
                </span>
            </div>

            <div className={styles.summaryDivider} />

            <div className={styles.summaryTotalRow}>
                <span className={styles.summaryTotalLabel}>Total Payable</span>
                <span className={styles.summaryTotalValue}>
                    {totalPayable.toFixed(2)} {currency}
                </span>
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: SecurityBadges
   ═══════════════════════════════════════════════════════════════════════════ */

const SecurityBadges = memo(function SecurityBadges() {
    return (
        <div className={styles.securityBadges}>
            <div className={styles.securityBadge}>
                <ShieldCheck className={styles.securityBadgeIcon} size={20} />
                <div className={styles.securityBadgeContent}>
                    <span className={styles.securityBadgeTitle}>Secure & Encrypted</span>
                    <span className={styles.securityBadgeDesc}>
                        Your payment is protected with bank-level encryption.
                    </span>
                </div>
            </div>

            <div className={styles.securityBadge}>
                <Clock className={styles.securityBadgeIcon} size={20} />
                <div className={styles.securityBadgeContent}>
                    <span className={styles.securityBadgeTitle}>Fast Confirmation</span>
                    <span className={styles.securityBadgeDesc}>
                        Your payment is confirmed instantly on the blockchain.
                    </span>
                </div>
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: WalletDropdown
   ═══════════════════════════════════════════════════════════════════════════ */

function WalletDropdown({ wallets, selectedWallet, onSelect, isOpen, onToggle }) {
    const dropdownRef = useRef(null);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onToggle(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    // No wallets at all
    if (!wallets || wallets.length === 0) {
        return (
            <div className={styles.walletStateMessage}>
                <AlertCircle className={styles.walletStateIcon} size={20} />
                <span className={styles.walletStateText}>
                    Add and verify a wallet to continue
                </span>
            </div>
        );
    }

    // Wallets exist but none are verified
    const verifiedWallets = wallets.filter((w) => w.isVerified);
    if (verifiedWallets.length === 0) {
        return (
            <div className={styles.walletStateMessage}>
                <AlertCircle className={styles.walletStateIcon} size={20} />
                <span className={styles.walletStateText}>
                    Add and verify a wallet to continue
                </span>
            </div>
        );
    }

    // Wallets exist but no default set
    const defaultWallet = verifiedWallets.find((w) => w.isDefault);
    if (!defaultWallet) {
        return (
            <div className={styles.walletStateMessage}>
                <Wallet className={styles.walletStateIcon} size={20} />
                <span className={styles.walletStateText}>
                    Set a default wallet to continue
                </span>
            </div>
        );
    }

    // Show dropdown with default selected
    const displayWallet = selectedWallet || defaultWallet;

    return (
        <div className={styles.walletDropdownWrapper} ref={dropdownRef}>
            <div
                className={styles.walletDropdown}
                onClick={() => onToggle(!isOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(!isOpen); }}
            >
                <div className={styles.walletDropdownLeft}>
                    <ShieldCheck className={styles.walletDropdownIcon} size={20} />
                    <div className={styles.walletDropdownInfo}>
                        <span className={styles.walletDropdownName}>
                            {displayWallet.name} {displayWallet.isDefault ? '(Default)' : ''}
                        </span>
                        <span className={styles.walletDropdownAddress}>
                            {formatAddress(displayWallet.address)}
                        </span>
                    </div>
                </div>
                <div className={styles.walletDropdownRight}>
                    <span className={styles.walletDropdownBalance}>
                        {formatBalance(displayWallet.balance, displayWallet.currency)}
                    </span>
                    <ChevronDown
                        className={`${styles.walletDropdownChevron} ${isOpen ? styles.walletDropdownChevronOpen : ''}`}
                        size={18}
                    />
                </div>
            </div>

            {isOpen && (
                <div className={styles.walletDropdownMenu}>
                    {verifiedWallets.map((wallet) => (
                        <div
                            key={wallet.id}
                            className={`${styles.walletDropdownOption} ${displayWallet.id === wallet.id ? styles.walletDropdownOptionSelected : ''}`}
                            onClick={() => { onSelect(wallet); onToggle(false); }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { onSelect(wallet); onToggle(false); }
                            }}
                        >
                            <ShieldCheck className={styles.walletDropdownIcon} size={18} />
                            <div className={styles.walletDropdownOptionInfo}>
                                <span className={styles.walletDropdownOptionName}>
                                    {wallet.name} {wallet.isDefault ? '(Default)' : ''}
                                </span>
                                <span className={styles.walletDropdownOptionAddress}>
                                    {formatAddress(wallet.address)}
                                </span>
                            </div>
                            <span className={styles.walletDropdownOptionBalance}>
                                {formatBalance(wallet.balance, wallet.currency)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: PaymentDetailsBox
   ═══════════════════════════════════════════════════════════════════════════ */

const PaymentDetailsBox = memo(function PaymentDetailsBox({ amount, currency, network }) {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return (
        <div className={styles.paymentDetailsBox}>
            <div className={styles.paymentDetailsLeft}>
                <div className={styles.paymentDetailsIcon}>
                    <span className={styles.paymentDetailsIconInner}>T</span>
                </div>
                <div className={styles.paymentDetailsAmount}>
                    <span className={styles.paymentDetailsValue}>{val.toFixed(2)}</span>
                    <span className={styles.paymentDetailsCurrency}>{currency || 'USDT'}</span>
                </div>
            </div>
            <div className={styles.paymentDetailsRight}>
                <span className={styles.paymentDetailsNetworkLabel}>Network</span>
                <span className={styles.networkBadge}>{network || 'BSC (BEP20)'}</span>
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: PaymentSkeleton
   ═══════════════════════════════════════════════════════════════════════════ */

const PaymentSkeleton = memo(function PaymentSkeleton() {
    /* Reuse actual UI layout classes so skeleton = exact layout match */
    const sk = (w, h, r = 4) => ({ width: w, height: h, borderRadius: r });

    return (
        <div className={styles.page}>
            {/* ── Topbar: same class as real topbar ──────────────────────── */}
            <div className={styles.topbar}>
                <div className={styles.topbarLogo}>
                    <div className={styles.skeletonCircle} style={sk(32, 32, 8)} />
                    <div className={styles.skeletonBar} style={sk(72, 18, 6)} />
                </div>
                <div className={styles.topbarCenter}>
                    <div className={styles.skeletonBar} style={sk(44, 14, 4)} />
                    <div className={styles.skeletonBar} style={sk(44, 24, 12)} />
                </div>
                <div className={styles.topbarUser}>
                    <div className={styles.skeletonCircle} style={sk(32, 32, 16)} />
                    <div className={styles.topbarUserInfo}>
                        <div className={styles.skeletonBar} style={sk(80, 13, 4)} />
                        <div className={styles.skeletonBar} style={sk(56, 10, 3)} />
                    </div>
                </div>
            </div>

            {/* ── Main Layout: same class as real layout ─────────────────── */}
            <div className={styles.mainLayout}>
                {/* Left Panel — identical structure to real left panel */}
                <div className={styles.summaryPanel}>
                    <div className={styles.summaryCard}>
                        <div className={styles.skeletonBar} style={{ ...sk(130, 18, 6), marginBottom: 24 }} />
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={styles.summaryRow}>
                                <div className={styles.skeletonBar} style={sk(70, 12, 4)} />
                                <div className={styles.skeletonBar} style={sk(64, 12, 4)} />
                            </div>
                        ))}
                        <div className={styles.summaryDivider} />
                        <div className={styles.summaryTotalRow}>
                            <div className={styles.skeletonBar} style={sk(82, 12, 4)} />
                            <div className={styles.skeletonBar} style={sk(96, 20, 6)} />
                        </div>
                    </div>

                    {/* Security Badges — same structure as real badges */}
                    <div className={styles.securityBadges}>
                        <div className={styles.securityBadge}>
                            <div className={styles.skeletonCircle} style={sk(20, 20, 10)} />
                            <div className={styles.securityBadgeContent}>
                                <div className={styles.skeletonBar} style={sk(130, 12, 4)} />
                                <div className={styles.skeletonBar} style={{ ...sk(200, 10, 3), marginTop: 4 }} />
                            </div>
                        </div>
                        <div className={styles.securityBadge}>
                            <div className={styles.skeletonCircle} style={sk(20, 20, 10)} />
                            <div className={styles.securityBadgeContent}>
                                <div className={styles.skeletonBar} style={sk(120, 12, 4)} />
                                <div className={styles.skeletonBar} style={{ ...sk(180, 10, 3), marginTop: 4 }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel — identical structure to real form panel */}
                <div className={styles.formPanel}>
                    <div className={styles.skeletonBar} style={{ ...sk(260, 26, 6), marginBottom: 6 }} />
                    <div className={styles.skeletonBar} style={{ ...sk(300, 13, 4), marginBottom: 28 }} />

                    {/* Step 1 */}
                    <div className={styles.stepHeader}>
                        <div className={styles.skeletonCircle} style={sk(28, 28, 14)} />
                        <div className={styles.skeletonBar} style={sk(108, 17, 4)} />
                    </div>
                    <p className={styles.stepDescription}>
                        <div className={styles.skeletonBar} style={sk(170, 12, 4)} />
                    </p>

                    <div className={styles.walletDropdownWrapper}>
                        <div className={styles.walletDropdown}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={styles.skeletonCircle} style={sk(20, 20, 10)} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <div className={styles.skeletonBar} style={sk(130, 12, 4)} />
                                    <div className={styles.skeletonBar} style={sk(88, 9, 4)} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className={styles.skeletonBar} style={sk(72, 12, 4)} />
                                <div className={styles.skeletonBar} style={sk(16, 16, 8)} />
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={styles.stepHeader}>
                        <div className={styles.skeletonCircle} style={sk(28, 28, 14)} />
                        <div className={styles.skeletonBar} style={sk(128, 17, 4)} />
                    </div>
                    <p className={styles.stepDescription}>
                        <div className={styles.skeletonBar} style={sk(100, 12, 4)} />
                    </p>

                    <div className={styles.paymentDetailsBox}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div className={styles.skeletonCircle} style={sk(36, 36, 18)} />
                            <div className={styles.skeletonBar} style={sk(100, 22, 6)} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div className={styles.skeletonBar} style={sk(44, 10, 4)} />
                            <div className={styles.skeletonBar} style={sk(72, 20, 6)} />
                        </div>
                    </div>

                    <div className={styles.skeletonBar} style={{ ...sk('100%', 48, 12), marginBottom: 16 }} />

                    <div className={styles.footerText}>
                        <div className={styles.skeletonCircle} style={sk(14, 14, 7)} />
                        <div className={styles.skeletonBar} style={sk(260, 10, 4)} />
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: PaymentFlowOverlay
   ── Shows step-by-step progress when the payment flow is active.
   ═══════════════════════════════════════════════════════════════════════════ */

const FLOW_STEPS_ORDER = ['creating-session', 'detecting-wallet', 'connecting-wallet', 'sending-transaction', 'submitting-tx-hash', 'polling'];

const FLOW_STEPS = {
    'creating-session': {
        stepIndex: 1,
        icon: Loader2,
        title: 'Creating Payment Session',
        message: 'Preparing your payment session on the blockchain...',
    },
    'detecting-wallet': {
        stepIndex: 2,
        icon: Loader2,
        title: 'Detecting Wallet',
        message: 'Looking for your browser wallet extension...',
    },
    'connecting-wallet': {
        stepIndex: 3,
        icon: Loader2,
        title: 'Connecting Wallet',
        message: 'Please approve the connection in your wallet extension.',
    },
    'sending-transaction': {
        stepIndex: 4,
        icon: Wallet,
        title: 'Approve Transaction',
        message: 'Please review and approve the USDT transfer in your wallet extension.',
    },
    'submitting-tx-hash': {
        stepIndex: 5,
        icon: Loader2,
        title: 'Verifying Transaction',
        message: 'Your transaction is being recorded on the blockchain.',
    },
    'polling': {
        stepIndex: 6,
        icon: RefreshCw,
        title: 'Waiting for Confirmation',
        message: 'Waiting for the blockchain to confirm your payment...',
    },
};

function PaymentFlowOverlay({ flowState, theme, onToggleTheme, username, avatarUrl, role, txHash, onViewExplorer, elapsedTime, confirmations, requiredConfirmations, remainingSeconds }) {
    const step = FLOW_STEPS[flowState];
    if (!step) return null;

    const isProgress = flowState !== 'success' && flowState !== 'failed' && flowState !== 'expired-session';
    const currentStepIndex = step.stepIndex || 0;

    // Format elapsed time
    const formatElapsed = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Format remaining time
    const formatRemaining = (seconds) => {
        if (seconds == null) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className={`${styles.page} ${theme === 'light' ? styles.light : ''}`}>
            <PaymentTopBar
                theme={theme}
                onToggleTheme={onToggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={role}
            />
            <div className={styles.errorOverlay}>
                <div className={styles.errorCard}>
                    {/* Step progress indicator */}
                    <div className={styles.stepCounter}>
                        Step {currentStepIndex} of {FLOW_STEPS_ORDER.length}
                    </div>

                    <div className={styles.flowProgress}>
                        {FLOW_STEPS_ORDER.map((key, idx) => {
                            const stepNum = idx + 1;
                            let dotClass = styles.flowProgressDot;
                            if (stepNum < currentStepIndex) dotClass += ` ${styles.flowProgressDotDone}`;
                            else if (stepNum === currentStepIndex) dotClass += ` ${styles.flowProgressDotActive}`;
                            return <div key={key} className={dotClass} />;
                        })}
                    </div>

                    <div className={styles.errorIconWrapper}>
                        <step.icon
                            size={40}
                            className={isProgress ? styles.spinnerIcon : ''}
                        />
                    </div>
                    <h2 className={styles.errorTitle}>{step.title}</h2>
                    <p className={styles.errorMessage}>{step.message}</p>

                    {txHash && (
                        <div className={styles.txHashDisplay}>
                            <span className={styles.txHashLabel}>Transaction Hash:</span>
                            <code className={styles.txHashValue}>{formatAddress(txHash)}</code>
                            {onViewExplorer && (
                                <button
                                    className={styles.explorerLink}
                                    onClick={onViewExplorer}
                                    title="View on BscScan"
                                >
                                    <ExternalLink size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Confirmations progress bar during polling */}
                    {flowState === 'polling' && confirmations != null && requiredConfirmations > 0 && (
                        <div className={styles.confirmationsDisplay}>
                            <div className={styles.confirmationsHeader}>
                                <span className={styles.confirmationsLabel}>
                                    Confirmations
                                </span>
                                <span className={styles.confirmationsCount}>
                                    {confirmations}/{requiredConfirmations}
                                </span>
                            </div>
                            <div className={styles.confirmationsBar}>
                                <div
                                    className={styles.confirmationsBarFill}
                                    style={{
                                        width: `${Math.min(100, (confirmations / requiredConfirmations) * 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {flowState === 'polling' && (
                        <div className={styles.pollingDots}>
                            <span className={styles.pollingDot} />
                            <span className={styles.pollingDot} />
                            <span className={styles.pollingDot} />
                        </div>
                    )}

                    {/* Elapsed time */}
                    {isProgress && elapsedTime != null && (
                        <div className={styles.elapsedTime}>
                            Elapsed: {formatElapsed(elapsedTime)}
                            {flowState === 'polling' && remainingSeconds != null && (
                                <> &middot; Session expires in {formatRemaining(remainingSeconds)}</>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page States — error / expired / tampered / reauth / session-expired
   ═══════════════════════════════════════════════════════════════════════════ */

function PaymentErrorOverlay({ theme, onToggleTheme, username, avatarUrl, role, icon: Icon, title, message, actionLabel, onAction, secondaryLabel, onSecondary, hint }) {
    return (
        <div className={`${styles.page} ${theme === 'light' ? styles.light : ''}`}>
            {/* Top Bar with theme toggle */}
            <PaymentTopBar
                theme={theme}
                onToggleTheme={onToggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={role}
            />
            <div className={styles.errorOverlay}>
                <div className={styles.errorCard}>
                    <div className={styles.errorIconWrapper}>
                        <Icon size={40} />
                    </div>
                    <h2 className={styles.errorTitle}>{title}</h2>
                    <p className={styles.errorMessage}>{message}</p>
                    <div className={styles.errorActions}>
                        {onAction && (
                            <button className={styles.proceedBtn} onClick={onAction}>
                                {actionLabel}
                            </button>
                        )}
                        {onSecondary && (
                            <button className={styles.errorSecondaryBtn} onClick={onSecondary}>
                                {secondaryLabel}
                            </button>
                        )}
                    </div>
                    {hint && (
                        <p className={styles.errorHint}>{hint}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component: PaymentPage
   ═══════════════════════════════════════════════════════════════════════════ */

function PaymentPage() {
    const { callback_token } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    /* ── Theme State ──────────────────────────────────────────────────── */
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('payment_theme') || 'dark';
    });

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('payment_theme', next);
            return next;
        });
    }, []);

    /* ── Page State ───────────────────────────────────────────────────── */
    const [pageState, setPageState] = useState('loading');
    // loading | ready | error | expired | tampered | reauth | session-expired | payment-flow | payment-result
    const [paymentData, setPaymentData] = useState(null);
    const [wallets, setWallets] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [requiredRole, setRequiredRole] = useState(null);
    const hasValidated = useRef(false);

    /* ── Payment Flow State ───────────────────────────────────────────── */
    const [paymentFlowState, setPaymentFlowState] = useState(null);
    // null | creating-session | detecting-wallet | connecting-wallet | sending-transaction
    //      | submitting-tx-hash | polling | success | failed | expired-session
    const [sessionId, setSessionId] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [txHash, setTxHash] = useState(null);
    const [paymentFlowError, setPaymentFlowError] = useState('');
    const [flowElapsed, setFlowElapsed] = useState(0);
    const [confirmations, setConfirmations] = useState(0);
    const [requiredConfirmations, setRequiredConfirmations] = useState(0);
    const [remainingSeconds, setRemainingSeconds] = useState(null);
    const pollingRef = useRef(null);
    const elapsedRef = useRef(null);
    const isFlowActive = useRef(false);

    /* ── Auth Error from redirect ─────────────────────────────────────── */
    const authError = searchParams.get('auth_error');
    const reauthNeeded = searchParams.get('reauth');

    /* ── Wallet State ─────────────────────────────────────────────────── */
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleSelectWallet = useCallback((wallet) => {
        setSelectedWallet(wallet);
    }, []);

    const handleToggleDropdown = useCallback((open) => {
        setIsDropdownOpen(open);
    }, []);

    /* ── User Profile from localStorage (overridden by API response) ── */
    const [displayName, setDisplayName] = useState(() => {
        const stored = localStorage.getItem('username');
        if (!stored || stored === 'undefined' || stored === 'null') return 'User';
        return stored;
    });

    /* Keep a stable reference for error overlays (before API response) */
    const username = useMemo(() => displayName, [displayName]);

    const avatarUrl = useMemo(() => {
        const discordId = localStorage.getItem('discord_id');
        const discordAvatar = localStorage.getItem('discord_avatar');
        if (discordId && discordId !== 'undefined'
            && discordAvatar && discordAvatar !== 'undefined') {
            return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`;
        }
        return null;
    }, []);

    const userRole = useMemo(() => {
        const stored = localStorage.getItem('active_role')
            || localStorage.getItem('selected_role')
            || localStorage.getItem('user_role');
        if (!stored || stored === 'undefined' || stored === 'null') return 'freelancer';
        return stored;
    }, []);

    /* ── Payment content type from paymentData ────────────────────────── */
    const paymentContentTypeId = useMemo(() => {
        return paymentData?.paymentContentTypeId || null;
    }, [paymentData]);

    const paymentObjectId = useMemo(() => {
        return paymentData?.paymentObjectId || null;
    }, [paymentData]);

    /* ── Validate Callback Token ──────────────────────────────────────── */
    const validateToken = useCallback(async () => {
        const jwt = localStorage.getItem('access_token');
        if (!jwt) {
            // No JWT — fetch required role for login redirect, then go to login.
            try {
                const infoRes = await callbackService.getPublicInfo(callback_token);
                setRequiredRole(infoRes.data.required_role);
            } catch {
                setRequiredRole('freelancer');
            }
            // Redirect to login page immediately (no error overlay)
            // Use requiredRole state if available (set above), fallback to freelancer
            const role = requiredRole || 'freelancer';
            navigate(`/login?payment_callback_token=${callback_token}&role=${role}`, { replace: true });
            return;
        }

        try {
            const res = await callbackService.validate(callback_token);
            const data = res.data;
            const payment = data.payment || {};

            // Attach content type info to payment data for later session creation
            payment.paymentContentTypeId = data.payment_content_type_id;
            payment.paymentObjectId = data.payment_object_id;

            setPaymentData(payment);
            setWallets(data.wallets || []);
            setSelectedWallet((data.wallets || []).find((w) => w.isDefault) || null);
            /* Use profile display name from API instead of localStorage */
            if (data.profile?.username) {
                setDisplayName(data.profile.username);
            }
            setPageState('ready');
        } catch (err) {
            const status = err.response?.status;
            const code = err.response?.data?.code || err.response?.data?.error_code;
            const msg = err.response?.data?.error || err.response?.data?.detail || 'An error occurred.';

            if (status === 401) {
                // Session expired
                setPageState('session-expired');
                setErrorMessage('Your session has expired. Please log in again.');
            } else if (status === 409) {
                // Wrong profile — need re-auth
                setPageState('reauth');
                setErrorMessage(msg);
                setRequiredRole(err.response?.data?.required_role || null);
            } else if (status === 403 || code === 'tampered') {
                // Wrong user or tampered token
                setPageState('tampered');
                setErrorMessage(msg);
            } else if (code === 'expired') {
                setPageState('expired');
                setErrorMessage(msg);
            } else if (code === 'not_found' || code === 'consumed') {
                setPageState('expired');
                setErrorMessage(msg);
            } else {
                setPageState('error');
                setErrorMessage(msg);
            }
        }
    }, [callback_token]);

    /* ── Initial Validation ───────────────────────────────────────────── */
    useEffect(() => {
        if (hasValidated.current) return;
        hasValidated.current = true;
        validateToken();
    }, [validateToken]);

    /* ── Handle Auth Error Redirect ───────────────────────────────────── */
    useEffect(() => {
        if (authError === '1') {
            setPageState('error');
            setErrorMessage('Authentication failed. Please try logging in again.');
        }
        if (reauthNeeded === '1') {
            setPageState('reauth');
            setErrorMessage('Please log in with the correct profile to continue.');
        }
    }, [authError, reauthNeeded]);

    /* ── 15-Minute Inactivity Timeout ───────────────────────────────── */
    /* If the user is idle on the payment page for 15 minutes we treat
       the login session as expired and ask them to re-authenticate.
       The timer resets on any mouse / keyboard / touch interaction. */
    useEffect(() => {
        if (pageState !== 'ready') return;
        const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
        let timer = null;

        const startTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setPageState('session-expired');
                setErrorMessage(
                    'Your login session has expired due to inactivity. Please log in again to continue with your payment.'
                );
            }, INACTIVITY_TIMEOUT);
        };

        const resetEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
        resetEvents.forEach((evt) => window.addEventListener(evt, startTimer, { passive: true }));
        startTimer();

        return () => {
            clearTimeout(timer);
            resetEvents.forEach((evt) => window.removeEventListener(evt, startTimer));
        };
    }, [pageState]);

    /* ── Periodic Token Re-validation (every 5 min) ──────────────────── */
    /* The backend token lifetime is 30 minutes. We periodically
       re-validate with the backend to keep payment data fresh and
       detect expired / consumed / tampered tokens promptly. */
    useEffect(() => {
        if (pageState !== 'ready') return;
        const REVALIDATE_INTERVAL = 5 * 60 * 1000; // every 5 minutes
        const interval = setInterval(async () => {
            try {
                const res = await callbackService.validate(callback_token);
                const data = res.data;
                /* Refresh payment data in case it changed */
                const payment = data.payment || {};
                payment.paymentContentTypeId = data.payment_content_type_id;
                payment.paymentObjectId = data.payment_object_id;
                setPaymentData(payment);
                /* Keep display name in sync */
                if (data.profile?.username) {
                    setDisplayName(data.profile.username);
                }
            } catch (err) {
                const status = err.response?.status;
                const code = err.response?.data?.code || err.response?.data?.error_code;
                const msg = err.response?.data?.error || err.response?.data?.detail || 'An error occurred.';

                if (status === 401) {
                    setPageState('session-expired');
                    setErrorMessage('Your login session has expired. Please log in again.');
                } else if (status === 409) {
                    setPageState('reauth');
                    setErrorMessage(msg);
                    setRequiredRole(err.response?.data?.required_role || null);
                } else if (status === 403 || code === 'tampered') {
                    setPageState('tampered');
                    setErrorMessage(msg);
                } else if (code === 'expired') {
                    setPageState('expired');
                    setErrorMessage(msg);
                } else if (code === 'not_found' || code === 'consumed') {
                    setPageState('expired');
                    setErrorMessage(msg);
                } else {
                    /* Network error or 5xx — don't kill the page, just skip this cycle */
                }
            }
        }, REVALIDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [pageState, callback_token]);

    /* ── Navigate to Login ────────────────────────────────────────────── */
    const goToLogin = useCallback(() => {
        const role = requiredRole || 'freelancer';
        navigate(`/login?payment_callback_token=${callback_token}&role=${role}`, { replace: true });
    }, [navigate, callback_token, requiredRole]);

    /* ── Retry Validation ─────────────────────────────────────────────── */
    const handleRetry = useCallback(() => {
        setPageState('loading');
        hasValidated.current = false;
        validateToken();
    }, [validateToken]);

    /* ── Cleanup polling on unmount ──────────────────────────────────── */
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            if (elapsedRef.current) {
                clearInterval(elapsedRef.current);
                elapsedRef.current = null;
            }
        };
    }, []);

    /* ── Elapsed Time Timer ───────────────────────────────────────────── */
    useEffect(() => {
        if (paymentFlowState && !['success', 'failed', 'expired-session'].includes(paymentFlowState)) {
            setFlowElapsed(0);
            elapsedRef.current = setInterval(() => {
                setFlowElapsed((prev) => prev + 1);
            }, 1000);
        } else {
            if (elapsedRef.current) {
                clearInterval(elapsedRef.current);
                elapsedRef.current = null;
            }
        }
        return () => {
            if (elapsedRef.current) {
                clearInterval(elapsedRef.current);
                elapsedRef.current = null;
            }
        };
    }, [paymentFlowState]);

    /* ── View Transaction on BscScan ──────────────────────────────────── */
    const handleViewExplorer = useCallback(() => {
        if (txHash) {
            window.open(getBscScanUrl(txHash, true), '_blank', 'noopener');
        }
    }, [txHash]);

    /* ── Handle Proceed (Payment Flow Orchestration) ──────────────────── */
    const handleProceed = useCallback(async () => {
        if (isFlowActive.current) return;
        isFlowActive.current = true;

        try {
            // ── Step 0: Validate we have everything ────────────────────────
            if (!selectedWallet) {
                setPaymentFlowError('Please select a wallet first.');
                setPageState('payment-result');
                isFlowActive.current = false;
                return;
            }

            if (!paymentData) {
                setPaymentFlowError('Payment data not available.');
                setPageState('payment-result');
                isFlowActive.current = false;
                return;
            }

            // ── Step 0b: Pre-check session expiry ──────────────────────────
            // Prevent starting the flow when the payment link is about to expire.
            if (paymentData.remaining_seconds !== undefined && paymentData.remaining_seconds < 60 && paymentData.remaining_seconds > 0) {
                throw new Error(
                    'This payment link is about to expire. Please go back and refresh the page to create a new payment.'
                );
            }

            // Reset confirmations for fresh flow
            setConfirmations(0);
            setRemainingSeconds(null);

            // ── Step 1: Create PaymentSession ─────────────────────────────
            // The backend generates an idempotency_key (prefix PSI_) to prevent
            // double-session on double-click. The response includes it for retry.
            setPaymentFlowState('creating-session');
            setPageState('payment-flow');

            // Determine recipient address from payment data
            const recipientAddress = paymentData.target_wallet;
            if (!recipientAddress) {
                throw new Error('No recipient wallet configured for this payment.');
            }

            const createRes = await paymentSessionService.createSession({
                paymentContentTypeId: paymentData.paymentContentTypeId,
                paymentObjectId: paymentData.paymentObjectId,
                sessionType: 'SUBSCRIPTION',
                recipientAddress,
                amount: paymentData.totalPayable || paymentData.amount,
                walletProvider: selectedWallet.provider || 'METAMASK',
                chainId: 56,
                selectedWalletAddress: selectedWallet?.address || '',     // ← wallet re-verification
            });

            const session = createRes.data;
            setSessionId(session.session_id);
            setSessionData(session);

            // Read required_confirmations from backend so progress bar matches scanner
            if (session.required_confirmations != null) {
                setRequiredConfirmations(session.required_confirmations);
            }

            // ── Step 2: Detect wallet extension by provider ───────────────
            setPaymentFlowState('detecting-wallet');
            const providerKey = selectedWallet.provider || session.wallet_provider || 'METAMASK';
            const detectedProvider = detectProvider();

            if (!detectedProvider) {
                throw new Error(
                    `No wallet extension detected for ${providerKey}. Please install the wallet extension and refresh.`
                );
            }

            // ── Step 3: Ensure correct chain (BSC) ────────────────────────
            setPaymentFlowState('connecting-wallet');
            const chainResult = await ensureCorrectChain();
            if (!chainResult.ok) {
                throw new Error(chainResult.message || 'Please switch your wallet to BSC Mainnet.');
            }

            // ── Step 4: Send USDT transaction via wallet popup ─────────────
            setPaymentFlowState('sending-transaction');
            const txResult = await sendPaymentTransaction({
                recipientAddress,
                amount: session.amount,
                tokenContract: session.token_contract,
                chainId: session.chain_id,
            });

            setTxHash(txResult.txHash);

            // ── Step 5: Submit tx_hash + from_address to backend ───────────
            // from_address helps the scanner skip log parsing to discover
            // the sender — the frontend already knows it.
            setPaymentFlowState('submitting-tx-hash');
            await paymentSessionService.submitTransaction(
                session.session_id,
                txResult.txHash,
                txResult.from,  // connected wallet address from the popup
            );

            // ── Step 6: Start polling for confirmation ──────────────────────
            setPaymentFlowState('polling');

            // Poll every 5 seconds
            let pollCount = 0;
            const MAX_POLLS = 120; // 10 minutes max (120 × 5s)
            pollingRef.current = setInterval(async () => {
                pollCount++;
                try {
                    const statusRes = await paymentSessionService.getStatus(session.session_id);
                    const statusData = statusRes.data;

                    // Track confirmations during polling for the progress bar
                    if (statusData.confirmations != null) {
                        setConfirmations(statusData.confirmations);
                    }
                    if (statusData.remaining_seconds != null) {
                        setRemainingSeconds(statusData.remaining_seconds);
                    }

                    if (statusData.is_terminal) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                        isFlowActive.current = false;

                        if (statusData.status === 'SUCCESS') {
                            setPaymentFlowState('success');
                        } else if (statusData.status === 'FAILED') {
                            setPaymentFlowState('failed');
                            setPaymentFlowError(statusData.error_log || statusData.status_display || 'Payment verification failed.');
                        } else if (statusData.status === 'EXPIRED') {
                            setPaymentFlowState('expired-session');
                            setPaymentFlowError('Payment session expired. Please try again.');
                        } else {
                            setPaymentFlowState('failed');
                            setPaymentFlowError(`Payment ended with status: ${statusData.status_display}`);
                        }
                    } else if (statusData.is_expired) {
                        // Session expired but we haven't been notified by terminal check
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                        isFlowActive.current = false;
                        setPaymentFlowState('expired-session');
                        setPaymentFlowError('Payment session expired. Please try again.');
                    }

                    if (pollCount >= MAX_POLLS) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                        isFlowActive.current = false;
                        setPaymentFlowState('failed');
                        setPaymentFlowError('Confirmation timed out. Your transaction may still be pending on the blockchain.');
                    }
                } catch {
                    // Ignore polling errors, continue
                }
            }, 5000);

        } catch (err) {
            // Cleanup polling if it was started
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            isFlowActive.current = false;

            // Handle wallet rejection (MetaMask code 4001 / user rejected)
            if (err.code === 4001 || err.code === 'ACTION_REJECTED' || (err.message && (
                err.message.includes('User rejected') ||
                err.message.includes('user rejected') ||
                err.message.includes('User denied') ||
                err.message.includes('MetaMask Tx Signature: User denied')
            ))) {
                setPaymentFlowState('failed');
                setPaymentFlowError('Transaction was rejected in your wallet. You can try again when you\'re ready.');
                return;
            }

            // Handle wrong chain rejection
            if (err.message && (
                err.message.includes('chain') ||
                err.message.includes('Wrong network') ||
                err.message.includes('Unrecognized chain')
            )) {
                setPaymentFlowState('failed');
                setPaymentFlowError('Please switch your wallet to BSC Mainnet (Chain ID 56) and try again.');
                return;
            }

            setPaymentFlowState('failed');
            setPaymentFlowError(err.message || 'An unexpected error occurred during payment.');
        }
    }, [selectedWallet, paymentData, paymentContentTypeId, paymentObjectId]);

    /* ── Reset payment flow (go back to form) ─────────────────────────── */
    const handleResetFlow = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (elapsedRef.current) {
            clearInterval(elapsedRef.current);
            elapsedRef.current = null;
        }
        isFlowActive.current = false;
        setPaymentFlowState(null);
        setSessionId(null);
        setSessionData(null);
        setTxHash(null);
        setPaymentFlowError('');
        setConfirmations(0);
        setRemainingSeconds(null);
        setFlowElapsed(0);
        setPageState('ready');
    }, []);

    /* ── Go to Dashboard ──────────────────────────────────────────────── */
    const goToDashboard = useCallback(() => {
        navigate('/dashboard');
    }, [navigate]);

    /* ── Render Loading ───────────────────────────────────────────────── */
    if (pageState === 'loading') {
        return <PaymentSkeleton />;
    }

    /* ── Render Payment Flow Overlay ──────────────────────────────────── */
    if (pageState === 'payment-flow') {
        // Success / failure result screens
        if (paymentFlowState === 'success') {
            const paidAmount = sessionData?.amount || paymentData?.totalPayable || paymentData?.amount;
            return (
                <div className={`${styles.page} ${theme === 'light' ? styles.light : ''}`}>
                    <PaymentTopBar
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        username={username}
                        avatarUrl={avatarUrl}
                        role={userRole}
                    />
                    <div className={styles.errorOverlay}>
                        <div className={styles.errorCard}>
                            <div className={styles.errorIconWrapper}>
                                <CheckCircle2 size={40} color="#22c55e" />
                            </div>
                            <h2 className={styles.errorTitle}>Payment Successful!</h2>
                            <div className={styles.successAmount}>{paidAmount} USDT</div>
                            <div className={styles.successAmountLabel}>Paid on BSC (BEP20)</div>
                            <p className={styles.errorMessage}>
                                Your premium subscription payment has been confirmed on the blockchain.
                                You can now enjoy all premium features.
                            </p>
                            {txHash && (
                                <div className={styles.txHashDisplay}>
                                    <span className={styles.txHashLabel}>Transaction:</span>
                                    <code className={styles.txHashValue}>{formatAddress(txHash)}</code>
                                    <button
                                        className={styles.explorerLink}
                                        onClick={handleViewExplorer}
                                        title="View on BscScan"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            )}
                            {confirmations > 0 && (
                                <div style={{ fontSize: 12, color: 'var(--pp-text-muted)', marginTop: 8 }}>
                                    {confirmations} confirmations
                                </div>
                            )}
                            <div className={styles.errorActions}>
                                <button className={styles.proceedBtn} onClick={goToDashboard}>
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (paymentFlowState === 'failed' || paymentFlowState === 'expired-session') {
            const isExpired = paymentFlowState === 'expired-session';
            let errorTagType = 'network';
            let errorTagLabel = 'Payment Error';
            if (isExpired) {
                errorTagType = 'expired';
                errorTagLabel = 'Session Expired';
            } else if (
                paymentFlowError &&
                (paymentFlowError.toLowerCase().includes('rejected') ||
                    paymentFlowError.toLowerCase().includes('denied'))
            ) {
                errorTagType = 'rejected';
                errorTagLabel = 'Rejected by User';
            } else if (
                paymentFlowError &&
                (paymentFlowError.toLowerCase().includes('chain') ||
                    paymentFlowError.toLowerCase().includes('network') ||
                    paymentFlowError.toLowerCase().includes('bsc'))
            ) {
                errorTagType = 'network';
                errorTagLabel = 'Network Error';
            }
            const errorTagClass = styles[`errorDetailTag${errorTagType.charAt(0).toUpperCase() + errorTagType.slice(1)}`] || styles.errorDetailTag;
            return (
                <div className={`${styles.page} ${theme === 'light' ? styles.light : ''}`}>
                    <PaymentTopBar
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        username={username}
                        avatarUrl={avatarUrl}
                        role={userRole}
                    />
                    <div className={styles.errorOverlay}>
                        <div className={styles.errorCard}>
                            <div className={styles.errorIconWrapper}>
                                <XCircle size={40} color={isExpired ? '#f59e0b' : '#ef4444'} />
                            </div>
                            <div className={styles.errorDetailTag + ' ' + (errorTagClass || '')}>
                                <AlertCircle size={14} />
                                {errorTagLabel}
                            </div>
                            <h2 className={styles.errorTitle}>
                                {isExpired ? 'Payment Session Expired' : 'Payment Failed'}
                            </h2>
                            <p className={styles.errorMessage}>
                                {paymentFlowError || (isExpired
                                    ? 'The payment session expired before confirmation. Please try again.'
                                    : 'Your payment could not be processed. Please try again.')
                                }
                            </p>
                            {txHash && (
                                <div className={styles.txHashDisplay}>
                                    <span className={styles.txHashLabel}>Transaction:</span>
                                    <code className={styles.txHashValue}>{formatAddress(txHash)}</code>
                                    <button
                                        className={styles.explorerLink}
                                        onClick={handleViewExplorer}
                                        title="View on BscScan"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            )}
                            <div className={styles.errorActions}>
                                <button className={styles.proceedBtn} onClick={handleResetFlow}>
                                    Try Again
                                </button>
                                <button className={styles.errorSecondaryBtn} onClick={goToDashboard}>
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // In-progress flow overlay
        return (
            <PaymentFlowOverlay
                flowState={paymentFlowState}
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                txHash={txHash}
                onViewExplorer={handleViewExplorer}
                elapsedTime={flowElapsed}
                confirmations={confirmations}
                requiredConfirmations={requiredConfirmations}
                remainingSeconds={remainingSeconds}
            />
        );
    }

    /* ── Render Session Expired ───────────────────────────────────────── */
    if (pageState === 'session-expired') {
        return (
            <PaymentErrorOverlay
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                icon={Clock}
                title="Login Session Expired"
                message={errorMessage || 'Your login session has expired. Please log in again to continue with your payment.'}
                actionLabel="Log In Again"
                onAction={goToLogin}
                secondaryLabel="Go to Dashboard"
                onSecondary={() => navigate('/dashboard')}
                hint="Your session tokens are stored securely. Logging in again will restore your session."
            />
        );
    }

    /* ── Render Error (no JWT / auth failed) ──────────────────────────── */
    if (pageState === 'error') {
        return (
            <PaymentErrorOverlay
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                icon={AlertCircle}
                title="Authentication Required"
                message={errorMessage || 'You need to be logged in to access this payment page. Your existing session will be used — no separate login is required.'}
                actionLabel="Log In"
                onAction={goToLogin}
                secondaryLabel="Go to Dashboard"
                onSecondary={() => navigate('/dashboard')}
                hint="Use the same account you logged in with on the dashboard."
            />
        );
    }

    /* ── Render Tampered ──────────────────────────────────────────────── */
    if (pageState === 'tampered') {
        return (
            <PaymentErrorOverlay
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                icon={AlertTriangle}
                title="Access Denied"
                message={errorMessage || 'This payment link is tied to a different account. You are logged in with the wrong profile, so access has been denied.'}
                actionLabel="Go to Dashboard"
                onAction={() => navigate('/dashboard')}
                hint="This is not a session issue — the payment link belongs to another account. Log in with the correct account from the dashboard, then use the payment link again."
            />
        );
    }

    /* ── Render Expired ───────────────────────────────────────────────── */
    if (pageState === 'expired') {
        return (
            <PaymentErrorOverlay
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                icon={Clock}
                title="Payment Expired"
                message={errorMessage || 'This payment link has expired. Payment links are valid for 30 minutes. Please create a new payment from your dashboard.'}
                actionLabel="Go to Dashboard"
                onAction={() => navigate('/dashboard')}
                hint="You can create a new payment from the Subscription section in your dashboard."
            />
        );
    }

    /* ── Render Re-auth Needed ────────────────────────────────────────── */
    if (pageState === 'reauth') {
        return (
            <PaymentErrorOverlay
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                icon={LogOut}
                title="Wrong Profile"
                message={errorMessage || 'This payment requires a different profile. Please log in with the correct profile to continue.'}
                actionLabel="Log In with Correct Profile"
                onAction={goToLogin}
                secondaryLabel="Go to Dashboard"
                onSecondary={() => navigate('/dashboard')}
                hint="Each payment is linked to the profile type (freelancer or client) that created it."
            />
        );
    }

    /* ── Render Payment Result (validation error before flow) ────────── */
    if (pageState === 'payment-result') {
        return (
            <PaymentErrorOverlay
                theme={theme}
                onToggleTheme={toggleTheme}
                username={username}
                avatarUrl={avatarUrl}
                role={userRole}
                icon={AlertCircle}
                title="Payment Error"
                message={paymentFlowError || 'An unexpected error occurred.'}
                actionLabel="Try Again"
                onAction={handleResetFlow}
                secondaryLabel="Go to Dashboard"
                onSecondary={goToDashboard}
            />
        );
    }

    /* ── Render Ready (payment page) ──────────────────────────────────── */
    if (pageState === 'ready' && paymentData) {
        const hasWallets = wallets.length > 0;
        const hasVerified = wallets.some((w) => w.isVerified);
        const hasDefault = wallets.some((w) => w.isDefault && w.isVerified);
        const canProceed = hasWallets && hasVerified && hasDefault && selectedWallet;

        return (
            <div className={`${styles.page} ${theme === 'light' ? styles.light : ''}`}>
                {/* Top Bar */}
                <PaymentTopBar
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    username={username}
                    avatarUrl={avatarUrl}
                    role={userRole}
                />

                {/* Main Content */}
                <div className={styles.mainLayout}>
                    {/* Left Panel: Payment Summary */}
                    <div className={styles.summaryPanel}>
                        <PaymentSummaryCard data={paymentData} />
                        <SecurityBadges />
                    </div>

                    {/* Right Panel: Payment Form */}
                    <div className={styles.formPanel}>
                        <h1 className={styles.formTitle}>Complete Your Payment</h1>
                        <p className={styles.formSubtitle}>
                            Review your order and make a secure crypto payment
                        </p>

                        {/* Step 1: Select Wallet */}
                        <div className={styles.stepHeader}>
                            <div className={styles.stepCircle}>1</div>
                            <span className={styles.stepTitle}>Select Wallet</span>
                        </div>
                        <p className={styles.stepDescription}>Choose a wallet to pay with</p>

                        <WalletDropdown
                            wallets={wallets}
                            selectedWallet={selectedWallet}
                            onSelect={handleSelectWallet}
                            isOpen={isDropdownOpen}
                            onToggle={handleToggleDropdown}
                        />

                        {/* Step 2: Payment Details */}
                        <div className={styles.stepHeader}>
                            <div className={styles.stepCircle}>2</div>
                            <span className={styles.stepTitle}>Payment Details</span>
                        </div>
                        <p className={styles.stepDescription}>You are paying</p>

                        <PaymentDetailsBox
                            amount={paymentData.totalPayable || paymentData.amount}
                            currency={paymentData.amountCurrency || 'USDT'}
                            network={paymentData.network || 'BSC (BEP20)'}
                        />

                        {/* Proceed to Pay */}
                        <button
                            className={styles.proceedBtn}
                            onClick={handleProceed}
                            disabled={!canProceed}
                        >
                            Proceed to Pay
                            <span className={styles.proceedBtnArrow}>
                                <ArrowRight size={18} />
                            </span>
                        </button>

                        {/* Footer */}
                        <div className={styles.footerText}>
                            <Lock className={styles.footerLockIcon} size={14} />
                            <span>By proceeding, you agree to our </span>
                            <span className={styles.footerLink}>Terms of Service</span>
                            <span> and </span>
                            <span className={styles.footerLink}>Privacy Policy</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Fallback: should not reach here ──────────────────────────────── */
    return <PaymentSkeleton />;
}

export default memo(PaymentPage);
