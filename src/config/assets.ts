// src/config/assets.ts
import { Address } from 'viem';

export interface TokenInfo {
  address: Address;
}

// Network Chain IDs
export const MANTLE_CHAIN_ID = 5000;
export const SONIC_CHAIN_ID = 146;

// New Asset Configuration Structure
export interface AssetConfig {
  id: string; // Unique ID for the config entry (e.g., 'lendle-usdc', 'pool-example-ab')
  name: string; // Display name shown in the UI (e.g., 'Lendle USDC', 'Example Pool A/B')
  type: 'pool' | 'reserve'; // UI classification (e.g., for color coding)
  chainId: number; // Network identifier (e.g., 5000 for Mantle, 146 for Sonic), used for filtering
  decimals: number; // Decimals of the primary underlying token (used for formatting amounts)
  source?: string; // Protocol/Source identifier string (e.g., 'Lendle Mantle', 'Aave Sonic'). Used to match against `Pool`/`Reserve` data from `/fetch-pool-data`.
  logoUrl?: string; // Path to the asset's logo
  contractAddress: Address; // Primary contract address. For reserves, this is often the *underlying token* address (like USDC). For pools, it's the pool's address. Used in `getAssetsForApi` for `/fetch-pool-data` request.
  underlyingTokens: TokenInfo[]; // List of underlying tokens (primarily for info, sometimes used as fallback address)
  explorerUrl?: string; // Link to block explorer for the asset or underlying token
  apiType: 'pool' | 'reserve'; // Type expected/used by the backend API (`/fetch-pool-data` request)
  apiName?: string; // Name expected/used by the backend API (in `/fetch-pool-data` response, matched against `Pool`/`Reserve` name field). Often specific, like 'USDC Reserve' or 'USDC-USDT'.
  allocationKey: string; // Unique key used to match this asset config with the `name` field in the response details from `/calculate-optimal-allocation`.
  apiTokenId?: string;      // Token address/identifier used to match against the `id` field in the `/portfolio` API response (usually the underlying token address).
  apiProtocolName?: string; // Protocol name used to match against the `protocol` field in the `/portfolio` API response (e.g., 'lendle.xyz', 'Aave').
  apiPoolId?: string;       // Pool/Market identifier used to match against the `poolId` field in the `/portfolio` API response.
}


// --- Common Tokens ---
export const MANTLE_USDC: TokenInfo = {
    address: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9',
};

// Define Sonic USDC.e based on search results
export const SONIC_USDCe: TokenInfo = {
    address: '0x29219dd400f2bf60e5a23d13be72b486d4038894',
};


