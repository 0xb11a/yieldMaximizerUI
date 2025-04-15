'use client';

import { useState } from 'react';

interface PoolInfoProps {
  title: string;
  address: string;
  chain: string;
  color: string;
  data: {
    allocation: string;
    expectedReturn: string;
  };
}

export default function PoolInfo({ title, address, chain, color, data }: PoolInfoProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Chain</span>
          <span className="text-white font-medium">{chain}</span>
        </div>
        <div className="flex justify-between items-center animate-fadeIn group">
          <span className="text-[#9CA3AF]">Address</span>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">{truncateAddress(address)}</span>
            <button
              onClick={handleCopy}
              className="text-[#9CA3AF] hover:text-[#34D399] transition-colors"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Allocation</span>
          <span className="text-white">{data.allocation}</span>
        </div>
        <div className="flex justify-between animate-fadeIn">
          <span className="text-[#9CA3AF]">Expected Return</span>
          <span className="text-[#34D399]">{data.expectedReturn}</span>
        </div>
      </div>
    </div>
  );
} 