'use client';

import React from 'react';
import Image from 'next/image';
import { Reserve } from '@/config/apiConfig';

interface ReserveInfoProps {
  title: string;
  color: string;
  reserveData: Reserve;
  explorerUrl?: string;
  logoUrl?: string;
}

// Helper to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

export default function ReserveInfo({ title, color, reserveData, explorerUrl, logoUrl }: ReserveInfoProps) {
  const utilizationRate = 
    reserveData?.total_supplied && reserveData.total_supplied > 0 && reserveData?.total_borrowed !== undefined
    ? (reserveData.total_borrowed / reserveData.total_supplied) * 100
    : 0;

  const formatUtilization = (rate: number) => 
     `${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  const formattedTotalSupplied = formatNumber(reserveData.total_supplied ?? 0);
  const formattedTotalBorrowed = formatNumber(reserveData.total_borrowed ?? 0);

  const titleElement = (
    <h3 className="text-lg font-semibold">{title}</h3>
  );

  return (
    <div className="card transform transition-all duration-500 hover:scale-[1.02]">
      <div className="p-6 border-b border-[#1E2633]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {/* Render title (linked if explorerUrl exists) */}
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
          {/* Add logo if URL is provided (moved to the right) */}
          {logoUrl && (
            <Image 
              src={logoUrl} 
              alt={`${title} logo`} 
              width={36}
              height={36}
              className="object-contain self-center ml-auto"
            />
          )}
        </div>
      </div>
      <div className="p-6 space-y-2">
        {reserveData?.total_supplied !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Total Supplied</span>
            <span className="text-sm text-white">{formattedTotalSupplied}</span>
          </div>
        )}
        {reserveData?.total_borrowed !== undefined && (
          <div className="flex justify-between animate-fadeIn mt-1">
            <span className="text-sm text-[#9CA3AF]">Total Borrowed</span>
            <span className="text-sm text-white">{formattedTotalBorrowed}</span>
          </div>
        )}
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