// --- Master Asset Configuration List ---
export const SUPPORTED_ASSETS: AssetConfig[] = [
  
  // --- MANTLE ASSETS ---
  // --- Wallet USDC ---
  {
    id: 'wallet-usdc',
    name: 'Wallet USDC',
    type: 'reserve', // Conceptually a reserve
    chainId: MANTLE_CHAIN_ID,
    source: 'wallet', // Keep internal source
    contractAddress: MANTLE_USDC.address,
    decimals: 6,
    underlyingTokens: [{ address: MANTLE_USDC.address }],
    apiType: 'reserve', // For allocation API (if wallet is considered a source)
    logoUrl: undefined,
    allocationKey: 'PLACEHOLDER_WALLET_USDC_KEY', 
    apiTokenId: MANTLE_USDC.address.toLowerCase(),
    apiProtocolName: undefined, // Wallet balance doesn't have a protocol in API response
    apiPoolId: undefined,       // Wallet balance doesn't have a poolId
  },
  
  // --- Lendle USDC Reserve ---
  {
    id: 'lendle-usdc',
    name: 'Lendle USDC Reserve',
    type: 'reserve',
    chainId: MANTLE_CHAIN_ID,
    source: 'Lendle Mantle', 
    contractAddress: MANTLE_USDC.address,
    decimals: 6,
    underlyingTokens: [{ address: MANTLE_USDC.address }],
    apiType: 'reserve',
    apiName: 'USDC Reserve', // For allocation API
    logoUrl: '/svg/lendle-token.svg',
    explorerUrl: 'https://mantlescan.xyz/token/0xf36afb467d1f05541d998bbbcd5f7167d67bd8fc',
    allocationKey: 'USDC Reserve Lendle Mantle',
    // NEW: API Mapping Fields (Based on API example)
    apiTokenId: MANTLE_USDC.address.toLowerCase(),
    apiProtocolName: 'lendle.xyz',
    apiPoolId: '0xcfa5ae7c2ce8fadc6426c1ff872ca45378fb7cf3',
  },
  
  // --- Init Capital USDC Supply ---
  {
    id: 'initcapital-usdc',
    name: 'InitCapital USDC Reserve',
    type: 'reserve',
    chainId: MANTLE_CHAIN_ID,
    source: 'Init Mantle', // Keep internal source
    apiName: 'USDC Reserve', // For allocation API
    contractAddress: MANTLE_USDC.address,
    decimals: 6,
    underlyingTokens: [{ address: MANTLE_USDC.address }],
    apiType: 'reserve',
    logoUrl: '/svg/initCapital.ico',
    explorerUrl: 'https://mantlescan.xyz/token/0x00a55649e597d463fd212fbe48a3b40f0e227d06',
    allocationKey: 'USDC Reserve Init Mantle',
    apiTokenId: MANTLE_USDC.address.toLowerCase(),
    apiProtocolName: 'INIT Capital',
    apiPoolId: '0xf82cbcab75c1138a8f1f20179613e7c0c8337346',
  },  
  {
    id: 'merchantmoe-usdc-usdt',
    name: 'Merchant Moe USDC-USDT Pool',
    type: 'pool',
    chainId: MANTLE_CHAIN_ID,
    source: 'Merchant Moe Mantle', // Keep internal source
    contractAddress: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec',
    decimals: 6,
    underlyingTokens: [{ address: MANTLE_USDC.address }],
    apiName: 'USDC-USDT', // For allocation API
    logoUrl: '/svg/merchant-moe-logo.ea3ba2549690769a8d68.png',    
    apiType: 'pool',
    allocationKey: 'USDC-USDT Merchant Moe Mantle',
    explorerUrl: 'https://mantlescan.xyz/address/0x48c1a89af1102cad358549e9bb16ae5f96cddfec',    
    apiTokenId: MANTLE_USDC.address.toLowerCase(), // Match the USDC token ID
    apiProtocolName: 'Merchant Moe',
    apiPoolId: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec', // Pool ID from API example for USDC
  },

  // --- SONIC ASSETS ---
  // --- Wallet USDC.e ---
  {
    id: 'wallet-sonic-usdc',
    name: 'Wallet USDC.e', // Name for Sonic Wallet USDC
    type: 'reserve',
    chainId: SONIC_CHAIN_ID,
    source: 'wallet',
    contractAddress: SONIC_USDCe.address,
    decimals: 6,
    underlyingTokens: [{ address: SONIC_USDCe.address }],
    apiType: 'reserve',
    logoUrl: undefined,
    allocationKey: 'PLACEHOLDER_WALLET_SONIC_USDC_KEY',
    apiTokenId: SONIC_USDCe.address.toLowerCase(),
    apiProtocolName: undefined,
    apiPoolId: undefined,
  },

  // --- Aave Sonic USDC.e Reserve ---
  {
    id: 'aave-sonic-usdc',
    name: 'Aave USDC.e Reserve',
    type: 'reserve',
    chainId: SONIC_CHAIN_ID,
    source: 'Aave Sonic',
    contractAddress: '0x29219dd400f2bf60e5a23d13be72b486d4038894', // Underlying token address (matches API request for Aave)
    decimals: 6, // Assumed USDC decimals
    underlyingTokens: [{ address: '0x29219dd400f2bf60e5a23d13be72b486d4038894' }],
    apiType: 'reserve',
    apiName: 'USDC.e Reserve', // Updated from API response
    logoUrl: '/svg/aave-logo.svg', // Placeholder - host locally
    explorerUrl: `https://sonicscan.org/token/0x29219dd400f2bf60e5a23d13be72b486d4038894`, // Link to underlying token
    allocationKey: 'USDC.e Reserve Aave Sonic', // Updated key based on apiName
    apiTokenId: '0x29219dd400f2bf60e5a23d13be72b486d4038894',
    apiProtocolName: 'Aave', // Matches API response
    apiPoolId: '0x29219dd400f2bf60e5a23d13be72b486d4038894', // Matches contractAddress used in API request
  },

  // --- Euler Sonic USDC.e Reserve ---
  {
    id: 'euler-sonic-usdc',
    name: 'Euler USDC.e Reserve', // Display name
    type: 'reserve',
    chainId: SONIC_CHAIN_ID,
    source: 'Euler Sonic',
    contractAddress: '0x196F3C7443E940911EE2Bb88e019Fd71400349D9', // Updated - Euler market/eToken address from API request
    decimals: 6, // Assumed USDC decimals
    underlyingTokens: [{ address: SONIC_USDCe.address }], // Underlying is still USDC.e
    apiType: 'reserve',
    apiName: 'eUSDC.e-3 Reserve', // Updated from API response
    logoUrl: '/svg/euler-logo.svg', // Placeholder - host locally
    explorerUrl: `https://sonicscan.org/token/${SONIC_USDCe.address}`, // Link to underlying token
    allocationKey: 'eUSDC.e-3 Reserve Euler Sonic', // Updated key based on apiName
    apiTokenId: SONIC_USDCe.address.toLowerCase(), // Refers to underlying token
    apiProtocolName: 'Euler', // Updated from API response
    apiPoolId: '0x196f3c7443e940911ee2bb88e019fd71400349d9', // Updated - Matches contractAddress used in API request
  },

  // --- Silo Sonic USDC.e Reserve ---
  {
    id: 'silo-sonic-usdc',
    name: 'Silo USDC.e Reserve', // Display name
    type: 'reserve',
    chainId: SONIC_CHAIN_ID,
    source: 'Silo Sonic',
    contractAddress: '0x322e1d5384aa4ED66AeCa770B95686271de61dc3', // Updated - Silo market/siloToken address from API request
    decimals: 6, // Assumed USDC decimals
    underlyingTokens: [{ address: SONIC_USDCe.address }], // Underlying is still USDC.e
    apiType: 'reserve',
    apiName: 'bUSDC.e-20 Reserve', // Updated from API response (base name)
    logoUrl: '/svg/silo-logo.svg', // Placeholder - host locally
    explorerUrl: `https://sonicscan.org/token/${SONIC_USDCe.address}`, // Link to underlying token
    allocationKey: 'bUSDC.e-20 Reserve Silo Sonic', // Updated key based on apiName
    apiTokenId: SONIC_USDCe.address.toLowerCase(), // Refers to underlying token
    apiProtocolName: 'Silo', // Updated from API response
    apiPoolId: '0x322e1d5384aa4ed66aeca770b95686271de61dc3', // Updated - Matches contractAddress used in API request
  },
];


// Modified function to accept optional network filter
export type NetworkFilter = 'all' | 'mantle' | 'sonic';

export const getAssetsForApi = (networkFilter: NetworkFilter = 'all'): { type: 'pool' | 'reserve'; address: Address; source?: string }[] => {
  const uniqueFunds = new Map<string, { type: 'pool' | 'reserve'; address: Address; source?: string }>();

  SUPPORTED_ASSETS.forEach(asset => {
    // Skip assets with source 'wallet'
    if (asset.source === 'wallet') {
      return;
    }

    // Apply network filter
    const assetChainId = asset.chainId;
    if (networkFilter === 'mantle' && assetChainId !== MANTLE_CHAIN_ID) {
        return;
    }
    if (networkFilter === 'sonic' && assetChainId !== SONIC_CHAIN_ID) {
        return;
    }
    // 'all' includes everything (no return)

    const fund = {
      type: asset.apiType,
      address: asset.contractAddress,
      source: asset.source,
    };

    const key = `${fund.type}-${fund.address}-${fund.source ?? 'undefined'}`;
    if (!uniqueFunds.has(key)) {
      uniqueFunds.set(key, fund);
    }
  });

  return Array.from(uniqueFunds.values());
};