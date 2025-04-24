'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBalance, useReadContract, UseBalanceReturnType, UseReadContractReturnType } from 'wagmi';
import { isAddress, formatUnits, Address } from 'viem';
import { WalletBalance } from '@/types';
import { AssetConfig, getAssetsForBalanceDisplay, TokenInfo } from '@/config/assets';

import Header from './components/Header';
import InvestmentCalculator from '@/app/components/InvestmentCalculator';
import WalletBalanceDisplay from '@/app/components/WalletBalanceDisplay';

// Interface for the data passed to WalletBalanceDisplay
// Represents the balance of a specific token configured for display
interface BalanceDisplayItem {
  id: string; // From original AssetConfig
  name: string; // From original AssetConfig
  symbol: string; // From balanceDisplayConfig
  decimals: number; // From balanceDisplayConfig
  address: Address; // From balanceDisplayConfig (token address being displayed)
  value: bigint | undefined | null;
  isLoading: boolean;
  isError: boolean;
  // Include underlying tokens for potential future use in display?
  // underlyingTokens?: TokenInfo[]; 
}

// --- Remove Static Asset Definitions ---
// const usdcAsset: AssetData = { ... };
// const lvUsdcAsset: AssetData = { ... };
// ---

// --- Internal component to fetch balance for a single asset's display token ---
interface AssetBalanceFetcherProps {
  assetId: string; // Use ID to link results back
  walletAddress: Address | undefined;
  balanceConfig: AssetConfig['balanceDisplayConfig']; // Pass only the relevant config part
  onBalanceUpdate: (assetId: string, result: BalanceResult) => void;
}

interface BalanceResult {
  data: bigint | undefined | null;
  isLoading: boolean;
  isError: boolean;
}

function AssetBalanceFetcher({ assetId, walletAddress, balanceConfig, onBalanceUpdate }: AssetBalanceFetcherProps) {
  // Skip if balanceConfig is somehow undefined (shouldn't happen with filtering)
  if (!balanceConfig) return null; 

  const commonQueryOptions = { enabled: !!walletAddress };

  // --- useBalance Hook ---
  const balanceResult: UseBalanceReturnType = useBalance({
    address: walletAddress,
    token: balanceConfig.hook === 'useBalance' ? balanceConfig.tokenAddress : undefined,
    query: {
      ...commonQueryOptions,
      enabled: commonQueryOptions.enabled && balanceConfig.hook === 'useBalance',
    },
  });

  // --- useReadContract Hook ---
  const readContractResult: UseReadContractReturnType = useReadContract({
    address: balanceConfig.hook === 'useReadContract' ? balanceConfig.tokenAddress : undefined,
    abi: balanceConfig.hook === 'useReadContract' ? balanceConfig.args?.abi : undefined,
    functionName: balanceConfig.hook === 'useReadContract' ? balanceConfig.args?.functionName : undefined,
    args: balanceConfig.hook === 'useReadContract' && walletAddress ? [walletAddress] : undefined,
    query: {
      ...commonQueryOptions,
      enabled: commonQueryOptions.enabled && balanceConfig.hook === 'useReadContract',
    },
  });

  // Destructure results to get potentially stable primitive values
  const { data: balanceData, isLoading: balanceLoading, isError: balanceError } = balanceResult;
  const { data: readData, isLoading: readLoading, isError: readError } = readContractResult;

  // Determine which result to use based on the config
  const result = useMemo(() => {
    if (balanceConfig.hook === 'useBalance') {
      return {
        data: balanceData?.value,
        isLoading: balanceLoading,
        isError: balanceError,
      };
    } else if (balanceConfig.hook === 'useReadContract') {
      return {
        data: readData as bigint | undefined,
        isLoading: readLoading,
        isError: readError,
      };
    }
    return { data: undefined, isLoading: false, isError: true }; // Fallback
  // Depend on specific fields from hook results, not the objects themselves
  }, [balanceConfig.hook, balanceData, balanceLoading, balanceError, readData, readLoading, readError]);

  // Memoize the result object itself to ensure stable reference if content is same
  // This might be redundant given the check in handleBalanceUpdate, but can help
  const memoizedResult = useMemo(() => result, [result.data, result.isLoading, result.isError]);

  // Notify parent component about the result update
  useEffect(() => {
    onBalanceUpdate(assetId, memoizedResult); // Pass memoized result
  // Depend on the memoized result object's reference
  }, [assetId, memoizedResult, onBalanceUpdate]);

  return null;
}
// --- End Internal Component ---

