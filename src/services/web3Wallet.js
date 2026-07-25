/**
 * Web3 Wallet Service — handles browser wallet detection, connection, and EIP-191 signing.
 * Uses the raw window.ethereum provider API (no ethers.js / web3.js dependency).
 *
 * Supports EIP-6963 provider discovery for multiple wallet extensions.
 * Includes chain ID validation, BSC chain switching, and chain change listeners.
 */

// ── BSC Chain Configuration ────────────────────────────────────────────────
/** BSC Mainnet chain ID in hex (56 in decimal) — protocol constant, never changes. */
export const BSC_CHAIN_ID = '0x38';
/** BSC Mainnet chain ID in decimal — for display. */
export const BSC_CHAIN_ID_DECIMAL = 56;

const BSC_CHAIN_CONFIG = {
  chainId: BSC_CHAIN_ID,
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
};

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
let discoveryEventCleanup = null;

/**
 * Attach EIP-6963 listeners and request provider announcements.
 * Returns cleanup function for unmount.
 */
export function startProviderDiscovery() {
  if (discoveryListenersAttached) return () => { };
  discoveryListenersAttached = true;
  discoveredProviders.clear();

  const handler = (event) => {
    const { info, provider } = event.detail;
    if (info?.uuid) {
      discoveredProviders.set(info.uuid, { info, provider });
    }
  };

  window.addEventListener('eip6963:announceProvider', handler);
  window.dispatchEvent(new CustomEvent('eip6963:requestProviders'));

  discoveryEventCleanup = () => {
    window.removeEventListener('eip6963:announceProvider', handler);
    discoveryListenersAttached = false;
    discoveryEventCleanup = null;
  };

  return discoveryEventCleanup;
}

/**
 * Subscribe to future EIP-6963 provider announcements (for real-time updates).
 * @param {(providers: Array) => void} callback - Called when new providers are discovered.
 * @returns {() => void} Cleanup function.
 */
export function onProvidersChanged(callback) {
  const handler = (event) => {
    const { info, provider } = event.detail;
    if (info?.uuid) {
      discoveredProviders.set(info.uuid, { info, provider });
      callback(getDiscoveredProviders());
    }
  };

  window.addEventListener('eip6963:announceProvider', handler);
  return () => {
    window.removeEventListener('eip6963:announceProvider', handler);
  };
}

/**
 * Stop EIP-6963 discovery and clean up listeners.
 */
export function stopProviderDiscovery() {
  if (discoveryEventCleanup) {
    discoveryEventCleanup();
  }
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
  if (!!window.ethereum) return true;
  // Check legacy providers array (wallets that don't support EIP-6963)
  if (window.ethereum?.providers?.length > 0) return true;
  return false;
}

/**
 * Detect which wallet provider the user has installed.
 * @param {object} [targetProvider] - Optional specific provider to detect.
 * @returns {string|null} Provider key (e.g. 'METAMASK', 'TRUST_WALLET') or null if unknown.
 */
export function detectProvider(targetProvider) {
  const eth = targetProvider || (typeof window !== 'undefined' && window.ethereum);
  if (!eth) return null;

  // If the provider has a providers array (multi-wallet), try each
  const providerCandidates = eth.providers?.length
    ? eth.providers
    : [eth];

  for (const provider of providerCandidates) {
    for (const detector of PROVIDER_DETECTORS) {
      try {
        if (detector.check(provider)) return detector.key;
      } catch {
        // ignore detection errors
      }
    }
  }

  // If targetProvider was passed and has its own detection, check it directly
  if (targetProvider && targetProvider !== eth) {
    for (const detector of PROVIDER_DETECTORS) {
      try {
        if (detector.check(targetProvider)) return detector.key;
      } catch {
        // ignore
      }
    }
  }

  return null;
}

/**
 * Get the display name for a provider key.
 */
export function getProviderLabel(providerKey) {
  const detector = PROVIDER_DETECTORS.find((d) => d.key === providerKey);
  return detector?.label || providerKey;
}

// ── Chain ID / Network ──────────────────────────────────────────────────────

/**
 * Get the currently connected chain ID from the wallet.
 * @param {object} [targetProvider] - Optional specific provider.
 * @returns {Promise<string>} Chain ID as hex string (e.g. '0x38' for BSC).
 */
