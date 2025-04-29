// src/config/assets.ts
import { Address } from 'viem';
import { erc20Abi } from '@/config/constants'; // Import ABI
import initLensAbi from './abis/InitLens.json'; // Import InitLens ABI
// import posManagerAbi from './abis/PosManager.json'; // Removed unused import

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
  source?: string; // Protocol source (e.g., 'lendle')
  logoUrl?: string; // Optional URL for the asset's logo

  // --- Addresses ---
  // Address of the main pool or reserve contract (or underlying token if that's the API identifier)
  contractAddress: Address;

  // Underlying base token(s) involved
  // Reserve: Usually one token (e.g., USDC)
  // Pool: Two or more tokens (e.g., [TokenA, TokenB])
  underlyingTokens: TokenInfo[];

  // Optional: Token representing the deposit/liquidity (e.g., lvUSDC, LP token)
  receiptToken?: TokenInfo;

  // Optional: Explorer URL for the asset
  explorerUrl?: string;

  // --- Balance Display Configuration --- 
  // Specifies which token balance to fetch and display in UI
  balanceDisplayConfig?: {
    tokenAddress: Address; // Address of token to fetch balance for
    tokenSymbol: string;   // Symbol to display
    tokenDecimals: number; // Decimals for formatting
    hook: 'useBalance' | 'useReadContract'; // Hook to use
    args?: { abi: ReadonlyArray<unknown>; functionName: string; }; // Args for useReadContract - Replaced 'any' with ReadonlyArray<unknown>
  };

  // --- API Configuration --- 
  // Type to send to the /fetch-pool-data API
  apiType: 'pool' | 'reserve';
  apiName?: string; // Optional: Name expected in the API response if different from display 'name'
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
    decimals: 6, // Assuming USDT also has 6 decimals on Mantle
};
export const INITCAPITAL_INUSDC: TokenInfo = {
    address: '0x00a55649e597d463fd212fbe48a3b40f0e227d06',
    symbol: 'inUSDC',
    decimals: 6, // CORRECTED: Decimals confirmed as 6
};
// --- Removed Placeholders for Merchant Moe Pool ---

