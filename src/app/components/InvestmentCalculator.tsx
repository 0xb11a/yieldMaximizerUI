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
import { SUPPORTED_ASSETS, type AssetConfig } from '@/config/assets';
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
  symbol: string;
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
}

export default function InvestmentCalculator({ supplyFunds = 0, walletBalances = [] }: InvestmentCalculatorProps) {
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
        // Find the corresponding AssetConfig using the allocationKey
        const assetConfig = SUPPORTED_ASSETS.find(
          config => config.allocationKey === investment.name
        );

        if (!assetConfig) {
          console.warn(`Optimal Calc: AssetConfig not found for allocationKey: ${investment.name}`);
          // Decide how to handle missing config: skip, use default, etc.
          // For now, try using the investment name directly, but this might lack details
          return {
            name: investment.name,
            percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
            color: getInvestmentColor(investment.type, -1), // Fallback color
            type: investment.type,
            expected_return: investment.total_apr ?? 0, // Use total_apr (assuming APY calculation is done elsewhere or APR is sufficient)
            allocation: investment.allocation,
            expectedProfit: investment.expectedProfit ?? 0, // Use expectedProfit
            reserve_apy: investment.base_apr, // Use base_apr (assuming APY calc is elsewhere)
            rewards_apy: investment.rewards_apy, // Use rewards_apy directly
            total_apr: investment.total_apr, // Map total_apr
            base_apr: investment.base_apr,     // Map base_apr
            rewards_apr: investment.rewards_apr, // Map rewards_apr
          };
        }

        // Determine the index within SUPPORTED_ASSETS for consistent coloring
        const supportedAssetIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);

        const displayName = assetConfig.name; // Always use config name for display

        return {
            name: displayName,
            percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
            color: getInvestmentColor(assetConfig.type, supportedAssetIndex),
            type: assetConfig.type, // Use type from config
            expected_return: investment.total_apr ?? 0, // Use total_apr (assuming APY calc is elsewhere)
            allocation: investment.allocation,
            expectedProfit: investment.expectedProfit ?? 0, // Use expectedProfit
            reserve_apy: investment.base_apr, // Use base_apr (assuming APY calc is elsewhere)
            rewards_apy: investment.rewards_apy, // Use rewards_apy directly
            total_apr: investment.total_apr, // Map total_apr
            base_apr: investment.base_apr,     // Map base_apr
            rewards_apr: investment.rewards_apr, // Map rewards_apr
        };
      });

    return calculatedAllocation;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

   // Calculate current yield when wallet balances change
   useEffect(() => {
     let isCancelled = false;

     const calculateCurrentYieldInternal = async () => {
       if (walletBalances.length === 0) {
         return; 
       }
    
       setIsLoading(true); 
       setError(null); 
    
       const walletAddressToUse: string = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";
    
       try {
         // --- Step 1: Fetch Pool and Reserve Base Data --- 
         const poolReserveBaseData = await fetchPoolAndReserveData(walletAddressToUse);
         if (isCancelled) {
             return;
         } 

         const localFetchedPools = poolReserveBaseData.pools;
         const localFetchedReserves = poolReserveBaseData.reserves;
         setFetchedPools(localFetchedPools);
         setFetchedReserves(localFetchedReserves);
    
         if (localFetchedPools.length === 0 && localFetchedReserves.length === 0) {
             if (!isCancelled) setError('No pools or reserves base data found.');
             return;
         }
    
         // --- Step 2: Fetch Current APYs --- 
         const apyData = await fetchOptimalAllocation(0, localFetchedPools, localFetchedReserves);
         if (isCancelled) {
             return;
         } 
         
         // --- Step 3: Map Wallet Balances --- 
         let totalCalculatedProfit = 0;
         const calculatedYield: CurrentYieldItem[] = walletBalances.map((balance) => {
             const assetConfig = SUPPORTED_ASSETS.find(asset => asset.name === balance.name);
             if (!assetConfig) {
                  console.warn(`No AssetConfig found for wallet balance: ${balance.name}`);
                  return {
                     name: balance.name,
                     symbol: balance.symbol,
                     balance: parseFloat(formatUnits(balance.value, balance.decimals)),
                     color: '#808080', 
                     type: 'reserve', 
                     expected_return: 0,
                     expectedYearlyProfit: 0,
                  } as CurrentYieldItem;
             }

             let baseData: Pool | Reserve | undefined;
             if (assetConfig.type === 'pool') {
                 // Match base data using source and apiName from config
                 baseData = localFetchedPools.find(p =>
                     p.source === assetConfig.source &&
                     p.name === assetConfig.apiName
                 );
             } else {
                   // Match base data using source and apiName from config
                   baseData = localFetchedReserves.find(r =>
                       r.source === assetConfig.source &&
                       r.name === assetConfig.apiName
                   );
             }
             if (!baseData) {
                 // Fallback removed - matching should now work correctly if types/API response includes source/name
                 console.warn(`Current Yield: No matching base data found for config: ${assetConfig.name} (Source: ${assetConfig.source}, apiName: ${assetConfig.apiName})`);
             }

             // Match APY data using the allocationKey
             const matchedApyDetail: Investment | undefined = apyData.investments.find(
                 (detail: Investment) => detail.name === assetConfig.allocationKey
             );

             if (!matchedApyDetail && assetConfig.allocationKey !== 'PLACEHOLDER_WALLET_USDC_KEY') { // Avoid warning for wallet
                  console.warn(`Current Yield: No matching APY data found for allocationKey: ${assetConfig.allocationKey} (Config: ${assetConfig.name})`);
             }

             const itemData: Partial<CurrentYieldItem> = {
                 name: assetConfig.name,
                 symbol: balance.symbol,
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
                 // Use the fields already mapped in fetchOptimalAllocation
                 itemData.reserve_apy = matchedApyDetail.reserve_apy ?? 0; // Contains base_apy
                 itemData.rewards_apy = matchedApyDetail.rewards_apy ?? 0;
                 itemData.expected_return = matchedApyDetail.expected_return ?? 0; // Contains total_apy
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
           if (calculatedYield.length > 0) {
               setDisplayMode('current'); 
           } else {
               setDisplayMode('idle'); 
           }
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

   // --- Effect Execution Logic --- 
   if (walletBalances.length > 0 && displayMode !== 'optimal') {
       calculateCurrentYieldInternal();
   } else if (walletBalances.length === 0 && displayMode === 'current') {
       setDisplayMode('idle'); 
       setCurrentYield(INITIAL_CURRENT_YIELD); 
       setCurrentTotalProfit(0);
   }

   // --- Cleanup Function --- 
   return () => {
     isCancelled = true;
   };
 }, [walletBalances, displayMode]);

  const handleOptimalAllocation = async () => {
    if (supplyFunds <= 0) {
      setError("Please provide a valid total supply value greater than 0 to calculate optimal allocation.");
      return;
    }
    // Check if we have current yield data needed for withdrawal simulation
    if (currentYield.length === 0) {
       setError("Current wallet holdings information is not available. Please wait or reload.");
       console.warn("Attempted optimal allocation calculation before current yield data was ready.");
       return;
    }
    // Check if we have fetched pool/reserve data needed for adjustment
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
      // --- Step 1: Simulate Withdrawal - Create Adjusted Market Data ---
      console.log("Simulating withdrawal: Adjusting market data based on current holdings:", currentYield);

      const adjustedPools = JSON.parse(JSON.stringify(fetchedPools)) as Pool[];
      const adjustedReserves = JSON.parse(JSON.stringify(fetchedReserves)) as Reserve[];

      const findAdjustedReserve = (holding: CurrentYieldItem): Reserve | undefined => {
        const assetConfig = SUPPORTED_ASSETS.find(a => a.name === holding.name);
        if (!assetConfig || assetConfig.type !== 'reserve') {
            console.warn(`Adjust Reserve: Could not find reserve AssetConfig for holding: ${holding.name}`);
            return undefined;
        }

        // Match using source and apiName from config against fetched reserve data
        // IMPORTANT: Assumes 'source' field exists in the Reserve type (needs adding to apiConfig.ts)
        let reserve = adjustedReserves.find(r =>
             r.source === assetConfig.source &&
             r.name === assetConfig.apiName
        );

        if (!reserve) {
            console.warn(`Adjust Reserve: Could not find matching reserve for ${assetConfig.name} (Source: ${assetConfig.source}, apiName: ${assetConfig.apiName})`);
        }
        return reserve;
      };

      const findAdjustedPool = (holding: CurrentYieldItem): Pool | undefined => {
         const assetConfig = SUPPORTED_ASSETS.find(a => a.name === holding.name);
         if (!assetConfig || assetConfig.type !== 'pool') {
             console.warn(`Adjust Pool: Could not find pool AssetConfig for holding: ${holding.name}`);
             return undefined;
         }

         // Match using source and apiName from config against fetched pool data
         // IMPORTANT: Assumes 'source' field exists in the Pool type (needs adding to apiConfig.ts)
         return adjustedPools.find(p =>
             p.source === assetConfig.source &&
             p.name === assetConfig.apiName
         );
      };

      // --- Main loop using helper functions ---
      currentYield.forEach(holding => {
          if (holding.name === 'Wallet USDC') {
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

      console.log('Adjusted market data:', { pools: adjustedPools, reserves: adjustedReserves });

      // --- Step 2: Fetch Optimal Allocation using ADJUSTED data ---
      console.log('Fetching optimal allocation with adjusted market data and total funds:', totalFundsForCalc);
      const allocationData = await fetchOptimalAllocation(
          totalFundsForCalc,
          adjustedPools,
          adjustedReserves,
          1
      );
      
      const newAllocation = calculateOptimalDistribution(allocationData);
      
      setOptimalDistribution(allocationData);
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
      console.error('Optimal Allocation Process Error:', err);
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
      const formatProfit = (profit: number | undefined) =>
        profit !== undefined ? `$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

      return (
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg text-sm">
          <p className="font-semibold">{`${label}`}</p>
          <p>{`Allocation: $${data.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
          <p>{`Percentage: ${data.percentage}%`}</p>
          <p>{`Expected Profit: ${formatProfit(data.expectedProfit)}`}</p>
          <p>{`Total APY: ${formatApy(data.expected_return)}`}</p>
          {data.reserve_apy !== undefined && (
            <p className="text-xs pl-2">{`└ Reserve APY: ${formatApy(data.reserve_apy)}`}</p>
          )}
          {data.rewards_apy !== undefined && (
            <p className="text-xs pl-2">{`└ Rewards APY: ${formatApy(data.rewards_apy)}`}</p>
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

  const displayAllocationData = displayMode === 'current' ? currentYield : optimalAllocation;
  const showResults = !isLoading && displayMode !== 'idle' && displayAllocationData.length > 0;

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

      {/* Results Section */}
      <div className={`transition-opacity duration-500 ${
        showResults ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
      }`}>
        {/* Optimal Allocation View */}
        {displayMode === 'optimal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8">
            {/* Optimal Distribution Chart */}
            <div className="card p-8">
              <h2 className="text-xl font-semibold mb-2">Optimal Distribution</h2>
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
              <h2 className="text-xl font-semibold mb-2">Optimal Allocation</h2>
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
                        <span className="text-gray-400 flex-[2]">Current Yearly Profit</span>
                        <span className="text-gray-400 text-right">
                          ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[#34D399] font-semibold flex-[2]">Optimal Yearly Profit</span>
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
            <h2 className="text-xl font-semibold mb-2">Current Estimated Yield</h2>
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
                  <div key={`current-${item.symbol}-${item.name}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-none last:border-b-0`}>
                    <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                      <span className="text-white font-medium break-words">{item.name} ({item.symbol})</span>
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
                  <span className="text-[#34D399] font-semibold flex-[2]">Total Estimated Yearly Profit</span>
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

      {/* Pool & Reserves Information Section */}
      {/* Reverted to only showing when optimalDistribution is available */}
      {displayMode === 'optimal' && optimalDistribution && (fetchedPools.length > 0 || fetchedReserves.length > 0) && (
        <>
          <h2 className="text-xl font-bold mt-8 mb-8">
            Pools & Reserves Information (Optimal Allocation)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            
            {/* Reverted to Optimal Allocation Info Logic Only */}
            {optimalDistribution?.investments
                .filter(inv => inv.allocation > 0) // Only show those with > 0 allocation in optimal
                .map((investment: Investment) => {
                  // Find AssetConfig using allocationKey
                  const assetConfig = SUPPORTED_ASSETS.find(config =>
                      config.allocationKey === investment.name
                  );

                  if (!assetConfig) {
                      console.warn(`Optimal Info Render: Config not found for investment key ${investment.name}`);
                      return null;
                  }

                  // Now find the corresponding base data (pool or reserve) using source and name
                  // IMPORTANT: Assumes 'source' field exists in Pool/Reserve types (needs adding to apiConfig.ts)
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