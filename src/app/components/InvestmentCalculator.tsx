'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PoolInfo from './PoolInfo';
import ReserveInfo from './ReserveInfo';
import { 
  generateApiRequestBody, 
  fetchDistribution, 
  type Reserve, 
  type ApiResponse,
  type Investment,
  DEMO_DATA
} from '@/config/apiConfig';
import { SAMPLE_POOLS, SAMPLE_RESERVES, TOTAL_FUNDS } from '@/config/poolsAndReserves';
import { getInvestmentColor } from '@/styles/colors';
// Import Recharts components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';


// Remove dynamic import for PieChart
// const PieChart = dynamic(
//   () => import('react-minimal-pie-chart').then((mod) => mod.PieChart),
//   { ssr: false }
// );

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
  type: 'pool' | 'reserve';
  expected_return: number;
  allocation: number;
}

const INITIAL_ALLOCATION: AllocationItem[] = [];

// Remove TooltipData interface
// interface TooltipData extends AllocationItem {
//   x: number;
//   y: number;
// }

interface InvestmentCalculatorProps {
  useDemo?: boolean;
}

export default function InvestmentCalculator({ useDemo = false }: InvestmentCalculatorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isDistributed, setIsDistributed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allocation, setAllocation] = useState<AllocationItem[]>(INITIAL_ALLOCATION);
  const [distribution, setDistribution] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remove state related to PieChart hover
  // const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);


  // Processes API response into formatted allocation data
  const calculateDistribution = (apiResponse: ApiResponse): AllocationItem[] => {
    const pools = apiResponse.investments.filter(inv => inv.type === 'pool');
    const reserves = apiResponse.investments.filter(inv => inv.type === 'reserve');
    const validTotalFunds = apiResponse.total_funds > 0 ? apiResponse.total_funds : 1;

    const calculatedAllocation: AllocationItem[] = [
      ...pools.map((investment, index) => ({
        name: investment.name,
        percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)), // Use parseFloat for number type
        color: getInvestmentColor('pool', index),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation
      })),
      ...reserves.map((investment, index) => ({
        name: investment.name,
        percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)), // Use parseFloat for number type
        color: getInvestmentColor('reserve', index),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation
      }))
    ];
    return calculatedAllocation.filter(item => item.allocation > 0);
  };

  // useEffect remains the same
  useEffect(() => {
    if (useDemo && isConnected) {
      const newAllocation = calculateDistribution(DEMO_DATA);
      setDistribution(DEMO_DATA);
      setAllocation(newAllocation);
      setIsDistributed(true);
      setError(null);
    }
  }, [useDemo, isConnected]);

  // handleDistribute remains largely the same, remove hover state reset
  const handleDistribute = async () => {
    // setHoveredIndex(null);
    // setTooltipData(null);
    
    if (useDemo) {
      const newAllocation = calculateDistribution(DEMO_DATA);
      setDistribution(DEMO_DATA);
      setAllocation(newAllocation);
      setIsDistributed(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = generateApiRequestBody(
        SAMPLE_RESERVES,
        TOTAL_FUNDS,
        SAMPLE_POOLS
      );

      const data = await fetchDistribution(requestBody);
      const newAllocation = calculateDistribution(data);
      
      setDistribution(data);
      setAllocation(newAllocation);
      setIsDistributed(true);
    } catch (err) {
      let errorMessage = 'An unexpected error occurred'; // Default message
      if (err instanceof Error) {
        // Check for specific network error (connection refused, DNS error, etc.)
        if (err.message.includes('Failed to fetch') || err instanceof TypeError) { 
           errorMessage = 'Unable to connect to the server.';
        } else {
           // For other errors (like 500, 400, etc.), use a more generic server error message
           errorMessage = 'An error occurred while fetching data from the server.';
           // Optionally, you could try to parse err.message if the server sends specific details
           // errorMessage = err.message; 
        }
      } 
      
      setError(errorMessage);
      console.error('Error:', err); // Log the actual error for debugging
      setAllocation(INITIAL_ALLOCATION); 
      setDistribution(null);
      setIsDistributed(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove PieChart data transformation
  // const pieData = allocation.map((item) => ({
  //     title: item.name,
  //     value: item.percentage,
  //     color: item.color,
  // }));

  // Remove CustomTooltip component for PieChart
  // const CustomTooltip = () => { ... };

  // Custom Tooltip for BarChart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Access the full data item
      return (
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg text-sm">
          <p className="font-semibold">{`${label}`}</p>
          <p>{`Allocation: $${data.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
          <p>{`Distribution Percentage: ${data.percentage}%`}</p>
          <p>{`APY: ${data.expected_return.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}</p>
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
    // Remove relative positioning unless needed for other elements
    <div className="container mx-auto px-8 py-12">
      {/* Remove old tooltip */}
      {/* <CustomTooltip /> */}
      <h1 className="text-3xl font-bold mb-8">Calculator</h1>
      
      {/* Wallet Connection Section (remains the same) */}
      <div className="card p-8 mb-12">
         <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">Wallet Connection</h2>
              <p className="text-[#9CA3AF]">
                {isConnected ? 'Wallet connected' : 'Connect your wallet to start'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsConnected(!isConnected);
                if (!isConnected) {
                  setIsDistributed(false);
                  setAllocation(INITIAL_ALLOCATION);
                  setDistribution(null);
                  setError(null);
                  // Remove hover state reset
                  // setHoveredIndex(null);
                  // setTooltipData(null);
                }
              }}
              className="px-6 py-3 bg-[#1E2633] hover:bg-[#2D3748] text-white rounded-lg transition-colors"
            >
              {isConnected ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>
          {isConnected && (
            <button
              onClick={handleDistribute}
              disabled={isLoading}
              className={`w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Calculating Distribution...' : 'Distribute Funds'}
            </button>
          )}
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Distribution and Allocation Section */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-500 ${
        isDistributed && allocation.length > 0 ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Distribution Chart -> Now BarChart */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Distribution</h2>
          {/* Use ResponsiveContainer for BarChart */}
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart 
                data={allocation} 
                margin={{ top: 5, right: 0, left: 0, bottom: 5 }} // Adjusted margins
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> {/* Darker grid */}
                <XAxis dataKey="name" hide /> {/* Hide X-axis labels, use tooltip */}
                <YAxis 
                  tickFormatter={formatYAxisTick} 
                  stroke="#9CA3AF" // Axis line color
                  tick={{ fill: '#9CA3AF', fontSize: 12 }} // Tick label color and size
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} /> {/* Custom tooltip and hover cursor*/}
                <Bar dataKey="allocation">
                  {allocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation List (remove hover effect tied to PieChart) */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-2">Allocation</h2>
          {isDistributed && (
             <p className="text-sm text-[#9CA3AF] mb-4">
               Total Funds Allocated: ${TOTAL_FUNDS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
          )}
          <div className="space-y-2">
            {/* Allocation List Headers - Keep only APY */} 
            <div className="flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
              {/* Removed Asset header */}
              <div className="flex items-center gap-2 flex-[2] p-1">
                 {/* Empty div to maintain layout */}
                 <span>&nbsp;</span> 
              </div>
              <div className="flex flex-1 justify-end gap-8 p-1">
                 {/* Removed Allocation Amount header - Add placeholder for alignment */}
                 <span className="w-24 text-right">&nbsp;</span> 
                 <span className="w-20 text-right">APY</span>
              </div>
            </div>

            {/* Allocation List Items */} 
            {allocation.map((item, index) => (
              <div 
                key={item.name} 
                className={`flex items-center transition-colors duration-150`}
              >
                <div className="flex items-center gap-2 flex-[2] p-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white">{item.name}</span>
                </div>
                <div className="flex flex-1 justify-end gap-8 p-1">
                  <span className="text-white w-24 text-right">
                    ${item.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[#34D399] w-20 text-right">
                    {item.expected_return.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
              </div>
            ))}
            {/* Total Profit / Return section */} 
            {distribution && (
              <div className="pt-4 mt-4 border-t border-[#1E2633]">
                 <div className="flex items-center">
                  <span className="text-[#34D399] flex-[2]">Total Profit</span>
                  <span className="text-[#34D399] flex-1 text-right">
                    ${distribution.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  {/* Changed label to Total APY */}
                  <span className="text-[#34D399] flex-[2]">Total APY</span>
                  <span className="text-[#34D399] flex-1 text-right">
                    {(distribution.total_expected_return * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pool & Reserves Information (remains the same) */}
      {isDistributed && distribution && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-6">Pool & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            {/* Pools */} 
            {SAMPLE_POOLS.map((pool, index) => {
              const investment = distribution.investments.find(
                inv => inv.type === 'pool' && inv.name === pool.name 
              );
              return (
                <PoolInfo
                  key={pool.address}
                  title={pool.name || `Pool ${index + 1}`}
                  address={pool.address}
                  chain={pool.chain}
                  color={getInvestmentColor('pool', index)}
                  data={{
                    allocation: investment 
                      ? `$${investment.allocation.toLocaleString()}`
                      : '$0',
                    expectedReturn: investment
                      ? `${(investment.expected_return * 100).toFixed(2)}%`
                      : '0%'
                  }}
                />
              );
            })}
            
            {/* Reserves */}
            {SAMPLE_RESERVES.map((reserve, index) => {
              const investment = distribution.investments.find(
                inv => inv.type === 'reserve' && inv.name === reserve.name
              );
              return (
                <ReserveInfo
                  key={reserve.name}
                  title={reserve.name}
                  color={getInvestmentColor('reserve', index)}
                  data={{
                    totalValueLocked: `$${reserve.total_supplied.toLocaleString()}`,
                    volume24h: `$${(reserve.total_borrowed * 0.1).toLocaleString()}`,
                    utilizationRate: reserve.total_supplied > 0 
                      ? `${((reserve.total_borrowed / reserve.total_supplied) * 100).toFixed(1)}%`
                      : '0.0%',
                    baseFee: `${(reserve.fee_percentage * 100).toFixed(1)}%`,
                    baseAPY: `${(reserve.base_variable_borrow_rate * 100).toFixed(2)}%`
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
} 