// --- Master Asset Configuration List ---
export const SUPPORTED_ASSETS: AssetConfig[] = [
  // --- Lendle USDC Reserve --- 
  {
    id: 'lendle-usdc',
    name: 'Lendle USDC Reserve',
    type: 'reserve',
    source: 'lendle',
    contractAddress: MANTLE_USDC.address, 
    underlyingTokens: [MANTLE_USDC], 
    receiptToken: MANTLE_LVUSDC,    
    apiType: 'reserve',
    logoUrl: '/svg/lendle-token.svg', // Updated path to SVG
    // Add explorer URL for the lvUSDC token
    explorerUrl: 'https://mantlescan.xyz/token/0xf36afb467d1f05541d998bbbcd5f7167d67bd8fc', 
    // Display the balance of the receipt token (lvUSDC)
    balanceDisplayConfig: {
        tokenAddress: MANTLE_LVUSDC.address,
        tokenSymbol: MANTLE_LVUSDC.symbol,
        tokenDecimals: MANTLE_LVUSDC.decimals,
        hook: 'useReadContract',
        args: { abi: erc20Abi, functionName: 'balanceOf' },
    },
  },
  // --- Wallet USDC (can also act as a reserve source) --- 
  {
    id: 'wallet-usdc',
    name: 'Wallet USDC',
    type: 'reserve', 
    source: 'wallet', 
    contractAddress: '0x0000000000000000000000000000000000000000',
    underlyingTokens: [MANTLE_USDC],
    receiptToken: undefined, 
    apiType: 'reserve', 
    logoUrl: undefined, // No logo for wallet USDC? Keeping undefined.
    // Display the balance of the underlying token (USDC)
    balanceDisplayConfig: {
        tokenAddress: MANTLE_USDC.address,
        tokenSymbol: MANTLE_USDC.symbol,
        tokenDecimals: MANTLE_USDC.decimals,
        hook: 'useBalance',
    },
  },
  // --- Init Capital USDC Supply --- 
  {
    id: 'initcapital-usdc',
    name: 'InitCapital USDC Reserve',
    type: 'reserve',
    source: 'init',
    apiName: 'init USDC Reserve',
    // API identifies this reserve by the underlying token address
    contractAddress: MANTLE_USDC.address,
    underlyingTokens: [MANTLE_USDC],
    receiptToken: INITCAPITAL_INUSDC,
    apiType: 'reserve',
    logoUrl: '/svg/initCapital.ico', // Updated path to ICO
    // Add explorer URL for the inUSDC token
    explorerUrl: 'https://mantlescan.xyz/token/0x00a55649e597d463fd212fbe48a3b40f0e227d06', 
    // Display the balance by calling InitLens.getInitPosInfos
    balanceDisplayConfig: {
        tokenAddress: '0x4725e220163e0b90b40dd5405ee08718523dea78', // InitLens contract address
        tokenSymbol: INITCAPITAL_INUSDC.symbol, // Still display as inUSDC
        tokenDecimals: INITCAPITAL_INUSDC.decimals, // Use inUSDC decimals for display
        hook: 'useReadContract',
        args: { 
            abi: initLensAbi,
            functionName: 'getInitPosInfos', 
            // NOTE: Actual call requires `_initPosIds` argument.
            // The UI component needs to fetch these IDs separately using PosManager 
            // (0x0e7401707CD08c03CDb53DAEF3295DDFb68BBa92) and provide them here.
            // Then, it needs to process the returned PosInfo[] to sum the relevant USDC amounts.
        },
    },
  },
  // --- Merchant Moe USDC/USDT Pool --- 
  {
    id: 'merchantmoe-usdc-usdt',
    name: 'Merchant Moe USDC-USDT Pool',
    type: 'pool',
    source: 'merchantmoe',
    // Pool contract address confirmed from screenshot
    contractAddress: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec',
    underlyingTokens: [MANTLE_USDC, MANTLE_USDT],
    logoUrl: '/svg/merchant-moe-logo.ea3ba2549690769a8d68.png', // Updated path
    // TODO: Verify LP token address, symbol, and decimals. Assuming LP address = pool address for now.
    receiptToken: {
        address: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec', // Assuming LP address = pool address
        symbol: 'MM-LP-USDC/USDT', // Placeholder symbol
        decimals: 18, // Placeholder decimals
    }, 
    apiType: 'pool',
    // Add explorer URL for the pool contract
    explorerUrl: 'https://mantlescan.xyz/address/0x48c1a89af1102cad358549e9bb16ae5f96cddfec', 
    // NOTE: Balance for this LBPair pool requires complex calculation.
    // Use the `useMMPoolBalance` hook directly in the UI component.
    /* // Temporarily disable balance display for this pool
    balanceDisplayConfig: {
        tokenAddress: '0x48c1a89af1102cad358549e9bb16ae5f96cddfec', // Assuming LP address = pool address
        tokenSymbol: 'MM-LP-USDC/USDT', // Placeholder symbol
        tokenDecimals: 18, // Placeholder decimals
        // TODO: Verify correct hook for LP token balance (useBalance or useReadContract?)
        hook: 'useBalance', 
    },
    */
  },
  // Removed example-pool and lendle-reserve-unknown placeholders
];


export const getAssetsForApi = (): { type: 'pool' | 'reserve'; address: Address; source?: string }[] => {
  const uniqueFunds = new Map<string, { type: 'pool' | 'reserve'; address: Address; source?: string }>();

  SUPPORTED_ASSETS.forEach(asset => {
    // Skip assets with source 'wallet'
    if (asset.source === 'wallet') {
      return; // Skip this asset
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


export const getAssetsForBalanceDisplay = (): AssetConfig[] => {
   return SUPPORTED_ASSETS.filter(asset => !!asset.balanceDisplayConfig);
}; 