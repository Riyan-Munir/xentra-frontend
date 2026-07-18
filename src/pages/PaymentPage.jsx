import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
} from 'lucide-react';
import styles from './Payment.module.css';

/* ═══════════════════════════════════════════════════════════════════════════
   Mock Data — UI-only, no backend logic
   ═══════════════════════════════════════════════════════════════════════════ */

const MOCK_PAYMENT_DATA = {
    plan: 'Pro Plan',
    duration: '1 Month',
    amount: 50.0,
    amountCurrency: 'USDT',
    networkFee: 0.29,
    networkFeeCurrency: 'USDT',
    network: 'BSC (BEP20)',
    totalPayable: 50.29,
};

const MOCK_WALLETS = [
    {
        id: '1',
        name: 'Main Wallet',
        address: '0x3f4a9c2e1b7d8f5a3c6e9b2d4f7a1c8e5b3d6f9a',
        balance: 125.5,
        currency: 'USDT',
        isDefault: true,
        isVerified: true,
    },
    {
        id: '2',
        name: 'Trading Wallet',
        address: '0x7e2b5d8a1c4f9e3b6a2d8c5f1e4b7a3d9c6f2e8b',
        balance: 342.0,
        currency: 'USDT',
        isDefault: false,
        isVerified: true,
    },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Utility: Format address for display
   ═══════════════════════════════════════════════════════════════════════════ */

function formatAddress(addr) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBalance(balance, currency) {
    return `${balance.toFixed(2)} ${currency}`;
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
    return (
        <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Payment Summary</h2>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Plan</span>
                <span className={styles.summaryValue}>{data.plan}</span>
            </div>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Duration</span>
                <span className={styles.summaryValue}>{data.duration}</span>
            </div>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Amount</span>
                <span className={styles.summaryValue}>
                    {data.amount.toFixed(2)} {data.amountCurrency}
                </span>
            </div>

            <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Network Fee</span>
                <span className={styles.summaryValue}>
                    {data.networkFee.toFixed(2)} {data.networkFeeCurrency}
                </span>
            </div>

            <div className={styles.summaryDivider} />

            <div className={styles.summaryTotalRow}>
                <span className={styles.summaryTotalLabel}>Total Payable</span>
                <span className={styles.summaryTotalValue}>
                    {data.totalPayable.toFixed(2)} {data.amountCurrency}
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
    return (
        <div className={styles.paymentDetailsBox}>
            <div className={styles.paymentDetailsLeft}>
                <div className={styles.paymentDetailsIcon}>
                    <span className={styles.paymentDetailsIconInner}>T</span>
                </div>
                <div className={styles.paymentDetailsAmount}>
                    <span className={styles.paymentDetailsValue}>{amount.toFixed(2)}</span>
                    <span className={styles.paymentDetailsCurrency}>{currency}</span>
                </div>
            </div>
            <div className={styles.paymentDetailsRight}>
                <span className={styles.paymentDetailsNetworkLabel}>Network</span>
                <span className={styles.networkBadge}>{network}</span>
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
   Main Component: PaymentPage
   ═══════════════════════════════════════════════════════════════════════════ */

function PaymentPage() {
    const { callback_token } = useParams();

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

    /* ── Loading State (simulated) ────────────────────────────────────── */
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate initial data fetch
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    /* ── Payment Data ─────────────────────────────────────────────────── */
    const paymentData = MOCK_PAYMENT_DATA;

    /* ── Wallet State ─────────────────────────────────────────────────── */
    const [wallets] = useState(MOCK_WALLETS);
    const [selectedWallet, setSelectedWallet] = useState(() => {
        return MOCK_WALLETS.find((w) => w.isDefault) || null;
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleSelectWallet = useCallback((wallet) => {
        setSelectedWallet(wallet);
    }, []);

    const handleToggleDropdown = useCallback((open) => {
        setIsDropdownOpen(open);
    }, []);

    /* ── User Profile from localStorage ───────────────────────────────── */
    const username = useMemo(() => {
        const stored = localStorage.getItem('username');
        if (!stored || stored === 'undefined' || stored === 'null') return 'User';
        return stored;
    }, []);

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

    /* ── Handle Proceed (UI-only placeholder) ─────────────────────────── */
    const handleProceed = useCallback(() => {
        // UI-only — no backend logic
    }, []);

    /* ── Render Skeleton ──────────────────────────────────────────────── */
    if (isLoading) {
        return <PaymentSkeleton />;
    }

    /* ── Determine wallet state for step 2 button disabled ────────────── */
    const hasWallets = wallets.length > 0;
    const hasVerified = wallets.some((w) => w.isVerified);
    const hasDefault = wallets.some((w) => w.isDefault && w.isVerified);
    const canProceed = hasWallets && hasVerified && hasDefault;

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
                        amount={paymentData.totalPayable}
                        currency={paymentData.amountCurrency}
                        network={paymentData.network}
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

export default memo(PaymentPage);