export async function getChainId(targetProvider) {
  const eth = targetProvider || window.ethereum;
  if (!eth) return null;

  try {
    const chainId = await eth.request({ method: 'eth_chainId' });
    return chainId;
  } catch {
    return null;
  }
}

/**
 * Check if the connected chain is BSC Mainnet (chain ID 56).
 * @param {object} [targetProvider] - Optional specific provider.
 * @returns {Promise<boolean>}
 */
export async function isBSCChain(targetProvider) {
  const chainId = await getChainId(targetProvider);
  if (!chainId) return false;
  return chainId.toLowerCase() === BSC_CHAIN_ID;
}

/**
 * Switch the wallet to BSC Mainnet.
 * If the chain is not in the wallet, it will be added automatically.
 * @param {object} [targetProvider] - Optional specific provider.
 * @returns {Promise<{ switched: boolean, message?: string }>}
 */
export async function switchToBSC(targetProvider) {
  const eth = targetProvider || window.ethereum;
  if (!eth) return { switched: false, message: 'No wallet detected.' };

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_CHAIN_ID }],
    });
    return { switched: true };
  } catch (err) {
    // 4902 = chain not added yet
    if (err.code === 4902) {
      try {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [BSC_CHAIN_CONFIG],
        });
        return { switched: true };
      } catch (addErr) {
        return {
          switched: false,
          message: addErr.code === 4001
            ? 'BSC chain addition was rejected in your wallet.'
            : `Failed to add BSC chain: ${addErr.message}`,
        };
      }
    }

    if (err.code === 4001) {
      return { switched: false, message: 'BSC chain switch was rejected in your wallet.' };
    }

    return { switched: false, message: err.message || 'Failed to switch to BSC.' };
  }
}

/**
 * Ensure the wallet is connected to BSC Mainnet.
 * Checks current chain and prompts switch if needed.
 * @param {object} [targetProvider] - Optional specific provider.
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function ensureCorrectChain(targetProvider) {
  const onBSC = await isBSCChain(targetProvider);
  if (onBSC) return { ok: true };

  const result = await switchToBSC(targetProvider);
  if (!result.switched) {
    return { ok: false, message: result.message || 'Please switch your wallet to BSC Mainnet.' };
  }

  // Wait for chain to actually switch (wallet takes a moment)
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { ok: true };
}

// ── Connection ──────────────────────────────────────────────────────────────

/**
 * Connect to the user's browser wallet and return the connected address.
 * Prompts the wallet popup for permission. Validates that the chain is BSC.
 *
 * @param {object} [targetProvider] - Optional specific EIP-6963 provider to use.
 * @returns {Promise<{ address: string, provider: string, chainId: string }>}
 * @throws {Error} If no wallet installed, user rejects, wrong chain, or connection fails.
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

    // ── Validate chain is BSC ──────────────────────────────────────────
    let chainId;
    try {
      chainId = await eth.request({ method: 'eth_chainId' });
    } catch {
      // Chain ID unavailable — non-fatal, but warn
      chainId = null;
    }

    if (chainId && chainId.toLowerCase() !== BSC_CHAIN_ID) {
      // Try to auto-switch to BSC
      const switchResult = await ensureCorrectChain(eth);
      if (!switchResult.ok) {
        // If user rejected the switch, still return the address but flag the warning
        // The caller (UI) will show the chain warning
        return {
          address,
          provider,
          chainId: chainId || null,
          wrongChain: true,
          chainMessage: switchResult.message || `Connected to wrong network. Switch to BSC Mainnet (Chain ID: ${BSC_CHAIN_ID_DECIMAL}).`,
        };
      }
      // Re-fetch chain ID after switch
      try {
        chainId = await eth.request({ method: 'eth_chainId' });
      } catch {
        chainId = BSC_CHAIN_ID; // assume switch worked
      }
    }

    return { address, provider, chainId: chainId || null, wrongChain: false };
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
 * After revoking, verifies by checking eth_accounts. If the wallet
 * still returns accounts, the revoke failed (unsupported wallet).
 *
 * @param {object} [targetProvider] - Optional specific provider to disconnect from.
 * @returns {Promise<{ revoked: boolean, stillConnected: boolean }>}
 */
