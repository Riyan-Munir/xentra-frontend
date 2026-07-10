import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Wallet, CreditCard } from 'lucide-react';
import walletService from '../../../services/walletService';
import WalletCard from './WalletCard';
import AddWalletModal from './AddWalletModal';
import VerifyWalletModal from './VerifyWalletModal';
import ConfirmationModal from './ConfirmationModal';

const Wallets = ({ currentRole, addNotification }) => {
    const [wallets, setWallets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [verifyModal, setVerifyModal] = useState({ open: false, wallet: null });
    const [removeModal, setRemoveModal] = useState({ open: false, wallet: null });

    // Derive walletType from currentRole — maps to backend model
    const walletType = useMemo(
        () => (currentRole === 'client' ? 'client' : 'freelancer'),
        [currentRole]
    );

    // Fetch wallets
    const fetchWallets = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await walletService.list(walletType);
            setWallets(res.data || []);
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to fetch wallets';
            addNotification?.(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [walletType, addNotification]);

    // Fetch on mount and when walletType changes
    useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    // Filter out disabled wallets (show only active ones)
    const activeWallets = useMemo(
        () => wallets.filter((w) => w.status !== 'disabled'),
        [wallets]
    );

    // Find default wallet
    const defaultWallet = useMemo(
        () => activeWallets.find((w) => w.is_default),
        [activeWallets]
    );

    // Check if user has any verified wallet (for Settings card)
    const hasVerifiedWallet = useMemo(
        () => activeWallets.some((w) => w.is_verified),
        [activeWallets]
    );

    // Handlers
    const handleAddSuccess = () => {
        fetchWallets();
    };

    const handleVerifyClick = (wallet) => {
        setVerifyModal({ open: true, wallet });
    };

    const handleSetDefault = async (wallet) => {
        try {
            await walletService.setDefault(walletType, wallet.id);
            addNotification?.('Default wallet updated', 'success');
            await fetchWallets();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to set default wallet';
            addNotification?.(msg, 'error');
        }
    };

    const handleRemoveClick = (wallet) => {
        setRemoveModal({ open: true, wallet });
    };

    const handleConfirmRemove = async () => {
        const wallet = removeModal.wallet;
        if (!wallet) return;

        try {
            await walletService.remove(walletType, wallet.id);
            addNotification?.('Wallet removed successfully', 'success');
            await fetchWallets();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to remove wallet';
            addNotification?.(msg, 'error');
        }
    };

    const handleVerifySuccess = () => {
        fetchWallets();
    };

    return (
        <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar skeleton-section-scroll">

            {/* Header */}
            <div className="flex-between flex-shrink-0">
                <h2>Wallets</h2>
                <button className="btn btn-secondary px-16 py-8 text-sm" onClick={() => setAddModalOpen(true)}>
                    <Plus size={18} /> Add Wallet
                </button>
            </div>

            {/* Wallets panel */}
            <div className="wallets-fixed-panel">
                <div className="scrollable-content-card">

                    {isLoading ? (
                        /* Loading state — skeleton handled by Dashboard.jsx */
                        <div className="wallet-empty-state">
                            <span className="text-sm" style={{ opacity: 0.4 }}>Loading wallets...</span>
                        </div>
                    ) : activeWallets.length === 0 ? (
                        /* Empty state */
                        <div className="wallet-empty-state">
                            <CreditCard size={48} style={{ opacity: 0.3 }} />
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                Connect Your First Wallet
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', maxWidth: 320, lineHeight: 1.5 }}>
                                Add a BSC wallet to send & receive USDT through Xentra escrow payments.
                            </p>
                        </div>
                    ) : (
                        /* Wallet grid */
                        <div className="wallet-grid">
                            {activeWallets.map((wallet, idx) => (
                                <WalletCard
                                    key={wallet.id}
                                    wallet={wallet}
                                    isDefault={wallet.is_default}
                                    onSetDefault={handleSetDefault}
                                    onVerify={handleVerifyClick}
                                    onRemove={handleRemoveClick}
                                    index={idx}
                                    canRemove={activeWallets.length > 1 || !wallet.is_default}
                                />
                            ))}
                        </div>
                    )}

                </div>
            </div>

            {/* Modals */}
            <AddWalletModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                walletType={walletType}
                onSuccess={handleAddSuccess}
                addNotification={addNotification}
            />

            <VerifyWalletModal
                isOpen={verifyModal.open}
                onClose={() => setVerifyModal({ open: false, wallet: null })}
                wallet={verifyModal.wallet}
                walletType={walletType}
                onSuccess={handleVerifySuccess}
                addNotification={addNotification}
            />

            <ConfirmationModal
                isOpen={removeModal.open}
                onClose={() => setRemoveModal({ open: false, wallet: null })}
                onConfirm={handleConfirmRemove}
                title="Remove Wallet"
                message={
                    removeModal.wallet
                        ? `Remove ${removeModal.wallet.label || 'this wallet'} (${removeModal.wallet.address?.slice(0, 6)}...${removeModal.wallet.address?.slice(-4)})? This wallet will be disabled and removed from your account.`
                        : 'Remove this wallet?'
                }
                confirmText="Remove"
                cancelText="Cancel"
                type="danger"
            />

        </div>
    );
};

export default Wallets;
