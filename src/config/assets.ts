// src/config/assets.ts
import { Address } from 'viem';
// Removed erc20Abi import as balanceDisplayConfig is removed
// import { erc20Abi } from '@/config/constants'; 

// Represents basic info about a token
export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
}

// New Asset Configuration Structure
export interface AssetConfig {
  id: string; // Unique ID for the config entry (e.g., 'lendle-usdc', 'pool-example-ab')
  name: string; // Display name (e.g., 'Lendle USDC', 'Example Pool A/B')
  type: 'pool' | 'reserve'; // Type of the asset (pool or reserve)
  source?: string; // Protocol source (e.g., 'lendle') - Keep for internal logic/display?
  logoUrl?: string; // Optional URL for the asset's logo

  // --- Addresses ---
  // Address of the main pool or reserve contract (or underlying token if that's the API identifier)
  contractAddress: Address;

  // Underlying base token(s) involved
  underlyingTokens: TokenInfo[];

  // Optional: Token representing the deposit/liquidity (e.g., lvUSDC, LP token)
  // Keep for potential future use or internal logic, but not for balance fetching
  receiptToken?: TokenInfo;

  // Optional: Explorer URL for the asset
  explorerUrl?: string;

  // --- Balance Display Configuration (REMOVED) ---
  // balanceDisplayConfig?: { ... }; // Removed

  // --- API Configuration ---
  // Type to send to the /fetch-pool-data API (Potentially removable if fetchPoolAndReserveData is removed later)
  apiType: 'pool' | 'reserve';
  apiName?: string; // Optional: Name expected in the allocation API response if different from display 'name'
  allocationKey: string; // Unique key from the /calculate-optimal-allocation API response

  // --- NEW: Fields for mapping portfolio API response ---
  apiTokenId?: string;      // Token `id` from portfolio API (usually the underlying token address)
  apiProtocolName?: string; // `protocol` name from portfolio API (e.g., 'lendle.xyz')
  apiPoolId?: string;       // `poolId` from portfolio API
}


// --- Define Common Tokens (Reusable) ---
export const MANTLE_USDC: TokenInfo = {
    address: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9',
    symbol: 'USDC',
    decimals: 6,
};
export const MANTLE_LVUSDC: TokenInfo = {
    address: '0xf36afb467d1f05541d998bbbcd5f7167d67bd8fc',
    symbol: 'lvUSDC',
    decimals: 6,
};
export const MANTLE_USDT: TokenInfo = {
    address: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
    symbol: 'USDT',
    decimals: 6,
};
export const INITCAPITAL_INUSDC: TokenInfo = {
    address: '0x00a55649e597d463fd212fbe48a3b40f0e227d06',
    symbol: 'inUSDC',
    decimals: 6,
};
// --- Removed Placeholders for Merchant Moe Pool ---

