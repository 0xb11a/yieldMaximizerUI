'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full border-b border-[#1E2633] bg-[#111827] relative">
      <div className="container mx-auto px-8 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold gradient-text">
            b11a
          </Link>
        </div>
      </div>
    </header>
  );
} 