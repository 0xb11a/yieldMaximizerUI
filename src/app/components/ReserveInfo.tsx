'use client';

// Add reserve-specific data interface
interface ReserveSpecificData {
  total_borrowed?: number;
  total_supplied?: number;
  optimal_usage_ratio?: number;
}

interface ReserveInfoProps {
  title: string;
  color: string;
  reserveData?: ReserveSpecificData; // Add optional prop for reserve-specific data
}

export default function ReserveInfo({ title, color, reserveData }: ReserveInfoProps) {
  // Helper to format APY (same as in PoolInfo)
  // const formatApy = (apy: number | undefined) => 
  //   apy !== undefined ? `${apy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';

  // Helper to format currency amount
  const formatCurrency = (amount: number | undefined) => 
    amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  // Calculate Utilization Rate
  const utilizationRate = 
    reserveData?.total_supplied && reserveData.total_supplied > 0 && reserveData?.total_borrowed !== undefined
    ? (reserveData.total_borrowed / reserveData.total_supplied) * 100
    : 0;

  // Format Utilization Rate
  const formatUtilization = (rate: number) => 
     `${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="p-6 space-y-2">
        {/* Total Supplied */}
        {reserveData?.total_supplied !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Total Supplied</span>
            <span className="text-sm text-white">{formatCurrency(reserveData.total_supplied)}</span>
          </div>
        )}
        {/* Total Borrowed */}
        {reserveData?.total_borrowed !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Total Borrowed</span>
            <span className="text-sm text-white">{formatCurrency(reserveData.total_borrowed)}</span>
          </div>
        )}
        {/* Utilization Rate */}
        {reserveData?.total_supplied !== undefined && reserveData?.total_borrowed !== undefined && (
           <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Utilization Rate</span>
            <span className="text-sm text-white">{formatUtilization(utilizationRate)}</span>
          </div>
        )}
      </div>
    </div>
  );
} 