// --- Master Asset Configuration List ---
export const SUPPORTED_ASSETS: AssetConfig[] = [
  // --- Lendle USDC Reserve ---
  {
    id: 'lendle-usdc',
    name: 'Lendle USDC Reserve',
    type: 'reserve',
    source: 'Lendle Mantle', // Keep internal source?
    contractAddress: MANTLE_USDC.address, // Still useful for internal logic?
    underlyingTokens: [MANTLE_USDC],
    receiptToken: MANTLE_LVUSDC,
    apiType: 'reserve',
    apiName: 'USDC Reserve', // For allocation API
    logoUrl: '/svg/lendle-token.svg',
    explorerUrl: 'https://mantlescan.xyz/token/0xf36afb467d1f05541d998bbbcd5f7167d67bd8fc',
    allocationKey: 'USDC Reserve Lendle Mantle',
    // NEW: API Mapping Fields (Based on API example)
    apiTokenId: MANTLE_USDC.address.toLowerCase(),
    apiProtocolName: 'lendle.xyz',
    apiPoolId: '0xcfa5ae7c2ce8fadc6426c1ff872ca45378fb7cf3',
    // balanceDisplayConfig: { ... }, // REMOVED
  },
  // --- Wallet USDC ---
  {
    id: 'wallet-usdc',
    name: 'Wallet USDC',
    type: 'reserve', // Conceptually a reserve
    source: 'wallet', // Keep internal source
    // Use underlying token address as identifier if needed internally
    contractAddress: MANTLE_USDC.address, 
    underlyingTokens: [MANTLE_USDC],
    receiptToken: undefined,
    apiType: 'reserve', // For allocation API (if wallet is considered a source)
    logoUrl: undefined,
    // Wallet likely won't be in allocation API response, but keep placeholder
    allocationKey: 'PLACEHOLDER_WALLET_USDC_KEY', 
    // NEW: API Mapping Fields (API returns wallet balance without protocol/poolId)
    apiTokenId: MANTLE_USDC.address.toLowerCase(),
    apiProtocolName: undefined, // Wallet balance doesn't have a protocol in API response
    apiPoolId: undefined,       // Wallet balance doesn't have a poolId
    // balanceDisplayConfig: { ... }, // REMOVED
  },
  // --- Init Capital USDC Supply ---
  {
    id: 'initcapital-usdc',
    name: 'InitCapital USDC Reserve',
    type: 'reserve',
    source: 'Init Mantle', // Keep internal source
    apiName: 'USDC Reserve', // For allocation API
    contractAddress: MANTLE_USDC.address, // Underlying token address
    underlyingTokens: [MANTLE_USDC],
    receiptToken: INITCAPITAL_INUSDC,
    apiType: 'reserve',
    logoUrl: '/svg/initCapital.ico',
    explorerUrl: 'https://mantlescan.xyz/token/0x00a55649e597d463fd212fbe48a3b40f0e227d06',
    allocationKey: 'USDC Reserve Init Mantle',
    // NEW: API Mapping Fields (Based on API example)
    apiTokenId: MANTLE_USDC.address.toLowerCase(),
    apiProtocolName: 'INIT Capital',
    apiPoolId: '0xf82cbcab75c1138a8f1f20179613e7c0c8337346',
    // balanceDisplayConfig: { ... }, // REMOVED
  },
  // --- Merchant Moe USDC/USDT Pool ---
  // NOTE: This config represents the *pool* concept internally.
  // The API returns *individual token balances* within the pool.
  // We'll map the USDC part of the pool balance using this config.
  {
    id: 'merchantmoe-usdc-usdt',
    name: 'Merchant Moe USDC-USDT Pool',
    type: 'pool',
    source: 'Merchant Moe Mantle', // Keep internal source
    contractAddress: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec', // Pool address
    underlyingTokens: [MANTLE_USDC, MANTLE_USDT],
    apiName: 'USDC-USDT', // For allocation API
    logoUrl: '/svg/merchant-moe-logo.ea3ba2549690769a8d68.png',
    // Receipt token info might still be useful internally
    receiptToken: {
        address: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec',
        symbol: 'MM-LP-USDC/USDT',
        decimals: 18,
    },
    apiType: 'pool',
    allocationKey: 'USDC-USDT Merchant Moe Mantle',
    explorerUrl: 'https://mantlescan.xyz/address/0x48c1a89af1102cad358549e9bb16ae5f96cddfec',
    // NEW: API Mapping Fields - Map the *USDC component* using these
    // We will aggregate USDC + USDT amounts from API in the component logic
    apiTokenId: MANTLE_USDC.address.toLowerCase(), // Match the USDC token ID
    apiProtocolName: 'Merchant Moe',
    apiPoolId: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec', // Pool ID from API example for USDC
    // balanceDisplayConfig: { ... }, // REMOVED
  },
  // Removed example-pool and lendle-reserve-unknown placeholders
];


// Keep getAssetsForApi for now, as fetchPoolAndReserveData might still be needed
// for the allocation calculation API which might require different data structure.
// Review if this can be removed after allocation logic is confirmed.
export const getAssetsForApi = (): { type: 'pool' | 'reserve'; address: Address; source?: string }[] => {
  const uniqueFunds = new Map<string, { type: 'pool' | 'reserve'; address: Address; source?: string }>();

  SUPPORTED_ASSETS.forEach(asset => {
    // Skip assets with source 'wallet' as they don't interact with allocation API
    if (asset.source === 'wallet') {
      return;
    }

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

// REMOVED getAssetsForBalanceDisplay function
/*
export const getAssetsForBalanceDisplay = (): AssetConfig[] => {
   return SUPPORTED_ASSETS.filter(asset => !!asset.balanceDisplayConfig);
};
*/ 