export default function Home() {
  // --- State Management --- 
  const [manualAddress, setManualAddress] = useState<string>('');
  const [displayAddress, setDisplayAddress] = useState<Address | undefined>(undefined);
  const [isManualAddressValid, setIsManualAddressValid] = useState<boolean>(true);
  const [totalSupplyValue, setTotalSupplyValue] = useState<number>(0);
  const [balanceResults, setBalanceResults] = useState<Record<string, BalanceResult>>({});
  // ---

  // Get assets configured for balance display
  const assetsToDisplay = useMemo(() => getAssetsForBalanceDisplay(), []);

  // Callback for AssetBalanceFetcher - MEMOIZED
  const handleBalanceUpdate = useCallback((assetId: string, result: BalanceResult) => {
    setBalanceResults(prev => {
      // Avoid unnecessary updates if the data hasn't actually changed
      if (prev[assetId]?.data === result.data && 
          prev[assetId]?.isLoading === result.isLoading &&
          prev[assetId]?.isError === result.isError) {
        return prev;
      }
      return { ...prev, [assetId]: result };
    });
  }, []); // Empty dependency array because it only uses setBalanceResults

  // --- Derive Loading/Error Status --- 
  const balanceStatus = useMemo(() => {
      const assetsWithBalanceConfig = assetsToDisplay.filter(asset => asset.balanceDisplayConfig);
      // Considered loaded only if we have a result object for the asset
      const allLoaded = assetsWithBalanceConfig.every(asset => balanceResults[asset.id] && !balanceResults[asset.id].isLoading);
      const anyError = assetsWithBalanceConfig.some(asset => balanceResults[asset.id]?.isError);
      return { allLoaded, anyError };
  // Recalculate only when results object reference changes or assets list changes
  }, [assetsToDisplay, balanceResults]); 

  // --- Calculate Total Supply Effect ---
  useEffect(() => {
    // Use derived status flags
    const { allLoaded, anyError } = balanceStatus; 

    if (displayAddress && allLoaded && !anyError) {
      let totalUsdcEquivalentBigInt = BigInt(0);
      let usdcDecimals = 6; // Default USDC decimals

      // Find USDC config to get decimals reliably
      const usdcConfig = assetsToDisplay.find(a => a.id === 'wallet-usdc');
      if (usdcConfig?.balanceDisplayConfig) {
          usdcDecimals = usdcConfig.balanceDisplayConfig.tokenDecimals;
      }

      assetsToDisplay.filter(asset => asset.balanceDisplayConfig).forEach(asset => {
         const result = balanceResults[asset.id];
         const value = result?.data ?? BigInt(0);

         // --- Total Supply Calculation Logic --- 
         // Sum balances assuming 1:1 conversion for receipt tokens to underlying USDC
         // TODO: Implement accurate conversion using exchange rates for lvUSDC, inUSDC etc.
         // TODO: Decide how to handle non-USDC based assets (e.g., LP tokens) - currently ignored.
         if (asset.id === 'wallet-usdc' || asset.id === 'lendle-usdc' || asset.id === 'initcapital-usdc') {
            // Assuming the displayed balance value (USDC, lvUSDC, inUSDC) can be treated as USDC equivalent for now
            totalUsdcEquivalentBigInt += value;
         } 
         // --- End Logic --- 
      });

      const formattedTotal = formatUnits(totalUsdcEquivalentBigInt, usdcDecimals); 
      const newTotalSupply = parseFloat(formattedTotal);
      setTotalSupplyValue(newTotalSupply); // This is now the estimated total USDC equivalent

      // --- Logging (Keep as is for debugging) ---
      console.log('--- Balance Data Update (Aggregated) ---');
      console.log('Address:', displayAddress);
      assetsToDisplay.filter(asset => asset.balanceDisplayConfig).forEach(asset => {
           console.log(`${asset.name} (${asset.balanceDisplayConfig?.tokenSymbol}):`, balanceResults[asset.id]);
      });
      console.log('Total Supply Calculated (USDC Equivalent Estimate):', newTotalSupply);
      // --- End Logging ---

    } else if (!displayAddress) {
      setTotalSupplyValue(0);
      setBalanceResults({});
    }
  // Update dependencies: use derived status flags instead of balanceResults directly
  }, [displayAddress, assetsToDisplay, balanceStatus.allLoaded, balanceStatus.anyError]); 
  // ---

  // --- Event Handlers ---
  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setManualAddress(newAddress);
    const isValid = newAddress === '' || isAddress(newAddress);
    setIsManualAddressValid(isValid);
    if (!isValid) {
        setDisplayAddress(undefined);
        setBalanceResults({}); 
    }
  };

  const handleShowManualBalances = () => {
     if (isAddress(manualAddress)) {
        setDisplayAddress(manualAddress as Address);
        setIsManualAddressValid(true);
     } else {
        setIsManualAddressValid(false);
        setDisplayAddress(undefined);
        setBalanceResults({});
     }
  };
  // ---

  // --- Prepare Props for Components --- 
  // Prepare data specifically for WalletBalanceDisplay
  const balanceDisplayData: BalanceDisplayItem[] = useMemo(() => {
    return assetsToDisplay
      .filter(asset => asset.balanceDisplayConfig) // Ensure config exists
      .map(asset => {
        const balanceConfig = asset.balanceDisplayConfig!;
        const result = balanceResults[asset.id] || { data: undefined, isLoading: true, isError: false };
        return {
          // Data for display comes from balanceConfig and results
          id: asset.id,
          name: asset.name, // Use the main asset name
          symbol: balanceConfig.tokenSymbol,
          decimals: balanceConfig.tokenDecimals,
          address: balanceConfig.tokenAddress, // Address of the token being displayed
          value: result.data,
          isLoading: result.isLoading,
          isError: result.isError,
        };
      });
  }, [assetsToDisplay, balanceResults]);

  // Prepare data for InvestmentCalculator (WalletBalance format)
  const validBalancesForCalc: WalletBalance[] = useMemo(() => {
    return balanceDisplayData // Start from already prepared display data
      .filter(bal => !bal.isLoading && !bal.isError && bal.value !== undefined && bal.value !== null && bal.value > BigInt(0))
      .map(bal => ({
        // Map from BalanceDisplayItem to WalletBalance
        address: bal.address, // Use the token address from balanceDisplayConfig
        symbol: bal.symbol,
        name: bal.name, // Keep the main asset name
        decimals: bal.decimals,
        value: bal.value as bigint
      }));
  }, [balanceDisplayData]);
  // ---

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Render Fetcher components for assets with display config */}
      {assetsToDisplay
        .filter(asset => asset.balanceDisplayConfig) // Ensure config exists before rendering fetcher
        .map(asset => (
          <AssetBalanceFetcher 
            key={asset.id}
            assetId={asset.id} // Pass assetId separately
            walletAddress={displayAddress}
            balanceConfig={asset.balanceDisplayConfig!} // Pass the specific balance config
            onBalanceUpdate={handleBalanceUpdate} // Pass memoized callback
          />
      ))}

      <Header /> 
      <main className="text-[#F9FAFB]">
        <div className="container mx-auto px-4 sm:px-8 py-12">
          <WalletBalanceDisplay 
            manualAddress={manualAddress}
            isManualAddressValid={isManualAddressValid}
            onManualAddressChange={handleManualAddressChange}
            onShowManualBalances={handleShowManualBalances}
            displayAddress={displayAddress}
            balanceDisplayData={balanceDisplayData} // Pass newly structured data
          />
          <InvestmentCalculator 
            initialFunds={totalSupplyValue} 
            walletBalances={validBalancesForCalc} // Pass newly structured data
          />
        </div>
      </main>
      <footer className="border-t border-[#1E2633] py-8">
        <div className="container mx-auto px-8 flex justify-between items-center">
          <p className="text-[#9CA3AF]">© 2025 b11a. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-[#9CA3AF] hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5 0-.28-.03-.56-.08-.83A7.72 7.72 0 0 0 23 3z" />
              </svg>
            </a>
            <a href="#" className="text-[#9CA3AF] hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
