'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  darkTheme, // Or lightTheme, midnightTheme, etc.
  // If you need custom themes:
  // AvatarComponent, connectorsForWallets, getDefaultWallets
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/config/wagmi'; // Import the config we just created

// Recreate the query client here
const queryClient = new QueryClient();

// Customize RainbowKit theme (optional)
const customTheme = darkTheme({
    accentColor: '#10B981', // Example: Match your button color
    accentColorForeground: 'white',
    borderRadius: 'medium',
    // overlayBlur: 'small', // Example option
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Provide the Wagmi config to the WagmiProvider
    <WagmiProvider config={wagmiConfig}>
      {/* Provide the react-query client to the QueryClientProvider */}
      <QueryClientProvider client={queryClient}>
        {/* Provide RainbowKit options and theme to the RainbowKitProvider */}
        <RainbowKitProvider
            theme={customTheme} // Use the customized theme
            // You can add other props here if needed:
            // modalSize="compact"
            // initialChain={defaultChain} // Optional: Set initial chain
            // showRecentTransactions={true}
        >
          {children} 
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 