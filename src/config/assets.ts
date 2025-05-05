// src/config/assets.ts
import { Address } from 'viem';

export interface TokenInfo {
  address: Address;
}

// New Asset Configuration Structure
export interface AssetConfig {
  id: string; // Unique ID for the config entry (e.g., 'lendle-usdc', 'pool-example-ab')
  name: string; // Display name (e.g., 'Lendle USDC', 'Example Pool A/B')
  type: 'pool' | 'reserve'; // Type of the asset (pool or reserve)
  decimals: number; // Decimals of the primary underlying token
  source?: string; 
  logoUrl?: string;    
  contractAddress: Address; // Address of the main pool or reserve contract (or underlying token if that's the API identifier)
  underlyingTokens: TokenInfo[];  
  explorerUrl?: string;  
  apiType: 'pool' | 'reserve';
  apiName?: string; // Optional: Name expected in the allocation API response if different from display 'name'
  allocationKey: string; // Unique key from the /calculate-optimal-allocation API response 
  apiTokenId?: string;      // Token `id` from portfolio API (usually the underlying token address)
  apiProtocolName?: string; // `protocol` name from portfolio API (e.g., 'lendle.xyz')
  apiPoolId?: string;       // `poolId` from portfolio API
}


// --- Common Tokens ---
export const MANTLE_USDC: TokenInfo = {
    address: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9',
};


// --- Master Asset Configuration List ---
export const SUPPORTED_ASSETS: AssetConfig[] = [
  // --- Lendle USDC Reserve ---
  {
    id: 'lendle-usdc',
    name: 'Lendle USDC Reserve',
    type: 'reserve',
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
  // --- Wallet USDC ---
  {
    id: 'wallet-usdc',
    name: 'Wallet USDC',
    type: 'reserve', // Conceptually a reserve
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
  // --- Init Capital USDC Supply ---
  {
    id: 'initcapital-usdc',
    name: 'InitCapital USDC Reserve',
    type: 'reserve',
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
];


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