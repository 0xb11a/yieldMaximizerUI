'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full border-b border-[#1E2633] bg-[#111827] relative">
      <div className="container mx-auto px-8 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-2xl font-bold gradient-text">
            Yield Maximizer
          </Link>
          <Link href="/protocol-dashboard" className="text-lg text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
} 