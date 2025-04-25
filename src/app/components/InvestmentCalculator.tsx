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
import { SUPPORTED_ASSETS } from '@/config/assets';
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
  expected_return: number; // Total APY
  allocation: number;
  expectedProfit: number;  // Added profit specific to this allocation
  reserve_apy?: number;   // APY from reserve/fees
  rewards_apy?: number;   // APY from rewards
  total_apr?: number;     
  base_apr?: number;      
  rewards_apr?: number;   
}

interface CurrentYieldItem {
  name: string;
  symbol: string;
  balance: number; // Formatted balance (USD value or token amount)
  color: string;
  type: 'pool' | 'reserve'; // Indicates if it's mapped to a pool or reserve
  expected_return: number; // Total APY from the mapped pool/reserve
  expectedYearlyProfit: number; // Calculated yearly profit (balance * APY)
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

// Define props for the component
interface InvestmentCalculatorProps {
  initialFunds?: number; // Receive initial funds from parent for optimal calc
  walletBalances?: WalletBalance[]; // Receive wallet balances for current yield calc
}

export default function InvestmentCalculator({ initialFunds = 0, walletBalances = [] }: InvestmentCalculatorProps) {
  const [displayMode, setDisplayMode] = useState<'idle' | 'current' | 'optimal'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // State for Optimal Allocation results
  const [optimalAllocation, setOptimalAllocation] = useState<AllocationItem[]>(INITIAL_ALLOCATION);
  const [optimalDistribution, setOptimalDistribution] = useState<ApiResponse | null>(null);

  // State for Current Yield results
  const [currentYield, setCurrentYield] = useState<CurrentYieldItem[]>(INITIAL_CURRENT_YIELD);
  const [currentTotalProfit, setCurrentTotalProfit] = useState<number>(0); // State for total current profit

  // State to hold fetched pool and reserve data (used by both modes)
  const [fetchedPools, setFetchedPools] = useState<Pool[]>([]);
  const [fetchedReserves, setFetchedReserves] = useState<Reserve[]>([]);

  // Processes API response (Optimal Allocation) into formatted allocation data
  const calculateOptimalDistribution = (apiResponse: ApiResponse): AllocationItem[] => {
    const investments = apiResponse.investments;
    const validTotalFunds = apiResponse.total_funds > 0 ? apiResponse.total_funds : 1;

    // Find the original index in the fetched data for color mapping
    const findOriginalIndex = (name: string, type: 'pool' | 'reserve'): number => {
      if (type === 'pool') {
        return fetchedPools.findIndex(p => p.name === name);
      } else {
        return fetchedReserves.findIndex(r => r.name === name);
      }
    };

    const calculatedAllocation: AllocationItem[] = investments
      .filter(investment => investment.allocation > 0)
      .map((investment) => ({
        name: investment.name,
        percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
        color: getInvestmentColor(investment.type, findOriginalIndex(investment.name, investment.type)),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation,
        expectedProfit: investment.expectedProfit,
        reserve_apy: investment.reserve_apy,
        rewards_apy: investment.rewards_apy,
        total_apr: investment.total_apr,
        base_apr: investment.base_apr,
        rewards_apr: investment.rewards_apr
      }));

    return calculatedAllocation;
  };

  // useEffect to set isClient to true after mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

   // useEffect to trigger current yield calculation when walletBalances are available
   // and we are not already showing optimal results
   useEffect(() => {
     let isCancelled = false; // Cancellation flag for this effect run

     const calculateCurrentYieldInternal = async () => {
       if (walletBalances.length === 0) {
         return; // Exit if no balances
       }
    
       setIsLoading(true); 
       setError(null); // Clear previous errors
       // We don't reset currentYield/totalProfit here to avoid clearing potentially valid results
       // from a quick previous run before this one finishes.
    
       const walletAddressToUse: string = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";
    
       try {
         // Step 1: Fetch Pool and Reserve Base Data
         const poolReserveBaseData = await fetchPoolAndReserveData(walletAddressToUse);
         // --- Check cancellation after await --- 
         if (isCancelled) {
             return;
         } 

         const localFetchedPools = poolReserveBaseData.pools;
         const localFetchedReserves = poolReserveBaseData.reserves;
         // Update fetched data state to be used by this run and potentially optimal calc later
         setFetchedPools(localFetchedPools); 
         setFetchedReserves(localFetchedReserves);
    
         if (localFetchedPools.length === 0 && localFetchedReserves.length === 0) {
             if (!isCancelled) setError('No pools or reserves base data found.');
             return; // Exit if no base data found
         }
    
         // Step 2: Fetch Current APYs 
         const apyData = await fetchOptimalAllocation(0, localFetchedPools, localFetchedReserves);
         // --- Check cancellation after await --- 
         if (isCancelled) {
             return;
         } 
         
         // Step 3: Map Wallet Balances
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
             if (assetConfig.apiType === 'pool') {
                 baseData = localFetchedPools.find(p => p.address === assetConfig.contractAddress); 
             } else { 
                  baseData = localFetchedReserves.find(r => 
                      (r.name?.toLowerCase() === assetConfig.name.toLowerCase())
                      || (r.address && r.address === assetConfig.contractAddress) 
                  );
             }
             let matchedApyDetail: Investment | undefined;
             if (assetConfig.source === 'merchantmoe' && assetConfig.apiType === 'pool') {
                 matchedApyDetail = apyData.investments.find(detail =>
                     detail.name === "USDC-USDT" && detail.type === 'pool'
                 );
                  // if (matchedApyDetail) { console.log(`Matched Merchant Moe pool...`); }
             } else {
                 // Use apiName for matching if available, otherwise fall back to name (case-insensitive)
                 const nameToMatch = (assetConfig.apiName ?? assetConfig.name).toLowerCase();
                 matchedApyDetail = apyData.investments.find(detail =>
                     detail.name.toLowerCase() === nameToMatch && detail.type === assetConfig.apiType
                 );
             }
             if (!matchedApyDetail && assetConfig.name !== 'Wallet USDC') { 
                  console.warn(`No matching APY data found for config: ${assetConfig.name} ...`);
             }
             const itemData: Partial<CurrentYieldItem> = {
                 name: assetConfig.name,
                 symbol: balance.symbol, 
                 balance: parseFloat(formatUnits(balance.value, balance.decimals)),
                 color: '#8884d8',
                 type: assetConfig.type,
                 originalPoolData: assetConfig.apiType === 'pool' ? baseData as Pool : undefined,
                 originalReserveData: assetConfig.apiType === 'reserve' ? baseData as Reserve : undefined,
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
                 itemData.expected_return = itemData.reserve_apy + itemData.rewards_apy;
                 itemData.total_apr = matchedApyDetail.total_apr;
                 itemData.base_apr = matchedApyDetail.base_apr;
                 itemData.rewards_apr = matchedApyDetail.rewards_apr;
                 itemData.expectedYearlyProfit = balanceInUsd * (itemData.expected_return / 100);
                 totalCalculatedProfit += itemData.expectedYearlyProfit;
                 // console.log(`Profit calc for ${itemData.name}...`);
             } 
             const originalIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);
             itemData.color = getInvestmentColor(assetConfig.type, originalIndex);
             return itemData as CurrentYieldItem; 
       });
    
       if (!isCancelled) {
           setCurrentYield(calculatedYield);
           setCurrentTotalProfit(totalCalculatedProfit); 
           if (calculatedYield.length > 0) {
               // Only switch to current mode if we actually have yield data
               setDisplayMode('current'); 
           } else {
               // If calculation resulted in empty list, go back to idle
               setDisplayMode('idle'); 
           }
       }
    
     } catch (err) {
       // Handle errors only if not cancelled
       if (!isCancelled) {
         console.error('Current Yield Calculation Error:', err);
         let errorMessage = 'An unexpected error occurred calculating current yield';
         if (err instanceof Error) {
            errorMessage = `Error fetching data for current yield: ${err.message}`;
         }
         setError(errorMessage);
         // Ensure state reflects the error
         setDisplayMode('idle'); 
         setCurrentYield(INITIAL_CURRENT_YIELD); 
         setCurrentTotalProfit(0);
       }
     } finally {
       // Set loading false only if this run finished (was not cancelled)
       if (!isCancelled) {
         setIsLoading(false);
       }
     }
   };

