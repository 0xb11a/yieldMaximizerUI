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
  type Pool,
  DEMO_DATA
} from '@/config/apiConfig';
import { SAMPLE_POOLS, SAMPLE_RESERVES } from '@/config/poolsAndReserves';
import { getInvestmentColor } from '@/styles/colors';

// Load PieChart component dynamically to avoid SSR issues
const PieChart = dynamic(
  () => import('react-minimal-pie-chart').then((mod) => mod.PieChart),
  { ssr: false }
);

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
  type: 'pool' | 'reserve';
  expected_return: number;
  allocation: number;
}

const INITIAL_ALLOCATION: AllocationItem[] = [];

interface InvestmentCalculatorProps {
  useDemo?: boolean;
}

export default function InvestmentCalculator({ useDemo = false }: InvestmentCalculatorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isDistributed, setIsDistributed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allocation, setAllocation] = useState(INITIAL_ALLOCATION);
  const [distribution, setDistribution] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Processes API response into formatted allocation data with consistent coloring
  const calculateDistribution = (apiResponse: ApiResponse) => {
    const pools = apiResponse.investments.filter(inv => inv.type === 'pool');
    const reserves = apiResponse.investments.filter(inv => inv.type === 'reserve');

    return [
      ...pools.map((investment, index) => ({
        name: investment.name,
        percentage: Math.round((investment.allocation / apiResponse.total_funds) * 100),
        color: getInvestmentColor('pool', index),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation
      })),
      ...reserves.map((investment, index) => ({
        name: investment.name,
        percentage: Math.round((investment.allocation / apiResponse.total_funds) * 100),
        color: getInvestmentColor('reserve', index),
        type: investment.type,
        expected_return: investment.expected_return,
        allocation: investment.allocation
      }))
    ];
  };

  // Automatically calculate distribution when using demo mode
  useEffect(() => {
    if (useDemo && isConnected) {
      const newAllocation = calculateDistribution(DEMO_DATA);
      setDistribution(DEMO_DATA);
      setAllocation(newAllocation);
      setIsDistributed(true);
      setError(null);
    }
  }, [useDemo, isConnected]);

  // Handles fund distribution calculation, either with demo or API data
  const handleDistribute = async () => {
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
      const defaultSupply = parseInt(process.env.NEXT_PUBLIC_DEFAULT_SUPPLY || '100000');

      const requestBody = generateApiRequestBody(
        SAMPLE_RESERVES,
        defaultSupply,
        SAMPLE_POOLS
      );

      const data = await fetchDistribution(requestBody);
      const newAllocation = calculateDistribution(data);
      
      setDistribution(data);
      setAllocation(newAllocation);
      setIsDistributed(true);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message.includes('Failed to fetch')
          ? 'Unable to connect to the server.'
          : err.message
        : 'An unexpected error occurred';
      
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Transforms allocation data for pie chart visualization
  const pieData = allocation
    .filter(item => item.allocation > 0)
    .map((item) => ({
      title: item.name,
      value: item.percentage,
      color: item.color,
    }));

  return (
    <div className="container mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Calculator</h1>
      
      {/* Wallet Connection Section */}
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
        isDistributed ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Distribution Chart */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Distribution</h2>
          <div className="w-64 h-64 mx-auto">
            <PieChart
              data={pieData}
              lineWidth={20}
              paddingAngle={2}
              rounded
              animate
              label={({ dataEntry }) => Math.round(dataEntry.value) + '%'}
              labelStyle={{
                fontSize: '6px',
                fill: '#fff',
              }}
              labelPosition={70}
            />
          </div>
        </div>

        {/* Allocation List */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Allocation</h2>
          <div className="space-y-4">
            {allocation.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div className="flex items-center gap-2 flex-[2]">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white">{item.name}</span>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                  <span className="text-white w-24 text-right">
                    ${item.allocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[#34D399] w-20 text-right">
                    {item.expected_return.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
              </div>
            ))}
            {distribution && (
              <div className="pt-4 mt-4 border-t border-[#1E2633]">
                <div className="flex items-center">
                  <span className="text-[#34D399] flex-[2]">Total Profit</span>
                  <span className="text-[#34D399] flex-1 text-right">
                    ${distribution.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-[#34D399] flex-[2]">Total Expected Return</span>
                  <span className="text-[#34D399] flex-1 text-right">
                    {(distribution.total_expected_return * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pool & Reserves Information */}
      {isDistributed && distribution && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-6">Pool & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            {/* Pools */}
            {SAMPLE_POOLS.map((pool, index) => {
              const investment = distribution.investments.find(
                inv => inv.type === 'pool' && inv.name === `Pool-${pool.address.slice(2, 10)}`
              );
              return (
                <PoolInfo
                  key={pool.address}
                  title={`Pool ${index + 1}`}
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
                    utilizationRate: `${((reserve.total_borrowed / reserve.total_supplied) * 100).toFixed(1)}%`,
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