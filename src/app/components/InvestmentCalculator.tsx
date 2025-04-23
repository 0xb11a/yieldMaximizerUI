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
import { getInvestmentColor } from '@/styles/colors';
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

const INITIAL_ALLOCATION: AllocationItem[] = [];

// Define props for the component
interface InvestmentCalculatorProps {
  initialFunds?: number; // Receive initial funds from parent
}

export default function InvestmentCalculator({ initialFunds = 0 }: InvestmentCalculatorProps) { // Default to 0
  const [isDistributed, setIsDistributed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allocation, setAllocation] = useState<AllocationItem[]>(INITIAL_ALLOCATION);
  const [distribution, setDistribution] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remove state related to PieChart hover
  // const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  // State to track client-side mounting
  const [isClient, setIsClient] = useState(false);

  // State to hold fetched pool and reserve data
  const [fetchedPools, setFetchedPools] = useState<Pool[]>([]);
  const [fetchedReserves, setFetchedReserves] = useState<Reserve[]>([]);

  // Processes API response into formatted allocation data
  const calculateDistribution = (apiResponse: ApiResponse): AllocationItem[] => {
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

  // Updated handleDistribute - Always use demo logic
  const handleDistribute = async () => {
    // Use initialFunds prop now
    if (initialFunds <= 0) {
      setError("Please provide a valid supply value."); // Or handle this upstream
      return;
    }

    setIsLoading(true);
    setError(null);
    setDistribution(null); // Reset previous results
    setAllocation(INITIAL_ALLOCATION);
    setFetchedPools([]);
    setFetchedReserves([]);
    setIsDistributed(false);

    const totalFundsForCalc: number = initialFunds; // Use prop
    const walletAddressToUse: string = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";
    logger.info('Starting calculation', { totalFunds: totalFundsForCalc });

    try {
      // Step 1: Fetch Pool and Reserve Data
      console.log('Fetching pool and reserve data for address:', walletAddressToUse);
      const poolReserveData = await fetchPoolAndReserveData(walletAddressToUse);
      // Added console log for fetchPoolAndReserveData response
      console.log('<<< Raw Response from fetchPoolAndReserveData >>>:', poolReserveData);
      setFetchedPools(poolReserveData.pools);
      setFetchedReserves(poolReserveData.reserves);
      console.log('Fetched Pools:', poolReserveData.pools);
      console.log('Fetched Reserves:', poolReserveData.reserves);

      // Check if pools or reserves are empty after fetching
      if (poolReserveData.pools.length === 0 && poolReserveData.reserves.length === 0) {
          setError('No pools or reserves found for this configuration.');
          setIsLoading(false);
          return;
      }

      // Step 2: Fetch Optimal Allocation using data from Step 1
      console.log('Fetching optimal allocation with total funds:', totalFundsForCalc);
      // Using the renamed function fetchOptimalAllocation
      const allocationData = await fetchOptimalAllocation(
          totalFundsForCalc,
          poolReserveData.pools, 
          poolReserveData.reserves,
          1 // Example: Set min_allocation_percent to 1%, make this configurable if needed
      );
      // Added console log for fetchOptimalAllocation response
      console.log('<<< Raw Response from fetchOptimalAllocation >>>:', allocationData);
      
      const newAllocation = calculateDistribution(allocationData);
      
      setDistribution(allocationData);
      setAllocation(newAllocation);
      setIsDistributed(true);

    } catch (err) {
      let errorMessage = 'An unexpected error occurred during distribution';
      if (err instanceof Error) {

        if (err.message.includes('Failed to fetch') || err instanceof TypeError) { 
           errorMessage = 'Unable to connect to the server.' + process.env.NEXT_PUBLIC_API_URL;
        } else {
           errorMessage = 'An error occurred while fetching data from the server.';
        }

      } 
      setError(errorMessage);
      console.error('Distribution Process Error:', err);
      // Keep state cleared
      setDistribution(null);
      setAllocation(INITIAL_ALLOCATION);
      setFetchedPools([]);
      setFetchedReserves([]);
      setIsDistributed(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Tooltip for BarChart
  const CustomBarTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Access the full data item
      const formatApy = (apy: number | undefined) => 
        apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';
      // Helper to format profit
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

  return (
    <div className="container mx-auto px-4 sm:px-8 py-12">
       {/* Add some basic CSS for the tooltip */}
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

      {/* Remove old tooltip */}
      {/* <CustomTooltip /> */}
      <h1 className="text-3xl font-bold mb-8">Yield Maximizer</h1>
      
      {/* ADD Button to trigger calculation using parent-provided funds */}
      <div className="mb-8">
         <button
            onClick={handleDistribute}
            disabled={isLoading || initialFunds <= 0} // Disable if loading or no funds
            className={`w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors ${ 
              (isLoading || initialFunds <= 0) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Calculating...' : 'Calculate Optimal Yield'}
          </button>
       </div>

      {/* Error Display */}
      {isClient && error && (
        <div className="text-red-500 text-sm mt-2 mb-4"> {/* Add margin below error */}
          {error}
        </div>
      )}

      {/* Distribution and Allocation Section */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 transition-opacity duration-500 ${ 
        (isDistributed && allocation.length > 0 && !isLoading) ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden' // Added !isLoading to hide during recalc
      }`}>
        {/* Distribution Chart */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-2">Distribution</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart 
                data={allocation} 
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
                  {allocation.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation List */} 
        <div className="card p-4 sm:p-8 flex flex-col">
          <h2 className="text-xl font-semibold mb-2">Allocation</h2>
          <div className="space-y-1 lg:space-y-2 flex-grow">
            {/* Headers */}
            <div className="hidden lg:flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
              <div className="flex-[2] p-1">
                 <span>Asset</span> 
              </div>
              <div className="flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                 <span className="w-24 text-right">Allocation ($)</span>
                 <span className="w-16 text-right">Total APR</span> 
                 <span className="w-16 text-right">Total APY</span>
                 <span className="w-24 text-right">Profit ($)</span> 
              </div>
            </div>

            {/* Items */}
            {allocation.map((item) => {
              const formatPercent = (value: number | undefined) => 
                value !== undefined ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-';
              const formatCurrency = (value: number | undefined) => 
                value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
              
              return (
                <div key={item.name} className={`flex flex-col lg:flex-row lg:items-center transition-colors duration-150 text-sm py-2 border-b border-gray-800 lg:border-none last:border-b-0`}>
                  {/* Asset Name */}
                  <div className="flex items-center gap-2 p-1 mb-1 lg:mb-0 lg:flex-[2]">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                    <span className="text-white font-medium break-words">{item.name}</span> 
                  </div>
                  
                  {/* Data - Mobile/Tablet View */}
                  <div className="block lg:hidden pl-5 space-y-1 text-xs">
                     <div className="flex justify-between">
                        <span className='text-[#9CA3AF]'>Allocation:</span>
                        <span className="text-white font-medium">{formatCurrency(item.allocation)}</span>
                     </div>
                      <div className="flex justify-between">
                        <span className='text-[#9CA3AF]'>Total APY:</span>
                        <span className="text-[#34D399] font-semibold">
                           {formatPercent(item.expected_return)} 
                        </span>
                     </div>
                      <div className="flex justify-between">
                        <span className='text-[#9CA3AF]'>Profit:</span>
                        <span className="text-white font-medium">
                           {formatCurrency(item.expectedProfit)} 
                        </span>
                     </div>
                     {/* Optionally add APR breakdown here too */}
                  </div>

                  {/* Data - Desktop View */}
                  <div className="hidden lg:flex flex-1 justify-end gap-2 lg:gap-3 p-1">
                     {/* Allocation */}
                     <div className="w-24 text-right">
                        <span className="text-white">{formatCurrency(item.allocation)}</span>
                     </div>
                     {/* Total APR */}
                     <div className="tooltip-container w-16 text-right">
                        <span className="text-gray-400 hover:text-white cursor-help">
                          {formatPercent(item.total_apr)} 
                        </span>
                        <div className="tooltip-content">
                           <div className="tooltip-row">
                             <span className="tooltip-label">Base APR</span>
                             <span className="tooltip-value">{formatPercent(item.base_apr)}</span>
                           </div>
                           <div className="tooltip-row">
                             <span className="tooltip-label">Rewards APR</span>
                             <span className="tooltip-value">{formatPercent(item.rewards_apr)}</span>
                           </div>
                        </div>
                     </div>
                     {/* Total APY */}
                     <div className="tooltip-container w-16 text-right">
                        <span className="text-[#34D399] font-semibold hover:text-emerald-400 cursor-help">
                           {formatPercent(item.expected_return)} 
                        </span>
                       <div className="tooltip-content">
                         <div className="tooltip-row">
                           <span className="tooltip-label">Base APY</span>
                           <span className="tooltip-value">{formatPercent(item.reserve_apy)}</span>
                         </div>
                         <div className="tooltip-row">
                           <span className="tooltip-label">Rewards APY</span>
                           <span className="tooltip-value">{formatPercent(item.rewards_apy)}</span>
                         </div>
                      </div>
                     </div>
                     {/* Profit */}
                      <div className="w-24 text-right">
                        <span className="text-white">{formatCurrency(item.expectedProfit)}</span>
                     </div>
                  </div>
                </div>
              );
            })} 
            </div>
            {/* Total Profit Section */}
            {distribution && (
              <div className="pt-4 mt-auto border-t border-[#1E2633]"> {/* Use mt-auto to push to bottom */}
                 <div className="flex items-center justify-between">
                  <span className="text-[#34D399] font-semibold flex-[2]">Total Profit</span>
                  <span className="text-[#34D399] font-semibold text-right">
                    ${distribution.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Pool & Reserves Information */}
      {isDistributed && distribution && (fetchedPools.length > 0 || fetchedReserves.length > 0) && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-6">Pools & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            {distribution.investments
              .filter(inv => inv.type === 'pool' && inv.allocation > 0)
              .map((investment: Investment) => {
                const originalPoolData = fetchedPools.find(p => p.name === investment.name);
                if (!originalPoolData) return null;
                const originalIndex = fetchedPools.findIndex(p => p.name === investment.name);
                return (
                  <PoolInfo
                    key={investment.name}
                    title={investment.name}
                    color={getInvestmentColor('pool', originalIndex)}
                    data={originalPoolData}
                  />
                );
            })}
            {distribution.investments
              .filter(inv => inv.type === 'reserve' && inv.allocation > 0)
              .map((investment: Investment) => {
                const originalReserveData = fetchedReserves.find(r => r.name === investment.name);
                if (!originalReserveData) return null;
                const originalIndex = fetchedReserves.findIndex(r => r.name === investment.name);
                return (
                  <ReserveInfo
                    key={investment.name}
                    title={investment.name}
                    color={getInvestmentColor('reserve', originalIndex)}
                    reserveData={originalReserveData}
                  />
                );
            })}
          </div>
        </>
      )}
    </div>
  );
} 