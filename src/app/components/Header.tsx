'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-[#1E2633] bg-[#111827]">
      <div className="container mx-auto px-8 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold gradient-text">
            CryptoCalc
          </Link>
        </div>
        <nav className="flex gap-8">
          <Link
            href="/dashboard"
            className={`text-base ${
              pathname === '/dashboard'
                ? 'text-white'
                : 'text-[#9CA3AF] hover:text-white transition-colors'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/pools"
            className={`text-base ${
              pathname === '/pools'
                ? 'text-white'
                : 'text-[#9CA3AF] hover:text-white transition-colors'
            }`}
          >
            Pools
          </Link>
          <Link
            href="/reserves"
            className={`text-base ${
              pathname === '/reserves'
                ? 'text-white'
                : 'text-[#9CA3AF] hover:text-white transition-colors'
            }`}
          >
            Reserves
          </Link>
        </nav>
      </div>
    </header>
  );
} 