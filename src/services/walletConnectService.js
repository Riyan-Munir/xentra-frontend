/**
 * WalletConnect v2 Service — bridges mobile wallets via QR code scanning.
 *
 * Uses @walletconnect/ethereum-provider to create an EIP-1193 provider
 * that is API-compatible with window.ethereum. The resulting provider
 * can be passed to connectWallet() / signMessage() etc. from web3Wallet.js.
 *
 * Supports persistent sessions across page refreshes via localStorage.
 *
 * Requires VITE_WALLETCONNECT_PROJECT_ID env var (get one at https://cloud.walletconnect.com).
 */

import { EthereumProvider } from '@walletconnect/ethereum-provider';

// ── State ────────────────────────────────────────────────────────────────────
let wcProvider = null;
let wcUri = null;
let wcConnected = false;

const WC_CHAIN_ID = 56; // BSC Mainnet
const WC_STORAGE_KEY = 'xentra_wc_session';

// ── Initialization ───────────────────────────────────────────────────────────

/**
 * Check whether the WalletConnect provider has been initialised.
 */
export function isWCInitialized() {
  return wcProvider !== null;
}

/**
 * Get the current WC connection URI (for QR display).
 */
export function getWCUri() {
  return wcUri;
}

/**
 * Whether a WalletConnect session is active.
 */
export function isWCConnected() {
  return wcConnected;
}

/**
 * Try to restore a previous WalletConnect session from storage.
 * @returns {Promise<boolean>} True if a session was restored and still valid.
 */
export async function tryRestoreWCSession() {
  try {
    const savedSession = localStorage.getItem(WC_STORAGE_KEY);
    if (!savedSession) return false;

    const { topic } = JSON.parse(savedSession);
    if (!topic) return false;

    // Initialise provider — it will try to restore the session automatically
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
    if (!projectId) return false;

    // Don't re-init if already done
    if (wcProvider) {
      // Check if the existing session is still alive
      try {
        const accounts = wcProvider.accounts;
        if (accounts && accounts.length > 0) {
          wcConnected = true;
          return true;
        }
      } catch {
        // Session expired, clean up
        localStorage.removeItem(WC_STORAGE_KEY);
        wcProvider = null;
        return false;
      }
      return false;
    }

    wcProvider = await EthereumProvider.init({
      projectId,
      chains: [WC_CHAIN_ID],
      showQrModal: false,
      rpcMap: {
        56: 'https://bsc-dataseed.binance.org/',
      },
    });

    // Check if restored session is active
    if (wcProvider.accounts && wcProvider.accounts.length > 0) {
      wcConnected = true;
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Failed to restore WC session:', err.message);
    localStorage.removeItem(WC_STORAGE_KEY);
    return false;
  }
}

/**
/**
 * Persist the current WalletConnect session to localStorage.
 */
function persistWCSession() {
  try {
    if (wcProvider?.session?.topic) {
      localStorage.setItem(WC_STORAGE_KEY, JSON.stringify({
        topic: wcProvider.session.topic,
        expiry: wcProvider.session.expiry,
      }));
    }
  } catch {
    // Storage unavailable (private browsing, etc.)
  }
}

/**
 * Clear the persisted WalletConnect session from localStorage.
 */
function clearWCSession() {
  try {
    localStorage.removeItem(WC_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Initialise the WalletConnect EthereumProvider.
 * Must be called before connect/disconnect.
 * If a previous session exists, it will be restored.
 *
 * @param {object} [options]
 * @param {string}  [options.projectId]  — Override projectId (defaults to VITE_WALLETCONNECT_PROJECT_ID).
 * @throws If no projectId is available.
 */
export async function initWalletConnect(options = {}) {
  if (wcProvider) return wcProvider;

  const projectId =
    options.projectId || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      'WalletConnect project ID is missing. Set VITE_WALLETCONNECT_PROJECT_ID in .env or pass projectId option.',
    );
  }

  wcProvider = await EthereumProvider.init({
    projectId,
    chains: [WC_CHAIN_ID],
    showQrModal: false, // We render the QR ourselves with qrcode.react
    rpcMap: {
      56: 'https://bsc-dataseed.binance.org/',
    },
  });

  // If the provider restored a session, mark as connected
  if (wcProvider.accounts && wcProvider.accounts.length > 0) {
    wcConnected = true;
  }

  return wcProvider;
}

// ── URI listening (for QR code) ─────────────────────────────────────────────

/**
 * Subscribe to the `display_uri` event emitted when WC is ready to pair.
 *
 * @param {(uri: string) => void} callback
 * @returns {() => void} Cleanup function.
 */
export function onWcUri(callback) {
  if (!wcProvider) return () => { };

  const handler = (uri) => {
    wcUri = uri;
    callback(uri);
  };

  wcProvider.on('display_uri', handler);

  return () => {
    wcProvider?.removeListener('display_uri', handler);
  };
}

// ── Connect / Disconnect ────────────────────────────────────────────────────

/**
 * Open a WalletConnect session (triggers QR code display via onWcUri).
 * Resolves once the user scans the QR and the wallet approves.
 *
 * @returns {Promise<{ address: string, provider: object }>}
 */
export async function connectWalletConnect() {
  if (!wcProvider) throw new Error('WalletConnect not initialised. Call initWalletConnect() first.');

  const accounts = await wcProvider.connect();
  wcConnected = true;

  const address = accounts?.[0];
  if (!address) throw new Error('No accounts returned from WalletConnect');

  // Persist the session so it survives page refreshes
  persistWCSession();

  return {
    address,
    provider: wcProvider, // Pass this to signMessage etc.
  };
}

/**
 * Disconnect the active WalletConnect session and reset state.
 */
export async function disconnectWalletConnect() {
  if (wcProvider) {
    try {
      await wcProvider.disconnect();
    } catch (err) {
      console.warn('WalletConnect disconnect error:', err.message);
    }
  }
  wcProvider = null;
  wcUri = null;
  wcConnected = false;
  clearWCSession();
}

// ── Account change listener ──────────────────────────────────────────────────

/**
 * Listen for account changes in the active WalletConnect session.
 *
 * @param {(address: string | null) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onWCAccountChange(callback) {
  if (!wcProvider) return () => { };

  const handler = (accounts) => {
    callback(accounts?.[0] || null);
  };

  wcProvider.on('accountsChanged', handler);

  return () => {
    wcProvider?.removeListener('accountsChanged', handler);
  };
}

/**
 * Listen for chain changes in the active WalletConnect session.
 *
 * @param {(chainId: string) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onWCChainChange(callback) {
  if (!wcProvider) return () => { };

  const handler = (chainId) => {
    callback(chainId);
  };

  wcProvider.on('chainChanged', handler);

  return () => {
    wcProvider?.removeListener('chainChanged', handler);
  };
}

/**
 * Get the active WalletConnect provider instance.
 * @returns {object|null}
 */
export function getWCProvider() {
  return wcProvider;
}

/**
 * Get the currently connected accounts from the active WalletConnect session.
 * @returns {string[]}
 */
export function getWCAccounts() {
  if (!wcProvider || !Array.isArray(wcProvider.accounts)) return [];
  return wcProvider.accounts;
}

/**
 * Get the chain ID of the active WalletConnect session.
 * @returns {number|null}
 */
export function getWCChainId() {
  if (!wcProvider) return null;
  return wcProvider.chainId || null;
}
