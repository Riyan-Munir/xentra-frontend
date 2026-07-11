/**
 * WalletConnect v2 Service — bridges mobile wallets via QR code scanning.
 *
 * Uses @walletconnect/ethereum-provider to create an EIP-1193 provider
 * that is API-compatible with window.ethereum. The resulting provider
 * can be passed to connectWallet() / signMessage() / etc. from web3Wallet.js.
 *
 * Requires VITE_WALLETCONNECT_PROJECT_ID env var (get one at https://cloud.walletconnect.com).
 */

import { EthereumProvider } from '@walletconnect/ethereum-provider';

// ── State ────────────────────────────────────────────────────────────────────
let wcProvider = null;
let wcUri = null;
let wcConnected = false;

const WC_CHAIN_ID = 56; // BSC Mainnet

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
 * Initialise the WalletConnect EthereumProvider.
 * Must be called before connect/disconnect.
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
  if (!wcProvider) return () => {};

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
}

// ── Account change listener ──────────────────────────────────────────────────

/**
 * Listen for account changes in the active WalletConnect session.
 *
 * @param {(address: string | null) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onWCAccountChange(callback) {
  if (!wcProvider) return () => {};

  const handler = (accounts) => {
    callback(accounts?.[0] || null);
  };

  wcProvider.on('accountsChanged', handler);

  return () => {
    wcProvider?.removeListener('accountsChanged', handler);
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
