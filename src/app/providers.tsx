'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Recreate the wagmi config here
const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    // Add other connectors here if needed
  ],
  transports: {
    [mainnet.id]: http(),
  },
});

// Recreate the query client here
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 