// Minimal ERC20 ABI for balance checking
export const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view', // Recommended for view functions
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view', // Recommended for view functions
    type: 'function',
  },
    {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view', // Recommended for view functions
    type: 'function',
  },
] as const; // Use 'as const' for better type inference with viem/wagmi 