export async function disconnectWallet(targetProvider) {
  const eth = targetProvider || window.ethereum;
  if (!eth) return { revoked: false, stillConnected: false };

  let revoked = false;

  try {
    // EIP-3326: wallet_revokePermissions
    await eth.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    revoked = true;
  } catch (err) {
    // Some wallets don't support wallet_revokePermissions
    console.warn('wallet_revokePermissions not supported:', err.message);
  }

  // Verify the revoke actually worked
  let stillConnected = false;
  try {
    const accounts = await eth.request({ method: 'eth_accounts' });
    stillConnected = accounts && accounts.length > 0;
  } catch {
    // ignore
  }

  return { revoked, stillConnected };
}

// ── Signing ─────────────────────────────────────────────────────────────────

/**
 * Sign a message using EIP-191 personal_sign.
 *
 * @param {string} message - The message to sign (plaintext, not hex-encoded).
 * @param {string} address - The signer's Ethereum address.
 * @param {object} [customProvider] - Optional custom provider (e.g. WalletConnect provider).
 * @returns {Promise<string>} The hex signature (0x...).
 */
export async function signMessage(message, address, customProvider) {
  const eth = customProvider || window.ethereum;

  if (!eth) {
    throw new Error('No wallet detected.');
  }

  if (!address) {
    throw new Error('No address provided for signing.');
  }

  try {
    const signature = await eth.request({
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
 * @param {object} [customProvider] - Optional custom provider to subscribe to.
 * @returns {Function} Unsubscribe function.
 */
export function onAccountChange(callback, customProvider) {
  const eth = customProvider || (typeof window !== 'undefined' && window.ethereum);
  if (!eth) return () => { };

  const handler = (accounts) => {
    callback(accounts?.[0] || null);
  };

  eth.on('accountsChanged', handler);
  return () => {
    eth.removeListener('accountsChanged', handler);
  };
}

/**
 * Subscribe to wallet chain/network changes.
 * @param {(chainId: string) => void} callback - Called with new chain ID (hex string).
 * @param {object} [customProvider] - Optional custom provider to subscribe to.
 * @returns {Function} Unsubscribe function.
 */
export function onChainChange(callback, customProvider) {
  const eth = customProvider || (typeof window !== 'undefined' && window.ethereum);
  if (!eth) return () => { };

  const handler = (chainId) => {
    callback(chainId);
  };

  eth.on('chainChanged', handler);
  return () => {
    eth.removeListener('chainChanged', handler);
  };
}

/**
 * Subscribe to wallet disconnect events.
 * @param {() => void} callback
 * @param {object} [customProvider] - Optional custom provider to subscribe to.
 * @returns {Function} Unsubscribe function.
 */
export function onDisconnect(callback, customProvider) {
  const eth = customProvider || (typeof window !== 'undefined' && window.ethereum);
  if (!eth) return () => { };

  const handler = (error) => {
    console.warn('Wallet disconnected:', error?.message || 'unknown reason');
    callback();
  };

  eth.on('disconnect', handler);
  return () => {
    eth.removeListener('disconnect', handler);
  };
}

// ── USDT Transfer ───────────────────────────────────────────────────────────

/**
 * Minimal ERC-20 ABI for encoding a USDT transfer function call.
 * Only the `transfer(address,uint256)` function signature is needed;
 * the frontend never decodes return data — that's the backend's job.
 */
const USDT_TRANSFER_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
];

/**
 * Encode a USDT transfer function call so it can be passed to eth_sendTransaction.
 *
 * Uses the raw ABI encoding (function selector + 32-byte padded params) so we
 * don't need ethers.js or web3.js on the frontend.
 *
 * @param {string} to - Recipient address (0x...)
 * @param {number|string} rawAmount - Amount in *human-readable* USDT (e.g., 5.00)
 * @param {number} decimals - Token decimals (USDT = 18 on BSC)
 * @returns {string} Encoded data hex string (0x...)
 */
function encodeUsdtTransfer(to, rawAmount, decimals = 18) {
  // 1. Compute function selector = keccak256("transfer(address,uint256)")[0:4]
  //    Pre-computed: 0xa9059cbb
  const SELECTOR = '0xa9059cbb';

  // 2. Convert human-readable amount to raw uint256 (multiply by 10^decimals)
  //    USDT on BSC uses 18 decimals, so 5.00 USDT → 5_000_000_000_000_000_000
  const amountWei = BigInt(Math.round(Number(rawAmount) * 10 ** decimals));

  // 3. Pad address to 32 bytes (left-pad with zeros)
  const cleanTo = to.startsWith('0x') ? to.slice(2).toLowerCase() : to.toLowerCase();
  const paddedTo = cleanTo.padStart(64, '0');

  // 4. Convert amount to 32-byte hex (no leading 0x, pad to 64 chars)
  const amountHex = amountWei.toString(16).padStart(64, '0');

  // 5. Concatenate
  return `${SELECTOR}${paddedTo}${amountHex}`;
}

/**
 * Send a USDT transfer from the user's connected wallet.
 *
 * Opens the wallet extension popup to let the user review and approve
 * the transaction. Returns only after the wallet has submitted it to
 * the mempool (NOT after confirmation — the backend handles confirmation).
 *
 * @param {Object} opts
 * @param {string} opts.recipientAddress - The address that will receive USDT (0x...)
 * @param {number} opts.amount - Human-readable USDT amount (e.g., 5.00 for 5 USDT)
 * @param {string} [opts.tokenContract] - USDT BEP20 contract address (default BSC USDT)
 * @param {number} [opts.chainId=56] - BSC Mainnet chain ID
 * @param {number} [opts.decimals=18] - Token decimals (USDT on BSC = 18)
 * @param {object} [customProvider] - Optional specific EIP-6963 provider
 * @returns {Promise<{ txHash: string, from: string }>}
 * @throws {Error} If wallet not detected, user rejects, chain wrong, or send fails.
 */
export async function sendPaymentTransaction(opts, customProvider) {
  const {
    recipientAddress,
    amount,
    tokenContract = '0x55d398326f99059ff775485246999027b3197955',
    chainId = 56,
    decimals = 18,
  } = opts || {};

  if (!recipientAddress) throw new Error('recipientAddress is required');
  if (amount == null || isNaN(amount) || Number(amount) <= 0) {
    throw new Error('A valid positive amount is required');
  }

  const eth = customProvider || window.ethereum;
  if (!eth) {
    throw new Error('No wallet extension detected. Please install MetaMask or another EVM wallet.');
  }

  // 1. Ensure connected and get the sender address
  let fromAddress;
  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available. Please unlock your wallet.');
    }
    fromAddress = accounts[0];
  } catch (err) {
    if (err.code === 4001) throw new Error('Connection rejected in wallet.');
    throw new Error(err.message || 'Failed to connect wallet.');
  }

  // 2. Validate / switch to correct chain
  try {
    const currentChainId = await eth.request({ method: 'eth_chainId' });
    const targetHex = `0x${chainId.toString(16)}`;
    if (currentChainId?.toLowerCase() !== targetHex.toLowerCase()) {
      // Try switching
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetHex }],
        });
        // Wait briefly for chain switch
        await new Promise((r) => setTimeout(r, 500));
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          throw new Error(
            `Chain ID ${chainId} is not in your wallet. Please add it manually or switch to BSC (56).`
          );
        }
        if (switchErr.code === 4001) {
          throw new Error('Chain switch was rejected in your wallet.');
        }
        throw new Error(`Failed to switch chain: ${switchErr.message}`);
      }
    }
  } catch (err) {
    // Re-throw chain errors directly
    if (err.message.includes('rejected') || err.message.includes('Chain ID')) throw err;
    // Non-critical — continue, the wallet will reject if chain is wrong
  }

  // 3. Encode the USDT transfer
  const data = encodeUsdtTransfer(recipientAddress, amount, decimals);

  // 4. Send the transaction
  const txParams = {
    from: fromAddress,
    to: tokenContract,
    data,
    // No value — this is a token transfer, not BNB
  };

  try {
    const txHash = await eth.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });

    if (!txHash || typeof txHash !== 'string') {
      throw new Error('Wallet did not return a transaction hash.');
    }

    return { txHash, from: fromAddress };
  } catch (err) {
    if (err.code === 4001 || err.code === -32002) {
      throw new Error('Transaction was rejected in your wallet.');
    }
    throw new Error(err.message || 'Failed to send transaction.');
  }
}

/**
 * Get the BSC explorer URL for an address or transaction hash.
 * @param {string} address - Address or tx hash
 * @param {boolean} [isTx=false] - If true, link to tx instead of address
 * @returns {string}
 */
export function getBscScanUrl(address, isTx = false) {
  if (isTx) return `https://bscscan.com/tx/${address}`;
  return `https://bscscan.com/address/${address}`;
}
