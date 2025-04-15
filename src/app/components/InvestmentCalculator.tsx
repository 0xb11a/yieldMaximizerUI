'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const PieChart = dynamic(
  () => import('react-minimal-pie-chart').then((mod) => mod.PieChart),
  { ssr: false }
);

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
}

const ALLOCATION: AllocationItem[] = [
  { name: 'USDC/ETH Pool', percentage: 25, color: '#10B981' },
  { name: 'USDC Reserve', percentage: 20, color: '#EC4899' },
  { name: 'ETH Reserve', percentage: 20, color: '#F59E0B' },
  { name: 'BTC/ETH Pool', percentage: 20, color: '#06B6D4' },
  { name: 'BTC Reserve', percentage: 15, color: '#F97316' },
];

export default function InvestmentCalculator() {
  const [isConnected, setIsConnected] = useState(false);

  const pieData = ALLOCATION.map((item) => ({
    title: item.name,
    value: item.percentage,
    color: item.color,
  }));

  const handleDistribute = () => {
    // This will be implemented in the future to recalculate distribution
    console.log('Distributing funds...');
  };

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
              onClick={() => setIsConnected(!isConnected)}
              className="px-6 py-3 bg-[#1E2633] hover:bg-[#2D3748] text-white rounded-lg transition-colors"
            >
              {isConnected ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>
          {isConnected && (
            <button
              onClick={handleDistribute}
              className="w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors"
            >
              Distribute Funds
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Distribution Chart */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Distribution</h2>
          <div className="w-64 h-64 mx-auto">
            <PieChart
              data={pieData}
              lineWidth={20}
              paddingAngle={2}
              rounded
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
            {ALLOCATION.map((item) => (
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
          </div>
        </div>
      </div>
    </div>
  );
} 