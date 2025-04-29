'use client';

import Image from 'next/image';

interface PoolDisplayData {
  daily_fee?: number;
  pool_distribution?: number;
  reward_per_day?: number;
  reward_token_price?: number;
}

interface PoolInfoProps {
  title: string;
  color: string;
  data: PoolDisplayData; 
  explorerUrl?: string;
  logoUrl?: string;
}

export default function PoolInfo({ title, color, data, explorerUrl, logoUrl }: PoolInfoProps) {

  const formatCurrency = (amount: number | undefined) => 
    amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  // Calculate Rewards Per Day in USD
  const rewardsPerDayUSD = 
    data.reward_per_day !== undefined && data.reward_token_price !== undefined
    ? data.reward_per_day * data.reward_token_price
    : undefined;

  const titleElement = (
    <h3 className="text-lg font-semibold">{title}</h3>
  );

  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {explorerUrl ? (
            <a 
               href={explorerUrl} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="hover:opacity-80 transition-opacity"
            >
              {titleElement}
            </a>
          ) : (
            titleElement
          )}
          {logoUrl && (
            <Image 
              src={logoUrl} 
              alt={`${title} logo`} 
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
        </div>
      </div>
      <div className="p-6 space-y-2">
        
        {data.pool_distribution !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Volume</span>
            <span className="text-sm text-white">{formatCurrency(data.pool_distribution)}</span>
          </div>
        )}
        {data.daily_fee !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Daily Fee</span>
            <span className="text-sm text-white">{formatCurrency(data.daily_fee)}</span>
          </div>
        )}
        {rewardsPerDayUSD !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Rewards/Day (USD)</span>
            <span className="text-sm text-white">{formatCurrency(rewardsPerDayUSD)}</span>
          </div>
        )}
      </div>
    </div>
  );
}