'use client';

interface ReserveInfoProps {
  title: string;
  color: string;
  data: {
    totalValueLocked: string;
    utilizationRate: string;
    baseFee: string;
    baseAPY: string;
  };
}

export default function ReserveInfo({ title, color, data }: ReserveInfoProps) {
  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {data.totalValueLocked && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Total Value Locked</span>
            <span className="text-white font-medium">{data.totalValueLocked}</span>
          </div>
        )}
        {data.utilizationRate && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Utilization Rate</span>
            <span className="text-white">{data.utilizationRate}</span>
          </div>
        )}
        {data.baseFee && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Base Fee</span>
            <span className="text-white">{data.baseFee}</span>
          </div>
        )}
        {data.baseAPY && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Base APY</span>
            <span className="text-[#34D399]">{data.baseAPY}</span>
          </div>
        )}
      </div>
    </div>
  );
} 