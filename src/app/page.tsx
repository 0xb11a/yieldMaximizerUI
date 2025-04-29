'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBalance, useReadContract, UseBalanceReturnType, UseReadContractReturnType } from 'wagmi';
import { isAddress, formatUnits, Address} from 'viem';
import { AssetConfig, getAssetsForBalanceDisplay, SUPPORTED_ASSETS, MANTLE_USDC} from '@/config/assets';
import { useInitCapitalBalance } from '@/hooks/mantleCustom/useInitCapitalBalance';
import { useMMPoolBalance } from '@/hooks/mantleCustom/useMMPoolBalance';
import { getInvestmentColor } from '@/styles/colors';
import { BalanceDisplayItem, WalletBalance } from '@/types';

import Header from './components/Header';
import InvestmentCalculator from '@/app/components/InvestmentCalculator';
import WalletBalanceDisplay from '@/app/components/WalletBalanceDisplay';

// Define a type for the results stored in state, matching relevant fields from BalanceDisplayItem
interface BalanceStateResult {
  value: bigint | undefined | null; // Matches BalanceDisplayItem['value'] now
  isLoading: boolean;
  isError: boolean;
}

// --- Internal component to fetch balance for a single asset's display token ---
interface AssetBalanceFetcherProps {
  assetId: string; // Use ID to link results back
  walletAddress: Address | undefined;
  balanceConfig: AssetConfig['balanceDisplayConfig']; // Pass only the relevant config part
  onBalanceUpdate: (assetId: string, result: BalanceStateResult) => void;
}

function AssetBalanceFetcher({ assetId, walletAddress, balanceConfig, onBalanceUpdate }: AssetBalanceFetcherProps) {
  // Determine if this fetcher is for the special InitCapital case
  const isInitCapital = assetId === 'initcapital-usdc';

  // Determine if the standard hooks should be active 
  const isStandardHookActive = !!walletAddress && !isInitCapital;
  const isInitCapitalHookActive = !!walletAddress && isInitCapital; 

  // --- Hooks called UNCONDITIONALLY (but enabled conditionally) --- 

  // Custom Hook for InitCapital (Always called, but now takes walletAddress)
  const { 
      balance: initCapitalBalance, 
      isLoading: initCapitalLoading, 
      isError: initCapitalError 
  } = useInitCapitalBalance(walletAddress); 

  // useBalance Hook (Conditionally enabled)
  const balanceResult: UseBalanceReturnType = useBalance({
    address: walletAddress,
    token: balanceConfig?.hook === 'useBalance' ? balanceConfig.tokenAddress : undefined,
    query: {
      enabled: isStandardHookActive && balanceConfig?.hook === 'useBalance',
    },
  });

  // useReadContract Hook (Conditionally enabled)
  const readContractResult: UseReadContractReturnType = useReadContract({
    address: balanceConfig?.hook === 'useReadContract' ? balanceConfig.tokenAddress : undefined,
    abi: balanceConfig?.hook === 'useReadContract' ? balanceConfig.args?.abi : undefined,
    functionName: balanceConfig?.hook === 'useReadContract' ? balanceConfig.args?.functionName : undefined,
    args: balanceConfig?.hook === 'useReadContract' && walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: isStandardHookActive && balanceConfig?.hook === 'useReadContract',
    },
  });

  // --- Separate Effects for Updating Parent --- 

  // Effect for InitCapital
  useEffect(() => {
    if (isInitCapital && isInitCapitalHookActive) { 
        const result: BalanceStateResult = {
            value: initCapitalBalance,
            isLoading: initCapitalLoading,
            isError: initCapitalError,
        };
        onBalanceUpdate(assetId, result);
    } else if (isInitCapital && !isInitCapitalHookActive) {
        const result: BalanceStateResult = { value: undefined, isLoading: false, isError: false }; 
        onBalanceUpdate(assetId, result);
    }
  }, [
    isInitCapital, isInitCapitalHookActive, 
    initCapitalBalance, initCapitalLoading, initCapitalError, 
    assetId, onBalanceUpdate
  ]); 

  // Effect for Standard Hooks (useBalance / useReadContract)
  useEffect(() => {
    if (!isInitCapital && balanceConfig) {
        let result: BalanceStateResult;
        if (balanceConfig.hook === 'useBalance') {
            result = {
                value: balanceResult.data?.value,
                isLoading: balanceResult.isLoading,
                isError: balanceResult.isError,
            };
        } else if (balanceConfig.hook === 'useReadContract') {
            result = {
                value: readContractResult.data as bigint | undefined,
                isLoading: readContractResult.isLoading,
                isError: readContractResult.isError,
            };
        } else {
            // Fallback if hook type is somehow wrong (shouldn't happen)
            result = { value: undefined, isLoading: false, isError: true };
        }
        onBalanceUpdate(assetId, result);
    }
  // Depend on standard hook results, config, callback
  }, [
    isInitCapital, 
    balanceConfig, 
    balanceResult.data, balanceResult.isLoading, balanceResult.isError, 
    readContractResult.data, readContractResult.isLoading, readContractResult.isError, 
    assetId, onBalanceUpdate
  ]);

  // This component doesn't render anything itself
  return null;
}
// --- End Internal Component ---

