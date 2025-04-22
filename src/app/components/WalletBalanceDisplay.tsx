'use client';

import React, { useState } from 'react';
import { isAddress } from 'viem';
// import { useMultipleBalances } from '@/hooks/useMultipleBalances'; // Remove hook import
import { AssetData } from '@/types'; 
import { Address } from 'viem'; // Removed unused formatUnits import
import BalanceListItem from './BalanceListItem'; // Import the new component

// --- Configuration (Asset List remains) ---
const assetsToCheck: AssetData[] = [
  { address: '0x0000000000000000000000000000000000000000', symbol: 'MNT', name: 'Mantle', decimals: 18 },
  { address: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { address: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  { address: '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8', symbol: 'WMNT', name: 'Wrapped Mantle', decimals: 18 },
  { address: '0xcabae6f6ea1ecab08ad02fe02ce9a44f09aebfa2', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  { address: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead1111', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  { address: '0xcda86a272531e8640cd7f1a92c01839911b90bb0', symbol: 'mETH', name: 'Mantle Staked Ether', decimals: 18 },
  { address: '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34', symbol: 'USDE', name: 'Ethena USDe', decimals: 18 },
  { address: '0xc96de26018a54d51c097160568752c4e3bd6c364', symbol: 'FBTC', name: 'Fragment BTC', decimals: 8 },
  { address: '0xe6829d9a7ee3040e1276fa75293bde931859e8fa', symbol: 'cmETH', name: 'ClayStack Mantle Staked Ether', decimals: 18 },
  { address: '0x00000000efe302beaa2b3e6e1b18d08d69a9012a', symbol: 'AUSD', name: 'Alchemix USD', decimals: 6 },
  { address: '0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2', symbol: 'sUSDe', name: 'Staked USDe', decimals: 18 },
];
// --- End Configuration ---

export default function WalletBalanceDisplay() {
  const [manualAddress, setManualAddress] = useState<string>('');
  const [displayAddress, setDisplayAddress] = useState<Address | undefined>(undefined);
  const [isManualAddressValid, setIsManualAddressValid] = useState<boolean>(true);

  // Remove balances fetching via hook
  // const balances = useMultipleBalances(assetsToCheck, displayAddress);

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setManualAddress(newAddress);
    const isValid = newAddress === '' || isAddress(newAddress);
    setIsManualAddressValid(isValid);
    if (!isValid) {
        setDisplayAddress(undefined);
    }
  };

  const handleShowManualBalances = () => {
     if (isAddress(manualAddress)) {
        setDisplayAddress(manualAddress as Address);
        setIsManualAddressValid(true);
     } else {
        setIsManualAddressValid(false);
        setDisplayAddress(undefined);
     }
  };

  const addressDisplayText = displayAddress
     ? `${displayAddress.substring(0, 6)}...${displayAddress.substring(displayAddress.length - 4)}`
     : 'N/A';

  // Loading/Error states are now handled within BalanceListItem
  // const isAnyLoading = balances.some(b => b.isLoading);
  // const isAnyError = balances.some(b => b.isError);


  return (
    <div className="card p-8 mb-12">
      <h2 className="text-3xl font-bold mb-8 text-white">Wallet Balances</h2>

      {/* Input Section container */}
      <div className="mb-8"> 
        <div className="flex flex-col gap-4"> 
          <div> 
            <label htmlFor="walletAddressInput" className="block text-sm font-medium text-[#9CA3AF] mb-1">
              Enter Wallet Address
            </label>
            <input
              type="text"
              id="walletAddressInput"
              value={manualAddress}
              onChange={handleManualAddressChange}
              className={`w-full px-3 py-2 bg-[#111827] border ${ 
                !isManualAddressValid && manualAddress !== '' ? 'border-red-500' : 'border-[#374151]'
              } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] placeholder-gray-500`}
              placeholder="0x..."
            />
            {!isManualAddressValid && manualAddress !== '' && (
              <p className="text-red-500 text-xs mt-1">Invalid address format.</p>
            )}
          </div>
          
          <button
            onClick={handleShowManualBalances}
            disabled={!isManualAddressValid || manualAddress === ''}
            className="w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Show Balances
          </button>
        </div>
      </div>
      {/* End Input Section */}

      {/* Balance Display Section */}
      {displayAddress && (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Balances for: <span className="text-white font-mono">{addressDisplayText}</span></h3> 
            {/* Render list using BalanceListItem component */} 
            <div className="border border-[#1E293B] rounded-md overflow-hidden">
              {assetsToCheck.length > 0 ? assetsToCheck.map((asset, index) => (
                // Add border between items using :not(:last-child) approach if needed or check index
                <div key={asset.symbol} className={`${index < assetsToCheck.length - 1 ? 'border-b border-[#1E293B]' : ''}`}>
                  <BalanceListItem 
                    asset={asset} 
                    address={displayAddress} 
                  />
                </div>
              )) : (
                <p className="text-sm text-gray-400 p-2 md:p-3">No assets configured to check.</p>
              )}
            </div>
        </div>
      )}
    </div>
  );
} 