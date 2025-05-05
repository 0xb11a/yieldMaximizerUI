'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { isAddress, formatUnits, Address, parseUnits } from 'viem';
import { AssetConfig, SUPPORTED_ASSETS, MANTLE_USDC } from '@/config/assets';
import { getInvestmentColor } from '@/styles/colors';
import { BalanceDisplayItem, WalletBalance } from '@/types';
import { fetchPortfolioData, PortfolioApiResponse, PortfolioToken } from '@/config/apiConfig';
import logger from '@/utils/logger';

import Header from './components/Header';
import InvestmentCalculator from '@/app/components/InvestmentCalculator';
import WalletBalanceDisplay from '@/app/components/WalletBalanceDisplay';

// Define Mantle Chain ID
const MANTLE_CHAIN_ID = 5000;

export default function Home() {
  // --- State Management ---
  const [manualAddress, setManualAddress] = useState<string>('');
  const [displayAddress, setDisplayAddress] = useState<Address | undefined>(undefined);
  const [isManualAddressValid, setIsManualAddressValid] = useState<boolean>(true);
  const [totalSupplyValue, setTotalSupplyValue] = useState<number>(0);

  // --- NEW State for Portfolio API ---
  const [portfolioData, setPortfolioData] = useState<PortfolioApiResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState<boolean>(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  // ---

  // --- Effect to Fetch Portfolio Data ---
  useEffect(() => {
    // Flag to prevent state updates if component unmounts during fetch
    let isCancelled = false;

    const loadPortfolio = async () => {
      if (!displayAddress || !isAddress(displayAddress)) {
        setPortfolioData(null);
        setPortfolioLoading(false);
        setPortfolioError(null);
        return;
      }

      setPortfolioLoading(true);
      setPortfolioError(null);
      setPortfolioData(null); // Clear previous data

      try {
        logger.info(`Fetching portfolio for address: ${displayAddress}`);
        const data = await fetchPortfolioData(displayAddress, MANTLE_CHAIN_ID);
        if (!isCancelled) {
          setPortfolioData(data);
          logger.info(`Successfully fetched portfolio for: ${displayAddress}`, data);
        }
      } catch (err) {
        logger.error(`Error fetching portfolio for ${displayAddress}:`, err);
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setPortfolioError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setPortfolioLoading(false);
        }
      }
    };

    loadPortfolio();

    // Cleanup function
    return () => {
      isCancelled = true;
      logger.info(`Cancelling portfolio fetch for: ${displayAddress}`);
    };
  }, [displayAddress]); // Re-run only when displayAddress changes

  // --- Calculate Total Supply Effect (using API data) ---
  useEffect(() => {
    if (portfolioLoading) {
      setTotalSupplyValue(0); // Don't show stale total while loading
      return;
    }
    if (portfolioError || !portfolioData || !portfolioData.tokens) {
      setTotalSupplyValue(0);
      return;
    }

    // Calculate total supply based ONLY on USDC tokens across all protocols/wallet
    let totalUsdcValue = 0;
    const usdcAddressLower = MANTLE_USDC.address.toLowerCase();

    portfolioData.tokens.forEach(token => {
      // Check if the token ID matches USDC address (case-insensitive)
      if (token.id.toLowerCase() === usdcAddressLower) {
        totalUsdcValue += token.amountUsd;
      }
    });

    setTotalSupplyValue(totalUsdcValue);
    logger.info(`Total USDC Supply Calculated: ${totalUsdcValue} from ${portfolioData.tokens.length} total tokens for ${portfolioData.address}`);

  // Depend only on the fetched data and loading/error state
  }, [portfolioData, portfolioLoading, portfolioError]);
  // ---

  // --- Event Handlers ---
  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setManualAddress(newAddress);
    const isValid = isAddress(newAddress);
    setIsManualAddressValid(isValid);

    if (isValid) {
      setDisplayAddress(newAddress as Address);
      // No need to manually refetch, useEffect handles it
    } else {
      setDisplayAddress(undefined);
      // Effect will clear portfolioData
    }
  };

  // --- Prepare Props for Components (using API data) ---

  const balanceDisplayData: BalanceDisplayItem[] = useMemo(() => {
      if (!portfolioData || !portfolioData.tokens) {
          // Return empty or placeholder based on loading state if desired
          return [];
      }

      const items: BalanceDisplayItem[] = [];
      const processedPoolIds = new Set<string>(); // Track processed MM pools

      // 1. Iterate through SUPPORTED_ASSETS to ensure order and inclusion
      SUPPORTED_ASSETS.forEach((asset, index) => {
          const assetType = asset.apiType || 'reserve';
          const color = getInvestmentColor(assetType, index);

          // Special Handling for Merchant Moe Pool (Aggregate USDC + USDT)
          if (asset.id === 'merchantmoe-usdc-usdt' && asset.apiPoolId && !processedPoolIds.has(asset.apiPoolId)) {
              let poolUsdValue = 0;
              let poolIsLoading = portfolioLoading; // Pool loading state mirrors overall fetch
              let poolIsError = !!portfolioError;   // Pool error state mirrors overall fetch

              // Find *all* tokens belonging to this pool in the API response
              const poolTokens = portfolioData.tokens.filter(token =>
                  token.protocol?.toLowerCase() === asset.apiProtocolName?.toLowerCase() &&
                  token.poolId?.toLowerCase() === asset.apiPoolId?.toLowerCase()
              );

              if (poolTokens.length > 0) {
                  poolUsdValue = poolTokens.reduce((sum, token) => sum + token.amountUsd, 0);
                  // If we found tokens, assume no error unless global error exists
                  poolIsError = !!portfolioError;
              } else if (!portfolioLoading && !portfolioError) {
                  // If not loading, no error, but no tokens found, might indicate 0 balance
                  poolUsdValue = 0;
                  poolIsError = false;
              }
              
              items.push({
                  id: asset.id,
                  name: asset.name,
                  decimals: asset.decimals,
                  address: asset.contractAddress,
                  value: poolUsdValue,
                  isLoading: poolIsLoading,
                  isError: poolIsError,
                  color: color,
                  underlyingTokens: asset.underlyingTokens,
              });
              processedPoolIds.add(asset.apiPoolId); // Mark this pool as processed
          }
          // Handling for Reserves and Wallet USDC
          else if (asset.type === 'reserve') {
              // Find the matching token in the API response
              const matchedToken = portfolioData.tokens.find(token =>
                  // Match Wallet USDC (no protocol/poolId)
                  (asset.source === 'wallet' && token.id.toLowerCase() === asset.apiTokenId?.toLowerCase() && !token.protocol) ||
                  // Match Protocol Reserves (match token, protocol, poolId)
                  (asset.source !== 'wallet' &&
                   token.id.toLowerCase() === asset.apiTokenId?.toLowerCase() &&
                   token.protocol?.toLowerCase() === asset.apiProtocolName?.toLowerCase() &&
                   token.poolId?.toLowerCase() === asset.apiPoolId?.toLowerCase())
              );

              items.push({
                  id: asset.id,
                  name: asset.name,
                  decimals: asset.decimals,
                  address: asset.underlyingTokens[0]?.address || asset.contractAddress,
                  value: matchedToken?.amountUsd ?? 0,
                  isLoading: portfolioLoading,
                  isError: !!portfolioError && !matchedToken,
                  color: color,
                  underlyingTokens: asset.underlyingTokens,
              });
          }
      });

      logger.debug("Generated balanceDisplayData:", items);
      return items;
  // Recalculate when portfolio data or loading/error state changes
  }, [portfolioData, portfolioLoading, portfolioError]);


  // Prepare data for InvestmentCalculator (WalletBalance format)
  const validBalancesForCalc: WalletBalance[] = useMemo(() => {
      if (!portfolioData || !portfolioData.tokens || portfolioLoading || portfolioError) {
          return [];
      }

      const walletBalances: WalletBalance[] = [];
      const processedPoolIds = new Set<string>(); // Track processed MM pools

      // Map SUPPORTED_ASSETS to WalletBalance, converting amounts
      SUPPORTED_ASSETS.forEach(asset => {
          // Special Handling for Merchant Moe Pool (Combine USDC/USDT amounts into one entry)
          if (asset.id === 'merchantmoe-usdc-usdt' && asset.apiPoolId && !processedPoolIds.has(asset.apiPoolId)) {
              // Find *USDC* token for this pool in API response
              const usdcToken = portfolioData.tokens.find(token =>
                  token.id.toLowerCase() === MANTLE_USDC.address.toLowerCase() &&
                  token.protocol?.toLowerCase() === asset.apiProtocolName?.toLowerCase() &&
                  token.poolId?.toLowerCase() === asset.apiPoolId?.toLowerCase()
              );
              // Find *USDT* token for this pool in API response (assuming same protocol/poolId)
              const mantleUsdtAddress = '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae'; // Hardcode USDT address for now
              const usdtToken = portfolioData.tokens.find(token =>
                  token.id.toLowerCase() === mantleUsdtAddress && // Use hardcoded address
                  token.protocol?.toLowerCase() === asset.apiProtocolName?.toLowerCase() &&
                  token.poolId?.toLowerCase() === asset.apiPoolId?.toLowerCase()
              );

              let combinedValueBigInt = BigInt(0);
              let poolName = asset.name; // Default name

              if (usdcToken && usdcToken.amount > 0) {
                  try {
                     combinedValueBigInt += parseUnits(usdcToken.amount.toString(), usdcToken.decimals);
                     poolName = asset.name; // Keep original name if USDC found
                  } catch (e) {
                      logger.warn(`Could not parse MM USDC amount: ${usdcToken.amount}`, e);
                  }
              }
               // Add USDT amount converted to USDC decimals (assuming 1:1 price for simplicity in calc input)
               if (usdtToken && usdtToken.amount > 0 && asset.decimals === usdtToken.decimals) {
                    try {
                       combinedValueBigInt += parseUnits(usdtToken.amount.toString(), usdtToken.decimals);
                    } catch (e) {
                       logger.warn(`Could not parse MM USDT amount: ${usdtToken.amount}`, e);
                   }
               } else if (usdtToken && usdtToken.amount > 0) {
                   logger.warn(`USDC (${asset.decimals}) and USDT (${usdtToken.decimals}) decimals don't match for MM pool ${asset.apiPoolId}. USDT amount not included in calculation input.`);
               }

              if (combinedValueBigInt > BigInt(0)) {
                  walletBalances.push({
                      address: asset.contractAddress,
                      name: poolName,
                      decimals: asset.decimals,
                      value: combinedValueBigInt,
                  });
              }
              processedPoolIds.add(asset.apiPoolId); // Mark pool as processed
          }
          // Handling for Reserves and Wallet USDC
          else if (asset.type === 'reserve') {
              // Find the matching token in the API response
              const matchedToken = portfolioData.tokens.find(token =>
                  (asset.source === 'wallet' && token.id.toLowerCase() === asset.apiTokenId?.toLowerCase() && !token.protocol) ||
                  (asset.source !== 'wallet' &&
                   token.id.toLowerCase() === asset.apiTokenId?.toLowerCase() &&
                   token.protocol?.toLowerCase() === asset.apiProtocolName?.toLowerCase() &&
                   token.poolId?.toLowerCase() === asset.apiPoolId?.toLowerCase())
              );

              if (matchedToken && matchedToken.amount > 0 && asset.underlyingTokens[0]) {
                  try {
                      const valueBigInt = parseUnits(matchedToken.amount.toString(), matchedToken.decimals);
                      if (valueBigInt > BigInt(0)) {
                          walletBalances.push({
                              address: asset.underlyingTokens[0]?.address || asset.contractAddress,
                              name: asset.name,
                              decimals: asset.decimals,
                              value: valueBigInt,
                          });
                      }
                  } catch (e) {
                      logger.warn(`Could not parse amount for ${asset.name}: ${matchedToken.amount}`, e);
                  }
              }
          }
      });

      logger.debug("Generated validBalancesForCalc:", walletBalances);
      return walletBalances;
  // Recalculate when portfolio data or loading/error state changes
  }, [portfolioData, portfolioLoading, portfolioError]);
  // ---

  return (
    <div className="min-h-screen bg-[#111827]">
      <Header />
      <main className="text-[#F9FAFB]">
        <div className="container mx-auto px-4 sm:px-8 py-12">
          <WalletBalanceDisplay
            manualAddress={manualAddress}
            isManualAddressValid={isManualAddressValid}
            onManualAddressChange={handleManualAddressChange}
            displayAddress={displayAddress}
            balanceDisplayData={balanceDisplayData} // Pass API-derived data
            isLoading={portfolioLoading} // Pass overall loading state
            isError={!!portfolioError} // Pass overall error state
            error={portfolioError} // Pass error message
          />
          <InvestmentCalculator
            supplyFunds={totalSupplyValue} // Pass API-derived total supply
            walletBalances={validBalancesForCalc} // Pass API-derived balances
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
