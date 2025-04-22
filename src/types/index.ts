export interface AssetData {
  assetId?: string
  assetType?: string
  decimals: number
  isRebasing?: boolean
  name: string
  protocolId?: string
  symbol: string
  // Ensure address is compatible with viem/wagmi Address type (`0x${string}`)
  // or the zero address '0x000...' for native currency.
  address: string 
}

// You can add other shared types here as your project grows. 