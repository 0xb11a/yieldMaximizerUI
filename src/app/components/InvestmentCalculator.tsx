'use client';

import { useState, useEffect } from 'react';
import PoolInfo from './PoolInfo';
import ReserveInfo from './ReserveInfo';
import logger from '@/utils/logger';
import {
  fetchOptimalAllocation,
  fetchPoolAndReserveData,
  type ApiResponse,
  type Pool,
  type Reserve,
  type Investment
} from '@/config/apiConfig';
import { AssetConfig, SUPPORTED_ASSETS } from '@/config/assets';
import { WalletBalance } from '@/types'; // Import WalletBalance
import { getInvestmentColor } from '@/styles/colors';
import { formatUnits } from 'viem'; // Import formatUnits
// Import Recharts components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
// Add NameType and ValueType imports
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
  total_apr?: number;     // Added field to match Investment type
  base_apr?: number;      // Added
  rewards_apr?: number;   // Added
}

// New interface for displaying current wallet yield
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

  // Fetches data and calculates current yield based on wallet balances
  const calculateCurrentYield = async () => {
    if (walletBalances.length === 0) {
      setDisplayMode('idle'); // Nothing to show
      return;
    }

    console.log("Calculating Current Yield for balances:", walletBalances);
    setIsLoading(true);
    setError(null);
    setCurrentYield(INITIAL_CURRENT_YIELD); // Reset previous results
    setCurrentTotalProfit(0);
    setFetchedPools([]);
    setFetchedReserves([]);
    setDisplayMode('current'); // Set mode early

    const walletAddressToUse: string = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";

    try {
        // Step 1: Fetch Pool and Reserve Base Data
        // console.log('Fetching pool and reserve base data for current yield:', walletAddressToUse); // Commented out
        const poolReserveBaseData = await fetchPoolAndReserveData(walletAddressToUse);
        // console.log('<<< Raw Response from fetchPoolAndReserveData (Current Yield) >>>:', poolReserveBaseData); // Commented out
        // Store fetched data locally for price lookup etc.
        const localFetchedPools = poolReserveBaseData.pools;
        const localFetchedReserves = poolReserveBaseData.reserves;
        setFetchedPools(localFetchedPools); // Update state for Info section if needed
        setFetchedReserves(localFetchedReserves);

        // Check if base data is empty
        if (localFetchedPools.length === 0 && localFetchedReserves.length === 0) {
            setError('No pools or reserves base data found.');
            setIsLoading(false);
            setDisplayMode('idle');
            return;
        }

        // Step 2: Fetch Current APYs using calculate-optimal-allocation with total_funds = 0
        // console.log('Fetching current APYs with total_funds = 0'); // Commented out
        const apyData = await fetchOptimalAllocation(0, localFetchedPools, localFetchedReserves);
        // console.log('<<< Raw Response from fetchOptimalAllocation (APY Data) >>>:', apyData); // Commented out

        // Step 3: Map Wallet Balances, match with APY data, and Calculate Yield
        let totalCalculatedProfit = 0;
        const calculatedYield: CurrentYieldItem[] = walletBalances.map((balance) => {
            
            const assetConfig = SUPPORTED_ASSETS.find(asset => asset.name === balance.name);

            if (!assetConfig) {
                 console.warn(`No AssetConfig found for wallet balance: ${balance.name}`);
                 // Return a minimal item to show the balance without yield info
                 return {
                    name: balance.name,
                    symbol: balance.symbol,
                    balance: parseFloat(formatUnits(balance.value, balance.decimals)),
                    color: '#808080', // Gray color for unmatched
                    type: 'reserve', // Default or unknown type
                    expected_return: 0,
                    expectedYearlyProfit: 0,
                 } as CurrentYieldItem;
            }
            
            // Find matching pool/reserve base data (for token_price)
            let baseData: Pool | Reserve | undefined;
            if (assetConfig.apiType === 'pool') {
                baseData = localFetchedPools.find(p => p.address === assetConfig.contractAddress);
            } else { 
                baseData = localFetchedReserves.find(r => r.address === assetConfig.contractAddress);
            }

            // Find matching APY detail item(s) from Step 2 response
            let matchedApyDetail: Investment | undefined;

            if (assetConfig.source === 'merchantmoe' && assetConfig.apiType === 'pool') {
                // Special case for Merchant Moe: match by API name "USDC-USDT"
                matchedApyDetail = apyData.investments.find(detail =>
                    detail.name === "USDC-USDT" && detail.type === 'pool'
                );
                 if (matchedApyDetail) {
                    console.log(`Matched Merchant Moe pool using special case: API Name="USDC-USDT", Config Name="${assetConfig.name}"`);
                 }
            } else {
                // Default case: match by assetConfig.name in lowercase
                matchedApyDetail = apyData.investments.find(detail =>
                    detail.name.toLowerCase() === assetConfig.name.toLowerCase() && detail.type === assetConfig.apiType
                );
            }

             // Optional: Log if still no match (useful for debugging other assets)
            if (!matchedApyDetail && assetConfig.name !== 'Wallet USDC') { // Don't warn for Wallet USDC, it's expected not to match
                 console.warn(`No matching APY data found for config: ${assetConfig.name} (type: ${assetConfig.apiType}, source: ${assetConfig.source})`);
            }

            // Build the CurrentYieldItem
            let itemData: Partial<CurrentYieldItem> = {
                name: assetConfig.name,
                symbol: balance.symbol, 
                balance: parseFloat(formatUnits(balance.value, balance.decimals)),
                color: '#8884d8',
                type: assetConfig.type,
                originalPoolData: assetConfig.apiType === 'pool' ? baseData as Pool : undefined,
                originalReserveData: assetConfig.apiType === 'reserve' ? baseData as Reserve : undefined,
                // Default APY/Profit values
                expected_return: 0, 
                reserve_apy: 0,
                rewards_apy: 0,
                expectedYearlyProfit: 0,
            };
            
            const tokenPrice = baseData?.token_price ?? 1;
            const balanceInUsd = (itemData.balance ?? 0) * tokenPrice;

            if (matchedApyDetail) {
                // Use APY data from the matched detail item
                itemData.reserve_apy = matchedApyDetail.reserve_apy ?? 0;
                itemData.rewards_apy = matchedApyDetail.rewards_apy ?? 0;
                itemData.expected_return = itemData.reserve_apy + itemData.rewards_apy;
                itemData.total_apr = matchedApyDetail.total_apr;
                itemData.base_apr = matchedApyDetail.base_apr;
                itemData.rewards_apr = matchedApyDetail.rewards_apr;
                itemData.expectedYearlyProfit = balanceInUsd * (itemData.expected_return / 100);
                totalCalculatedProfit += itemData.expectedYearlyProfit;
                 console.log(`Profit calc for ${itemData.name}: BalanceUSD=${balanceInUsd}, TotalAPY=${itemData.expected_return}, Profit=${itemData.expectedYearlyProfit}`);
            }

            // Get color
            const originalIndex = SUPPORTED_ASSETS.findIndex(a => a.id === assetConfig.id);
            itemData.color = getInvestmentColor(assetConfig.type, originalIndex);
            
            return itemData as CurrentYieldItem; 
        });

        setCurrentYield(calculatedYield);
        setCurrentTotalProfit(totalCalculatedProfit); 

    } catch (err) {
      let errorMessage = 'An unexpected error occurred calculating current yield';
      if (err instanceof Error) {
         errorMessage = `Error fetching data for current yield: ${err.message}`;
      }
      setError(errorMessage);
      console.error('Current Yield Calculation Error:', err);
      setCurrentYield(INITIAL_CURRENT_YIELD); // Clear results on error
      setCurrentTotalProfit(0);
      setFetchedPools([]);
      setFetchedReserves([]);
      setDisplayMode('idle'); // Reset mode on error
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect to set isClient to true after mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

   // useEffect to trigger current yield calculation when walletBalances are available
   // and we are not already showing optimal results
   useEffect(() => {
     // Only run if walletBalances is provided and has items, and we haven't explicitly calculated optimal
     if (walletBalances.length > 0 && displayMode !== 'optimal') {
       calculateCurrentYield();
     } else if (walletBalances.length === 0 && displayMode === 'current') {
       // If balances are removed, reset the current yield display
       setDisplayMode('idle');
       setCurrentYield(INITIAL_CURRENT_YIELD);
       setCurrentTotalProfit(0);
       setFetchedPools([]);
       setFetchedReserves([]);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [walletBalances]); // Rerun only when walletBalances array reference changes

  // Renamed handler for Optimal Allocation button click
  const handleOptimalAllocation = async () => {
    // Use initialFunds prop now
    if (initialFunds <= 0) {
      setError("Please provide a valid total supply value greater than 0 to calculate optimal allocation.");
      return;
    }

    // --- Optimization: Check if pool/reserve data is already fetched --- 
    if (fetchedPools.length === 0 && fetchedReserves.length === 0) {
        setError("Pool and reserve data not available. Please ensure wallet balances are loaded first.");
        console.warn('Attempted optimal allocation calculation before fetching base pool/reserve data.');
        return;
    }
    // --- End Optimization Check ---

    setIsLoading(true);
    setError(null);
    setOptimalDistribution(null); 
    setOptimalAllocation(INITIAL_ALLOCATION);
    // Don't clear current yield display immediately, wait for results
    // setCurrentYield(INITIAL_CURRENT_YIELD); 
    // setCurrentTotalProfit(0);
    // Don't reset fetched data, we need it!
    // setFetchedPools([]); 
    // setFetchedReserves([]);
    setDisplayMode('optimal'); 

    const totalFundsForCalc: number = initialFunds; 
    // Removed walletAddressToUse as it's not needed for this optimized call
    logger.info('Starting optimal allocation calculation with pre-fetched data', { totalFunds: totalFundsForCalc });

    try {
      // --- Step 1: Use existing fetched data --- 
      // Remove fetchPoolAndReserveData call
      // console.log('Using existing pool and reserve data for optimal allocation:', { pools: fetchedPools, reserves: fetchedReserves }); // Commented out

      // --- Step 2: Fetch Optimal Allocation using data from state --- 
      // console.log('Fetching optimal allocation with total funds:', totalFundsForCalc); // Commented out
      const allocationData = await fetchOptimalAllocation(
          totalFundsForCalc,
          fetchedPools, // Use data from state
          fetchedReserves, // Use data from state
          1 // Example: Set min_allocation_percent
      );
      // console.log('<<< Raw Response from fetchOptimalAllocation >>>:', allocationData); // Commented out

      const newAllocation = calculateOptimalDistribution(allocationData);

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
      // Don't clear fetched data on error either?
      // setFetchedPools([]);
      // setFetchedReserves([]);
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
  const displayTotalProfit = displayMode === 'current' ? currentTotalProfit : optimalDistribution?.total_profit;
  const showResults = !isLoading && displayMode !== 'idle' && displayAllocationData.length > 0;

  // Determine which pools/reserves to show info for
  const getInfoSectionData = () => {
    if (!showResults) return { pools: [], reserves: [] };
    if (displayMode === 'optimal' && optimalDistribution) {
        // This part seems okay, uses optimal allocation data
        return {
            pools: optimalDistribution.investments.filter(inv => inv.type === 'pool' && inv.allocation > 0),
            reserves: optimalDistribution.investments.filter(inv => inv.type === 'reserve' && inv.allocation > 0),
        };
    }
    if (displayMode === 'current') {
        // Filter based on items present in currentYield and get original data
        // We need to match based on contractAddress from the config associated with currentYield item
        const currentYieldConfigs = currentYield.map(item => SUPPORTED_ASSETS.find(a => a.name === item.name)).filter(Boolean) as AssetConfig[];
        const poolAddressesToShow = currentYieldConfigs.filter(c => c.apiType === 'pool').map(c => c.contractAddress);
        const reserveAddressesToShow = currentYieldConfigs.filter(c => c.apiType === 'reserve').map(c => c.contractAddress);
        
        return {
            pools: fetchedPools.filter(p => p.address && poolAddressesToShow.includes(p.address)),
            reserves: fetchedReserves.filter(r => r.address && reserveAddressesToShow.includes(r.address)),
        };
    }
    return { pools: [], reserves: [] };
  };
  const infoSectionData = getInfoSectionData();

  return (
    <div className="container mx-auto px-4 sm:px-8 py-12">
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

      <h1 className="text-3xl font-bold mb-8">Yield Maximizer</h1>

      {/* Button to trigger OPTIMAL calculation */}
      <div className="mb-8">
         <button
            onClick={handleOptimalAllocation} // Use renamed handler
            disabled={isLoading || initialFunds <= 0} // Disable if loading or no funds > 0
            className={`w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors ${
              (isLoading || initialFunds <= 0) ? 'opacity-50 cursor-not-allowed' : ''
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
      {isLoading && displayMode === 'current' && (
         <div className="text-center text-gray-400 py-8">Loading Current Yield...</div>
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
                {/* Total Profit (Optimal) */}
                {optimalDistribution && displayTotalProfit !== undefined && ( // Check optimalDistribution
                   <div className="pt-4 mt-auto border-t border-[#1E2633]">
                      <div className="flex items-center justify-between">
                         <span className="text-[#34D399] font-semibold flex-[2]">Total Optimal Profit</span>
                         <span className="text-[#34D399] font-semibold text-right">
                           ${displayTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                      </div>
                   </div>
                )}
            </div>
          </div>
        )}

        {/* Current Yield specific: Allocation List */}
        {displayMode === 'current' && (
          <div className="card p-4 sm:p-8 flex flex-col">
            <h2 className="text-xl font-semibold mb-2">Current Wallet Yield</h2>
            <div className="space-y-1 lg:space-y-2 flex-grow">
              {/* Headers */}
              <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
                <div className="flex-[2] p-1"><span>Asset</span></div>
                <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                  <span className="w-24 text-right">Balance ($)</span> {/* Changed header */}
                  <span className="w-16 text-right">Total APR</span>
                  <span className="w-16 text-right">Total APY</span>
                  <span className="w-24 text-right">Yearly Profit ($)</span> {/* Changed header */}
                </div>
              </div>

              {/* Items */}
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
            {displayTotalProfit !== undefined && displayTotalProfit > 0 && (
              <div className="pt-4 mt-auto border-t border-[#1E2633]">
                 <div className="flex items-center justify-between">
                  <span className="text-[#34D399] font-semibold flex-[2]">Total Estimated Yearly Profit</span>
                  <span className="text-[#34D399] font-semibold text-right">
                    ${displayTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
             {displayTotalProfit !== undefined && displayTotalProfit <= 0 && currentYield.length > 0 && (
                 <p className="text-sm text-gray-400 pt-4 mt-auto border-t border-[#1E2633]">No current yield detected for held assets.</p>
             )}
          </div>
        )}
      </div>

      {/* Pool & Reserves Information Section (conditionally rendered based on available data) */}
      {showResults && (infoSectionData.pools.length > 0 || infoSectionData.reserves.length > 0) && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-6">Pools & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            {/* Render PoolInfo for relevant pools */}
            {(displayMode === 'optimal' ? infoSectionData.pools as Investment[] : currentYield.filter(i => i.type === 'pool'))
                .map((item) => {
                    const poolData = displayMode === 'optimal'
                       ? fetchedPools.find(p => p.name === (item as Investment).name) // Cast item
                       : (item as CurrentYieldItem).originalPoolData;
                    if (!poolData) return null;
                    const itemName = displayMode === 'optimal' ? (item as Investment).name : (item as CurrentYieldItem).name;
                    const originalIndex = fetchedPools.findIndex(p => p.name === itemName);
                    const color = getInvestmentColor('pool', originalIndex);
                    return (
                        <PoolInfo
                            key={`info-pool-${itemName}`}
                            title={itemName}
                            color={color}
                            data={poolData}
                        />
                    );
            })}
            {/* Render ReserveInfo for relevant reserves */}
            {(displayMode === 'optimal' ? infoSectionData.reserves as Investment[] : currentYield.filter(i => i.type === 'reserve'))
                .map((item) => {
                    const reserveData = displayMode === 'optimal'
                       ? fetchedReserves.find(r => r.name === (item as Investment).name) // Cast item
                       : (item as CurrentYieldItem).originalReserveData;
                    if (!reserveData) return null;
                    const itemName = displayMode === 'optimal' ? (item as Investment).name : (item as CurrentYieldItem).name;
                    const originalIndex = fetchedReserves.findIndex(r => r.name === itemName);
                    const color = getInvestmentColor('reserve', originalIndex);
                    return (
                        <ReserveInfo
                            key={`info-reserve-${itemName}`}
                            title={itemName}
                            color={color}
                            reserveData={reserveData} // Pass the fetched reserve data
                        />
                    );
            })}
          </div>
        </>
      )}
    </div>
  );
} 