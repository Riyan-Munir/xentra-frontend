import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Crown, Gift, Zap, Shield, MessageCircle, Wallet, Check, X, Search, User, Loader, AlertCircle, CheckCircle, ArrowLeft, ExternalLink, CreditCard } from 'lucide-react';
import { premiumService } from '../../../services/premiumService';

/* ═══════════════════════════════════════════════════════════════
   FEATURES CONFIG — shown in comparison chart below plan cards
   ═══════════════════════════════════════════════════════════════ */
const ALL_FEATURES = [
  { id: 'job_limit', label: 'Job Postings / Applications', free: '3 / month', premium: 'Unlimited' },
  { id: 'portfolio', label: 'Portfolio Items', free: '5 max', premium: 'Unlimited' },
  { id: 'priority', label: 'Priority Support', free: false, premium: true },
  { id: 'chatrooms', label: 'Chat Rooms', free: false, premium: true },
  { id: 'badge', label: 'Premium Badge on Profile', free: false, premium: true },
  { id: 'analytics', label: 'Advanced Analytics', free: false, premium: true },
  { id: 'visibility', label: 'Profile Visibility Boost', free: false, premium: true },
  { id: 'escrow', label: 'Escrow-Free Transactions', free: false, premium: true },
];

/* ═══════════════════════════════════════════════════════════════
   GIFT MODAL — search user, display profiles, choose plan
   ═══════════════════════════════════════════════════════════════ */
