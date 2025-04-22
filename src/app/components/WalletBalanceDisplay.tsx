'use client';

import React, { useState } from 'react';
import { isAddress } from 'viem';
// import { useMultipleBalances } from '@/hooks/useMultipleBalances'; // Remove hook import
import { AssetData } from '@/types'; 
import { Address } from 'viem'; // Removed unused formatUnits import
import BalanceListItem from './BalanceListItem'; // Import the new component

// Recreate assetsToCheck with specific balances
const assetsToCheck: AssetData[] = [
  {
    address: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9', 
    symbol: 'USDC',
    name: 'Wallet USDC',
    decimals: 6, 
  },
  {
    address: '0xf36afb467d1f05541d998bbbcd5f7167d67bd8fc', // lvUSDC address
    symbol: 'lvUSDC',
    name: 'Lendle USDC Supply',
    decimals: 6, 
  },
  {
    address: '0x00a55649e597d463fd212fbe48a3b40f0e227d06', // InitCapital iUSDC address
    symbol: 'iUSDC',
    name: 'InitCapital USDC Supply',
    decimals: 6, // Assuming 6 decimals, verify if needed
  },
];

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
      <h2 className="text-3xl font-bold mb-8 text-white">Token Balances</h2>

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
            {/* Render list using BalanceListItem component and the specific assets */}
            <div className="border border-[#1E293B] rounded-md overflow-hidden">
              {assetsToCheck.map((asset, index) => (
                <div key={asset.symbol} className={`${index < assetsToCheck.length - 1 ? 'border-b border-[#1E293B]' : ''}`}>
                  <BalanceListItem 
                    asset={asset} 
                    address={displayAddress} 
                  />
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
} 