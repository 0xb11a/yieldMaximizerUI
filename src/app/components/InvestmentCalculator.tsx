'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import PoolInfo from './PoolInfo';

const PieChart = dynamic(
  () => import('react-minimal-pie-chart').then((mod) => mod.PieChart),
  { ssr: false }
);

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
}

// Demo data
const DEMO_DATA = {
  reserves: {
    reserve1: {
      total_borrowed: 179954,
      total_supplied: 370406,
      optimal_usage_ratio: 0.85,
      variable_rate_slope1: 0.08,
      variable_rate_slope2: 0.8,
      token_price: 1,
    },
    reserve2: {
      total_borrowed: 522821,
      total_supplied: 1792518,
      optimal_usage_ratio: 0.75,
      variable_rate_slope1: 0.11,
      variable_rate_slope2: 0.7,
      token_price: 1,
    },
    reserve3: {
      total_borrowed: 400000,
      total_supplied: 1200000,
      optimal_usage_ratio: 0.8,
      variable_rate_slope1: 0.09,
      variable_rate_slope2: 0.75,
      token_price: 1,
    }
  },
  distribution: {
    fund1_supply: 68830.86,
    fund2_supply: 6671.54,
    fund3_supply: 24497.60,
    total_profit: 1123.79
  }
};

const INITIAL_ALLOCATION: AllocationItem[] = [
  { name: 'USDC Reserve', percentage: 0, color: '#EC4899' },
  { name: 'ETH Reserve', percentage: 0, color: '#F59E0B' },
  { name: 'BTC Reserve', percentage: 0, color: '#F97316' },
];

export default function InvestmentCalculator() {
  const [isConnected, setIsConnected] = useState(false);
  const [isDistributed, setIsDistributed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allocation, setAllocation] = useState(INITIAL_ALLOCATION);

  const calculateDistribution = () => {
    const total = DEMO_DATA.distribution.fund1_supply + 
                 DEMO_DATA.distribution.fund2_supply + 
                 DEMO_DATA.distribution.fund3_supply;

    return [
      { 
        name: 'USDC Reserve', 
        percentage: Math.round((DEMO_DATA.distribution.fund1_supply / total) * 100), 
        color: '#EC4899' 
      },
      { 
        name: 'ETH Reserve', 
        percentage: Math.round((DEMO_DATA.distribution.fund2_supply / total) * 100), 
        color: '#F59E0B' 
      },
      { 
        name: 'BTC Reserve', 
        percentage: Math.round((DEMO_DATA.distribution.fund3_supply / total) * 100), 
        color: '#F97316' 
      },
    ];
  };

  const handleDistribute = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newAllocation = calculateDistribution();
    setAllocation(newAllocation);
    setIsDistributed(true);
    setIsLoading(false);
  };

  const calculateAPY = (reserve: any) => {
    const utilizationRate = reserve.total_borrowed / reserve.total_supplied;
    let interestRate;
    
    if (utilizationRate <= reserve.optimal_usage_ratio) {
      interestRate = (utilizationRate * reserve.variable_rate_slope1) / reserve.optimal_usage_ratio;
    } else {
      const normalRate = reserve.variable_rate_slope1;
      const excessUtilization = (utilizationRate - reserve.optimal_usage_ratio) / (1 - reserve.optimal_usage_ratio);
      interestRate = normalRate + (excessUtilization * reserve.variable_rate_slope2);
    }
    
    return (interestRate * 100).toFixed(2);
  };

  const pieData = allocation.map((item) => ({
    title: item.name,
    value: item.percentage,
    color: item.color,
  }));

  return (
    <div className="container mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Vaults Calculator</h1>
      
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
            {allocation.map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white">{item.name}</span>
                </div>
                <span className="text-white">{item.percentage}%</span>
              </div>
            ))}
            {isDistributed && (
              <div className="pt-4 mt-4 border-t border-[#1E2633]">
                <div className="flex justify-between items-center text-[#34D399]">
                  <span>Total Profit</span>
                  <span>${DEMO_DATA.distribution.total_profit.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pool & Reserve Information */}
      {isDistributed && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-6">Pool & Reserves Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">
            <PoolInfo
              title="USDC Reserve"
              icon="#EC4899"
              data={{
                totalValueLocked: `$${DEMO_DATA.reserves.reserve1.total_supplied.toLocaleString()}`,
                utilizationRate: `${((DEMO_DATA.reserves.reserve1.total_borrowed / DEMO_DATA.reserves.reserve1.total_supplied) * 100).toFixed(1)}%`,
                apy: `${calculateAPY(DEMO_DATA.reserves.reserve1)}%`,
                volume24h: `$${(DEMO_DATA.reserves.reserve1.total_borrowed * 0.1).toLocaleString()}`,
                fees: `${(DEMO_DATA.reserves.reserve1.variable_rate_slope1 * 100).toFixed(1)}%`,
              }}
            />
            <PoolInfo
              title="ETH Reserve"
              icon="#F59E0B"
              data={{
                totalValueLocked: `$${DEMO_DATA.reserves.reserve2.total_supplied.toLocaleString()}`,
                utilizationRate: `${((DEMO_DATA.reserves.reserve2.total_borrowed / DEMO_DATA.reserves.reserve2.total_supplied) * 100).toFixed(1)}%`,
                apy: `${calculateAPY(DEMO_DATA.reserves.reserve2)}%`,
                volume24h: `$${(DEMO_DATA.reserves.reserve2.total_borrowed * 0.1).toLocaleString()}`,
                fees: `${(DEMO_DATA.reserves.reserve2.variable_rate_slope1 * 100).toFixed(1)}%`,
              }}
            />
            <PoolInfo
              title="BTC Reserve"
              icon="#F97316"
              data={{
                totalValueLocked: `$${DEMO_DATA.reserves.reserve3.total_supplied.toLocaleString()}`,
                utilizationRate: `${((DEMO_DATA.reserves.reserve3.total_borrowed / DEMO_DATA.reserves.reserve3.total_supplied) * 100).toFixed(1)}%`,
                apy: `${calculateAPY(DEMO_DATA.reserves.reserve3)}%`,
                volume24h: `$${(DEMO_DATA.reserves.reserve3.total_borrowed * 0.1).toLocaleString()}`,
                fees: `${(DEMO_DATA.reserves.reserve3.variable_rate_slope1 * 100).toFixed(1)}%`,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
} 