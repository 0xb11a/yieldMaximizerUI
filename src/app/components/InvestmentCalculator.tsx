'use client';

import { useState, useEffect } from 'react';
import PoolInfo from './PoolInfo';
import ReserveInfo from './ReserveInfo';
import {
  fetchOptimalAllocation,
  fetchPoolAndReserveData,
  type ApiResponse,
  type Pool,
  type Reserve,
  type Investment
} from '@/config/apiConfig';
import { SUPPORTED_ASSETS, NetworkFilter, MANTLE_CHAIN_ID, SONIC_CHAIN_ID } from '@/config/assets';
import { WalletBalance } from '@/types'; 
import { getInvestmentColor } from '@/styles/colors';
import { formatUnits } from 'viem'; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
  type: 'pool' | 'reserve';
  expected_return: number;
  allocation: number;
  expectedProfit: number;
  reserve_apy?: number;
  rewards_apy?: number;
  total_apr?: number;     
  base_apr?: number;      
  rewards_apr?: number;   
}

interface CurrentYieldItem {
  name: string;
  balance: number;
  color: string;
  type: 'pool' | 'reserve';
  expected_return: number;
  expectedYearlyProfit: number;
  reserve_apy?: number;
  rewards_apy?: number;
  total_apr?: number;
  base_apr?: number;
  rewards_apr?: number;
  // Keep original pool/reserve data for PoolInfo/ReserveInfo display
  originalPoolData?: Pool;
  originalReserveData?: Reserve;
}

const INITIAL_ALLOCATION: AllocationItem[] = [];
const INITIAL_CURRENT_YIELD: CurrentYieldItem[] = [];

interface InvestmentCalculatorProps {
  supplyFunds?: number; 
  walletBalances?: WalletBalance[]; 
  networkFilter: NetworkFilter;
}

