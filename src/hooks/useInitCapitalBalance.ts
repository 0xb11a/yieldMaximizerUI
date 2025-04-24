'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { Address, Abi } from 'viem';
import initLensAbiJson from '../config/abis/InitLens.json';
import posManagerAbiJson from '../config/abis/PosManager.json';
import { AssetConfig, SUPPORTED_ASSETS } from '../config/assets';

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
export function useInitCapitalBalance() {
  const { address: userAddress } = useAccount();
  const [positionIds, setPositionIds] = useState<bigint[] | undefined>(undefined);
  const [balance, setBalance] = useState<bigint | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  console.log('[InitCap Hook] User Address:', userAddress);

  // 1. Fetch position ID length
  const { data: posLengthData, isLoading: isLoadingLength, isError: isErrorLength, error: errorLength } = useReadContracts({
    contracts: [
      {
        address: POS_MANAGER_ADDRESS,
        abi: posManagerAbi,
        functionName: 'getViewerPosIdsLength',
        args: [userAddress!],
      },
    ],
    query: {
      enabled: !!userAddress, // Only run if userAddress is available
    },
  });

  const positionLength = posLengthData?.[0]?.result as bigint | undefined;
  console.log('[InitCap Hook] Position Length Result:', { positionLength, isLoadingLength, isErrorLength, errorLength });

  // 2. Prepare contracts to fetch all position IDs based on length
  const positionIdContracts = positionLength !== undefined && userAddress
    ? Array.from({ length: Number(positionLength) }, (_, i) => ({
        address: POS_MANAGER_ADDRESS,
        abi: posManagerAbi,
        functionName: 'getViewerPosIdsAt',
        args: [userAddress, BigInt(i)],
      }))
    : [];

  // 3. Fetch all position IDs
  const { data: posIdsData, isLoading: isLoadingIds, isError: isErrorIds, error: errorIds } = useReadContracts({
    contracts: positionIdContracts,
    query: {
        enabled: !!userAddress && positionLength !== undefined && positionLength > 0, // Only run if we have address and length > 0
    },
  });
  console.log('[InitCap Hook] Position IDs Result:', { data: posIdsData, isLoadingIds, isErrorIds, errorIds });

  // Update positionIds state when data arrives
  useEffect(() => {
      if (posIdsData) {
          const ids = posIdsData.map(item => item.result as bigint).filter(id => id !== undefined);
          console.log('[InitCap Hook] Setting Position IDs:', ids);
          setPositionIds(ids);
      }
  }, [posIdsData]);

  // 4. Fetch position info using InitLens for all collected IDs
  const { data: posInfosData, isLoading: isLoadingInfos, isError: isErrorInfos, error: errorInfos } = useReadContracts({
    contracts: [
      {
        address: INIT_LENS_ADDRESS,
        abi: initLensAbi,
        functionName: 'getInitPosInfos',
        args: [positionIds!], // Pass the array of IDs
      },
    ],
    query: {
      enabled: !!userAddress && positionIds !== undefined && positionIds.length > 0, // Only run if we have address and IDs
    },
  });
  console.log('[InitCap Hook] Position Infos Result:', { data: posInfosData, isLoadingInfos, isErrorInfos, errorInfos });

  // 5. Calculate total balance from position infos
  useEffect(() => {
    console.log('[InitCap Hook] Calculating Balance. PosInfos Data:', posInfosData, 'Position Length:', positionLength);
    if (posInfosData?.[0]?.result) {
      const positionInfos = posInfosData[0].result as any[]; 
      console.log('[InitCap Hook] Processing PositionInfos:', positionInfos);
      let totalCollateral = BigInt(0);
      
      positionInfos.forEach((posInfo, index) => {
          console.log(`[InitCap Hook] Processing posInfo[${index}]:`, posInfo);
          console.log(`[InitCap Hook] posInfo[${index}] collInfo.pools:`, posInfo?.collInfo?.pools);
          console.log(`[InitCap Hook] posInfo[${index}] collInfo.amts:`, posInfo?.collInfo?.amts);
          console.log(`[InitCap Hook] Target Collateral Address: ${TARGET_COLLATERAL_ADDRESS}`); 
          if (posInfo?.collInfo?.pools && posInfo?.collInfo?.amts) {
              // *** Use the corrected helper function ***
              const collateralAmountInPos = findCollateralAmount(posInfo.collInfo.pools, posInfo.collInfo.amts);
              console.log(`[InitCap Hook] Found Collateral amount in posInfo[${index}]:`, collateralAmountInPos);
              totalCollateral += collateralAmountInPos;
          } else {
              console.log(`[InitCap Hook] Skipping posInfo[${index}] due to missing collInfo/pools/amts.`);
          }
      });
      
      console.log('[InitCap Hook] Setting Balance:', totalCollateral);
      setBalance(totalCollateral); // Set the balance using the found collateral amount
      setIsError(false); 
    } else if (positionLength === BigInt(0) && !isLoadingLength && !isErrorLength) {
      console.log('[InitCap Hook] Setting Balance to 0 (No positions)');
      setBalance(BigInt(0));
      setPositionIds([]); 
      setIsError(false); 
    } else {
        console.log('[InitCap Hook] Waiting for PosInfos data or length confirmation...');
    }
  }, [posInfosData, positionLength, isLoadingLength, isErrorLength]);

  // 6. Determine overall loading and error states
  useEffect(() => {
    // Loading is true if any fetch is loading, OR if we are waiting for IDs based on a non-zero length
    const waitingForIds = positionLength !== undefined && positionLength > 0 && positionIds === undefined && !isErrorIds;
    const waitingForInfos = positionIds !== undefined && positionIds.length > 0 && posInfosData === undefined && !isErrorInfos;
    const calculatedIsLoading = isLoadingLength || isLoadingIds || isLoadingInfos || waitingForIds || waitingForInfos;
    console.log('[InitCap Hook] Setting isLoading:', calculatedIsLoading);
    setIsLoading(calculatedIsLoading);
  }, [isLoadingLength, isLoadingIds, isLoadingInfos, positionLength, positionIds, posInfosData, isErrorIds, isErrorInfos]);

  useEffect(() => {
    const calculatedIsError = isErrorLength || isErrorIds || isErrorInfos;
    // Also consider error if length > 0 but IDs/Infos are missing after loading finishes? (More complex)
    console.log('[InitCap Hook] Setting isError:', calculatedIsError);
    setIsError(calculatedIsError);
  }, [isErrorLength, isErrorIds, isErrorInfos]);
  
  // Reset state if user disconnects
  useEffect(() => {
    if (!userAddress) {
      console.log('[InitCap Hook] Resetting state due to user disconnect.');
      setPositionIds(undefined);
      setBalance(undefined);
      setIsLoading(false);
      setIsError(false);
    }
  }, [userAddress]);

  return { balance, isLoading, isError };
} 