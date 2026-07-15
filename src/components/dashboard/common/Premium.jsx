import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    Crown,
    Gift,
    Check,
    X as XIcon,
    Sparkles,
    ArrowRight,
    Calendar,
    Zap,
    Shield,
    Star,
    Briefcase,
    FolderOpen,
    Tag,
    Code2,
    MessageCircle,
    UserCheck,
    Eye,
    Lock,
    Search,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    Loader2,
    ExternalLink,
    ChevronDown,
    Trash2,
    DollarSign,
    Repeat,
} from 'lucide-react';
import premiumService from '../../../services/premiumService';

/* ── Benefit definitions per role (for comparison chart) ─────────── */
const FREELANCER_BENEFITS = [
    { label: 'Applications / week', free: '3', pro: '6', icon: Briefcase },
    { label: 'Portfolio items', free: '3', pro: '6', icon: FolderOpen },
    { label: 'Skill tags / portfolio', free: '6', pro: '12', icon: Tag },
    { label: 'Technologies / project', free: '6', pro: '12', icon: Code2 },
    { label: 'Chat rooms access', free: false, pro: true, icon: MessageCircle },
    { label: 'Custom premium display ID', free: false, pro: true, icon: UserCheck },
    { label: 'Enhanced job visibility', free: false, pro: true, icon: Eye },
    { label: 'Priority in search results', free: false, pro: true, icon: Star },
];

const CLIENT_BENEFITS = [
    { label: 'Job postings / week', free: '3', pro: '6', icon: Briefcase },
    { label: 'Featured job listings', free: false, pro: true, icon: Star },
    { label: 'Confidential listings', free: false, pro: true, icon: Lock },
    { label: 'Strict eligibility control', free: false, pro: true, icon: Shield },
    { label: 'Chat rooms access', free: false, pro: true, icon: MessageCircle },
    { label: 'Custom premium display ID', free: false, pro: true, icon: UserCheck },
];

/* ── Card benefit lists — Free tier (top 4, for free card) ───────── */
const FREELANCER_FREE_CARD_BENEFITS = [
    '3 applications / week',
    '3 portfolio items',
    '6 skill tags',
    'Basic search visibility',
];

const CLIENT_FREE_CARD_BENEFITS = [
    '3 job postings / week',
    'Standard listings',
    'Basic eligibility control',
    'Standard search visibility',
];

/* ── Card benefit lists — Pro tier (top 4, for pro card) ─────────── */
const FREELANCER_PRO_CARD_BENEFITS = [
    '6 applications / week',
    'Chat rooms access',
    'Enhanced job visibility',
    'Custom premium ID',
];

const CLIENT_PRO_CARD_BENEFITS = [
    '6 job postings / week',
    'Featured listings',
    'Chat rooms access',
    'Custom premium ID',
];

/* ── Tier string mapping for plan filtering ──────────────────────── */
const TIER_MAP = {
    freelancer: 'freelancer_premium',
    client: 'client_premium',
};

/* ── Helper: format price ────────────────────────────────────────── */
const formatPrice = (price) => {
    if (price === null || price === undefined) return '—';
    return `$${Number(price).toFixed(2)}`;
};

/* ── Helper: days until date ─────────────────────────────────────── */
const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/* ── Benefit Value Cell ──────────────────────────────────────────── */
const BenefitCell = ({ value }) => {
    if (value === true) {
        return <Check size={16} className="success-text flex-shrink-0" />;
    }
    if (value === false) {
        return <XIcon size={16} className="error-text flex-shrink-0" />;
    }
    return <span className="text-sm text-white">{value}</span>;
};

