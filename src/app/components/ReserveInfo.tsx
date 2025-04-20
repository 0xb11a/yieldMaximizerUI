'use client';

// Define the shape of the specific investment data for this reserve
interface InvestmentAllocationData {
  allocation: number; 
}

// Add reserve-specific data interface
interface ReserveSpecificData {
  total_borrowed?: number;
  total_supplied?: number;
  optimal_usage_ratio?: number;
}

interface ReserveInfoProps {
  title: string;
  color: string;
  investmentData: InvestmentAllocationData; // Keep investment-specific data
  reserveData?: ReserveSpecificData; // Add optional prop for reserve-specific data
}

export default function ReserveInfo({ title, color, investmentData, reserveData }: ReserveInfoProps) {
  // Helper to format APY (same as in PoolInfo)
  // const formatApy = (apy: number | undefined) => 
  //   apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';

  // Helper to format currency amount
  const formatCurrency = (amount: number | undefined) => 
    amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  // Helper to format ratio as percentage
  const formatRatioPercent = (ratio: number | undefined) =>
    ratio !== undefined ? `${(ratio * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';

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
          <span className="text-white">{formatCurrency(investmentData.allocation)}</span>
        </div>
        {/* Display new reserve-specific fields if reserveData exists */}
        {reserveData?.total_borrowed !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Total Borrowed</span>
            <span className="text-sm text-white">{formatCurrency(reserveData.total_borrowed)}</span>
          </div>
        )}
        {reserveData?.total_supplied !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Total Supplied</span>
            <span className="text-sm text-white">{formatCurrency(reserveData.total_supplied)}</span>
          </div>
        )}
        {reserveData?.optimal_usage_ratio !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Optimal Usage Ratio</span>
            <span className="text-sm text-white">{formatRatioPercent(reserveData.optimal_usage_ratio)}</span>
          </div>
        )}
      </div>
    </div>
  );
} 