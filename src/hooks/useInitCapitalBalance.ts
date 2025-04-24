'use client';

import { useState, useEffect } from 'react';
import { useReadContracts } from 'wagmi';
import { Address, Abi } from 'viem';
import initLensAbiJson from '../config/abis/InitLens.json';
import posManagerAbiJson from '../config/abis/PosManager.json';
import { SUPPORTED_ASSETS } from '../config/assets';

// --- Constants --- 
const POS_MANAGER_ADDRESS: Address = '0x0e7401707CD08c03CDb53DAEF3295DDFb68BBa92';
const INIT_LENS_ADDRESS: Address = '0x4725e220163e0b90b40dd5405ee08718523dea78';

// Explicitly type the imported ABIs
const initLensAbi = initLensAbiJson as Abi;
const posManagerAbi = posManagerAbiJson as Abi;

// Find the InitCapital config
const initCapitalConfig = SUPPORTED_ASSETS.find(asset => asset.id === 'initcapital-usdc');
// *** Correction: Target the receipt token address reported by the contract ***
const TARGET_COLLATERAL_ADDRESS: Address | undefined = initCapitalConfig?.receiptToken?.address;

// Helper function to find the amount of the target collateral in a position
const findCollateralAmount = (pools: Address[], amts: bigint[]): bigint => {
  if (!TARGET_COLLATERAL_ADDRESS) {
      console.warn('[InitCap Hook] Target Collateral Address not found in config!');
      return BigInt(0);
  }
  const collateralIndex = pools.findIndex(poolAddr => poolAddr.toLowerCase() === TARGET_COLLATERAL_ADDRESS.toLowerCase());
  return collateralIndex !== -1 ? amts[collateralIndex] : BigInt(0);
};


// --- Hook Definition ---
export function useInitCapitalBalance(walletAddress: Address | undefined) {
  const [positionIds, setPositionIds] = useState<bigint[] | undefined>(undefined);
  const [balance, setBalance] = useState<bigint | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // 1. Fetch position ID length
  const { data: posLengthData, isLoading: isLoadingLength, isError: isErrorLength } = useReadContracts({
    contracts: [
      {
        address: POS_MANAGER_ADDRESS,
        abi: posManagerAbi,
        functionName: 'getViewerPosIdsLength',
        args: [walletAddress!],
      },
    ],
    query: {
      enabled: !!walletAddress, // Only run if walletAddress is available
    },
  });

  const positionLength = posLengthData?.[0]?.result as bigint | undefined;

  // 2. Prepare contracts to fetch all position IDs based on length
  const positionIdContracts = positionLength !== undefined && walletAddress
    ? Array.from({ length: Number(positionLength) }, (_, i) => ({
        address: POS_MANAGER_ADDRESS,
        abi: posManagerAbi,
        functionName: 'getViewerPosIdsAt',
        args: [walletAddress, BigInt(i)],
      }))
    : [];

  // 3. Fetch all position IDs
  const { data: posIdsData, isLoading: isLoadingIds, isError: isErrorIds } = useReadContracts({
    contracts: positionIdContracts,
    query: {
        enabled: !!walletAddress && positionLength !== undefined && positionLength > 0, // Only run if we have address and length > 0
    },
  });

  // Update positionIds state when data arrives
  useEffect(() => {
      if (posIdsData) {
          const ids = posIdsData.map(item => item.result as bigint).filter(id => id !== undefined);
          setPositionIds(ids);
      } else if (!walletAddress || positionLength === BigInt(0)) {
          // Clear IDs if address removed or length is 0
          setPositionIds(undefined);
      }
  }, [posIdsData, walletAddress, positionLength]);

  // 4. Fetch position info using InitLens for all collected IDs
  const { data: posInfosData, isLoading: isLoadingInfos, isError: isErrorInfos } = useReadContracts({
    contracts: [
      {
        address: INIT_LENS_ADDRESS,
        abi: initLensAbi,
        functionName: 'getInitPosInfos',
        args: [positionIds!], // Pass the array of IDs
      },
    ],
    query: {
      enabled: !!walletAddress && positionIds !== undefined && positionIds.length > 0, // Only run if we have address and IDs
    },
  });

  // 5. Calculate total balance from position infos
  useEffect(() => {
    if (posInfosData?.[0]?.result && positionIds && positionIds.length > 0) { // Check we actually queried for IDs
      // Use unknown[] for safer type handling
      const positionInfos = posInfosData[0].result as unknown[]; 
      let totalCollateral = BigInt(0);
      
      positionInfos.forEach((posInfo: unknown) => {
          // Safely access nested properties using a more specific type assertion
          const maybeCollInfo = (posInfo as { collInfo?: { pools?: Address[], amts?: bigint[] } })?.collInfo;
          const pools = maybeCollInfo?.pools as Address[] | undefined;
          const amts = maybeCollInfo?.amts as bigint[] | undefined;

          // Check if pools and amts are valid arrays before proceeding
          if (pools && amts && Array.isArray(pools) && Array.isArray(amts)) { 
              const collateralAmountInPos = findCollateralAmount(pools, amts);
              totalCollateral += collateralAmountInPos;
          }
      });
      
      setBalance(totalCollateral); // Set the balance using the found collateral amount
      setIsError(false); 
    } else if (positionLength === BigInt(0) && !isLoadingLength && !isErrorLength) {
      setBalance(BigInt(0));
      setPositionIds([]); 
      setIsError(false); 
    }
  }, [posInfosData, positionLength, isLoadingLength, isErrorLength]);

  // 6. Determine overall loading and error states
  useEffect(() => {
    // Loading is true if any fetch is loading, OR if we are waiting for IDs based on a non-zero length
    const waitingForIds = positionLength !== undefined && positionLength > 0 && positionIds === undefined && !isErrorIds;
    const waitingForInfos = positionIds !== undefined && positionIds.length > 0 && posInfosData === undefined && !isErrorInfos;
    const calculatedIsLoading = isLoadingLength || isLoadingIds || isLoadingInfos || waitingForIds || waitingForInfos;
    setIsLoading(calculatedIsLoading);
  }, [isLoadingLength, isLoadingIds, isLoadingInfos, positionLength, positionIds, posInfosData, isErrorIds, isErrorInfos]);

  useEffect(() => {
    // Use the specific error flags from the hooks
    const calculatedIsError = isErrorLength || isErrorIds || isErrorInfos;
    setIsError(calculatedIsError);
  }, [isErrorLength, isErrorIds, isErrorInfos]);
  
  // Reset state if user disconnects
  useEffect(() => {
    if (!walletAddress) {
      setPositionIds(undefined);
      setBalance(undefined);
      setIsLoading(false);
      setIsError(false);
    }
  }, [walletAddress]);

  return { balance, isLoading, isError };
} 