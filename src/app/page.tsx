'use client';

import { useState, useEffect } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { isAddress, formatUnits, Address } from 'viem';
import { AssetData } from '@/types';
import { erc20Abi } from '@/config/constants';

import Header from './components/Header';
import InvestmentCalculator from '@/app/components/InvestmentCalculator';
import WalletBalanceDisplay from '@/app/components/WalletBalanceDisplay';

// --- Define Assets within Page ---
const usdcAsset: AssetData = {
  address: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9',
  symbol: 'USDC',
  name: 'Wallet USDC',
  decimals: 6,
};

const lvUsdcAsset: AssetData = {
  address: '0xf36afb467d1f05541d998bbbcd5f7167d67bd8fc',
  symbol: 'lvUSDC',
  name: 'Lendle USDC Supply',
  decimals: 6,
};

// Remove inUSDC asset
// const iUsdcAsset: AssetData = {
//   address: '0x00A55649E597d463fD212fBE48a3B40f0E227d06',
//   symbol: 'inUSDC', // Match symbol reported by useBalance
//   name: 'InitCapital USDC Supply',
//   decimals: 14, // Corrected decimals
// };
// ---

export default function Home() {
  // --- State Management in Page ---
  const [manualAddress, setManualAddress] = useState<string>('');
  const [displayAddress, setDisplayAddress] = useState<Address | undefined>(undefined);
  const [isManualAddressValid, setIsManualAddressValid] = useState<boolean>(true);
  const [totalSupplyValue, setTotalSupplyValue] = useState<number>(0);
  // ---

  // --- Balance Fetching Hooks ---
  const validAddress = displayAddress; // Use displayAddress directly

  // 1. Wallet USDC Balance
  const { 
    data: usdcBalanceData, 
    isError: usdcIsError, 
    isLoading: usdcIsLoading 
  } = useBalance({
    address: validAddress,
    token: usdcAsset.address as Address, // Specify token for ERC20 via useBalance
    query: { 
      enabled: !!validAddress, 
    },
  });

  // 2. Lendle lvUSDC Balance
  const { 
    data: lvUsdcBalanceData, 
    isError: lvUsdcIsError, 
    isLoading: lvUsdcIsLoading 
  } = useReadContract({
    address: lvUsdcAsset.address as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: validAddress ? [validAddress] : undefined,
    query: { 
      enabled: !!validAddress, 
    },
  });

  // Remove InitCapital iUSDC Balance fetch
  // const { 
  //   data: iUsdcBalanceData, 
  //   isError: iUsdcIsError, 
  //   isLoading: iUsdcIsLoading 
  // } = useBalance({
  //   address: validAddress,
  //   token: iUsdcAsset.address as Address, // Specify token for ERC20
  //   query: { 
  //     enabled: !!validAddress, 
  //   },
  // });
  // ---

  // --- Calculate Total Supply Effect ---
  useEffect(() => {
    const usdcBal = usdcBalanceData?.value ?? BigInt(0);
    const lvUsdcBal = (lvUsdcBalanceData as bigint) ?? BigInt(0);
    // const iUsdcBal = iUsdcBalanceData?.value ?? BigInt(0); // Remove from calculation

    // Log raw balance data for debugging
    if (validAddress) {
      console.log('--- Balance Data Update ---');
      console.log('Address:', validAddress);
      console.log('USDC Balance:', { value: usdcBalanceData?.value, isLoading: usdcIsLoading, isError: usdcIsError });
      console.log('lvUSDC Balance:', { value: lvUsdcBalanceData, isLoading: lvUsdcIsLoading, isError: lvUsdcIsError });
      // console.log('iUSDC Balance:', { value: iUsdcBalanceData?.value, isLoading: iUsdcIsLoading, isError: iUsdcIsError }); // Remove log
    }

    const allLoaded = !usdcIsLoading && !lvUsdcIsLoading; // Remove iUsdcIsLoading
    const anyError = usdcIsError || lvUsdcIsError; // Remove iUsdcIsError

    if (validAddress && allLoaded && !anyError) {
      const totalBigInt = usdcBal + lvUsdcBal; // Remove iUsdcBal
      // Assuming all relevant tokens share the same decimals (6 in this case)
      // If decimals differ, more complex formatting is needed.
      const formattedTotal = formatUnits(totalBigInt, usdcAsset.decimals); 
      setTotalSupplyValue(parseFloat(formattedTotal));
      console.log('Total Supply Calculated:', parseFloat(formattedTotal));
    } else if (!validAddress) {
      // Reset total if address is cleared
      setTotalSupplyValue(0);
    }

    // Dependencies: run when address or any balance data changes
  }, [validAddress, usdcBalanceData, lvUsdcBalanceData, usdcIsLoading, lvUsdcIsLoading, usdcIsError, lvUsdcIsError]); // Corrected dependencies
  // ---

  // --- Event Handlers ---
  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setManualAddress(newAddress);
    const isValid = newAddress === '' || isAddress(newAddress);
    setIsManualAddressValid(isValid);
    if (!isValid) {
        setDisplayAddress(undefined);
    }
  };

  const handleShowManualBalances = () => {
     if (isAddress(manualAddress)) {
        setDisplayAddress(manualAddress as Address);
        setIsManualAddressValid(true);
     } else {
        setIsManualAddressValid(false);
        setDisplayAddress(undefined);
     }
  };
  // ---

  // --- Prepare Props for WalletBalanceDisplay ---
  // Pass individual balance details for display
  const balanceDisplayData = [
    { ...usdcAsset, isLoading: usdcIsLoading, isError: usdcIsError, value: usdcBalanceData?.value },
    { ...lvUsdcAsset, isLoading: lvUsdcIsLoading, isError: lvUsdcIsError, value: lvUsdcBalanceData },
    // { ...iUsdcAsset, isLoading: iUsdcIsLoading, isError: iUsdcIsError, value: iUsdcBalanceData?.value }, // Remove from display data
  ];
  // ---

  return (
    <div className="min-h-screen bg-[#111827]">
      <Header /> 
      <main className="text-[#F9FAFB]">
        <div className="container mx-auto px-4 sm:px-8 py-12">
          <WalletBalanceDisplay 
            manualAddress={manualAddress}
            isManualAddressValid={isManualAddressValid}
            onManualAddressChange={handleManualAddressChange}
            onShowManualBalances={handleShowManualBalances}
            displayAddress={displayAddress}
            balanceDisplayData={balanceDisplayData} // Pass formatted data for display
          />
          <InvestmentCalculator 
            initialFunds={totalSupplyValue} // Pass the calculated total supply
          />
        </div>
      </main>
      <footer className="border-t border-[#1E2633] py-8">
        <div className="container mx-auto px-8 flex justify-between items-center">
          <p className="text-[#9CA3AF]">© 2025 b11a. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-[#9CA3AF] hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5 0-.28-.03-.56-.08-.83A7.72 7.72 0 0 0 23 3z" />
              </svg>
            </a>
            <a href="#" className="text-[#9CA3AF] hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
