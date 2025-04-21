'use client';

// Remove unused useState import
// import { useState } from 'react';

// Define the shape of the data passed to PoolInfo
interface PoolDisplayData {
  // allocation: string; // Removed
  daily_fee?: number;
  pool_distribution?: number; // This is Volume
  reward_per_day?: number;
  reward_token_price?: number; // Added for calculation
}

interface PoolInfoProps {
  title: string;
  color: string;
  data: PoolDisplayData; 
}

export default function PoolInfo({ title, color, data }: PoolInfoProps) {
  // Helper to format currency amount
  const formatCurrency = (amount: number | undefined) => 
    amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  // Calculate Rewards Per Day in USD
  const rewardsPerDayUSD = 
    data.reward_per_day !== undefined && data.reward_token_price !== undefined
    ? data.reward_per_day * data.reward_token_price
    : undefined; // Or handle as 0 if preferred

  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="p-6 space-y-2">
        {/* Removed Allocated Amount display */}
        
        {/* Volume (Pool Distribution) */}
        {data.pool_distribution !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Volume</span>
            {/* Assuming pool_distribution is a currency value */}
            <span className="text-sm text-white">{formatCurrency(data.pool_distribution)}</span>
          </div>
        )}
        {/* Daily Fee */}
        {data.daily_fee !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Daily Fee</span>
            <span className="text-sm text-white">{formatCurrency(data.daily_fee)}</span>
          </div>
        )}
        {/* Rewards Per Day (USD) - Calculated */}
        {rewardsPerDayUSD !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Rewards/Day (USD)</span>
            <span className="text-sm text-white">{formatCurrency(rewardsPerDayUSD)}</span>
          </div>
        )}
        {/* Removed original Reward Per Day display */}
      </div>
    </div>
  );
} 