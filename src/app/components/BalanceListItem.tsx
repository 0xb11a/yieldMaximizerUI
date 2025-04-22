'use client';

import React from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { AssetData } from '@/types';
import { Address, formatUnits } from 'viem';
import { erc20Abi } from '@/config/constants'; // Assuming ABI is in src/config/constants.ts

interface BalanceListItemProps {
  asset: AssetData;
  address?: Address;
}

export default function BalanceListItem({ asset, address }: BalanceListItemProps) {
  const isNative = asset.address.toLowerCase() === '0x0000000000000000000000000000000000000000';
  const tokenAddress = asset.address as Address; 
  const validAddress = address && address !== '0x' ? address : undefined;

  // Fetch native balance
  const { 
    data: nativeBalanceData, 
    isError: isNativeError, 
    isLoading: isNativeLoading 
  } = useBalance({
    address: validAddress,
    query: { 
      enabled: isNative && !!validAddress, // Use query.enabled
    },
  });

  // Fetch ERC20 balance
  const { 
    data: erc20BalanceData, 
    isError: isErc20Error, 
    isLoading: isErc20Loading 
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: validAddress ? [validAddress] : undefined,
    query: { 
      enabled: !isNative && !!validAddress, // Use query.enabled
    },
  });

  const isLoading = isNative ? isNativeLoading : isErc20Loading;
  const isError = isNative ? isNativeError : isErc20Error;

  const balanceRaw = isNative
    ? nativeBalanceData?.value ?? BigInt(0)
    : (erc20BalanceData as bigint) ?? BigInt(0);

  const formattedBalance = formatUnits(balanceRaw, asset.decimals);

  return (
    // List item styling copied from WalletBalanceDisplay
    <div className="flex justify-between items-center text-sm p-2 md:p-3 hover:bg-[#1E293B] transition-colors">
      {/* Display Name (Symbol) */}
      <span className="text-gray-300 font-medium mr-2 flex-shrink-0"> 
        {`${asset.name} (${asset.symbol})`}
      </span>
      {/* Balance/Status */}
      <div className="text-right">
        {isError ? (
          <span className="text-red-500 text-xs">Error</span>
        ) : isLoading && validAddress ? ( // Only show loading if address is valid
          <span className="text-gray-500 text-xs animate-pulse">...</span>
        ) : validAddress ? ( // Only show balance if address is valid
          <span className="text-white font-mono">{parseFloat(formattedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
        ) : (
          <span className="text-gray-500">-</span> // Placeholder if no address
        )}
      </div>
    </div>
  );
} 