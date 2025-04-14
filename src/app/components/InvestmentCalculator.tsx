'use client';

import { useState } from 'react';
import { PieChart } from 'react-minimal-pie-chart';

interface DataEntry {
  title: string;
  value: number;
  color: string;
}

const ALLOCATION = [
  { name: 'USDC/ETH Pool', percentage: 25, color: '#10B981' },
  { name: 'USDC Reserve', percentage: 20, color: '#EC4899' },
  { name: 'ETH Reserve', percentage: 20, color: '#F59E0B' },
  { name: 'BTC/ETH Pool', percentage: 20, color: '#06B6D4' },
  { name: 'BTC Reserve', percentage: 15, color: '#F97316' },
];

export default function InvestmentCalculator() {
  const [amount, setAmount] = useState('');

  const pieData = ALLOCATION.map((item) => ({
    title: item.name,
    value: item.percentage,
    color: item.color,
  }));

  return (
    <div className="container mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Investment Calculator</h1>
      
      {/* Investment Amount Input */}
      <div className="card p-8 mb-12">
        <label className="block text-[#9CA3AF] mb-2">Investment Amount</label>
        <div className="relative">
          <input
            type="number"
            className="input pr-16"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            USD
          </span>
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
              label={({ dataEntry }: { dataEntry: DataEntry }) => 
                Math.round(dataEntry.value) + '%'
              }
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