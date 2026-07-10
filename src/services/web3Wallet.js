/**
 * Web3 Wallet Service — handles browser wallet detection, connection, and EIP-191 signing.
 * Uses the raw window.ethereum provider API (no ethers.js / web3.js dependency).
 *
 * Supports EIP-6963 provider discovery for multiple wallet extensions.
 */

// ── Provider detection map ──────────────────────────────────────────────────
const PROVIDER_DETECTORS = [
  { key: 'TRUST_WALLET', check: (eth) => eth?.isTrust, label: 'Trust Wallet' },
  { key: 'PHANTOM', check: (eth) => eth?.isPhantom, label: 'Phantom' },
  { key: 'RABBY', check: (eth) => eth?.isRabby, label: 'Rabby Wallet' },
  { key: 'COINBASE_WALLET', check: (eth) => eth?.isCoinbaseWallet, label: 'Coinbase Wallet' },
  { key: 'OKX_WALLET', check: () => !!window.okxwallet, label: 'OKX Wallet' },
  { key: 'BINANCE_WALLET', check: () => !!window.BinanceChain, label: 'Binance Wallet' },
  { key: 'METAMASK', check: (eth) => eth?.isMetaMask && !eth?.isBraveWallet, label: 'MetaMask' },
];

// ── EIP-6963 Provider Discovery ─────────────────────────────────────────────
const discoveredProviders = new Map();
let discoveryListenersAttached = false;

/**
 * Attach EIP-6963 listeners and request provider announcements.
 * Call once when the user opens the wallet modal.
 */
export function startProviderDiscovery() {
  if (discoveryListenersAttached) return;
  discoveryListenersAttached = true;

  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider } = event.detail;
    if (info?.uuid) {
      discoveredProviders.set(info.uuid, { info, provider });
    }
  });

  window.dispatchEvent(new CustomEvent('eip6963:requestProviders'));
}

/**
 * Get all discovered EIP-6963 providers.
 * @returns {Array<{ uuid: string, name: string, icon: string, rdns: string, provider: object }>}
 */
export function getDiscoveredProviders() {
  return Array.from(discoveredProviders.values()).map(({ info, provider }) => ({
    uuid: info.uuid,
    name: info.name || 'Unknown Wallet',
    icon: info.icon || '',
    rdns: info.rdns || '',
    provider,
  }));
}

// ── Provider helpers ────────────────────────────────────────────────────────

/**
 * Check if any browser wallet extension is installed.
 * @returns {boolean}
 */
export function isWalletAvailable() {
  if (typeof window === 'undefined') return false;
  if (discoveredProviders.size > 0) return true;
  return !!window.ethereum;
}

/**
 * Detect which wallet provider the user has installed.
 * @param {object} [targetProvider] - Optional specific provider to detect.
 * @returns {string} Provider key (e.g. 'METAMASK', 'TRUST_WALLET', etc.)
 */
export function detectProvider(targetProvider) {
  const eth = targetProvider || (typeof window !== 'undefined' && window.ethereum);
  if (!eth) return 'OTHER';

  const provider = eth.providers?.[0] || eth;

  for (const detector of PROVIDER_DETECTORS) {
    try {
      if (detector.check(provider)) return detector.key;
    } catch {
      // ignore detection errors
    }
  }

  return 'OTHER';
}

/**
 * Get the display name for a provider key.
 */
export function getProviderLabel(providerKey) {
  const detector = PROVIDER_DETECTORS.find((d) => d.key === providerKey);
  return detector?.label || providerKey;
}

// ── Connection ──────────────────────────────────────────────────────────────

/**
 * Connect to the user's browser wallet and return the connected address.
 * Prompts the wallet popup for permission.
 *
 * @param {object} [targetProvider] - Optional specific EIP-6963 provider to use.
 * @returns {Promise<{ address: string, provider: string }>}
 * @throws {Error} If no wallet installed, user rejects, or connection fails.
 */
export async function connectWallet(targetProvider) {
  const eth = targetProvider || window.ethereum;
  if (!eth) {
    throw new Error('No wallet extension detected. Please install MetaMask or another EVM wallet.');
  }

  try {
    const accounts = await eth.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned. Please unlock your wallet and try again.');
    }

    const address = accounts[0];
    const provider = targetProvider ? detectProvider(targetProvider) : detectProvider();

    return { address, provider };
  } catch (err) {
    if (err.code === 4001 || err.code === -32002) {
      throw new Error('Connection rejected. Please approve the wallet connection.');
    }
    throw new Error(err.message || 'Failed to connect wallet.');
  }
}

/**
 * Get the currently connected address (if wallet is already connected).
 * Does NOT trigger a popup — only checks existing connections.
 * @returns {Promise<string|null>} Connected address or null.
 */
export async function getConnectedAddress() {
  if (!window.ethereum) return null;

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Disconnect the wallet by revoking permissions (EIP-3326).
 * This clears the connection from the wallet extension so it won't
 * auto-reconnect on the next modal open.
 *
 * @param {object} [targetProvider] - Optional specific provider to disconnect from.
 * @returns {Promise<boolean>} true if successfully disconnected.
 */
export async function disconnectWallet(targetProvider) {
  const eth = targetProvider || window.ethereum;
  if (!eth) return false;

  try {
    // EIP-3326: wallet_revokePermissions
    await eth.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    return true;
  } catch (err) {
    // Some wallets don't support wallet_revokePermissions
    console.warn('wallet_revokePermissions not supported:', err.message);
    return false;
  }
}

// ── Signing ─────────────────────────────────────────────────────────────────

/**
 * Sign a message using EIP-191 personal_sign.
 * @param {string} message - The message to sign (plaintext, not hex-encoded).
 * @param {string} address - The signer's Ethereum address.
 * @returns {Promise<string>} The hex signature (0x...).
 */
export async function signMessage(message, address) {
  if (!window.ethereum) {
    throw new Error('No wallet extension detected.');
  }

  if (!address) {
    throw new Error('No address provided for signing.');
  }

  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });

    return signature;
  } catch (err) {
    if (err.code === 4001 || err.code === -32002) {
      throw new Error('Signature rejected. Please sign the message in your wallet.');
    }
    throw new Error(err.message || 'Failed to sign message.');
  }
}

// ── Events ──────────────────────────────────────────────────────────────────

/**
 * Subscribe to wallet account changes.
 * @param {(address: string|null) => void} callback
 * @returns {Function} Unsubscribe function.
 */
export function onAccountChange(callback) {
  if (!window.ethereum) return () => {};

  const handler = (accounts) => {
    callback(accounts?.[0] || null);
  };

  window.ethereum.on('accountsChanged', handler);
  return () => {
    window.ethereum.removeListener('accountsChanged', handler);
  };
}
