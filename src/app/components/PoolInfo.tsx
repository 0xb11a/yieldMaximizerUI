'use client';

interface PoolInfoProps {
  title: string;
  icon: string;
  data: {
    volume24h?: string;
    fees?: string;
    totalValueLocked?: string;
    utilizationRate?: string;
    apy?: string;
  };
}

export default function PoolInfo({ title, icon, data }: PoolInfoProps) {
  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: icon }}
          />
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
        {data.volume24h && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Volume 24h</span>
            <span className="text-white">{data.volume24h}</span>
          </div>
        )}
        {data.utilizationRate && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Utilization Rate</span>
            <span className="text-white">{data.utilizationRate}</span>
          </div>
        )}
        {data.fees && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">Base Fee</span>
            <span className="text-white">{data.fees}</span>
          </div>
        )}
        {data.apy && (
          <div className="flex justify-between animate-fadeIn">
            <span className="text-[#9CA3AF]">APY</span>
            <span className="text-[#34D399] font-medium">{data.apy}</span>
          </div>
        )}
      </div>
    </div>
  );
} 