   // --- Effect Execution Logic --- 
   if (walletBalances.length > 0 && displayMode !== 'optimal') {
       // Only trigger calculation if we have balances and are not showing optimal results
       calculateCurrentYieldInternal();
   } else if (walletBalances.length === 0 && displayMode === 'current') {
       // If balances disappear while showing current yield, reset to idle
       setDisplayMode('idle'); 
       setCurrentYield(INITIAL_CURRENT_YIELD); 
       setCurrentTotalProfit(0);
       // Clear fetched data as well?
       // setFetchedPools([]); 
       // setFetchedReserves([]);
   } // If displayMode is 'optimal' or 'idle' with no balances, do nothing

   // --- Cleanup Function --- 
   return () => {
     isCancelled = true;
   };
 // Dependencies: Rerun ONLY when balances change OR displayMode changes (as it's used in the initial check)
 }, [walletBalances, displayMode]); 

  // Renamed handler for Optimal Allocation button click
  const handleOptimalAllocation = async () => {
    // Use initialFunds prop now
    if (initialFunds <= 0) {
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
    setDisplayMode('optimal'); // Set mode immediately for optimal calc

    const totalFundsForCalc: number = initialFunds; 

    try {
      // --- Step 1: Simulate Withdrawal - Create Adjusted Market Data ---
      console.log("Simulating withdrawal: Adjusting market data based on current holdings:", currentYield);

      // Create deep copies to avoid modifying the original state used by Current Yield display
      const adjustedPools = JSON.parse(JSON.stringify(fetchedPools)) as Pool[];
      const adjustedReserves = JSON.parse(JSON.stringify(fetchedReserves)) as Reserve[];

      currentYield.forEach(holding => {
          // Skip pure wallet balance, only adjust for protocol positions
          if (holding.name === 'Wallet USDC') {
          return;
      }

          const holdingAmount = holding.balance; // This is already the USD value calculated in currentYield

          if (holding.type === 'pool') {
              // DO NOTHING for pools - API should handle pool state based on total_funds
              // We just pass the current fetched pool data
              console.log(`Skipping adjustment for pool: ${holding.name}`);

          } else if (holding.type === 'reserve') {
              // Find the corresponding reserve in adjusted data
               const reserveToAdjust = adjustedReserves.find(r =>
                  // Match using the originalReserveData name if present, or fallback to holding name comparison (case-insensitive)
                  (holding.originalReserveData && r.name === holding.originalReserveData.name) ||
                  (r.name?.toLowerCase() === holding.name.toLowerCase()) // Fallback
               );
              if (reserveToAdjust) {
                  console.log(`Adjusting reserve ${reserveToAdjust.name}: reducing total_supplied (${reserveToAdjust.total_supplied}) by ${holdingAmount}`);
                  reserveToAdjust.total_supplied = Math.max(0, reserveToAdjust.total_supplied - holdingAmount); // Prevent negative supply
              } else {
                   console.warn(`Could not find reserve to adjust supply for: ${holding.name} (lookup name: ${holding.originalReserveData?.name ?? holding.name})`);
              }
          }
      });

      console.log('Adjusted market data:', { pools: adjustedPools, reserves: adjustedReserves });

      // --- Step 2: Fetch Optimal Allocation using ADJUSTED data ---
      console.log('Fetching optimal allocation with adjusted market data and total funds:', totalFundsForCalc);
      const allocationData = await fetchOptimalAllocation(
          totalFundsForCalc,
          adjustedPools,     // Use ADJUSTED pools
          adjustedReserves,  // Use ADJUSTED reserves
          1 // Example: Set min_allocation_percent
      );
      // console.log('<<< Raw Response from fetchOptimalAllocation >>>:', allocationData);
      
      const newAllocation = calculateOptimalDistribution(allocationData); // This function uses API response names
      
      setOptimalDistribution(allocationData);
      setOptimalAllocation(newAllocation); 

    } catch (err) {
       // ... Error handling (no changes needed here) ...
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
      setDisplayMode('idle'); // Reset mode on error
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Tooltip for BarChart (Only used for Optimal Allocation)
  const CustomBarTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as AllocationItem; // Cast to AllocationItem
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

  // Function to format Y-axis ticks
  const formatYAxisTick = (tickItem: number): string => {
    if (tickItem >= 1000000) {
      return `$${(tickItem / 1000000).toFixed(1)}M`;
    } else if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(0)}K`;
    } else {
      return `$${tickItem}`;
    }
  };

  // Determine which allocation data to display
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

      {/* Button to trigger OPTIMAL calculation */}
      <div className="mt-8 mb-8">
         <button
            onClick={handleOptimalAllocation}
            disabled={isLoading || initialFunds <= 0}
            className={`w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all duration-150 ease-in-out shadow-md 
                      font-semibold transform hover:scale-[1.02] active:scale-[0.98] 
                      ${(isLoading || initialFunds <= 0) 
                        ? 'opacity-50 cursor-not-allowed' 
                        // Add glow animation class when enabled
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

      {/* Loading Indicator for Current Yield */}
      {isLoading && displayMode !== 'optimal' && (
        <div className="card p-4 sm:p-8 animate-pulse">
          <div className="mb-6 h-6 flex items-center">
             <span className="text-xl font-semibold text-gray-400">Calculating Current Wallet Yield...</span> 
          </div>
          <div className="space-y-1 lg:space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex flex-col lg:flex-row lg:items-center py-2 border-b border-gray-800 last:border-b-0`}>
                {/* Asset Name Skeleton */}
                <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-700"/>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </div>
                {/* Mobile Skeleton - Just show simplified lines */}
                <div className="block lg:hidden pl-5 space-y-2 text-xs mt-1">
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                </div>
                {/* Desktop Skeleton */}
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

      {/* Results Section (Conditional Rendering) */}
      <div className={`transition-opacity duration-500 ${
        showResults ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
      }`}>
        {/* Optimal Allocation specific: Distribution Chart */}
        {displayMode === 'optimal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8"> {/* Add mb-8 */}
        <div className="card p-8">
              <h2 className="text-xl font-semibold mb-2">Optimal Distribution</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart 
                    data={optimalAllocation} // Use optimalAllocation state
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
                      {optimalAllocation.map((entry: AllocationItem) => ( // Use optimalAllocation and add type
                        <Cell key={`cell-optimal-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
            {/* Allocation List (Optimal) - Reuse structure, pass optimalAllocation */}
        <div className="card p-4 sm:p-8 flex flex-col">
               <h2 className="text-xl font-semibold mb-2">Optimal Allocation</h2>
          <div className="space-y-1 lg:space-y-2 flex-grow">
            {/* Headers */}
            <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                       <div className="flex-[2] p-1"><span>Asset</span></div>
              <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                 <span className="w-24 text-right">Allocation ($)</span>
                 <span className="w-16 text-right">Total APR</span> 
                 <span className="w-16 text-right">Total APY</span>
                 <span className="w-24 text-right">Profit ($)</span> 
              </div>
            </div>
            {/* Items */}
                   {optimalAllocation.map((item: AllocationItem) => { // Use optimalAllocation and add type
                      const formatPercent = (value: number | undefined) => value !== undefined ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-';
                      const formatCurrency = (value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
              return (
                         <div key={`optimal-${item.name}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-none last:border-b-0`}>
                  {/* Asset Name */}
                  <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                    <span className="text-white font-medium break-words">{item.name}</span> 
                            </div>
                            {/* Mobile Data */}
                            <div className="block lg:hidden pl-5 space-y-1 text-xs">
                                {/* ... (Mobile view for optimal allocation) ... */}
                                 <div className="flex justify-between"><span className='text-[#9CA3AF]'>Allocation:</span><span className="text-white font-medium">{formatCurrency(item.allocation)}</span></div>
                                 <div className="flex justify-between"><span className='text-[#9CA3AF]'>Total APY:</span><span className="text-[#34D399] font-semibold">{formatPercent(item.expected_return)}</span></div>
                                 <div className="flex justify-between"><span className='text-[#9CA3AF]'>Profit:</span><span className="text-white font-medium">{formatCurrency(item.expectedProfit)}</span></div>
                            </div>
                            {/* Desktop Data */}
                            <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                                {/* ... (Desktop view for optimal allocation using item properties) ... */}
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
                                  {/* Profit */}
                                  <div className="w-24 text-right"><span className="text-white">{formatCurrency(item.expectedProfit)}</span></div>
                            </div>
                         </div>
                      );
                   })}
                </div>
                {/* Total Profit (Optimal vs Current) */}
                {optimalDistribution && ( // Check optimalDistribution is available
                   <div className="pt-4 mt-auto border-t border-[#1E2633] space-y-1">
                      {/* Current Profit */}
                      {currentTotalProfit > 0 && ( // Only show current if it's calculated and positive
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 flex-[2]">Current Yearly Profit</span>
                            <span className="text-gray-400 text-right">
                              ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                         </div>
                      )}
                      {/* Optimal Profit */}
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

        {/* Current Yield specific: Allocation List */}
        {displayMode === 'current' && isClient && (
          <div className="card p-4 sm:p-8 flex flex-col">
             <h2 className="text-xl font-semibold mb-2">Current Estimated Yield</h2>
             <div className="space-y-1 lg:space-y-2 flex-grow">
              {/* Headers */}
              <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                <div className="flex-[2] p-1"><span>Asset</span></div>
                <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                  <span className="w-24 text-right">Balance ($)</span>
                  <span className="w-16 text-right">Total APR</span> 
                  <span className="w-16 text-right">Total APY</span>
                  <span className="w-24 text-right">Yearly Profit ($)</span> 
                </div>
              </div>
              {/* Items */}
              {currentYield.length === 0 && <p className="text-gray-400 text-sm">No current yield data to display. Your wallet may not hold assets in supported pools/reserves.</p>}
              {currentYield.map((item) => { // Use currentYield state
                const formatPercent = (value: number | undefined) => value !== undefined ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-';
                const formatCurrency = (value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

                return (
                  <div key={`current-${item.symbol}-${item.name}`} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-none last:border-b-0`}>
                    {/* Asset Name */}
                    <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                       <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                       <span className="text-white font-medium break-words">{item.name} ({item.symbol})</span> {/* Added symbol */}
                  </div>
                  
                  {/* Data - Mobile/Tablet View */}
                  <div className="block lg:hidden pl-5 space-y-1 text-xs">
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Balance:</span><span className="text-white font-medium">{formatCurrency(item.balance)}</span></div>
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Total APY:</span><span className="text-[#34D399] font-semibold">{formatPercent(item.expected_return)}</span></div>
                        <div className="flex justify-between"><span className='text-[#9CA3AF]'>Yearly Profit:</span><span className="text-white font-medium">{formatCurrency(item.expectedYearlyProfit)}</span></div>
                  </div>

                  {/* Data - Desktop View */}
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
                       {/* Yearly Profit */}
                       <div className="w-24 text-right"><span className="text-white">{formatCurrency(item.expectedYearlyProfit)}</span></div>
                  </div>
                </div>
              );
            })} 
            </div>
            {/* Total Current Yearly Profit */}
            {currentTotalProfit > 0 && ( // Use currentTotalProfit state directly
              <div className="pt-4 mt-auto border-t border-[#1E2633]">
                 <div className="flex items-center justify-between">
                  <span className="text-[#34D399] font-semibold flex-[2]">Total Estimated Yearly Profit</span>
                  <span className="text-[#34D399] font-semibold text-right">
                    ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                  </span>
                </div>
              </div>
            )}
             {currentTotalProfit <= 0 && currentYield.length > 0 && ( // Check state directly
                 <p className="text-sm text-gray-400 pt-4 mt-auto border-t border-[#1E2633]">No current yield detected for held assets.</p>
            )}
        </div>
        )}
      </div>

      {/* Pool & Reserves Information Section */}
      {/* Condition: Show only when optimal allocation is calculated and available */}
      {displayMode === 'optimal' && optimalDistribution && (fetchedPools.length > 0 || fetchedReserves.length > 0) && (
        <>
          <h2 className="text-xl font-bold mt-8 mb-8">Pools & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            
            {/* === START: Align Logic with Current Yield === */}
            
            {/* Iterate over pools included in optimal allocation */}
            {optimalDistribution.investments
              .filter(inv => inv.type === 'pool' && inv.allocation > 0)
              .map((investment) => {
                // 1. Find the corresponding AssetConfig 
                const assetConfig = SUPPORTED_ASSETS.find(a => 
                    a.apiType === 'pool' && 
                    a.name.toLowerCase().includes(investment.name.toLowerCase())
                );
                if (!assetConfig) {
                    console.warn(`Optimal Pool: Config not found for ${investment.name}`);
                    return null; 
                }

                // 2. Find corresponding fetched data using config address (like current yield)
                const poolData = fetchedPools.find(p => p.address === assetConfig.contractAddress); 
                if (!poolData) {
                     console.warn(`Optimal Pool: Fetched data not found for ${assetConfig.name} (Address: ${assetConfig.contractAddress})`);
                     return null;
                 }
                
                // 3. Use config details for display, lookup color using API name index
                const displayTitle = assetConfig.name; 
                const explorerUrl = assetConfig.explorerUrl;
                const originalIndex = fetchedPools.findIndex(p => p.name === investment.name); // Color lookup still uses API name index
                const color = getInvestmentColor('pool', originalIndex);
                
                return (
                  <PoolInfo
                    key={`info-pool-${displayTitle}`}
                    title={displayTitle}
                    color={color}
                    data={poolData} 
                    explorerUrl={explorerUrl}
                  />
                );
            })}

            {/* Iterate over reserves included in optimal allocation */}
            {optimalDistribution.investments
              .filter(inv => inv.type === 'reserve' && inv.allocation > 0)
              .map((investment) => {
                 // 1. Find the corresponding AssetConfig
                const assetConfig = SUPPORTED_ASSETS.find(a => 
                    a.apiType === 'reserve' && 
                    (a.name === investment.name || a.name.toLowerCase() === investment.name.toLowerCase())
                );
                 if (!assetConfig) {
                    console.warn(`Optimal Reserve: Config not found for ${investment.name}`);
                    return null; 
                }

                // 2. Find corresponding fetched data using config name (case-insensitive) OR address (like current yield)
                const reserveData = fetchedReserves.find(r => 
                    (r.name?.toLowerCase() === assetConfig.name.toLowerCase()) || 
                    (r.address && r.address === assetConfig.contractAddress)
                );
                if (!reserveData) {
                     console.warn(`Optimal Reserve: Fetched data not found for ${assetConfig.name} (Name: ${assetConfig.name}, Address: ${assetConfig.contractAddress})`);
                     return null;
                 }
                
                // 3. Use config details for display, lookup color using API name index
                const displayTitle = assetConfig.name; 
                const explorerUrl = assetConfig.explorerUrl;
                const originalIndex = fetchedReserves.findIndex(r => r.name === investment.name); // Color lookup still uses API name index
                const color = getInvestmentColor('reserve', originalIndex);
                
                return (
                  <ReserveInfo
                    key={`info-reserve-${displayTitle}`}
                    title={displayTitle}
                    color={color}
                    reserveData={reserveData} 
                    explorerUrl={explorerUrl}
                  />
                );
            })}
            
            {/* === END: Align Logic with Current Yield === */}

          </div>
        </>
      )}
    </div>
  );
} 