export default function InvestmentCalculator({ supplyFunds = 0, walletBalances = [], networkFilter }: InvestmentCalculatorProps) {
  const [displayMode, setDisplayMode] = useState<'idle' | 'current' | 'optimal'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [optimalAllocation, setOptimalAllocation] = useState<AllocationItem[]>(INITIAL_ALLOCATION);
  const [optimalDistribution, setOptimalDistribution] = useState<ApiResponse | null>(null);

  const [currentYield, setCurrentYield] = useState<CurrentYieldItem[]>(INITIAL_CURRENT_YIELD);
  const [currentTotalProfit, setCurrentTotalProfit] = useState<number>(0);

  const [fetchedPools, setFetchedPools] = useState<Pool[]>([]);
  const [fetchedReserves, setFetchedReserves] = useState<Reserve[]>([]);

  const calculateOptimalDistribution = (apiResponse: ApiResponse): AllocationItem[] => {
    const investments = apiResponse.investments;
    const validTotalFunds = apiResponse.total_funds > 0 ? apiResponse.total_funds : 1;

    const calculatedAllocation: AllocationItem[] = investments
      .filter(investment => investment.allocation > 0)
      .map((investment: Investment) => {
        const assetConfig = SUPPORTED_ASSETS.find(
          config => config.allocationKey === investment.name
        );

        if (!assetConfig) {
          console.warn(`Optimal Calc: AssetConfig not found for allocationKey: ${investment.name}`);
          return {
            name: investment.name,
            percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
            color: getInvestmentColor(investment.type, -1),
            type: investment.type,
            expected_return: investment.expected_return ?? 0, // Total APY
            allocation: investment.allocation,
            expectedProfit: investment.expectedProfit ?? 0,
            reserve_apy: investment.reserve_apy, // Base APY
            rewards_apy: investment.rewards_apy, // Rewards APY
            total_apr: investment.total_apr,     // Total APR
            base_apr: investment.base_apr,       // Base APR
            rewards_apr: investment.rewards_apr, // Rewards APR
          };
        }

        const supportedAssetIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);
        const displayName = assetConfig.name;

        return {
            name: displayName,
            percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
            color: getInvestmentColor(assetConfig.type, supportedAssetIndex),
            type: assetConfig.type,
            expected_return: investment.expected_return ?? 0, // Total APY
            allocation: investment.allocation,
            expectedProfit: investment.expectedProfit ?? 0,
            reserve_apy: investment.reserve_apy, // Base APY
            rewards_apy: investment.rewards_apy, // Rewards APY
            total_apr: investment.total_apr,     // Total APR
            base_apr: investment.base_apr,       // Base APR
            rewards_apr: investment.rewards_apr, // Rewards APR
        };
      });

    return calculatedAllocation;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

   // Calculate current yield when wallet balances or network filter change
   useEffect(() => {
     if (displayMode === 'optimal') {
         return;
     }

     let isCancelled = false;

     const calculateCurrentYieldInternal = async () => {
       // walletBalances is already filtered by the parent based on networkFilter
       if (walletBalances.length === 0) {
         // Clear previous state if balances are empty for the current filter
         setCurrentYield(INITIAL_CURRENT_YIELD);
         setCurrentTotalProfit(0);
         setDisplayMode('idle');
         return;
       }

       setIsLoading(true);
       setError(null);

       // Fetch base data (consider if this fetch needs optimization later,
       // e.g., caching or fetching only when network changes from/to 'all')
       // For now, it fetches all data, filtering happens during mapping.
       const walletAddressToUse: string = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";

       try {
         // Step 1: Fetch Pool and Reserve Base Data (fetches all)
         const poolReserveBaseData = await fetchPoolAndReserveData(walletAddressToUse);
         if (isCancelled) return;

         const localFetchedPools = poolReserveBaseData.pools;
         const localFetchedReserves = poolReserveBaseData.reserves;
         // Store all fetched data, filtering happens later
         setFetchedPools(localFetchedPools);
         setFetchedReserves(localFetchedReserves);

         if (localFetchedPools.length === 0 && localFetchedReserves.length === 0) {
             if (!isCancelled) setError('No pools or reserves base data found.');
             return;
         }

         // Step 2: Fetch Current APYs (fetches all APYs for $0 simulation)
         const apyData = await fetchOptimalAllocation(0, localFetchedPools, localFetchedReserves);
         if (isCancelled) return;

         // Step 3: Map Wallet Balances (already filtered by parent)
         let totalCalculatedProfit = 0;
         const calculatedYield: CurrentYieldItem[] = walletBalances.map((balance) => {
            // Find assetConfig based on balance name (which corresponds to filtered assets)
             const assetConfig = SUPPORTED_ASSETS.find(asset => asset.name === balance.name);
             if (!assetConfig) {
                  console.warn(`Current Yield: No AssetConfig found for wallet balance: ${balance.name}`);
                  return {
                     name: balance.name,
                     balance: parseFloat(formatUnits(balance.value, balance.decimals)),
                     color: '#808080',
                     type: 'reserve', // Default type
                     expected_return: 0,
                     expectedYearlyProfit: 0,
                  } as CurrentYieldItem;
             }

             // Match base data from *all* fetched data using source and apiName
             let baseData: Pool | Reserve | undefined;
             if (assetConfig.type === 'pool') {
                 baseData = localFetchedPools.find(p =>
                     p.source === assetConfig.source &&
                     p.name === assetConfig.apiName
                 );
             } else {
                   baseData = localFetchedReserves.find(r =>
                       r.source === assetConfig.source &&
                       r.name === assetConfig.apiName
                   );
             }
             if (!baseData) {
                  console.warn(`Current Yield: No matching base data found for config: ${assetConfig.name} (Source: ${assetConfig.source}, apiName: ${assetConfig.apiName})`);
             }

             // Match APY data using the allocationKey from *all* APY data
             const matchedApyDetail: Investment | undefined = apyData.investments.find(
                 (detail: Investment) => detail.name === assetConfig.allocationKey
             );

             if (!matchedApyDetail && assetConfig.source !== 'wallet') { // Avoid warning for wallet
                  console.warn(`Current Yield: No matching APY data found for allocationKey: ${assetConfig.allocationKey} (Config: ${assetConfig.name})`);
             }

             const itemData: Partial<CurrentYieldItem> = {
                 name: assetConfig.name,
                 balance: parseFloat(formatUnits(balance.value, balance.decimals)),
                 color: '#8884d8',
                 type: assetConfig.type,
                 originalPoolData: assetConfig.type === 'pool' ? baseData as Pool : undefined,
                 originalReserveData: assetConfig.type === 'reserve' ? baseData as Reserve : undefined,
                 expected_return: 0,
                 reserve_apy: 0,
                 rewards_apy: 0,
                 expectedYearlyProfit: 0,
             };

             const tokenPrice = baseData?.token_price ?? 1;
             const balanceInUsd = (itemData.balance ?? 0) * tokenPrice;
             itemData.balance = balanceInUsd;

             if (matchedApyDetail) {
                 itemData.reserve_apy = matchedApyDetail.reserve_apy ?? 0;
                 itemData.rewards_apy = matchedApyDetail.rewards_apy ?? 0;
                 itemData.expected_return = matchedApyDetail.expected_return ?? 0;
                 itemData.total_apr = matchedApyDetail.total_apr;
                 itemData.base_apr = matchedApyDetail.base_apr;
                 itemData.rewards_apr = matchedApyDetail.rewards_apr;
                 itemData.expectedYearlyProfit = balanceInUsd * ((itemData.expected_return ?? 0) / 100);
                 totalCalculatedProfit += itemData.expectedYearlyProfit;
             }
             const originalIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);
             itemData.color = getInvestmentColor(assetConfig.type, originalIndex);

             return itemData as CurrentYieldItem;
         });

         if (!isCancelled) {
             setCurrentYield(calculatedYield);
             setCurrentTotalProfit(totalCalculatedProfit);
             // Set display mode based on calculated yield, even if profit is 0
             setDisplayMode(calculatedYield.length > 0 ? 'current' : 'idle');
         }

       } catch (err) {
         if (!isCancelled) {
           console.error('Current Yield Calculation Error:', err);
           let errorMessage = 'An unexpected error occurred calculating current yield';
           if (err instanceof Error) {
              errorMessage = `Error fetching data for current yield: ${err.message}`;
           }
           setError(errorMessage);
           setDisplayMode('idle'); 
           setCurrentYield(INITIAL_CURRENT_YIELD); 
           setCurrentTotalProfit(0);
         }
       } finally {
         if (!isCancelled) {
           setIsLoading(false);
         }
       }
     };

     // Re-run calculation when filtered balances change
     calculateCurrentYieldInternal();

     // Cleanup Function
     return () => {
       isCancelled = true;
     };
   // Depend on walletBalances and displayMode (to react when mode *changes* away from optimal)
   }, [walletBalances, displayMode]); 

  const handleOptimalAllocation = async () => {
    if (supplyFunds <= 0) {
      setError("Please provide a valid total supply value greater than 0 to calculate optimal allocation.");
      return;
    }
    // Use the currentYield state which corresponds to the filtered walletBalances
    if (currentYield.length === 0 && supplyFunds > 0 && networkFilter !== 'all') {
        // If supplyFunds > 0 but currentYield is empty for a specific network,
        // still allow calculation, but base data needs to be filtered first.
        console.warn("Calculating optimal allocation with zero current holdings for the selected network.");
    } else if (currentYield.length === 0 && supplyFunds > 0 && networkFilter === 'all') {
        // If all networks selected and still no yield, something might be wrong
        setError("Current wallet holdings information is not available. Please wait or reload.");
        console.warn("Attempted optimal allocation calculation before current yield data was ready (all networks).");
        return;
    }

    if (fetchedPools.length === 0 && fetchedReserves.length === 0) {
        setError("Pool and reserve market data not available...");
        console.warn('Attempted optimal allocation calculation before fetching base pool/reserve data.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setOptimalDistribution(null);
    setOptimalAllocation(INITIAL_ALLOCATION);
    setDisplayMode('optimal');

    const totalFundsForCalc: number = supplyFunds;

    try {
      // --- Step 1: Filter fetched data based on networkFilter --- 
      const targetChainId = networkFilter === 'mantle' ? MANTLE_CHAIN_ID : SONIC_CHAIN_ID;

      const poolsToConsider = networkFilter === 'all'
        ? fetchedPools
        : fetchedPools.filter(pool => {
            const config = SUPPORTED_ASSETS.find(c => c.source === pool.source && c.apiName === pool.name);
            return config?.chainId === targetChainId;
          });

      const reservesToConsider = networkFilter === 'all'
        ? fetchedReserves
        : fetchedReserves.filter(reserve => {
            const config = SUPPORTED_ASSETS.find(c => c.source === reserve.source && c.apiName === reserve.name);
            return config?.chainId === targetChainId;
          });

      // --- Step 2: Simulate Withdrawal using FILTERED data --- 
      const adjustedPools = JSON.parse(JSON.stringify(poolsToConsider)) as Pool[];
      const adjustedReserves = JSON.parse(JSON.stringify(reservesToConsider)) as Reserve[];

      // Helper functions now operate on the already filtered adjustedPools/Reserves
      const findAdjustedReserve = (holding: CurrentYieldItem): Reserve | undefined => {
        const assetConfig = SUPPORTED_ASSETS.find(a => a.name === holding.name);
        if (!assetConfig || assetConfig.type !== 'reserve') return undefined;
        // Match within the filtered & adjusted reserves
        return adjustedReserves.find(r => r.source === assetConfig.source && r.name === assetConfig.apiName);
      };

      const findAdjustedPool = (holding: CurrentYieldItem): Pool | undefined => {
        const assetConfig = SUPPORTED_ASSETS.find(a => a.name === holding.name);
        if (!assetConfig || assetConfig.type !== 'pool') return undefined;
         // Match within the filtered & adjusted pools
        return adjustedPools.find(p => p.source === assetConfig.source && p.name === assetConfig.apiName);
      };

      // --- Simulation loop (operates on filtered currentYield from parent) ---
      currentYield.forEach(holding => {
        if (holding.name === 'Wallet USDC' || holding.name === 'Wallet USDC.e') {
            return; // Skip wallet balance
        }
        const holdingAmount = holding.balance;
        if (holding.type === 'pool') {
            const poolToAdjust = findAdjustedPool(holding);
            if (poolToAdjust) {
                const liquidityField = 'pool_distribution';
                if (liquidityField in poolToAdjust && typeof poolToAdjust[liquidityField] === 'number') {
                    const currentLiquidity = poolToAdjust[liquidityField];
                    // Include pool name and source (if available) in log
                    console.log(`Adjusting pool ${poolToAdjust.name} (${poolToAdjust.source ?? 'Unknown Source'}): reducing ${liquidityField} (${currentLiquidity}) by ${holdingAmount}`);
                    poolToAdjust[liquidityField] = Math.max(0, currentLiquidity - holdingAmount);
                } else {
                    console.warn(`Pool ${poolToAdjust.name} (Holding: ${holding.name}) does not have valid numerical field '${liquidityField}'`);
                }
            } else {
                console.warn(`Could not find matching adjusted pool for holding: ${holding.name}`);
            }
        } else if (holding.type === 'reserve') {
            const reserveToAdjust = findAdjustedReserve(holding);
            if (reserveToAdjust) {
                const supplyField = 'total_supplied';
                if (supplyField in reserveToAdjust && typeof reserveToAdjust[supplyField] === 'number') {
                    const currentSupply = reserveToAdjust[supplyField];
                    // Include reserve name and source in log for clarity
                    console.log(`Adjusting reserve ${reserveToAdjust.name} (${reserveToAdjust.source ?? 'Unknown Source'}): reducing ${supplyField} (${currentSupply}) by ${holdingAmount}`);
                    reserveToAdjust[supplyField] = Math.max(0, currentSupply - holdingAmount);
                } else {
                    console.warn(`Reserve ${reserveToAdjust.name} (Holding: ${holding.name}) does not have valid numerical field '${supplyField}'`);
                }
            } else {
                console.warn(`Could not find matching adjusted reserve for holding: ${holding.name}`);
            }
        }
    });

    // --- Step 3: Fetch Optimal Allocation using FILTERED & ADJUSTED data ---
    const allocationData = await fetchOptimalAllocation(
        totalFundsForCalc,
        adjustedPools,    // Pass filtered & adjusted pools
        adjustedReserves, // Pass filtered & adjusted reserves
        1
    );

    // console.log('[Optimal Alloc] Calculating optimal distribution for UI...');
    const newAllocation = calculateOptimalDistribution(allocationData);

    // console.log('[Optimal Alloc] Setting optimalDistribution state...');
    setOptimalDistribution(allocationData);

    // console.log('[Optimal Alloc] Setting optimalAllocation state...');
    setOptimalAllocation(newAllocation);

  } catch (err) {
    let errorMessage = 'An unexpected error occurred during optimal allocation';
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch') || err instanceof TypeError) { 
         errorMessage = 'Unable to connect to the server. ' + process.env.NEXT_PUBLIC_API_URL;
      } else {
         errorMessage = `Error calculating optimal allocation: ${err.message}`;
      }
    } 
    setError(errorMessage);
    console.error('[Optimal Alloc] CAUGHT ERROR:', err); // Keep error log
    setOptimalDistribution(null);
    setOptimalAllocation(INITIAL_ALLOCATION);
    setDisplayMode('idle');
  } finally {
    setIsLoading(false);
  }
};

  const CustomBarTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as AllocationItem;
      const formatApy = (apy: number | undefined) => 
        apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';
      const formatApr = (apr: number | undefined) => 
        apr !== undefined ? `${apr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';
      const formatProfit = (profit: number | undefined) =>
        profit !== undefined ? `$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

      return (
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg text-sm">
          <p className="font-semibold">{`${label}`}</p>
          <p>{`Allocation: $${data.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
          <p>{`Percentage: ${data.percentage}%`}</p>
          <p>{`Expected Profit: ${formatProfit(data.expectedProfit)}`}</p>
          <p>{`Total APY: ${formatApy(data.expected_return)}`}</p>
          {(data.reserve_apy !== undefined && data.reserve_apy !== 0) && (
            <p className="text-xs pl-2">{`└ Base APY: ${formatApy(data.reserve_apy)}`}</p>
          )}
          {(data.rewards_apy !== undefined && data.rewards_apy !== 0) && (
            <p className="text-xs pl-2">{`└ Rewards APY: ${formatApy(data.rewards_apy)}`}</p>
          )}
          <p>{`Total APR: ${formatApr(data.total_apr)}`}</p>
          {(data.base_apr !== undefined && data.base_apr !== 0) && (
            <p className="text-xs pl-2">{`└ Base APR: ${formatApr(data.base_apr)}`}</p>
          )}
          {(data.rewards_apr !== undefined && data.rewards_apr !== 0) && (
            <p className="text-xs pl-2">{`└ Rewards APR: ${formatApr(data.rewards_apr)}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatYAxisTick = (tickItem: number): string => {
    if (tickItem >= 1000000) {
      return `$${(tickItem / 1000000).toFixed(1)}M`;
    } else if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(0)}K`;
    } else {
      return `$${tickItem}`;
    }
  };

  const showResults = !isLoading && displayMode !== 'idle'; // Simplified condition

  return (
    <div className="w-full">
       {/* Tooltip CSS */}
       <style>{`
        .tooltip-container {
          position: relative;
          display: inline-block; /* Or block, depending on layout */
        }
        .tooltip-content {
          visibility: hidden;
          width: 160px;
          background-color: #2d3748; /* gray-800 */
          color: #fff;
          text-align: left;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 10;
          bottom: 125%; /* Position above the element */
          left: 50%;
          margin-left: -80px; /* Center the tooltip */
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 0.75rem; /* text-xs */
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .tooltip-content::after { /* Optional: Arrow */
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #2d3748 transparent transparent transparent;
        }
        .tooltip-container:hover .tooltip-content {
          visibility: visible;
          opacity: 1;
        }
        .tooltip-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px; /* Spacing between rows */
        }
        .tooltip-label {
          color: #9ca3af; /* gray-400 */
        }
        .tooltip-value {
          font-weight: 600; /* semibold */
        }
       `}</style>

      {/* Calculate Optimal Yield Button (now takes full width again) */}
      <div className="mt-8 mb-8">
         <button
            onClick={handleOptimalAllocation}
            disabled={isLoading || supplyFunds <= 0}
            className={`w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all duration-150 ease-in-out shadow-md 
                      font-semibold transform hover:scale-[1.02] active:scale-[0.98] 
                      ${(isLoading || supplyFunds <= 0) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'animate-button-glow' 
                      }`}
          >
            {isLoading && displayMode === 'optimal' ? 'Calculating Optimal...' : 'Calculate Optimal Yield'}
          </button>
      </div>

      {/* Error Display */}
      {isClient && error && (
        <div className="text-red-500 text-sm mt-2 mb-4">
          {error}
        </div>
      )}

      {/* Loading Indicator: Current Yield */}
      {isLoading && displayMode !== 'optimal' && (
        <div className="card p-4 sm:p-8 animate-pulse">
          <div className="mb-6 h-6 flex items-center">
             <span className="text-xl font-semibold text-gray-400">Calculating Current Wallet Yield...</span> 
          </div>
          <div className="space-y-1 lg:space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex flex-col lg:flex-row lg:items-center py-2 border-b border-gray-800 last:border-b-0`}>
                <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-700"/>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </div>
                <div className="block lg:hidden pl-5 space-y-2 text-xs mt-1">
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                </div>
                <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                  <div className="h-4 bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-700 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section - Conditionally render based on displayMode */} 
      <div className={`transition-opacity duration-500 ${ 
        showResults ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden' 
      }`}> 
        {/* Optimal Allocation View */} 
        {displayMode === 'optimal' && optimalAllocation.length > 0 && ( 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8"> 
            {/* Optimal Distribution Chart */} 
            <div className="card p-8"> 
              <h2 className="text-xl font-semibold mb-2">Optimal Distribution ({networkFilter.charAt(0).toUpperCase() + networkFilter.slice(1)})</h2> 
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart 
                    data={optimalAllocation}
                    margin={{ top: 5, right: 0, left: 0, bottom: 5 }} 
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" hide />
                    <YAxis 
                      tickFormatter={formatYAxisTick} 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
                    <Bar dataKey="allocation">
                      {optimalAllocation.map((entry: AllocationItem) => (
                        <Cell key={`cell-optimal-${entry.name}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div> 
            {/* Optimal Allocation List */} 
            <div className="card p-4 sm:p-8 flex flex-col"> 
              <h2 className="text-xl font-semibold mb-2">Optimal Allocation ({networkFilter.charAt(0).toUpperCase() + networkFilter.slice(1)})</h2> 
              <div className="space-y-1 lg:space-y-2 flex-grow">
                {/* Desktop Headers */}
                <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                  <div className="flex-[2] p-1"><span>Asset</span></div>
                  <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                    <span className="w-24 text-right">Allocation ($)</span>
                    <span className="w-16 text-right">Total APR</span> 
                    <span className="w-16 text-right">Total APY</span>
                    <span className="w-24 text-right">Profit ($)</span> 
                  </div>
                </div>
                {/* Allocation Items */}
                {optimalAllocation.map((item: AllocationItem) => {
                  const formatPercent = (value: number | undefined) => value !== undefined ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-';
                  const formatCurrency = (value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
                                    return (
                    <div key={`optimal-${item.name}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-none last:border-b-0`}>
                      <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                        <span className="text-white font-medium break-words">{item.name}</span>
                      </div>
                      {/* Mobile Data View */}
                      <div className="block lg:hidden pl-5 space-y-1 text-xs">
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Allocation:</span><span className="text-white font-medium">{formatCurrency(item.allocation)}</span></div>
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Total APR:</span><span className="text-gray-400 font-medium">{formatPercent(item.total_apr)}</span></div>
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Total APY:</span><span className="text-[#34D399] font-semibold">{formatPercent(item.expected_return)}</span></div>
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Profit:</span><span className="text-white font-medium">{formatCurrency(item.expectedProfit)}</span></div>
                      </div>
                      {/* Desktop Data View */}
                      <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                        <div className="w-24 text-right"><span className="text-white">{formatCurrency(item.allocation)}</span></div>
                        {/* Total APR Tooltip */}
                        <div className="tooltip-container w-16 text-right">
                          <span className="text-gray-400 hover:text-white cursor-help">{formatPercent(item.total_apr)}</span>
                          <div className="tooltip-content">
                            <div className="tooltip-row"><span className="tooltip-label">Base APR</span><span className="tooltip-value">{formatPercent(item.base_apr)}</span></div>
                            <div className="tooltip-row"><span className="tooltip-label">Rewards APR</span><span className="tooltip-value">{formatPercent(item.rewards_apr)}</span></div>
                          </div>
                        </div>
                        {/* Total APY Tooltip */}
                        <div className="tooltip-container w-16 text-right">
                          <span className="text-[#34D399] font-semibold hover:text-emerald-400 cursor-help">{formatPercent(item.expected_return)}</span>
                          <div className="tooltip-content">
                            <div className="tooltip-row"><span className="tooltip-label">Base APY</span><span className="tooltip-value">{formatPercent(item.reserve_apy)}</span></div>
                            <div className="tooltip-row"><span className="tooltip-label">Rewards APY</span><span className="tooltip-value">{formatPercent(item.rewards_apy)}</span></div>
                          </div>
                        </div>
                        <div className="w-24 text-right"><span className="text-white">{formatCurrency(item.expectedProfit)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
                {/* Total Profit Comparison */} 
                {optimalDistribution && ( 
                  <div className="pt-4 mt-auto border-t border-[#1E2633] space-y-1"> 
                    {currentTotalProfit > 0 && ( 
                      <div className="flex items-center justify-between text-sm"> 
                        <span className="text-gray-400 flex-[2]">Current Yearly Profit ({networkFilter})</span> 
                        <span className="text-gray-400 text-right">
                          ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div> 
                    )} 
                    <div className="flex items-center justify-between"> 
                      <span className="text-[#34D399] font-semibold flex-[2]">Optimal Yearly Profit ({networkFilter})</span> 
                      <span className="text-[#34D399] font-semibold text-right">
                        ${optimalDistribution.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div> 
                  </div> 
                )} 
            </div> 
          </div> 
        )} 

        {/* Current Yield View */} 
        {displayMode === 'current' && isClient && ( 
          <div className="card p-4 sm:p-8 flex flex-col"> 
            <h2 className="text-xl font-semibold mb-2">Current Estimated Yield ({networkFilter.charAt(0).toUpperCase() + networkFilter.slice(1)})</h2> 
            <div className="space-y-1 lg:space-y-2 flex-grow">
              {/* Desktop Headers */}
              <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                <div className="flex-[2] p-1"><span>Asset</span></div>
                <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                  <span className="w-24 text-right">Balance ($)</span>
                  <span className="w-16 text-right">Total APR</span> 
                  <span className="w-16 text-right">Total APY</span>
                  <span className="w-24 text-right">Yearly Profit ($)</span> 
                </div>
              </div>
              {/* Yield Items */}
              {currentYield.length === 0 && <p className="text-gray-400 text-sm">No current yield data to display. Your wallet may not hold assets in supported pools/reserves.</p>}
              {currentYield.map((item) => {
                const formatPercent = (value: number | undefined) => value !== undefined ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-';
                const formatCurrency = (value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

                return (
                  <div key={`current-${item.name}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-none last:border-b-0`}>
                    <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                      <span className="text-white font-medium break-words">{item.name}</span>
                    </div>
                    {/* Mobile Data View */}
                    <div className="block lg:hidden pl-5 space-y-1 text-xs">
                      <div className="flex justify-between"><span className='text-[#9CA3AF]'>Balance:</span><span className="text-white font-medium">{formatCurrency(item.balance)}</span></div>
                      <div className="flex justify-between"><span className='text-[#9CA3AF]'>Total APY:</span><span className="text-[#34D399] font-semibold">{formatPercent(item.expected_return)}</span></div>
                      <div className="flex justify-between"><span className='text-[#9CA3AF]'>Yearly Profit:</span><span className="text-white font-medium">{formatCurrency(item.expectedYearlyProfit)}</span></div>
                    </div>
                    {/* Desktop Data View */}
                    <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                      <div className="w-24 text-right"><span className="text-white">{formatCurrency(item.balance)}</span></div>
                      {/* Total APR Tooltip */}
                      <div className="tooltip-container w-16 text-right">
                        <span className="text-gray-400 hover:text-white cursor-help">{formatPercent(item.total_apr)}</span>
                        <div className="tooltip-content">
                          <div className="tooltip-row"><span className="tooltip-label">Base APR</span><span className="tooltip-value">{formatPercent(item.base_apr)}</span></div>
                          <div className="tooltip-row"><span className="tooltip-label">Rewards APR</span><span className="tooltip-value">{formatPercent(item.rewards_apr)}</span></div>
                        </div>
                      </div>
                      {/* Total APY Tooltip */}
                      <div className="tooltip-container w-16 text-right">
                        <span className="text-[#34D399] font-semibold hover:text-emerald-400 cursor-help">{formatPercent(item.expected_return)}</span>
                        <div className="tooltip-content">
                          <div className="tooltip-row"><span className="tooltip-label">Base APY</span><span className="tooltip-value">{formatPercent(item.reserve_apy)}</span></div>
                          <div className="tooltip-row"><span className="tooltip-label">Rewards APY</span><span className="tooltip-value">{formatPercent(item.rewards_apy)}</span></div>
                        </div>
                      </div>
                      <div className="w-24 text-right"><span className="text-white">{formatCurrency(item.expectedYearlyProfit)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Total Current Profit */}
            {currentTotalProfit > 0 && (
              <div className="pt-4 mt-auto border-t border-[#1E2633]">
                <div className="flex items-center justify-between">
                  <span className="text-[#34D399] font-semibold flex-[2]">Total Estimated Yearly Profit ({networkFilter})</span>
                  <span className="text-[#34D399] font-semibold text-right">
                    ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                  </span>
                </div>
              </div>
            )}
            {currentTotalProfit <= 0 && currentYield.length > 0 && (
              <p className="text-sm text-gray-400 pt-4 mt-auto border-t border-[#1E2633]">No current yield detected for held assets.</p>
            )}
          </div>
        )}
      </div>

      {/* Pool & Reserves Information Section (Filter based on optimal allocation) */} 
       {displayMode === 'optimal' && optimalDistribution && optimalAllocation.length > 0 && ( 
         <> 
           <h2 className="text-xl font-bold mt-8 mb-8"> 
             Pools & Reserves Information (Optimal Allocation for {networkFilter.charAt(0).toUpperCase() + networkFilter.slice(1)}) 
           </h2> 
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn"> 
             {optimalAllocation // Iterate through the *filtered* optimal allocation items
                 .map((investment: AllocationItem) => { 
                   // Find AssetConfig using the display name (which matches config name)
                   const assetConfig = SUPPORTED_ASSETS.find(config =>
                       config.name === investment.name // Match by name used in allocation item
                   );

                   if (!assetConfig) {
                       console.warn(`Optimal Info Render: Config not found for optimal investment name ${investment.name}`);
                       return null;
                   }

                   // Find the corresponding base data (pool or reserve) from *all* fetched data 
                   // using source and apiName from the identified config
                   if (assetConfig.type === 'pool') {
                     const poolData = fetchedPools.find(p =>
                         p.source === assetConfig.source &&
                         p.name === assetConfig.apiName
                     );
                     if (!poolData) {
                          console.warn(`Optimal PoolInfo Render: Fetched data not found for ${assetConfig.name} (Source: ${assetConfig.source}, apiName: ${assetConfig.apiName})`);
                          return null;
                     }
                     const displayTitle = assetConfig.name;
                     const explorerUrl = assetConfig.explorerUrl;
                     const logoUrl = assetConfig.logoUrl;
                     const supportedAssetIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);
                     const color = getInvestmentColor('pool', supportedAssetIndex);
                     return (
                       <PoolInfo
                         key={`info-pool-${displayTitle}`}
                         title={displayTitle}
                         color={color}
                         data={poolData}
                         explorerUrl={explorerUrl}
                         logoUrl={logoUrl}
                       />
                     );
                   } else { // assetConfig.type === 'reserve'
                     const reserveData = fetchedReserves.find(r =>
                         r.source === assetConfig.source &&
                         r.name === assetConfig.apiName
                     );
                      if (!reserveData) {
                          console.warn(`Optimal ReserveInfo Render: Fetched data not found for ${assetConfig.name} (Source: ${assetConfig.source}, apiName: ${assetConfig.apiName})`);
                          return null;
                     }
                      const displayTitle = assetConfig.name;
                      const explorerUrl = assetConfig.explorerUrl;
                      const logoUrl = assetConfig.logoUrl;
                      const supportedAssetIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);
                      const color = getInvestmentColor('reserve', supportedAssetIndex);
                     return (
                       <ReserveInfo
                         key={`info-reserve-${displayTitle}`}
                         title={displayTitle}
                         color={color}
                         reserveData={reserveData}
                         explorerUrl={explorerUrl}
                         logoUrl={logoUrl}
                       />
                     );
                   }
               })
             } 
           </div> 
         </> 
       )} 
    </div>
  );
}