/* ── Pricing Card ────────────────────────────────────────────────── */
const PricingCard = memo(({ plan, isCurrent, isFreelancer, onSelect, extending, onViewAllBenefits, hasTimeLeft }) => {
    const isFree = !plan || plan.tier === 'free';
    const effectivePrice = plan?.effective_price ?? plan?.price ?? 0;
    const hasDiscount = !isFree && plan?.discount_percent > 0 && plan?.discounted_price;
    const cardBenefits = isFree
        ? (isFreelancer ? FREELANCER_FREE_CARD_BENEFITS : CLIENT_FREE_CARD_BENEFITS)
        : (isFreelancer ? FREELANCER_PRO_CARD_BENEFITS : CLIENT_PRO_CARD_BENEFITS);

    return (
        <div className={`premium-card ${isFree ? 'premium-card-free' : 'glass'} ${isCurrent ? 'premium-card-active' : ''}`}>
            {/* Current tag */}
            {isCurrent && (
                <div className="premium-current-tag">
                    <span>Current</span>
                </div>
            )}

            {/* Card header */}
            <div className="premium-card-header">
                {isFree ? (
                    <div className="premium-card-icon free">
                        <Zap size={24} />
                    </div>
                ) : (
                    <div className="premium-card-icon pro">
                        <Crown size={24} />
                    </div>
                )}
                <h3 className="premium-card-tier">
                    {isFree ? 'Free' : 'Pro'}
                </h3>
                {!isFree && plan?.billing_interval && (
                    <span className="premium-card-interval">
                        {plan.billing_interval === 'yearly' ? 'Yearly' : 'Monthly'}
                    </span>
                )}
            </div>

            {/* Price */}
            <div className="premium-card-price-block">
                {isFree ? (
                    <span className="premium-card-price">$0</span>
                ) : hasDiscount ? (
                    <div className="premium-card-price-discounted">
                        <div className="premium-card-price-row">
                            <span className="premium-card-price-original">{formatPrice(plan.price)}</span>
                            <span className="premium-discount-badge">-{plan.discount_percent}%</span>
                        </div>
                        <div className="premium-card-price-row">
                            <span className="premium-card-price">{formatPrice(effectivePrice)}</span>
                            <span className="premium-card-price-period">
                                /{plan.billing_interval === 'yearly' ? 'year' : 'month'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="premium-card-price-row">
                        <span className="premium-card-price">{formatPrice(effectivePrice)}</span>
                        <span className="premium-card-price-period">
                            /{plan?.billing_interval === 'yearly' ? 'year' : 'month'}
                        </span>
                    </div>
                )}
            </div>

            {/* Benefits */}
            <ul className="premium-card-benefits">
                {cardBenefits.map((b, i) => (
                    <li key={i} className="premium-card-benefit-item">
                        <Check size={14} className="success-text flex-shrink-0" />
                        <span className="text-sm">{b}</span>
                    </li>
                ))}
            </ul>

            {/* View All Benefits link */}
            {onViewAllBenefits && (
                <button className="premium-card-view-all" onClick={onViewAllBenefits}>
                    <span>View All Benefits</span>
                    <ChevronDown size={14} />
                </button>
            )}

            {/* Action */}
            <div className="premium-card-action">
                {isFree ? (
                    <div className="premium-card-current-label">
                        <CheckCircle size={16} className="primary-text" />
                        <span className="text-sm primary-text">Free Forever</span>
                    </div>
                ) : isCurrent || hasTimeLeft ? (
                    <button
                        className="btn btn-secondary premium-btn-extend"
                        onClick={() => onSelect(plan, true)}
                        disabled={extending}
                    >
                        <Calendar size={16} />
                        Extend
                    </button>
                ) : (
                    <button
                        className="btn btn-primary premium-btn-subscribe"
                        onClick={() => onSelect(plan, false)}
                        disabled={extending}
                    >
                        <Crown size={16} />
                        {extending ? 'Switching…' : 'Subscribe'}
                        <ArrowRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
});
PricingCard.displayName = 'PricingCard';

/* ── Pending Payment Banner ──────────────────────────────────────── */
const PendingPaymentBanner = memo(({ payment, onCancel, onPay, cancelling }) => {
    if (!payment) return null;

    const isGift = payment.payment_type === 'gift';
    const createdAt = payment.created_at
        ? new Date(payment.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        })
        : '';

    return (
        <div className="glass flex-row items-center gap-12 p-12 bg-warning-5 border-warning-light premium-pending-banner">
            <AlertCircle size={16} className="warning-text flex-shrink-0" />
            <div className="flex-col gap-2 flex-1 min-w-0">
                <p className="text-sm text-white font-medium">
                    {isGift ? 'Gift payment initiated' : 'Payment initiated'} —{' '}
                    <span className="text-dim">{payment.payment_id}</span>
                </p>
                <p className="text-xs text-dim">
                    {formatPrice(payment.amount)} USDT{createdAt ? ` · ${createdAt}` : ''}
                    {isGift && payment.payment_id && ' · Gift'}
                </p>
            </div>
            <div className="flex-row items-center gap-8 flex-shrink-0">
                <button
                    className="btn btn-secondary text-xs"
                    onClick={() => onPay(payment)}
                    disabled={cancelling}
                    title="Pay now (dummy — no payment page yet)"
                >
                    <DollarSign size={14} />
                    Pay
                </button>
                <button
                    className="btn btn-secondary text-xs"
                    onClick={() => onCancel(payment)}
                    disabled={cancelling}
                >
                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Cancel
                </button>
            </div>
        </div>
    );
});
PendingPaymentBanner.displayName = 'PendingPaymentBanner';

/* ── Main Premium Component ──────────────────────────────────────── */
const Premium = ({ profile, currentRole, addNotification }) => {
    const [plans, setPlans] = useState([]);
    const [activeSub, setActiveSub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [extending, setExtending] = useState(false);
    const chartRef = useRef(null);

    /* ── Pending payment state (Fix 3) ───────────────────────────── */
    const [pendingPayment, setPendingPayment] = useState(null);
    const [pendingGiftPayment, setPendingGiftPayment] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);

    /* ── Interval switch state (Switch Button feature) ───────────── */
    const [preferredInterval, setPreferredInterval] = useState(null);

    const isFreelancer = currentRole === 'freelancer';
    const benefits = isFreelancer ? FREELANCER_BENEFITS : CLIENT_BENEFITS;

    /* Fetch plans + active subscription */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [plansRes, activeRes, paymentsRes] = await Promise.all([
                premiumService.getPlans(),
                premiumService.getActive(),
                premiumService.getPayments({ page_size: 50 }),
            ]);
            setPlans(plansRes.data?.plans || []);
            setActiveSub(activeRes.data || {});

            /* Find pending payments for this role profile */
            const allPayments = paymentsRes.data?.results || [];
            const pending = allPayments.find(
                (p) => p.status === 'pending' && p.payment_type === 'subscription'
            );
            const pendingGift = allPayments.find(
                (p) => p.status === 'pending' && p.payment_type === 'gift'
            );
            setPendingPayment(pending || null);
            setPendingGiftPayment(pendingGift || null);
        } catch (err) {
            addNotification?.('Failed to load subscription plans.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* Determine which plan the user is on */
    const isPremium = activeSub?.has_active_premium || false;
    const activeInterval = activeSub?.billing_interval || null;

    /* Split plans into free + pro — filter by tier matching current role */
    const freePlan = { tier: 'free', price: 0 };
    const activeTier = isFreelancer ? TIER_MAP.freelancer : TIER_MAP.client;
    const monthlyPlan = plans.find(
        (p) => p.billing_interval === 'monthly' && p.tier === activeTier && p.is_active
    );
    const yearlyPlan = plans.find(
        (p) => p.billing_interval === 'yearly' && p.tier === activeTier && p.is_active
    );

    /* Check if current plan matches — uses preferredInterval override when user has both plans */
    const displayInterval = preferredInterval ?? activeInterval;
    const isMonthlyCurrent = isPremium && displayInterval === 'monthly';
    const isYearlyCurrent = isPremium && displayInterval === 'yearly';
    const isFreeCurrent = !isPremium;

    /* Show switch button only when user has time on both monthly AND yearly intervals */
    const availableIntervals = activeSub?.available_intervals || [];
    const hasBothIntervals = availableIntervals.includes('monthly') && availableIntervals.includes('yearly');

    /* Per-card hasTimeLeft: show "Extend" even on non-current card if user has activated time for that interval */
    const monthlyHasTime = availableIntervals.includes('monthly');
    const yearlyHasTime = availableIntervals.includes('yearly');

    /* Toggle between monthly/yearly display — stays within pro plans only */
    const handleToggleInterval = useCallback(() => {
        setPreferredInterval((prev) => {
            if (prev === 'monthly') return 'yearly';
            if (prev === 'yearly') return 'monthly';
            // First toggle: switch away from the backend's activeInterval
            return activeInterval === 'monthly' ? 'yearly' : 'monthly';
        });
    }, [activeInterval]);

    /* Handle subscribe / extend */
    const handleSelectPlan = useCallback(async (plan, isExtend) => {
        if (!plan?.id) {
            addNotification?.('Plan not available.', 'error');
            return;
        }
        setExtending(true);
        try {
            const res = await premiumService.createPayment({
                plan_id: plan.id,
                payment_type: 'subscription',
            });
            addNotification?.(
                isExtend
                    ? 'Subscription extension created. Complete payment to activate.'
                    : 'Payment initiated. Complete payment to activate premium.',
                'success'
            );
            /* Refresh to show pending payment */
            fetchData();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to create payment.';
            addNotification?.(msg, 'error');
        } finally {
            setExtending(false);
        }
    }, [addNotification, fetchData]);

    /* ── Cancel pending payment (Fix 3) ───────────────────────────── */
    const handleCancelPayment = useCallback(async (payment) => {
        if (!payment?.payment_id) return;
        setCancellingId(payment.payment_id);
        try {
            await premiumService.cancelPayment(payment.payment_id);
            addNotification?.('Payment cancelled.', 'success');
            fetchData();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to cancel payment.';
            addNotification?.(msg, 'error');
        } finally {
            setCancellingId(null);
        }
    }, [addNotification, fetchData]);

    /* ── Pay pending payment (dummy for now) (Fix 3) ──────────────── */
    const handlePayPayment = useCallback(async (payment) => {
        addNotification?.('Payment page coming soon. (Dummy action)', 'info');
    }, [addNotification]);

    /* Expiry info */
    const expiryDate = activeSub?.expires_at;
    const daysLeft = daysUntil(expiryDate);

    /* Scroll to benefits chart */
    const scrollToChart = useCallback(() => {
        chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    return (
        <div className="premium-section fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar">
            {/* Header */}
            <div className="premium-header flex-between flex-shrink-0">
                <div className="flex-col gap-4">
                    <h2 className="text-2xl font-bold">Subscription</h2>
                    {isPremium && expiryDate && (
                        <p className="text-xs text-dim">
                            {daysLeft !== null
                                ? daysLeft > 0
                                    ? `Active — expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                                    : 'Expires today'
                                : 'Active premium'}
                        </p>
                    )}
                </div>
                <div className="flex-row items-center gap-8 flex-shrink-0">
                    {/* Switch button — only when user has both monthly + yearly time */}
                    {isPremium && hasBothIntervals && (
                        <button
                            className="btn btn-secondary premium-switch-btn"
                            onClick={handleToggleInterval}
                            title={`Switch to ${displayInterval === 'monthly' ? 'Yearly' : 'Monthly'} plan`}
                        >
                            <Repeat size={14} />
                            <span className="text-xs">
                                {displayInterval === 'monthly' ? 'Switch to Yearly' : 'Switch to Monthly'}
                            </span>
                        </button>
                    )}
                    <button
                        className="btn btn-secondary premium-gift-btn"
                        onClick={() => setShowGiftModal(true)}
                    >
                        <Gift size={16} />
                        <span className="text-sm">Gift Pro</span>
                    </button>
                </div>
            </div>

            {/* Active subscription banner */}
            {isPremium && expiryDate && (
                <div className="glass flex-row items-center gap-12 p-12 bg-primary-5 border-primary-light premium-active-banner">
                    <Sparkles size={16} className="primary-text flex-shrink-0" />
                    <div className="flex-col gap-2 flex-1">
                        <p className="text-sm text-white font-medium">
                            You have an active Pro {displayInterval === 'yearly' ? 'Yearly' : 'Monthly'} subscription
                            {preferredInterval && ` (${activeInterval} plan paused)`}
                        </p>
                        <p className="text-xs text-dim">
                            Expires: {new Date(expiryDate).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric',
                            })}
                            {daysLeft !== null && daysLeft > 0 && ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining)`}
                        </p>
                    </div>
                </div>
            )}

            {/* Pending payment banners (Fix 3) — show regardless of premium status */}
            {pendingPayment && (
                <PendingPaymentBanner
                    payment={pendingPayment}
                    onCancel={handleCancelPayment}
                    onPay={handlePayPayment}
                    cancelling={cancellingId === pendingPayment.payment_id}
                />
            )}
            {pendingGiftPayment && (
                <PendingPaymentBanner
                    payment={pendingGiftPayment}
                    onCancel={handleCancelPayment}
                    onPay={handlePayPayment}
                    cancelling={cancellingId === pendingGiftPayment.payment_id}
                />
            )}

            {/* Pricing Cards */}
            {loading ? (
                <div className="premium-cards-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="premium-skeleton-card">
                            <div className="skeleton-line skel-w-40-icon skel-h-40 skel-r-12 mb-8" />
                            <div className="skeleton-line skel-w-35pct skel-h-16 mb-6" />
                            <div className="skeleton-line skel-w-40pct skel-h-24 mb-10" />
                            <div className="skeleton-text-block mb-8 gap-6">
                                <div className="skeleton-line skel-w-65pct skel-h-12" />
                                <div className="skeleton-line skel-w-70pct skel-h-12" />
                                <div className="skeleton-line skel-w-75pct skel-h-12" />
                                <div className="skeleton-line skel-w-80pct skel-h-12" />
                            </div>
                            <div className="skeleton-line skel-w-50pct skel-h-12 mb-8" />
                            <div className="skeleton-line skel-w-full skel-h-36 skel-r-8" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="premium-cards-grid">
                    <PricingCard
                        plan={freePlan}
                        isCurrent={isFreeCurrent}
                        isFreelancer={isFreelancer}
                        onSelect={handleSelectPlan}
                        extending={extending}
                        onViewAllBenefits={scrollToChart}
                        hasTimeLeft={false}
                    />
                    <PricingCard
                        plan={monthlyPlan}
                        isCurrent={isMonthlyCurrent}
                        isFreelancer={isFreelancer}
                        onSelect={handleSelectPlan}
                        extending={extending}
                        onViewAllBenefits={scrollToChart}
                        hasTimeLeft={monthlyHasTime}
                    />
                    <PricingCard
                        plan={yearlyPlan}
                        isCurrent={isYearlyCurrent}
                        isFreelancer={isFreelancer}
                        onSelect={handleSelectPlan}
                        extending={extending}
                        onViewAllBenefits={scrollToChart}
                        hasTimeLeft={yearlyHasTime}
                    />
                </div>
            )}

            {/* Benefits Comparison Chart */}
            {!loading && (
                <div id="premium-benefits-chart" ref={chartRef} className="premium-chart-container glass">
                    <div className="premium-chart-header">
                        <h3 className="text-0\875rem text-white font-semibold">
                            Benefits Comparison
                        </h3>
                    </div>
                    <div className="premium-chart-table">
                        {/* Header row */}
                        <div className="premium-chart-row premium-chart-row-header">
                            <div className="premium-chart-cell premium-chart-cell-benefit">Benefit</div>
                            <div className="premium-chart-cell premium-chart-cell-tier">Free</div>
                            <div className="premium-chart-cell premium-chart-cell-tier premium-chart-cell-pro">
                                <Crown size={12} className="primary-text" />
                                Pro
                            </div>
                        </div>
                        {/* Benefit rows */}
                        {benefits.map((b, i) => {
                            const Icon = b.icon;
                            return (
                                <div
                                    key={i}
                                    className={`premium-chart-row ${i % 2 === 0 ? 'premium-chart-row-even' : ''}`}
                                >
                                    <div className="premium-chart-cell premium-chart-cell-benefit">
                                        <Icon size={14} className="text-dim flex-shrink-0" />
                                        <span className="text-sm">{b.label}</span>
                                    </div>
                                    <div className="premium-chart-cell premium-chart-cell-tier">
                                        <BenefitCell value={b.free} />
                                    </div>
                                    <div className="premium-chart-cell premium-chart-cell-tier premium-chart-cell-pro">
                                        <BenefitCell value={b.pro} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Gift Modal */}
            {showGiftModal && (
                <PremiumGiftModal
                    isOpen={showGiftModal}
                    onClose={() => {
                        setShowGiftModal(false);
                        fetchData(); /* Refresh to pick up gift pending payment */
                    }}
                    plans={plans}
                    addNotification={addNotification}
                    isFreelancer={isFreelancer}
                />
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════
   Gift Modal
   ══════════════════════════════════════════════════════════════════ */
const PremiumGiftModal = memo(({ isOpen, onClose, plans, addNotification, isFreelancer }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [creating, setCreating] = useState(false);
    const [step, setStep] = useState('search'); // search | profiles | pricing | success

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('body-no-scroll');
        } else {
            document.body.classList.remove('body-no-scroll');
        }
        return () => document.body.classList.remove('body-no-scroll');
    }, [isOpen]);

    const handleSearch = useCallback(async () => {
        const q = searchQuery.trim();
        if (q.length < 2) {
            setSearchError('Username must be at least 2 characters.');
            return;
        }
        setSearching(true);
        setSearchError('');
        setSearchResults([]);
        setSelectedUser(null);
        setSelectedProfile(null);
        setStep('search');
        try {
            const res = await premiumService.searchGiftUser(q);
            const results = res.data?.results || [];
            if (results.length === 0) {
                setSearchError('No users found with that username.');
            } else {
                setSearchResults(results);
            }
        } catch (err) {
            setSearchError(err?.response?.data?.error || 'Search failed. Try again.');
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    const handleSelectUser = useCallback((user, profile) => {
        setSelectedUser(user);
        setSelectedProfile(profile);
        setStep('pricing');
    }, []);

    const handleSelectPlan = useCallback(async (plan) => {
        if (!selectedUser || !selectedProfile) return;
        setSelectedPlan(plan);
        setCreating(true);
        try {
            await premiumService.createPayment({
                plan_id: plan.id,
                payment_type: 'gift',
                giftee_system_id: selectedUser.discord_id,
            });
            setStep('success');
            addNotification?.(`Gift subscription created for ${selectedUser.discord_username}. Complete payment to send.`, 'success');
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to create gift.';
            addNotification?.(msg, 'error');
        } finally {
            setCreating(false);
        }
    }, [selectedUser, selectedProfile, addNotification]);

    const handleBackToSearch = useCallback(() => {
        setStep('search');
        setSelectedUser(null);
        setSelectedProfile(null);
        setSelectedPlan(null);
    }, []);

    const handleReset = useCallback(() => {
        setStep('search');
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        setSelectedProfile(null);
        setSelectedPlan(null);
        setSearchError('');
    }, []);

    if (!isOpen) return null;

    /* Filter gift plans by the selected profile's role tier */
    const giftTier = selectedProfile?.role === 'freelancer' ? TIER_MAP.freelancer
        : selectedProfile?.role === 'client' ? TIER_MAP.client
            : null;
    const monthlyPlan = giftTier
        ? plans.find((p) => p.billing_interval === 'monthly' && p.tier === giftTier && p.is_active)
        : plans.find((p) => p.billing_interval === 'monthly' && p.is_active);
    const yearlyPlan = giftTier
        ? plans.find((p) => p.billing_interval === 'yearly' && p.tier === giftTier && p.is_active)
        : plans.find((p) => p.billing_interval === 'yearly' && p.is_active);

    const giftMonthlyEffective = monthlyPlan?.effective_price ?? monthlyPlan?.price ?? 0;
    const giftYearlyEffective = yearlyPlan?.effective_price ?? yearlyPlan?.price ?? 0;

    return (
        <div className="modal-overlay z-9999" onClick={onClose}>
            <div
                className="modal-content glass fade-in premium-gift-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-between items-center mb-16">
                    <div className="flex-row items-center gap-8">
                        <Gift size={18} className="primary-text" />
                        <h3 className="text-base text-white font-semibold">Gift Premium</h3>
                    </div>
                    <button className="btn btn-secondary p-6" onClick={onClose}>
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Step: Search */}
                {step === 'search' && (
                    <div className="premium-gift-step">
                        <p className="text-sm text-dim mb-12">
                            Search for a Discord username to gift premium to.
                        </p>
                        <div className="premium-gift-search-row">
                            <div className="premium-gift-search-input-wrapper glass flex-1 flex-row items-center gap-8">
                                <Search size={16} className="text-dim flex-shrink-0" />
                                <input
                                    type="text"
                                    className="premium-gift-search-input"
                                    placeholder="Enter Discord username..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    disabled={searching}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleSearch}
                                disabled={searching || searchQuery.trim().length < 2}
                            >
                                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            </button>
                        </div>

                        {/* Search error */}
                        {searchError && (
                            <div className="glass flex-row items-center gap-8 p-12 mt-12 bg-error-5 border-error-light">
                                <AlertCircle size={16} className="error-text flex-shrink-0" />
                                <p className="text-sm error-text">{searchError}</p>
                            </div>
                        )}

                        {/* Search results */}
                        {searchResults.length > 0 && (
                            <div className="premium-gift-results mt-12">
                                {searchResults.map((user) => (
                                    <div key={user.discord_id} className="premium-gift-user-card glass">
                                        <div className="flex-row items-center gap-12 mb-12">
                                            {user.discord_avatar ? (
                                                <img
                                                    src={user.discord_avatar}
                                                    alt={user.discord_username}
                                                    className="premium-gift-avatar"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="premium-gift-avatar premium-gift-avatar-placeholder"
                                                style={{ display: user.discord_avatar ? 'none' : 'flex' }}
                                            >
                                                <span>{user.discord_username?.charAt(0)?.toUpperCase()}</span>
                                            </div>
                                            <div className="flex-col gap-2">
                                                <span className="text-sm text-white font-medium">
                                                    {user.discord_username}
                                                </span>
                                                <span className="text-xs text-dim">
                                                    {user.profiles.length} profile{user.profiles.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        {user.profiles.map((prof) => (
                                            <button
                                                key={prof.role}
                                                className="premium-gift-profile-btn glass flex-between items-center"
                                                onClick={() => handleSelectUser(user, prof)}
                                            >
                                                <div className="flex-row items-center gap-8">
                                                    <div className={`premium-gift-role-badge ${prof.role}`}>
                                                        {prof.role === 'freelancer' ? 'FL' : 'CL'}
                                                    </div>
                                                    <div className="flex-col gap-2">
                                                        <span className="text-sm text-white">{prof.username}</span>
                                                        <span className="text-xs text-dim">{prof.display_id}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-row items-center gap-6">
                                                    {prof.is_premium && (
                                                        <span className="premium-gift-already-pro text-xs primary-text">Pro Active</span>
                                                    )}
                                                    <ChevronRight size={16} className="text-dim" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Pricing */}
                {step === 'pricing' && selectedUser && selectedProfile && (
                    <div className="premium-gift-step">
                        <div className="glass flex-row items-center gap-12 p-12 mb-16 bg-primary-5 border-primary-light">
                            <div className="flex-col gap-2 flex-1">
                                <p className="text-sm text-white font-medium">
                                    Gifting to: {selectedUser.discord_username}
                                </p>
                                <p className="text-xs text-dim">
                                    {selectedProfile.role === 'freelancer' ? 'Freelancer' : 'Client'} — {selectedProfile.display_id}
                                </p>
                            </div>
                            <button className="btn btn-secondary text-xs" onClick={handleBackToSearch}>Change</button>
                        </div>

                        <p className="text-sm text-dim mb-12">Select a subscription plan to gift:</p>

                        <div className="premium-gift-plans">
                            {monthlyPlan && (
                                <div
                                    className={`premium-gift-plan-card glass ${selectedPlan?.id === monthlyPlan.id ? 'premium-gift-plan-active' : ''}`}
                                    onClick={() => handleSelectPlan(monthlyPlan)}
                                >
                                    <div className="premium-gift-plan-header">
                                        <Crown size={18} className="primary-text" />
                                        <span className="text-sm text-white font-medium">Pro Monthly</span>
                                    </div>
                                    {monthlyPlan.discount_percent > 0 && monthlyPlan.discounted_price ? (
                                        <div className="premium-gift-plan-price">
                                            <div className="premium-card-price-row">
                                                <span className="text-sm text-dim premium-price-strikethrough">
                                                    {formatPrice(monthlyPlan.price)}
                                                </span>
                                                <span className="premium-discount-badge text-xs">-{monthlyPlan.discount_percent}%</span>
                                            </div>
                                            <span className="text-lg text-white font-bold">
                                                {formatPrice(giftMonthlyEffective)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-lg text-white font-bold">
                                            {formatPrice(giftMonthlyEffective)}
                                        </span>
                                    )}
                                    <span className="text-xs text-dim">/month</span>
                                    {/* Spinner in top-right corner (Fix 5) */}
                                    {creating && selectedPlan?.id === monthlyPlan.id && (
                                        <div className="premium-gift-plan-spinner-corner">
                                            <Loader2 size={16} className="primary-text animate-spin" />
                                        </div>
                                    )}
                                </div>
                            )}
                            {yearlyPlan && (
                                <div
                                    className={`premium-gift-plan-card glass ${selectedPlan?.id === yearlyPlan.id ? 'premium-gift-plan-active' : ''}`}
                                    onClick={() => handleSelectPlan(yearlyPlan)}
                                >
                                    <div className="premium-gift-plan-header">
                                        <Crown size={18} className="primary-text" />
                                        <span className="text-sm text-white font-medium">Pro Yearly</span>
                                    </div>
                                    {yearlyPlan.discount_percent > 0 && yearlyPlan.discounted_price ? (
                                        <div className="premium-gift-plan-price">
                                            <div className="premium-card-price-row">
                                                <span className="text-sm text-dim premium-price-strikethrough">
                                                    {formatPrice(yearlyPlan.price)}
                                                </span>
                                                <span className="premium-discount-badge text-xs">-{yearlyPlan.discount_percent}%</span>
                                            </div>
                                            <span className="text-lg text-white font-bold">
                                                {formatPrice(giftYearlyEffective)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-lg text-white font-bold">
                                            {formatPrice(giftYearlyEffective)}
                                        </span>
                                    )}
                                    <span className="text-xs text-dim">/year</span>
                                    {/* Spinner in top-right corner (Fix 5) */}
                                    {creating && selectedPlan?.id === yearlyPlan.id && (
                                        <div className="premium-gift-plan-spinner-corner">
                                            <Loader2 size={16} className="primary-text animate-spin" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <div className="premium-gift-step text-center">
                        <div className="premium-gift-success-icon">
                            <CheckCircle size={48} className="success-text" />
                        </div>
                        <h4 className="text-base text-white mb-8 font-semibold">Gift Created!</h4>
                        <p className="text-sm text-dim mb-16">
                            Complete the payment to send the gift to{' '}
                            <strong className="text-white">{selectedUser?.discord_username}</strong>.
                        </p>
                        <button className="btn btn-primary" onClick={onClose}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});
PremiumGiftModal.displayName = 'PremiumGiftModal';

export default memo(Premium);
