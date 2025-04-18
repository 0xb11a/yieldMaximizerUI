'use client';

// Define the shape of the specific investment data for this reserve
interface InvestmentAllocationData {
  allocation: number; 
  expectedReturn: number; 
  expectedProfit: number;
  reserveApy?: number;
  rewardsApy?: number;
}

interface ReserveInfoProps {
  title: string;
  color: string;
  investmentData: InvestmentAllocationData; // Keep investment-specific data
}

export default function ReserveInfo({ title, color, investmentData }: ReserveInfoProps) {
  // Helper to format APY (same as in PoolInfo)
  const formatApy = (apy: number | undefined) => 
    apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';

  // Helper to format allocation amount
  const formatAllocation = (amount: number) => 
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Helper to format profit amount (same as in PoolInfo)
  const formatProfit = (amount: number) => 
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
          <span className="text-white">{formatAllocation(investmentData.allocation)}</span>
        </div>
        <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Expected Profit</span>
          <span className="text-white">{formatProfit(investmentData.expectedProfit)}</span>
        </div>
        <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Total APY</span>
          <span className="text-[#34D399] font-semibold">{formatApy(investmentData.expectedReturn)}</span>
        </div>
        {investmentData.reserveApy !== undefined && (
          <div className="flex justify-between animate-fadeIn pl-4 mt-1">
            <span className="text-sm text-gray-400">Reserve APY</span>
            <span className="text-sm text-gray-300">{formatApy(investmentData.reserveApy)}</span>
          </div>
        )}
        {investmentData.rewardsApy !== undefined && (
          <div className="flex justify-between animate-fadeIn pl-4 mt-1">
            <span className="text-sm text-gray-400">Rewards APY</span>
            <span className="text-sm text-gray-300">{formatApy(investmentData.rewardsApy)}</span>
          </div>
        )}
      </div>
    </div>
  );
} 