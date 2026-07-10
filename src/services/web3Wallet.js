/**
 * Web3 Wallet Service — handles browser wallet detection, connection, and EIP-191 signing.
 * Uses the raw window.ethereum provider API (no ethers.js / web3.js dependency).
 */

// Provider detection map: checks window.ethereum / window global properties
const PROVIDER_DETECTORS = [
  // Order matters! Many wallets set isMetaMask=true for compatibility.
  // Check specific wallets BEFORE MetaMask to avoid false positives.
  { key: 'TRUST_WALLET', check: (eth) => eth?.isTrust },
  { key: 'PHANTOM', check: (eth) => eth?.isPhantom },
  { key: 'RABBY', check: (eth) => eth?.isRabby },
  { key: 'COINBASE_WALLET', check: (eth) => eth?.isCoinbaseWallet },
  { key: 'OKX_WALLET', check: () => !!window.okxwallet },
  { key: 'BINANCE_WALLET', check: () => !!window.BinanceChain },
  { key: 'METAMASK', check: (eth) => eth?.isMetaMask && !eth?.isBraveWallet },
  { key: 'OTHER', check: () => true }, // fallback
];

/**
 * Check if any browser wallet extension is installed.
 * @returns {boolean}
 */
export function isWalletAvailable() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * Detect which wallet provider the user has installed.
 * Returns the first matching provider key from PROVIDER_DETECTORS.
 * @returns {string} Provider key (e.g. 'METAMASK', 'TRUST_WALLET', etc.)
 */
export function detectProvider() {
  if (typeof window === 'undefined' || !window.ethereum) return 'OTHER';

  const eth = window.ethereum;

  // Handle multi-provider wallets (e.g. if user has MetaMask + Rabby installed,
  // window.ethereum might be an array or have providers map)
  const provider = eth.providers?.[0] || eth;

  for (const detector of PROVIDER_DETECTORS) {
    if (detector.key === 'OTHER') continue;
    try {
      if (detector.check(provider)) return detector.key;
    } catch {
      // ignore detection errors
    }
  }

  return 'OTHER';
}

/**
 * Connect to the user's browser wallet and return the connected address.
 * Prompts the wallet popup for permission.
 * @returns {Promise<{ address: string, provider: string }>}
 * @throws {Error} If no wallet installed, user rejects, or connection fails.
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('No wallet extension detected. Please install MetaMask or another EVM wallet.');
  }

  try {
    // Request account access — triggers wallet popup
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned. Please unlock your wallet and try again.');
    }

    const address = accounts[0];
    const provider = detectProvider();

    return { address, provider };
  } catch (err) {
    // User rejected or wallet error
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
 * Sign a message using EIP-191 personal_sign.
 * Triggers the wallet's signature request popup.
 * @param {string} message - The message to sign (plaintext, not hex-encoded).
 * @param {string} address - The signer's Ethereum address.
 * @returns {Promise<string>} The hex signature (0x...).
 * @throws {Error} If signing fails or is rejected.
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
