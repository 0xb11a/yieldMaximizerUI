'use client';

import React from 'react';
// Remove AssetData import if not used directly, BalanceDisplayItem will be imported
// import { AssetData } from '@/types'; 
import { Address, formatUnits } from 'viem'; 
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

// Props received from the page component (Uses imported BalanceDisplayItem)
interface WalletBalanceDisplayProps {
  manualAddress: string;
  isManualAddressValid: boolean;
  onManualAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayAddress: Address | undefined;
  balanceDisplayData: BalanceDisplayItem[]; // Use imported type
}

export default function WalletBalanceDisplay({
  manualAddress,
  isManualAddressValid,
  onManualAddressChange,
  displayAddress,
  balanceDisplayData // Type is now the imported one
}: WalletBalanceDisplayProps) {

  const addressDisplayText = displayAddress
     ? `${displayAddress.substring(0, 6)}...${displayAddress.substring(displayAddress.length - 4)}`
     : 'N/A';

  // Helper function simplified - only handles bigint | undefined | null
  const formatBalanceValue = (value: bigint | undefined | null, decimals: number): string => {
    if (value === null || value === undefined) return '0.00'; 
    try {
        // Direct formatting with formatUnits
        const formatted = formatUnits(value, decimals);
        // Use toLocaleString for potentially better display formatting (commas, etc.)
        return parseFloat(formatted).toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 10 // Increase max digits for precision
        });
    } catch (error) {
      console.error("Error formatting balance value:", value, error);
      return 'Error'; // Indicate formatting error
    }
  };

  return (
    <div className="card p-8">
      <h2 className="text-xl font-bold mb-8 text-white">Token Balances</h2>

      {/* Input Section now uses props for value and handlers */}
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

      {/* Balance Display Section - Renders data from props */}
      {displayAddress && (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Balances for: <span className="text-white font-mono">{addressDisplayText}</span></h3> 
            
            {/* === START: Modified List Rendering === */}
            <div className="space-y-1 lg:space-y-0">
              
              {/* Add Desktop Headers */} 
              {balanceDisplayData.length > 0 && (
                 <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                    {/* Asset Header */} 
                    <div className="flex-[2] p-1"><span>Asset</span></div>
                    {/* Balance Header */} 
                    <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                       <span className="w-24 text-right">Balance</span>
                    </div>
                 </div>
              )}

              {/* Map Items */}
              {balanceDisplayData.length > 0 ? balanceDisplayData.map((balInfo, index) => {
                 // Use the simplified helper function
                 const displayBalance = formatBalanceValue(balInfo.value, balInfo.decimals);
                 const isFormatError = displayBalance === 'Error'; 

                 return (
                    // Apply item container styling from InvestmentCalculator
                    <div key={`${balInfo.symbol}-${balInfo.name}-${index}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-b last:border-b-0`}>
                      {/* Asset Name section */}
                      <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                         {/* Use passed color */}
                         <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: balInfo.color }}/>
                         {/* Use similar text styling */}
                         <span className="text-white font-medium break-words">
                           {`${balInfo.name} (${balInfo.symbol})`}
                         </span>
                      </div>
                      
                      {/* --- Mobile View --- */} 
                      <div className="block lg:hidden pl-5 space-y-1 text-xs">
                          <div className="flex justify-between">
                              <span className='text-[#9CA3AF]'>Balance:</span>
                           {balInfo.isError || isFormatError ? ( // Check for fetch error OR format error
                             <span className="text-red-500 text-xs">Error</span>
                           ) : balInfo.isLoading ? (
                             <span className="text-gray-500 text-xs animate-pulse">...</span>
                           ) : (
                                <span className="text-white font-medium">{`$${displayBalance}`}</span> // Use formatted value
                           )}
                         </div>
                       </div>

                      {/* --- Desktop View --- */} 
                      <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                           {/* Balance/Status Column */} 
                           <div className="w-24 text-right"> {/* Match width roughly */} 
                               {balInfo.isError || isFormatError ? ( // Check for fetch error OR format error
                                 <span className="text-red-500 text-xs">Error</span>
                               ) : balInfo.isLoading ? (
                                 <span className="text-gray-500 text-xs animate-pulse">...</span>
                               ) : (
                                 <span className="text-white">{`$${displayBalance}`}</span> // Use formatted value
                               )}
                           </div>
                      </div>
                     </div>
                 );
              }) : (
                 <p className="text-sm text-gray-400 p-2 md:p-3">No balances found.</p> 
              )}
            </div>
            {/* === END: Modified List Rendering === */}

        </div>
      )}
    </div>
  );
} 