'use client';

// Remove unused useState import
// import { useState } from 'react';

// Define the shape of the data passed to PoolInfo
interface PoolDisplayData {
  allocation: string;      // Formatted string
  // Remove APY and Profit fields
  // expectedReturn: number;  // Raw number for Total APY
  // expectedProfit: number;  // Raw number for Profit
  // reserveApy?: number;
  // rewardsApy?: number;
  // Add pool-specific fields
  daily_fee?: number;
  pool_distribution?: number;
  reward_per_day?: number;
}

interface PoolInfoProps {
  title: string;
  color: string;
  data: PoolDisplayData; 
}

export default function PoolInfo({ title, color, data }: PoolInfoProps) {
  const formatApy = (apy: number | undefined) => 
    apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';

  // Helper to format profit/currency amount
  const formatCurrency = (amount: number | undefined) => 
    amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  // Helper to format distribution (assuming it's a currency amount)
  const formatDistribution = (amount: number | undefined) =>
    amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="p-6 space-y-2">
        <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Allocated Amount</span>
          <span className="text-white">{data.allocation}</span>
        </div>
        {/* Remove Expected Profit display */}
        {/* <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Expected Profit</span>
          <span className="text-white">{formatCurrency(data.expectedProfit)}</span>
        </div> */}
        {/* Remove Total APY display */}
        {/* <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Total APY</span>
          <span className="text-[#34D399] font-semibold">{formatApy(data.expectedReturn)}</span>
        </div> */}
        {/* Remove Reserve APY display */}
        {/* {data.reserveApy !== undefined && (
          <div className="flex justify-between animate-fadeIn pl-4 mt-1">
            <span className="text-sm text-gray-400">Reserve APY</span>
            <span className="text-sm text-gray-300">{formatApy(data.reserveApy)}</span>
          </div>
        )} */}
        {/* Remove Rewards APY display */}
        {/* {data.rewardsApy !== undefined && (
          <div className="flex justify-between animate-fadeIn pl-4 mt-1">
            <span className="text-sm text-gray-400">Rewards APY</span>
            <span className="text-sm text-gray-300">{formatApy(data.rewardsApy)}</span>
          </div>
        )} */}
        {/* Display new pool-specific fields */}
        {data.daily_fee !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Daily Fee</span>
            <span className="text-sm text-white">{formatCurrency(data.daily_fee)}</span>
          </div>
        )}
        {data.pool_distribution !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Pool Distribution</span>
            <span className="text-sm text-white">{formatDistribution(data.pool_distribution)}</span>
          </div>
        )}
        {data.reward_per_day !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Reward Per Day</span>
            <span className="text-sm text-white">{formatCurrency(data.reward_per_day)}</span>
          </div>
        )}
      </div>
    </div>
  );
} 