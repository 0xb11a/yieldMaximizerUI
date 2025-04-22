'use client';

import React from 'react';
import { AssetData } from '@/types'; 
import { Address, formatUnits } from 'viem'; 

// Interface for the balance data passed from the page
interface BalanceDisplayItem extends AssetData {
  value: bigint | undefined | null; // Raw bigint value from hook
  isLoading: boolean;
  isError: boolean;
}

// Props received from the page component
interface WalletBalanceDisplayProps {
  manualAddress: string;
  isManualAddressValid: boolean;
  onManualAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowManualBalances: () => void;
  displayAddress: Address | undefined;
  balanceDisplayData: BalanceDisplayItem[]; // Array of balance data to display
}

export default function WalletBalanceDisplay({
  manualAddress,
  isManualAddressValid,
  onManualAddressChange,
  onShowManualBalances,
  displayAddress,
  balanceDisplayData
}: WalletBalanceDisplayProps) {

  const addressDisplayText = displayAddress
     ? `${displayAddress.substring(0, 6)}...${displayAddress.substring(displayAddress.length - 4)}`
     : 'N/A';

  return (
    <div className="card p-8 mb-12">
      <h2 className="text-3xl font-bold mb-8 text-white">Token Balances</h2>

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
          
          <button
            onClick={onShowManualBalances}
            disabled={!isManualAddressValid || manualAddress === ''}
            className="w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Show Balances
          </button>
        </div>
      </div>
      {/* End Input Section */}

      {/* Balance Display Section - Renders data from props */}
      {displayAddress && (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Balances for: <span className="text-white font-mono">{addressDisplayText}</span></h3> 
            {/* Render list using data from balanceDisplayData prop */}
            <div className="border border-[#1E293B] rounded-md overflow-hidden">
              {balanceDisplayData.length > 0 ? balanceDisplayData.map((balInfo, index) => {
                 const formattedBalance = formatUnits(balInfo.value ?? BigInt(0), balInfo.decimals);
                 return (
                    <div key={balInfo.symbol} className={`${index < balanceDisplayData.length - 1 ? 'border-b border-[#1E293B]' : ''}`}>
                       {/* Render balance list item directly */}
                       <div className="flex justify-between items-center text-sm p-2 md:p-3 hover:bg-[#1E293B] transition-colors">
                         {/* Display Name (Symbol) */}
                         <span className="text-gray-300 font-medium mr-2 flex-shrink-0"> 
                           {`${balInfo.name} (${balInfo.symbol})`}
                         </span>
                         {/* Balance/Status */}
                         <div className="text-right">
                           {balInfo.isError ? (
                             <span className="text-red-500 text-xs">Error</span>
                           ) : balInfo.isLoading && displayAddress ? (
                             <span className="text-gray-500 text-xs animate-pulse">...</span>
                           ) : displayAddress ? (
                             <span className="text-white font-mono">{parseFloat(formattedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                           ) : (
                             <span className="text-gray-500">-</span>
                           )}
                         </div>
                       </div>
                     </div>
                 );
              }) : (
                 <p className="text-sm text-gray-400 p-2 md:p-3">No balances configured to display.</p> 
              )}
            </div>
        </div>
      )}
    </div>
  );
} 