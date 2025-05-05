import { Address } from 'viem';
import { TokenInfo } from '@/config/assets'; // Assuming TokenInfo is exported

export interface AssetData {
  assetId?: string
  assetType?: string
  decimals: number
  isRebasing?: boolean
  name: string
  protocolId?: string
  // Ensure address is compatible with viem/wagmi Address type (`0x${string}`)
  // or the zero address '0x000...' for native currency.
  address: string 
}

// Consolidated interface for displaying balances in the UI
export interface BalanceDisplayItem {
  id: string; 
  name: string; 
  decimals: number; 
  address: Address; // Address of the token whose balance is shown OR underlying token for MM pool
  
  // Value should now consistently be bigint or undefined/null
  value: number | undefined; 

  isLoading: boolean;
  isError: boolean;
  color: string; 
  underlyingTokens?: TokenInfo[]; // Keep for potential future use
  // Inherit other fields from AssetData if necessary, e.g., using `extends AssetData` 
  // if AssetData is imported and defined appropriately.
}

// Type for wallet balance data used in calculations
export interface WalletBalance {
    address: Address; // Address of the token 
    name: string;
    decimals: number;
    value: bigint; 
}

// You can add other shared types here as your project grows. 