export default function Home() {
  // --- State Management --- 
  const [manualAddress, setManualAddress] = useState<string>('');
  const [displayAddress, setDisplayAddress] = useState<Address | undefined>(undefined);
  const [isManualAddressValid, setIsManualAddressValid] = useState<boolean>(true);
  const [totalSupplyValue, setTotalSupplyValue] = useState<number>(0);
  const [balanceResults, setBalanceResults] = useState<Record<string, BalanceStateResult>>({});
  // ---

  // Get assets configured for standard balance display (excluding MM pool now)
  const assetsToDisplayStandard = useMemo(() => 
    getAssetsForBalanceDisplay().filter(asset => asset.id !== 'merchantmoe-usdc-usdt'), 
  []);

  // Find the Merchant Moe asset config
  const merchantMoeAsset = useMemo(() => 
    SUPPORTED_ASSETS.find(asset => asset.id === 'merchantmoe-usdc-usdt'), 
  []);

  // Callback for AssetBalanceFetcher - MEMOIZED
  const handleBalanceUpdate = useCallback((assetId: string, result: BalanceStateResult) => {
    setBalanceResults(prev => {
      // Type checking is now consistent
      if (prev[assetId]?.value === result.value && 
          prev[assetId]?.isLoading === result.isLoading &&
          prev[assetId]?.isError === result.isError) {
        return prev;
      }
      return { ...prev, [assetId]: result };
    });
  }, []); // Empty dependency array because it only uses setBalanceResults

  // --- Hook for Merchant Moe Pool Balance ---
  const mmTokenX = merchantMoeAsset?.underlyingTokens?.[0];
  const mmTokenY = merchantMoeAsset?.underlyingTokens?.[1];
  
  const { 
    usdcBalanceRaw: mmUsdcBalanceBigInt, // Hook now returns bigint | null
    isLoading: mmIsLoading,
    error: mmError,
    refetch: refetchMmBalance 
  } = useMMPoolBalance(
    merchantMoeAsset?.contractAddress,
    mmTokenX, 
    mmTokenY, 
    displayAddress,
    80
  );

  // Effect to merge Merchant Moe balance results into the main state
  useEffect(() => {
    if (merchantMoeAsset) {
      // Directly use the bigint value from the hook
      const result: BalanceStateResult = {
        value: mmUsdcBalanceBigInt, // Use the bigint | null value directly
        isLoading: mmIsLoading,
        isError: !!mmError,
      };
      handleBalanceUpdate(merchantMoeAsset.id, result);
    }
  }, [merchantMoeAsset, mmUsdcBalanceBigInt, mmIsLoading, mmError, handleBalanceUpdate]);

  // --- Derive Loading/Error Status (Include MM Pool Status) --- 
  const balanceStatus = useMemo(() => {
      // Assets with standard balance config + MM pool if it exists
      const assetsToCheck = merchantMoeAsset 
          ? [...assetsToDisplayStandard, merchantMoeAsset] 
          : assetsToDisplayStandard;
          
      const allLoaded = assetsToCheck.every(asset => balanceResults[asset.id] && !balanceResults[asset.id].isLoading);
      const anyError = assetsToCheck.some(asset => balanceResults[asset.id]?.isError);
      return { allLoaded, anyError };
  // Recalculate when results object reference changes or assets list changes
  }, [assetsToDisplayStandard, merchantMoeAsset, balanceResults]); 

  // --- Calculate Total Supply Effect ---
  useEffect(() => {
    const { allLoaded, anyError } = balanceStatus; 
    if (displayAddress && allLoaded && !anyError) {
      let totalUsdcEquivalentBigInt = BigInt(0);
      let usdcDecimals = 6; 
      const usdcConfig = SUPPORTED_ASSETS.find(a => a.id === 'wallet-usdc');
      if (usdcConfig?.balanceDisplayConfig) {
          usdcDecimals = usdcConfig.balanceDisplayConfig.tokenDecimals;
      }
      const allAssetsWithResults = merchantMoeAsset 
          ? [...assetsToDisplayStandard, merchantMoeAsset] 
          : assetsToDisplayStandard;
      allAssetsWithResults.forEach(asset => {
         const result = balanceResults[asset.id];
         // Check if value is a valid bigint and greater than 0
         if (result && typeof result.value === 'bigint' && !result.isError && result.value > BigInt(0)) {
             // Simple 1:1 sum for now, including MM pool correctly
             if (asset.id === 'wallet-usdc' || asset.id === 'lendle-usdc' || asset.id === 'initcapital-usdc' || asset.id === 'merchantmoe-usdc-usdt') {
                totalUsdcEquivalentBigInt += result.value;
             } 
         } 
      });
      const formattedTotal = formatUnits(totalUsdcEquivalentBigInt, usdcDecimals); 
      const newTotalSupply = parseFloat(formattedTotal);
      setTotalSupplyValue(newTotalSupply); 
      // --- Logging --- 
      console.log('--- Balance Data Update (Aggregated) ---');
      console.log('Address:', displayAddress);
      allAssetsWithResults.forEach(asset => {
          const result = balanceResults[asset.id];
          let symbol = asset.balanceDisplayConfig?.tokenSymbol;
          if (asset.id === 'merchantmoe-usdc-usdt') { symbol = 'USDC (MM Pool)'; } 
          if (result && symbol) { 
              console.log(`${asset.name} (${symbol}):`, result); 
          }
      });
      console.log('Total Supply Calculated (USDC Equivalent Estimate):', newTotalSupply);
      // --- End Logging --- 
    } else if (!displayAddress) {
      setTotalSupplyValue(0);
      // --- MODIFICATION START ---
      // Only clear results if they are not already empty
      if (Object.keys(balanceResults).length > 0) {
         console.log("(Total Supply Effect) Clearing balanceResults because displayAddress is undefined/invalid.");
         setBalanceResults({});
      }
      // --- MODIFICATION END ---
    }
    // Keep dependencies including balanceResults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayAddress, assetsToDisplayStandard, merchantMoeAsset, balanceStatus.allLoaded, balanceStatus.anyError, balanceResults]); 
  // ---

  // --- Event Handlers ---
  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setManualAddress(newAddress);
    const isValid = isAddress(newAddress); // Check validity immediately
    setIsManualAddressValid(isValid);

    if (isValid) {
      setDisplayAddress(newAddress as Address);
      // Optionally trigger refetch for MM pool if needed, though hook should react to address change via useAccount
       refetchMmBalance(); // Explicitly refetch MM balance on address change
    } else {
        setDisplayAddress(undefined);
        setBalanceResults({}); 
    }
  };

  // --- Prepare Props for Components --- 
  const balanceDisplayData: BalanceDisplayItem[] = useMemo(() => {
    const allAssetsForDisplay = merchantMoeAsset 
        ? [...assetsToDisplayStandard, merchantMoeAsset] 
        : assetsToDisplayStandard;

    return allAssetsForDisplay
      .map(asset => {
        const result: BalanceStateResult = balanceResults[asset.id] || { value: undefined, isLoading: !displayAddress, isError: false }; 
        const originalIndex = SUPPORTED_ASSETS.findIndex(a => a.id === asset.id);
        const assetType = asset.apiType || 'reserve'; 
        const color = getInvestmentColor(assetType, originalIndex);

        // Merchant Moe Pool
        if (asset.id === 'merchantmoe-usdc-usdt') {
          return {
            id: asset.id,
            name: asset.name, 
            symbol: MANTLE_USDC.symbol, 
            decimals: MANTLE_USDC.decimals, 
            address: MANTLE_USDC.address, 
            value: result.value, // Pass bigint | null | undefined
            isLoading: result.isLoading,
            isError: result.isError,
            color: color, 
            underlyingTokens: asset.underlyingTokens,
          };
        } 
        // Standard Assets
        else if (asset.balanceDisplayConfig) {
            const balanceConfig = asset.balanceDisplayConfig;
            return {
              id: asset.id,
              name: asset.name, 
              symbol: balanceConfig.tokenSymbol,
              decimals: balanceConfig.tokenDecimals,
              address: balanceConfig.tokenAddress, 
              value: result.value, // Pass bigint | undefined
              isLoading: result.isLoading,
              isError: result.isError,
              color: color, 
              underlyingTokens: asset.underlyingTokens,
            };
        } 
        else { return null; }
      })
      .filter(item => item !== null) as BalanceDisplayItem[]; 

  }, [assetsToDisplayStandard, merchantMoeAsset, balanceResults, displayAddress]);

  // Prepare data for InvestmentCalculator
  const validBalancesForCalc: WalletBalance[] = useMemo(() => {
    return balanceDisplayData
      .filter(bal => !bal.isLoading && !bal.isError && typeof bal.value === 'bigint' && bal.value > BigInt(0))
      .map(bal => ({
        address: bal.address, 
        symbol: bal.symbol,
        name: bal.name, 
        decimals: bal.decimals,
        value: bal.value as bigint // Already filtered for bigint
      }));
  }, [balanceDisplayData]);
  // ---

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Render Fetcher components ONLY for assets with standard display config */}
      {assetsToDisplayStandard 
        .filter(asset => asset.balanceDisplayConfig) 
        .map(asset => (
          <AssetBalanceFetcher 
            key={asset.id}
            assetId={asset.id} 
            walletAddress={displayAddress}
            balanceConfig={asset.balanceDisplayConfig!} 
            onBalanceUpdate={handleBalanceUpdate} 
          />
      ))}

      <Header /> 
      <main className="text-[#F9FAFB]">
        <div className="container mx-auto px-4 sm:px-8 py-12">
          <WalletBalanceDisplay 
            manualAddress={manualAddress}
            isManualAddressValid={isManualAddressValid}
            onManualAddressChange={handleManualAddressChange}
            displayAddress={displayAddress}
            balanceDisplayData={balanceDisplayData} // Pass newly structured data
          />
          <InvestmentCalculator 
            supplyFunds={totalSupplyValue} 
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
