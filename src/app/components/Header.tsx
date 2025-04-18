'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DevMenuProps {
  onDemoChange: (isDemo: boolean) => void;
}

export default function Header({ onDemoChange }: DevMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleUseDemoData = () => {
    onDemoChange(true);
    setIsMenuOpen(false);
  };

  return (
    <header className="w-full border-b border-[#1E2633] bg-[#111827] relative">
      <div className="container mx-auto px-8 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold gradient-text">
            b11a
          </Link>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-4 py-2 bg-[#1E2633] hover:bg-[#2D3748] text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>Dev Menu</span>
            <svg
              className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1E2633] rounded-lg shadow-lg overflow-hidden z-50">
              <div className="p-4">
                <button
                  onClick={handleUseDemoData}
                  className="w-full px-4 py-2 bg-[#2D3748] hover:bg-[#374151] text-white rounded-lg transition-colors"
                >
                  Use Demo Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 