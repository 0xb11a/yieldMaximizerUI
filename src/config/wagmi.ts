import { http, createStorage, cookieStorage, createConfig } from 'wagmi'
import { Chain } from 'viem' // Import Chain from viem
import { connectorsForWallets } from '@rainbow-me/rainbowkit'

import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  trustWallet,
  rabbyWallet,
  zerionWallet,
  xdefiWallet,
  tahoWallet,
  safeWallet,
  phantomWallet,
  omniWallet,
  okxWallet,
  mewWallet,
  injectedWallet,
  imTokenWallet,
  dawnWallet,
  braveWallet,
  bitskiWallet,
  argentWallet,
  bybitWallet
} from '@rainbow-me/rainbowkit/wallets'
import binanceWallet from '@binance/w3w-rainbow-connector-v2'

// Define chains using viem's Chain type
const mantle: Chain = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
    public: { http: ['https://rpc.mantle.xyz', 'https://rpc.ankr.com/mantle'] }
  },
  blockExplorers: {
    default: { name: 'Mantle explorer', url: 'https://explorer.mantle.xyz' }
  },
  testnet: false
};

const mantleTestnet: Chain = {
  id: 5001,
  name: 'Mantle Testnet',
  nativeCurrency: { name: 'Mantle Testnet', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.mantle.xyz'] },
    public: { http: ['https://rpc.testnet.mantle.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Mantle Testnet explorer', url: 'https://explorer.testnet.mantle.xyz' }
  },
  testnet: true
};

const mantleSepolia: Chain = {
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: { name: 'Mantle Sepolia Testnet', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
    public: { http: ['https://rpc.sepolia.mantle.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Mantle Sepolia explorer', url: 'https://explorer.sepolia.mantle.xyz' }
  },
  testnet: true
};

// Environment check (ensure NEXT_PUBLIC_ prefix for browser access if needed)
// Using process.env.NODE_ENV is generally safer for distinguishing build environments.
const isProduction = process.env.NODE_ENV === 'production';

export const defaultChain = isProduction ? mantle : mantle;

const supportedChains: [Chain, ...Chain[]] = isProduction
  ? [mantle]
  : [mantle, mantleTestnet, mantleSepolia];

// RainbowKit projectId - Get one from https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '14b531d474e6ed383d9768ed2f41f16a'; // Use env var
if (!projectId) {
  console.warn('WalletConnect Project ID is not set. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env file');
  // You might want to throw an error here in production
}

const appName = 'Lendle App'; // Or get from env

// Define wallet groups with project ID
const walletGroups = [
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
      coinbaseWallet,
      walletConnectWallet,
      trustWallet,
      rabbyWallet,
    ]
  },
  {
    groupName: 'Others',
    wallets: [
      rainbowWallet,
      zerionWallet,
      omniWallet,
      okxWallet,
      argentWallet,
      bitskiWallet,
      braveWallet,
      dawnWallet,
      imTokenWallet,
      injectedWallet,
      mewWallet,
      phantomWallet,
      safeWallet,
      tahoWallet,
      xdefiWallet,
      bybitWallet,
      binanceWallet
    ]
  }
];

// Create connectors using the defined groups and project ID
const connectors = connectorsForWallets(
   walletGroups,
   {
     appName: appName,
     projectId: projectId,
     // Optional app metadata
     // appDescription: 'Your App Description',
     // appUrl: 'https://your-app-url.com',
     // appIcon: 'https://your-app-url.com/icon.png',
   }
);

// Transport configuration
const transports = supportedChains.reduce((acc, chain) => {
  acc[chain.id] = http();
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: transports,
  connectors,
  ssr: true, // Important for Next.js
  storage: createStorage({ storage: cookieStorage }), // Optional: Persist connections
  // projectId and appName are usually passed via connectorsForWallets now
});

// Export config directly
// export default wagmiConfig; // No need for the extra object wrapper 