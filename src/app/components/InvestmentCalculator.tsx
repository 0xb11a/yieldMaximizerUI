'use client';

import { useState, useEffect } from 'react';
import PoolInfo from './PoolInfo';
import ReserveInfo from './ReserveInfo';
import { 
  generateApiRequestBody, 
  fetchDistribution, 
  type ApiResponse,
} from '@/config/apiConfig';
import { SAMPLE_POOLS, SAMPLE_RESERVES } from '@/config/poolsAndReserves';
import { getInvestmentColor } from '@/styles/colors';
// Import Recharts components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
// Import wagmi hooks
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors'; // Import the connector
import { formatEther } from 'viem'; // Import formatEther
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
}

const INITIAL_ALLOCATION: AllocationItem[] = [];

interface InvestmentCalculatorProps {
  useDemo?: boolean;
}

export default function InvestmentCalculator({ useDemo = false }: InvestmentCalculatorProps) {
  // Replace useState for connection with wagmi hooks
  // const [isConnected, setIsConnected] = useState(false);
  const { address, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  // Add useBalance hook
  const { 
    data: balanceData, 
    isLoading: isBalanceLoading, 
    isError: isBalanceError 
  } = useBalance({
    address: address, // Fetch balance for the connected address
  });

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

  // Get demo funds from environment variable with fallback
  const demoFundsEnv = process.env.NEXT_PUBLIC_DEMO_FUNDS;
  const DEMO_TOTAL_FUNDS = demoFundsEnv && !isNaN(parseFloat(demoFundsEnv)) 
                           ? parseFloat(demoFundsEnv) 
                           : 500000; // Fallback value

  // Processes API response into formatted allocation data
  const calculateDistribution = (apiResponse: ApiResponse): AllocationItem[] => {
    const pools = apiResponse.investments.filter(inv => inv.type === 'pool');
    const reserves = apiResponse.investments.filter(inv => inv.type === 'reserve');
    const validTotalFunds = apiResponse.total_funds > 0 ? apiResponse.total_funds : 1;

    const calculatedAllocation: AllocationItem[] = [
      ...pools.map((investment, index) => ({
        name: investment.name,
        percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
        color: getInvestmentColor('pool', index),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation,
        expectedProfit: investment.expectedProfit, // Copy profit
        reserve_apy: investment.reserve_apy,
        rewards_apy: investment.rewards_apy
      })),
      ...reserves.map((investment, index) => ({
        name: investment.name,
        percentage: parseFloat(((investment.allocation / validTotalFunds) * 100).toFixed(2)),
        color: getInvestmentColor('reserve', index),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation,
        expectedProfit: investment.expectedProfit, // Copy profit
        reserve_apy: investment.reserve_apy,
        rewards_apy: investment.rewards_apy
      }))
    ];
    return calculatedAllocation.filter(item => item.allocation > 0);
  };

  // useEffect to set isClient to true after mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Updated handleDistribute
  const handleDistribute = async () => {
    setIsLoading(true);
    setError(null);

    let requestBody;
    let totalFundsForCalc: number;

    if (useDemo) {
      // Demo Mode Logic
      totalFundsForCalc = DEMO_TOTAL_FUNDS; // Use value from env/fallback
      console.log(`Running in Demo Mode with ${totalFundsForCalc} funds`);
      requestBody = generateApiRequestBody(
        SAMPLE_RESERVES,
        totalFundsForCalc, 
        SAMPLE_POOLS
      );
    } else {
      // Real Mode Logic
      // Check if balance is loaded and valid
      if (!balanceData || isBalanceLoading || isBalanceError) {
        setError('Could not fetch wallet balance or balance is zero.'); 
        console.error('Balance Error or Loading:', { balanceData, isBalanceLoading, isBalanceError });
        setIsLoading(false); // Stop loading
        return; // Don't proceed if balance isn't ready
      }

      // Convert balance from wei (BigInt) to Ether (number)
      totalFundsForCalc = parseFloat(formatEther(balanceData.value));
      
      // Check if balance is greater than zero
      if (totalFundsForCalc <= 0) {
         setError('Wallet balance is zero. Please add funds.');
         setIsLoading(false); // Stop loading
         return; // Don't proceed with zero balance
      }
      
      requestBody = generateApiRequestBody(
        SAMPLE_RESERVES,
        totalFundsForCalc, 
        SAMPLE_POOLS
      );
    }

    // Common logic for both demo and real mode
    try {
      const data = await fetchDistribution(requestBody);
      const newAllocation = calculateDistribution(data);
      
      setDistribution(data);
      setAllocation(newAllocation);
      setIsDistributed(true);
    } catch (err) {
      // Error handling remains the same
      let errorMessage = 'An unexpected error occurred';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err instanceof TypeError) { 
           errorMessage = 'Unable to connect to the server.';
        } else {
           errorMessage = 'An error occurred while fetching data from the server.';
        }
      } 
      setError(errorMessage);
      console.error('Distribution Error:', err);
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
    // Remove relative positioning unless needed for other elements
    <div className="container mx-auto px-8 py-12">
      {/* Remove old tooltip */}
      {/* <CustomTooltip /> */}
      <h1 className="text-3xl font-bold mb-8">Yield Maximizer</h1>
      
      {/* Wallet Connection Section - Updated with hydration fix */}
      <div className="card p-8 mb-12">
         <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">Wallet Connection</h2>
              <p className="text-[#9CA3AF]">
                {/* Render placeholder text until component has mounted */}
                {!isClient ? 'Loading...' : 
                  isConnecting ? 'Connecting...' : 
                  isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 
                  'Connect your wallet to start'
                }
              </p>
            </div>
            <button
              onClick={() => {
                if (isConnected) {
                  disconnect();
                } else {
                  // Connect using the injected connector (e.g., Rabby/MetaMask)
                  connect({ connector: injected() }); 
                }
              }}
              // Disable button only if isConnecting OR if not mounted yet (optional, but good practice)
              disabled={!isClient || isConnecting} 
              className="px-6 py-3 bg-[#1E2633] hover:bg-[#2D3748] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {/* Render placeholder text until component has mounted */}
              {!isClient ? 'Loading...' : 
                 isConnecting ? 'Connecting...' : 
                 isConnected ? 'Disconnect' : 
                 'Connect Wallet'
              }
            </button>
          </div>
          {/* Show Distribute button logic - simplified for demo mode */}
          {isClient && (useDemo || isConnected) && ( // Show if demo OR connected
            <button
              onClick={handleDistribute}
              // Disable logic: Disable if API is loading. If not demo, also disable if balance is loading/error/zero
              disabled={isLoading || (!useDemo && (isBalanceLoading || isBalanceError || !balanceData || parseFloat(formatEther(balanceData.value)) <= 0))}
              className={`w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors ${
                (isLoading || (!useDemo && (isBalanceLoading || isBalanceError || !balanceData || parseFloat(formatEther(balanceData.value)) <= 0)))
                 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading 
                ? 'Calculating Distribution...' 
                : (!useDemo && isBalanceLoading) // Show balance loading only in non-demo mode
                ? 'Fetching Balance...' 
                : (!useDemo && isBalanceError) // Show balance error only in non-demo mode
                ? 'Balance Error'
                : `Distribute ${useDemo ? 'Demo ' : ''}Funds` // Add 'Demo' text if applicable
              }
            </button>
           )}
           {/* Show balance error only in non-demo mode */}
           {!useDemo && isBalanceError && isClient && isConnected && (
             <div className="text-red-500 text-sm mt-2">
                Error fetching balance. Please try again.
             </div>
           )}
           {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
           )}
        </div>
      </div>

      {/* Distribution and Allocation Section - Conditional rendering also checks isClient */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-500 ${
        // Show if distributed AND (demo OR connected AND client mounted)
        isDistributed && (useDemo || (isClient && isConnected)) && allocation.length > 0 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
      }`}>
        {/* Distribution Chart -> Now BarChart */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-2">Distribution</h2>
          {/* Update Your Supply display for demo mode */}
          {(useDemo || (isClient && isConnected)) && isDistributed && (
             <p className="text-base text-white mb-4">
               Your Supply:&nbsp;
               <span className="font-semibold">
                {useDemo 
                 ? `$${(DEMO_TOTAL_FUNDS).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Demo)`
                 : isBalanceLoading 
                 ? 'Loading...' 
                 : isBalanceError 
                 ? 'Error' 
                 : balanceData 
                 ? `${balanceData.formatted} ${balanceData.symbol}`
                 : 'N/A'}
               </span>
             </p>
          )}
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
                  {allocation.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation List (remove hover effect tied to PieChart) */}
        <div className="card p-8 flex flex-col"> 
          <h2 className="text-xl font-semibold mb-2">Allocation</h2>
          {/* Remove flex-grow from this div */}
          <div className="space-y-2"> 
            {/* Allocation List Headers - Add APY Breakdown */}
            <div className="flex items-center text-xs text-[#9CA3AF] font-semibold mb-2">
              <div className="flex items-center gap-2 flex-[2] p-1">
                 <span>Asset</span> 
              </div>
              <div className="flex flex-1 justify-end gap-4 p-1">
                 <span className="w-24 text-right">Allocation</span>
                 <span className="w-28 text-right">APY (Total)</span>
                 <span className="w-24 text-right">APY (Reserve)</span>
                 <span className="w-24 text-right">APY (Rewards)</span>
              </div>
            </div>

            {/* Allocation List Items */} 
            {allocation.map((item) => {
              // Helper to format APY (REMOVE * 100)
              const formatApy = (apy: number | undefined) => 
                apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-';
              
              return (
                <div 
                  key={item.name} 
                  className={`flex items-center transition-colors duration-150 text-sm`}
                >
                  <div className="flex items-center gap-2 flex-[2] p-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-white">{item.name}</span>
                  </div>
                  <div className="flex flex-1 justify-end gap-4 p-1">
                    <span className="text-white w-24 text-right">
                      ${item.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[#34D399] w-28 text-right font-semibold">
                      {formatApy(item.expected_return)}
                    </span>
                    <span className="text-gray-400 w-24 text-right">
                      {formatApy(item.reserve_apy)}
                    </span>
                     <span className="text-gray-400 w-24 text-right">
                      {formatApy(item.rewards_apy)}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Total Profit / Return section */}
            {distribution && (
              // Added mt-auto to push totals to the bottom if list is short, but card still shrinks
              <div className="pt-4 mt-4 border-t border-[#1E2633]"> 
                 <div className="flex items-center">
                  <span className="text-[#34D399] flex-[2]">Total Profit</span>
                  <span className="text-[#34D399] flex-1 text-right">
                    ${distribution.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pool & Reserves Information - Conditional rendering with filtering */}
      {isDistributed && (useDemo || (isClient && isConnected)) && distribution && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-6">Pools & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            {/* Filter and map Pools */}
            {SAMPLE_POOLS
              .filter(pool => {
                // Find corresponding investment in the distribution results
                const investment = distribution.investments.find(
                  inv => inv.type === 'pool' && inv.name === pool.name 
                );
                // Keep the pool only if an investment exists and allocation > 0
                return investment && investment.allocation > 0;
              })
              // Restore index parameter for use in title
              .map((pool, index) => {
                // We know the investment exists from the filter above, find it again
                const investment = distribution.investments.find(
                  inv => inv.type === 'pool' && inv.name === pool.name 
                )!; // Add non-null assertion as we filtered already

                return (
                  <PoolInfo
                    key={pool.name}
                    // Use index for default title
                    title={pool.name || `Pool ${index + 1}`}
                    color={getInvestmentColor('pool', SAMPLE_POOLS.findIndex(p => p.name === pool.name))}
                    data={{
                      allocation: `$${investment.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      expectedReturn: investment.expected_return,
                      expectedProfit: investment.expectedProfit,
                      reserveApy: investment.reserve_apy,
                      rewardsApy: investment.rewards_apy
                    }}
                  />
                );
            })}
            
            {/* Filter and map Reserves */}
            {SAMPLE_RESERVES
              .filter(reserve => {
                 // Find corresponding investment in the distribution results
                const investment = distribution.investments.find(
                  inv => inv.type === 'reserve' && inv.name === reserve.name
                );
                 // Keep the reserve only if an investment exists and allocation > 0
                return investment && investment.allocation > 0;
              })
              // Remove unused index parameter
              .map((reserve) => {
                 // We know the investment exists from the filter above
                const investment = distribution.investments.find(
                  inv => inv.type === 'reserve' && inv.name === reserve.name
                )!;

                return (
                  <ReserveInfo
                    key={reserve.name}
                    title={reserve.name}
                    color={getInvestmentColor('reserve', SAMPLE_RESERVES.findIndex(r => r.name === reserve.name))}
                    investmentData={{
                      allocation: investment.allocation,
                      expectedReturn: investment.expected_return, 
                      expectedProfit: investment.expectedProfit,
                      reserveApy: investment.reserve_apy, 
                      rewardsApy: investment.rewards_apy 
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