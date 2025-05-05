'use client';

import React from 'react';
// Remove AssetData import if not used directly, BalanceDisplayItem will be imported
// import { AssetData } from '@/types'; 
import { Address } from 'viem';
// Import the shared type definition
import { BalanceDisplayItem } from '@/types';

// --- REMOVE Local Interface Definition --- 
/*
interface BalanceDisplayItem extends AssetData {
  value: bigint | undefined | null; 
  isLoading: boolean;
  isError: boolean;
  color: string; 
}
*/

// --- MODIFIED Props Interface ---
interface WalletBalanceDisplayProps {
  manualAddress: string;
  isManualAddressValid: boolean;
  onManualAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayAddress: Address | undefined;
  balanceDisplayData: BalanceDisplayItem[]; // Uses imported type (value is now number | undefined)
  // --- NEW Props ---
  isLoading: boolean; // Overall loading state for the API call
  isError: boolean;   // Overall error state for the API call
  error: string | null; // Error message from API call
}
// --- END MODIFICATION ---

export default function WalletBalanceDisplay({
  manualAddress,
  isManualAddressValid,
  onManualAddressChange,
  displayAddress,
  balanceDisplayData,
  // --- NEW Props Deconstructed ---
  isLoading,
  isError,
  error
}: WalletBalanceDisplayProps) {

  const addressDisplayText = displayAddress
     ? `${displayAddress.substring(0, 6)}...${displayAddress.substring(displayAddress.length - 4)}`
     : 'N/A';

  // --- MODIFIED Helper Function ---
  // Now formats the amountUsd (number) directly as currency
  const formatBalanceValue = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '$0.00';
    try {
        // Use toLocaleString for currency formatting
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 // Adjust max digits if needed for very small USD values
        });
    } catch (err) {
      console.error("Error formatting balance value (USD):", value, err);
      return 'Error'; // Indicate formatting error
    }
  };
  // --- END MODIFICATION ---

  return (
    <div className="card p-8">
      <h2 className="text-xl font-bold mb-8 text-white">Token Balances</h2>

      {/* Input Section */}
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
              onChange={onManualAddressChange}
              className={`w-full px-3 py-2 bg-[#111827] border ${
                !isManualAddressValid && manualAddress !== '' ? 'border-red-500' : 'border-[#374151]'
              } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] placeholder-gray-500`}
              placeholder="0x..."
            />
            {!isManualAddressValid && manualAddress !== '' && (
              <p className="text-red-500 text-xs mt-1">Invalid address format.</p>
            )}
          </div>
        </div>
      </div>
      {/* End Input Section */}

      {/* Balance Display Section - Renders data based on overall loading/error state */}
      {displayAddress && (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Balances for: <span className="text-white font-mono">{addressDisplayText}</span></h3>

            {/* --- MODIFIED: Handle Overall Loading/Error States --- */}
            {isLoading && (
                <div className="text-center py-4">
                    <span className="text-gray-400 animate-pulse">Loading balances...</span>
                </div>
            )}
            {isError && (
                <div className="text-center py-4 px-2 bg-red-900/20 border border-red-700 rounded-md">
                    <p className="text-red-400 text-sm font-medium">Error loading balances:</p>
                    <p className="text-red-500 text-xs mt-1">{error || 'An unknown error occurred.'}</p>
                </div>
            )}
            {/* --- END MODIFICATION --- */}

            {/* Display list only if NOT loading and NO error */}
            {!isLoading && !isError && (
              <div className="space-y-1 lg:space-y-0">

                {/* Add Desktop Headers */}
                {balanceDisplayData.length > 0 && (
                   <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                      <div className="flex-[2] p-1"><span>Asset</span></div>
                      <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                         <span className="w-24 text-right">Balance (USD)</span> {/* Changed Header */}
                      </div>
                   </div>
                )}

                {/* Map Items */}
                {balanceDisplayData.length > 0 ? balanceDisplayData.map((balInfo, index) => {
                   // Use the modified helper function for USD amount
                   const displayBalance = formatBalanceValue(balInfo.value);
                   const isFormatError = displayBalance === 'Error'; 

                   return (
                      <div key={`${balInfo.symbol}-${balInfo.name}-${index}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-b last:border-b-0`}>
                        {/* Asset Name section */}
                        <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                           <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: balInfo.color }}/>
                           <span className="text-white font-medium break-words">
                             {`${balInfo.name} (${balInfo.symbol})`}
                           </span>
                        </div>

                        {/* --- Mobile View --- */}
                        <div className="block lg:hidden pl-5 space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className='text-[#9CA3AF]'>Balance (USD):</span> {/* Changed Label */}
                             {/* Display value directly, error handling is now global */}
                             {isFormatError ? (
                               <span className="text-red-500 text-xs">Format Error</span>
                             ) : (
                                  <span className="text-white font-medium">{displayBalance}</span>
                             )}
                           </div>
                         </div>

                        {/* --- Desktop View --- */}
                        <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                             {/* Balance/Status Column */}
                             <div className="w-24 text-right"> {/* Match width roughly */}
                                 {/* Display value directly, error handling is now global */}
                                 {isFormatError ? (
                                   <span className="text-red-500 text-xs">Format Error</span>
                                 ) : (
                                   <span className="text-white">{displayBalance}</span>
                                 )}
                             </div>
                        </div>
                       </div>
                   );
                }) : (
                   <p className="text-sm text-gray-400 p-2 md:p-3 text-center">No supported asset balances found for this address.</p> // Updated message
                )}
              </div>
            )}
            {/* === END: Modified List Rendering === */}

        </div>
      )}
      {!displayAddress && !manualAddress && (
          <p className="text-sm text-gray-500 text-center pt-4">Enter a wallet address above to view balances.</p>
      )}
    </div>
  );
} 