const GiftModal = ({ isOpen, onClose, currentRole, onStartGiftFlow }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clean up on close
  const handleClose = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    onClose();
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await premiumService.searchUser(query);
        setResults(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setResults(null);
          setError('User not found. Make sure they have registered on Xentra.');
        } else {
          setError(err.response?.data?.error || 'Search failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectGiftee = useCallback((userData, billingInterval) => {
    onStartGiftFlow({
      system_id: userData.system_id,
      discord_username: userData.discord_username,
      avatar_url: userData.avatar_url,
      role: userData.active_role,
      billing_interval: billingInterval,
    });
    handleClose();
  }, [onStartGiftFlow, handleClose]);

  if (!isOpen) return null;

  // Determine which profile info to show based on currentRole
  const renderProfileInfo = (userData) => {
    const profiles = [];
    if (userData.client_profile) {
      profiles.push({ role: 'Client', username: userData.client_profile.display_name || userData.discord_username });
    }
    if (userData.freelancer_profile) {
      profiles.push({ role: 'Freelancer', username: userData.freelancer_profile.display_name || userData.discord_username });
    }
    return profiles;
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content card glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        {/* Header */}
        <div className="flex-between mb-16">
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Gift Premium</h3>
          <button className="btn btn-secondary" onClick={handleClose} style={{ padding: '6px 12px', fontSize: 13 }}>
            Close
          </button>
        </div>

        {/* Search */}
        <div className="form-group">
          <label className="form-label">Discord Username</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              type="text"
              placeholder="e.g. username#1234"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: 36 }}
              autoFocus
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-row items-center gap-8" style={{ padding: '16px 0', color: 'var(--text-dim)' }}>
            <Loader size={16} className="spin-icon" />
            Searching...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex-row items-center gap-8" style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
            <AlertCircle size={16} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--error)' }}>{error}</span>
          </div>
        )}

        {/* Results */}
        {results && !loading && !error && (
          <div className="flex-col gap-12">
            <div className="flex-row items-center gap-12" style={{ padding: '12px 16px', background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {results.avatar_url ? (
                  <img src={results.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="flex-col" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{results.discord_username}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {renderProfileInfo(results).map(p => p.role).join(' • ') || 'No active role'}
                </span>
              </div>
            </div>

            {/* Profile details & action buttons */}
            {renderProfileInfo(results).length > 0 ? (
              <div className="flex-col gap-8">
                <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Choose a plan to gift:</p>
                <div className="flex-row gap-8">
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 13, padding: '10px 12px' }}
                    onClick={() => handleSelectGiftee(results, 'monthly')}
                  >
                    <Zap size={14} />
                    Gift Monthly
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 13, padding: '10px 12px', background: 'linear-gradient(135deg, #ffd700, #ffae00)', color: '#000' }}
                    onClick={() => handleSelectGiftee(results, 'yearly')}
                  >
                    <Crown size={14} />
                    Gift Yearly
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                This user has not set up their profile yet. They need to register first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAYMENT STEP — shown after plan selection (subscribe or gift)
   ═══════════════════════════════════════════════════════════════ */
const PaymentStep = ({ plan, onBack, addNotification, gifteeInfo }) => {
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState('send'); // send → verifying → success | error
  const [paymentId, setPaymentId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [targetWallet, setTargetWallet] = useState('');

  const planPrice = useMemo(() => {
    if (!plan) return '0.00';
    // Use discounted price if a valid discount is active
    const hasDiscount = plan.discounted_price != null &&
      (!plan.discount_expires_at || new Date(plan.discount_expires_at) > new Date());
    const effectivePrice = hasDiscount ? plan.discounted_price : plan.price;
    return parseFloat(effectivePrice).toFixed(2);
  }, [plan]);

  const handleTxSubmit = useCallback(async () => {
    if (!txHash || txHash.length < 10) {
      setErrorMsg('Please enter a valid transaction hash');
      return;
    }
    setStep('verifying');
    setErrorMsg(null);
    try {
      const result = await premiumService.verifyPayment(paymentId, txHash);
      setPaymentData(result);
      setStep('success');
      addNotification('Premium activated successfully!', 'success');
    } catch (err) {
      setStep('send');
      setErrorMsg(err.response?.data?.error || 'Verification failed. Please check your transaction and try again.');
      addNotification('Payment verification failed', 'error');
    }
  }, [txHash, paymentId, addNotification]);

  const handleCreatePayment = useCallback(async () => {
    try {
      const payload = {
        plan_id: plan?.id,
        payment_type: gifteeInfo ? 'gift' : 'subscription',
      };
      if (gifteeInfo) {
        payload.giftee_system_id = gifteeInfo.system_id;
      }
      const result = await premiumService.createPayment(payload);
      setPaymentId(result.id);
      setTargetWallet(result.target_wallet || '');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create payment');
    }
  }, [plan, gifteeInfo]);

  useEffect(() => {
    handleCreatePayment();
  }, []);

  const recipientLabel = gifteeInfo ? `Gifting to ${gifteeInfo.discord_username}` : 'Self Purchase';
  const planLabel = plan?.billing_interval === 'yearly' ? 'Yearly' : 'Monthly';

  return (
    <div className="fade-in flex-col gap-20" style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Back button */}
      <button className="btn btn-secondary" onClick={onBack} style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: 13 }}>
        <ArrowLeft size={16} />
        Back to Plans
      </button>

      {/* Payment Card */}
      <div className="card glass" style={{ minHeight: 'auto', maxHeight: 'none' }}>
        <div className="flex-col gap-16">
          <div className="flex-between">
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Complete Payment</h3>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            }}>
              {recipientLabel}
            </span>
          </div>

          {/* Plan Summary */}
          <div className="flex-row items-center gap-12" style={{
            padding: '12px 16px', background: 'var(--glass)', borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <Crown size={24} style={{ color: '#ffd700' }} />
            <div className="flex-col" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{plan?.tier?.charAt(0).toUpperCase() + plan?.tier?.slice(1)} Premium — {planLabel}</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {plan?.duration_days} days •{' '}
                {plan?.discounted_price != null && (!plan?.discount_expires_at || new Date(plan.discount_expires_at) > new Date()) ? (
                  <>
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', marginRight: 4 }}>${parseFloat(plan.price).toFixed(2)} USDT</span>
                    ${planPrice} USDT
                  </>
                ) : '$' + planPrice + ' USDT'}
                {plan?.discount_percent > 0 && (
                  <span style={{ color: '#10b981', marginLeft: 8 }}>Save {plan.discount_percent}%</span>
                )}
              </span>
            </div>
          </div>

          {gifteeInfo && (
            <div className="flex-row items-center gap-8" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              <Gift size={14} />
              Gift for <strong style={{ color: 'var(--text)' }}>{gifteeInfo.discord_username}</strong>
            </div>
          )}

          {/* Step 1: Send USDT */}
          {step === 'send' && (
            <>
              <div style={{
                padding: '16px', background: 'rgba(16,185,129,0.08)', borderRadius: 12,
                border: '1px solid rgba(16,185,129,0.2)'
              }}>
                <div className="flex-row items-center gap-8 mb-12">
                  <Wallet size={16} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Send USDT (BEP-20)</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
                  Send exactly <strong style={{ color: 'var(--text)' }}>${planPrice} USDT</strong> to the address below on
                  BNB Smart Chain (BEP-20):
                </p>
                <div className="flex-row items-center gap-8" style={{
                  padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all'
                }}>
                  <span style={{ flex: 1 }}>{targetWallet || 'Loading...'}</span>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { navigator.clipboard.writeText(targetWallet); addNotification('Address copied!', 'info'); }}>
                    Copy
                  </button>
                </div>
              </div>

              {/* Tx Hash Input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Transaction Hash</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="0x..."
                  value={txHash}
                  onChange={e => { setTxHash(e.target.value); setErrorMsg(null); }}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              {errorMsg && (
                <div className="flex-row items-center gap-8" style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={14} style={{ color: 'var(--error)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--error)' }}>{errorMsg}</span>
                </div>
              )}

              <button className="btn btn-primary" onClick={handleTxSubmit} disabled={!txHash}
                style={{ width: '100%', padding: '14px 20px', fontSize: 15, opacity: !txHash ? 0.5 : 1 }}>
                <CheckCircle size={18} />
                Verify Payment
              </button>
            </>
          )}

          {/* Step 2: Verifying */}
          {step === 'verifying' && (
            <div className="flex-col flex-center gap-16" style={{ padding: '40px 0' }}>
              <Loader size={40} className="spin-icon" style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: 15, color: 'var(--text-dim)' }}>Verifying your transaction on-chain...</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>This may take up to 30 seconds</span>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="flex-col flex-center gap-12" style={{ padding: '32px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={36} style={{ color: '#10b981' }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>Payment Verified!</span>
              <span style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 320 }}>
                {gifteeInfo
                  ? `Premium has been gifted to ${gifteeInfo.discord_username}! They'll receive a notification.`
                  : 'Your premium subscription is now active. Enjoy all premium features!'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                TX: {txHash.slice(0, 10)}...{txHash.slice(-6)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUBSCRIPTION PAGE — Main component
   ═══════════════════════════════════════════════════════════════ */
const SubscriptionPage = ({ profile, currentRole, addNotification }) => {
  // ── State ───────────────────────────────────────────────────
  const [plans, setPlans] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('plans'); // plans → payment
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [gifteeInfo, setGifteeInfo] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const isPremium = profile?.premium_tier === 'premium';

  // ── Derived: separate free/pro plans ────────────────────────
  const proPlans = useMemo(() => {
    return plans.filter(p => p.tier !== 'free');
  }, [plans]);

  // ── Fetch plans & active sub on mount ───────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [plansData, subData] = await Promise.all([
          premiumService.getPlans(),
          premiumService.getActiveSubscription(),
        ]);
        if (cancelled) return;
        setPlans(Array.isArray(plansData) ? plansData : plansData?.plans || []);
        setActiveSub(subData || null);
      } catch (err) {
        if (!cancelled) addNotification('Failed to load subscription plans', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Subscribe handler ───────────────────────────────────────
  const handleSubscribe = useCallback((plan) => {
    setSelectedPlan(plan);
    setGifteeInfo(null);
    setStep('payment');
  }, []);

  // ── Gift flow handler (called from GiftModal) ───────────────
  const handleStartGiftFlow = useCallback((giftData) => {
    // Find the plan matching the giftee's role and chosen interval
    const matchingPlan = proPlans.find(p =>
      p.tier === giftData.role &&
      p.billing_interval === giftData.billing_interval
    );
    if (!matchingPlan) {
      addNotification(`No ${giftData.billing_interval} plan found for ${giftData.role} role`, 'error');
      return;
    }
    setSelectedPlan(matchingPlan);
    setGifteeInfo(giftData);
    setStep('payment');
  }, [proPlans, addNotification]);

  // ── Back to plans step ──────────────────────────────────────
  const handleBack = useCallback(() => {
    setStep('plans');
    setSelectedPlan(null);
    setGifteeInfo(null);
  }, []);

  // ── Card helpers ────────────────────────────────────────────
  const isPlanCurrent = (plan) => {
    if (!isPremium || !activeSub) return false;
    return plan?.billing_interval === activeSub?.billing_interval && plan?.tier === currentRole;
  };

  const getPlanIcon = (plan) => {
    if (plan?.tier === 'free') return <Zap size={28} />;
    if (plan?.billing_interval === 'yearly') return <Crown size={28} />;
    return <Crown size={28} />;
  };

  const getPlanColor = (plan) => {
    if (plan?.tier === 'free') return 'var(--text-dim)';
    if (plan?.billing_interval === 'yearly') return '#ffd700';
    return 'var(--primary)';
  };

  const getPlanBenefits = (plan) => {
    if (plan?.tier === 'free') {
      return [
        '3 job postings / applications per month',
        '5 portfolio items max',
        'Basic support',
        'Standard profile visibility',
      ];
    }
    return [
      plan?.billing_interval === 'yearly' ? 'Save 17% with annual billing' : 'Cancel anytime',
      'Unlimited job postings / applications',
      'Unlimited portfolio items',
      'Priority support',
      'Chat rooms access',
      'Premium badge on profile',
      'Profile visibility boost',
    ];
  };

  // ── Render loading state ────────────────────────────────────
  if (loading) {
    return <SubscriptionPageSkeleton />;
  }

  // ── Render payment step ─────────────────────────────────────
  if (step === 'payment' && selectedPlan) {
    return (
      <PaymentStep
        plan={selectedPlan}
        onBack={handleBack}
        addNotification={addNotification}
        gifteeInfo={gifteeInfo}
      />
    );
  }

  // ── Determine card layout order ─────────────────────────────
  // Free card first, then monthly, then yearly
  const freePlan = plans.find(p => p.tier === 'free') || { tier: 'free', billing_interval: null, price: '0.00' };

  return (
    <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex-between items-center flex-shrink-0">
        <div className="flex-col gap-4">
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Subscription</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {isPremium
              ? `You're on the Premium plan. Enjoy all the benefits!`
              : 'Choose a plan that fits your needs'}
          </p>
        </div>
        {!isPremium && (
          <button
            className="btn btn-secondary"
            onClick={() => setGiftModalOpen(true)}
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            <Gift size={16} />
            Gift Premium
          </button>
        )}
      </div>

      {/* ── Plan Cards ────────────────────────────────────────── */}
      <div className="subscription-card-grid">
        {/* Free Tier Card */}
        <div
          className={`subscription-plan-card ${isPremium && activeSub?.tier === 'free' ? 'current-plan' : ''}`}
          onMouseEnter={() => setHoveredCard('free')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          {isPremium && activeSub?.tier === 'free' && <span className="current-plan-tag">Current</span>}
          <div className="subscription-plan-card-inner">
            <div className="subscription-plan-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Zap size={28} style={{ color: 'var(--text-dim)' }} />
            </div>
            <h3 className="subscription-plan-name">Free</h3>
            <div className="subscription-plan-price">
              <span className="subscription-plan-amount">$0</span>
            </div>
            <p className="subscription-plan-desc">Get started with basic features</p>

            <ul className="subscription-plan-benefits">
              {getPlanBenefits(freePlan).map((ben, i) => (
                <li key={i} className="subscription-plan-benefit">
                  <Check size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <span>{ben}</span>
                </li>
              ))}
            </ul>

            {isPremium && activeSub?.tier === 'free' ? (
              <div className="subscription-plan-btn current-label">Current Plan</div>
            ) : (
              <div className="subscription-plan-btn disabled-label">Free Tier</div>
            )}
          </div>
        </div>

        {/* Pro Monthly Card */}
        {proPlans.filter(p => p.billing_interval === 'monthly').map(plan => (
          <div
            key={plan.id}
            className={`subscription-plan-card ${isPremium && isPlanCurrent(plan) ? 'current-plan' : ''} ${!isPremium && hoveredCard === plan.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredCard(plan.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={isPremium && isPlanCurrent(plan) ? undefined : () => handleSubscribe(plan)}
            style={{ cursor: isPremium && isPlanCurrent(plan) ? 'default' : 'pointer' }}
          >
            {isPremium && isPlanCurrent(plan) && <span className="current-plan-tag">Current</span>}
            <div className="subscription-plan-card-inner">
              <div className="subscription-plan-icon" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' }}>
                <Crown size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 className="subscription-plan-name">Pro <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>Monthly</span></h3>
              <div className="subscription-plan-price">
                <span className="subscription-plan-amount">
                  {plan.discounted_price != null && (!plan.discount_expires_at || new Date(plan.discount_expires_at) > new Date()) ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: 14, marginRight: 6 }}>${parseFloat(plan.price).toFixed(2)}</span>
                      ${parseFloat(plan.discounted_price).toFixed(2)}
                    </>
                  ) : `$${parseFloat(plan.price).toFixed(2)}`}
                </span>
                <span className="subscription-plan-period">/month</span>
              </div>
              {plan.discounted_price != null && plan.discount_percent > 0 && (!plan.discount_expires_at || new Date(plan.discount_expires_at) > new Date()) && (
                <div className="subscription-plan-save-badge">Save {plan.discount_percent}%</div>
              )}
              <p className="subscription-plan-desc">Unlock premium features</p>

              <ul className="subscription-plan-benefits">
                {getPlanBenefits(plan).map((ben, i) => (
                  <li key={i} className="subscription-plan-benefit">
                    <Check size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <span>{ben}</span>
                  </li>
                ))}
              </ul>

              {isPremium && isPlanCurrent(plan) ? (
                <div className="subscription-plan-btn current-label">Current Plan</div>
              ) : (
                <button className="subscription-plan-btn subscribe-btn" onClick={(e) => { e.stopPropagation(); handleSubscribe(plan); }}>
                  Subscribe
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Pro Yearly Card (centered below if only 2 cards in top row) */}
        {proPlans.filter(p => p.billing_interval === 'yearly').map(plan => (
          <div
            key={plan.id}
            className={`subscription-plan-card premium-highlight ${isPremium && isPlanCurrent(plan) ? 'current-plan' : ''} ${!isPremium && hoveredCard === plan.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredCard(plan.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={isPremium && isPlanCurrent(plan) ? undefined : () => handleSubscribe(plan)}
            style={{ cursor: isPremium && isPlanCurrent(plan) ? 'default' : 'pointer' }}
          >
            {isPremium && isPlanCurrent(plan) && <span className="current-plan-tag">Current</span>}
            <div className="subscription-plan-card-inner">
              <div className="subscription-plan-icon" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,174,0,0.2))' }}>
                <Crown size={28} style={{ color: '#ffd700' }} />
              </div>
              <h3 className="subscription-plan-name">Pro <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>Yearly</span></h3>
              <div className="subscription-plan-price">
                <span className="subscription-plan-amount">
                  {plan.discounted_price != null && (!plan.discount_expires_at || new Date(plan.discount_expires_at) > new Date()) ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: 14, marginRight: 6 }}>${parseFloat(plan.price).toFixed(2)}</span>
                      ${parseFloat(plan.discounted_price).toFixed(2)}
                    </>
                  ) : `$${parseFloat(plan.price).toFixed(2)}`}
                </span>
                <span className="subscription-plan-period">/year</span>
              </div>
              {plan.discounted_price != null && plan.discount_percent > 0 && (!plan.discount_expires_at || new Date(plan.discount_expires_at) > new Date()) && (
                <div className="subscription-plan-save-badge">Save {plan.discount_percent}%</div>
              )}
              <p className="subscription-plan-desc">Best value for power users</p>

              <ul className="subscription-plan-benefits">
                {getPlanBenefits(plan).map((ben, i) => (
                  <li key={i} className="subscription-plan-benefit">
                    <Check size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <span>{ben}</span>
                  </li>
                ))}
              </ul>

              {isPremium && isPlanCurrent(plan) ? (
                <div className="subscription-plan-btn current-label">Current Plan</div>
              ) : (
                <button className="subscription-plan-btn subscribe-btn premium-subscribe" onClick={(e) => { e.stopPropagation(); handleSubscribe(plan); }}>
                  Subscribe
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Feature Comparison Table ──────────────────────────── */}
      <div className="card" style={{ minHeight: 'auto', maxHeight: 'none', overflow: 'visible', marginTop: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Feature Comparison</h3>
        <div className="subscription-comparison-wrapper">
          <table className="subscription-comparison-table">
            <thead>
              <tr>
                <th className="comparison-feature-header">Feature</th>
                <th className={`comparison-tier-header ${!isPremium ? 'comparison-tier-current' : ''}`}>Free</th>
                <th className={`comparison-tier-header ${isPremium ? 'comparison-tier-current' : ''}`}>Premium</th>
              </tr>
            </thead>
            <tbody>
              {ALL_FEATURES.map((feat) => (
                <tr key={feat.id}>
                  <td className="comparison-feature-cell">{feat.label}</td>
                  <td className="comparison-value-cell">
                    {feat.free === true ? <Check size={16} style={{ color: 'var(--success)' }} />
                      : feat.free === false ? <X size={16} style={{ color: 'var(--error)' }} />
                        : <span style={{ fontSize: 13 }}>{feat.free}</span>}
                  </td>
                  <td className="comparison-value-cell comparison-premium-cell">
                    {feat.premium === true ? <Check size={16} style={{ color: 'var(--success)' }} />
                      : feat.premium === false ? <X size={16} style={{ color: 'var(--error)' }} />
                        : <span style={{ fontSize: 13 }}>{feat.premium}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Gift Modal ────────────────────────────────────────── */}
      <GiftModal
        isOpen={giftModalOpen}
        onClose={() => setGiftModalOpen(false)}
        currentRole={currentRole}
        onStartGiftFlow={handleStartGiftFlow}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SKELETON LOADING STATE
   ═══════════════════════════════════════════════════════════════ */
const SubscriptionPageSkeleton = () => (
  <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar">
    {/* Header skeleton */}
    <div className="flex-between items-center flex-shrink-0">
      <div className="flex-col gap-4">
        <div className="skeleton-line skel-w-140 skel-h-28 skel-r-4" />
        <div className="skeleton-line skel-w-200 skel-h-14 skel-r-4" />
      </div>
      <div className="skeleton-line skel-w-120 skel-h-36 skel-r-8" />
    </div>

    {/* Plan cards skeleton */}
    <div className="subscription-card-grid">
      {[1, 2, 3].map(i => (
        <div key={i} className="subscription-plan-card" style={{ pointerEvents: 'none' }}>
          <div className="subscription-plan-card-inner">
            <div className="skeleton-line" style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 16 }} />
            <div className="skeleton-line skel-w-80 skel-h-20 skel-r-4" style={{ marginBottom: 8 }} />
            <div className="skeleton-line skel-w-120 skel-h-32 skel-r-4" style={{ marginBottom: 8 }} />
            <div className="skeleton-line skel-w-160 skel-h-12 skel-r-4" style={{ marginBottom: 20 }} />
            <div className="flex-col gap-8" style={{ marginBottom: 20 }}>
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="skeleton-line skel-w-90pct skel-h-12 skel-r-4" />
              ))}
            </div>
            <div className="skeleton-line skel-w-100pct skel-h-40 skel-r-8" />
          </div>
        </div>
      ))}
    </div>

    {/* Comparison table skeleton */}
    <div className="card" style={{ minHeight: 200, maxHeight: 'none' }}>
      <div className="skeleton-line skel-w-160 skel-h-18 skel-r-4" style={{ marginBottom: 16 }} />
      <div className="flex-col gap-12">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-row items-center gap-16">
            <div className="skeleton-line skel-w-35pct skel-h-16 skel-r-4" />
            <div className="skeleton-line skel-w-20pct skel-h-16 skel-r-4" />
            <div className="skeleton-line skel-w-20pct skel-h-16 skel-r-4" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default SubscriptionPage;
