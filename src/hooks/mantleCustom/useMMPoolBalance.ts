import { useState, useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { usePublicClient, useReadContracts } from 'wagmi';
import { TokenInfo } from '@/config/assets'; // Assuming TokenInfo is exported from assets
import { MANTLE_USDC } from '@/config/assets'; // Import specific token if needed for comparison

// ABI snippets needed for LBPair interaction
export const lbPairAbi = [
  { // ERC1155 balanceOf
    inputs: [ { internalType: 'address', name: 'account', type: 'address' }, { internalType: 'uint256', name: 'id', type: 'uint256' } ],
    name: 'balanceOf',
    outputs: [ { internalType: 'uint256', name: '', type: 'uint256' } ],
    stateMutability: 'view',
    type: 'function'
  },
  { // LBToken totalSupply
    inputs: [ { internalType: 'uint256', name: 'id', type: 'uint256' } ],
    name: 'totalSupply',
    outputs: [ { internalType: 'uint256', name: '', type: 'uint256' } ],
    stateMutability: 'view',
    type: 'function'
  },
  { // LBPair getBin
    inputs: [ { internalType: 'uint24', name: 'id', type: 'uint24' } ],
    name: 'getBin',
    outputs: [ { internalType: 'uint128', name: 'binReserveX', type: 'uint128' }, { internalType: 'uint128', name: 'binReserveY', type: 'uint128' } ],
    stateMutability: 'view',
    type: 'function'
  },
  { // ERC1155 balanceOfBatch
    inputs: [
      { internalType: 'address[]', name: 'accounts', type: 'address[]' },
      { internalType: 'uint256[]', name: 'ids', type: 'uint256[]' }
    ],
    name: 'balanceOfBatch',
    outputs: [ { internalType: 'uint256[]', name: '', type: 'uint256[]' } ],
    stateMutability: 'view',
    type: 'function'
  },
  { // LBPair getActiveId
    inputs: [],
    name: 'getActiveId',
    outputs: [ { internalType: 'uint24', name: 'activeId', type: 'uint24' } ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Helper to generate a range of token IDs
function generateTokenIdRange(centerId: bigint, rangeWidth: number): bigint[] {
  const ids: bigint[] = [];
  const halfRange = Math.floor(rangeWidth / 2);
  for (let i = -halfRange; i <= halfRange; i++) {
    try {
       const result = centerId + BigInt(i);
       ids.push(result);
    } catch (error) {
        console.error('Error during BigInt operation inside generateTokenIdRange:', error);
        console.error('    centerId:', centerId, typeof centerId);
        console.error('    i:', i, typeof i);
    }
  }
  return ids;
}

interface UseMMPoolBalanceResult {
  usdcBalanceRaw: bigint | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch the underlying USDC balance (raw BigInt) for a user's position
 * in a Merchant Moe LBPair contract across a range of bins.
 */
export function useMMPoolBalance(
    pairAddress: Address | undefined,
    tokenX: TokenInfo | undefined,
    tokenY: TokenInfo | undefined,
    addressToCheck: Address | undefined,
    rangeToCheck: number = 80
): UseMMPoolBalanceResult {
  const publicClient = usePublicClient();

  const [usdcBalanceRaw, setUsdcBalanceRaw] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // --- Step 1: Fetch Active ID ---
  const { data: activeIdData, error: activeIdError, isLoading: isLoadingActiveId, refetch: refetchActiveId } = useReadContracts({
      contracts: pairAddress ? [{
          address: pairAddress,
          abi: lbPairAbi,
          functionName: 'getActiveId',
      }] : [],
      query: {
          enabled: !!pairAddress && !!publicClient,
      }
  });
  const activeId = useMemo(() => activeIdData?.[0]?.result as bigint | undefined, [activeIdData]);

  // --- Step 2: Generate Token IDs and Prepare Batch Calls ---
  const tokenIdsToCheck = useMemo(() => {
    if (typeof activeId === 'undefined' || activeId === null) return [];
    const centerBigInt = typeof activeId === 'bigint' ? activeId : BigInt(activeId);
    return generateTokenIdRange(centerBigInt, rangeToCheck);
  }, [activeId, rangeToCheck]);

  const batchContracts = useMemo(() => {
    if (!pairAddress || !addressToCheck || tokenIdsToCheck.length === 0) return [];
    const ownersArray = Array(tokenIdsToCheck.length).fill(addressToCheck);
    const balanceOfBatchCall = {
        address: pairAddress,
        abi: lbPairAbi,
        functionName: 'balanceOfBatch',
        args: [ownersArray, tokenIdsToCheck],
    };
    return [balanceOfBatchCall];
  }, [pairAddress, addressToCheck, tokenIdsToCheck]);

  // --- Step 3: Fetch Batch Balances ---
  const { data: batchBalanceData, error: batchError, isLoading: isLoadingBatch, refetch: refetchBatchBalances } = useReadContracts({
      contracts: batchContracts,
      query: {
          enabled: !!pairAddress && !!addressToCheck && tokenIdsToCheck.length > 0 && !!publicClient,
      }
  });
  const userLpBalances = useMemo(() => batchBalanceData?.[0]?.result as bigint[] | undefined, [batchBalanceData]);

  // --- Step 4: Fetch totalSupply and getBin for relevant bins & Calculate ---
  useEffect(() => {
    const calculateBalances = async () => {
        if (!publicClient || !pairAddress || !tokenX || !tokenY || !userLpBalances || tokenIdsToCheck.length !== userLpBalances.length) {
            if (!isLoadingActiveId && !isLoadingBatch) {
                setUsdcBalanceRaw(null);
            }
            return;
        }

        setIsLoading(true);
        setError(null);

        let totalUserReserveX = BigInt(0);
        let totalUserReserveY = BigInt(0);
        const binsWithLiquidity = [];

        for (let i = 0; i < tokenIdsToCheck.length; i++) {
            const userLpBalance = BigInt(userLpBalances[i] ?? 0);
            if (userLpBalance > BigInt(0)) {
                binsWithLiquidity.push({ tokenId: tokenIdsToCheck[i], userLpBalance: userLpBalance });
            }
        }

        if (binsWithLiquidity.length === 0) {
            setUsdcBalanceRaw(BigInt(0));
            setIsLoading(false);
            return;
        }

        try {
            const detailContracts = binsWithLiquidity.flatMap(({ tokenId }) => [
                { address: pairAddress, abi: lbPairAbi, functionName: 'totalSupply', args: [tokenId], },
                { address: pairAddress, abi: lbPairAbi, functionName: 'getBin', args: [Number(tokenId)], },
            ]);

            const results = await publicClient.multicall({
                contracts: detailContracts,
                allowFailure: true,
                multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11'
            });

            for (let i = 0; i < binsWithLiquidity.length; i++) {
                const { tokenId, userLpBalance } = binsWithLiquidity[i];
                const totalSupplyResult = results[i * 2];
                const getBinResult = results[i * 2 + 1];

                if (totalSupplyResult.status === 'success' && getBinResult.status === 'success') {
                    const totalLpSupply = BigInt(totalSupplyResult.result ?? 0);
                    const binReservesResult = getBinResult.result as unknown as readonly [bigint, bigint] | undefined | null;
                    const binReserves = binReservesResult ? [BigInt(binReservesResult[0] ?? 0), BigInt(binReservesResult[1] ?? 0)] : undefined;

                    if (totalLpSupply > BigInt(0) && binReserves) {
                        const [reserveX, reserveY] = binReserves;
                        const userReserveXBin = (userLpBalance * reserveX) / totalLpSupply;
                        const userReserveYBin = (userLpBalance * reserveY) / totalLpSupply;

                        totalUserReserveX += userReserveXBin;
                        totalUserReserveY += userReserveYBin;
                    } else {
                        // Skip bin if total supply is 0 or reserves are invalid
                    }
                } else {
                    console.warn(`(useMMPoolBalance) Failed to fetch details for bin ${tokenId}:`, totalSupplyResult.error || getBinResult.error);
                }
            }

            let usdcTotalRawBigInt: bigint | null = null;
            const usdcAddress = MANTLE_USDC.address;

            if (tokenX.address.toLowerCase() === usdcAddress.toLowerCase()) {
                usdcTotalRawBigInt = totalUserReserveX;
            } else if (tokenY.address.toLowerCase() === usdcAddress.toLowerCase()) {
                usdcTotalRawBigInt = totalUserReserveY;
            } else {
                console.warn("(useMMPoolBalance) Neither tokenX nor tokenY match the expected USDC address.");
                setError(new Error("USDC token not found in pair definition"));
                setUsdcBalanceRaw(null);
                setIsLoading(false);
                return;
            }

            setUsdcBalanceRaw(usdcTotalRawBigInt);

        } catch (err: unknown) {
            console.error("(useMMPoolBalance) Error calculating underlying balances:", err);
            setError(err instanceof Error ? err : new Error('Failed to calculate balances'));
            setUsdcBalanceRaw(null);
        } finally {
            setIsLoading(false);
        }
    };

    calculateBalances();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, pairAddress, tokenX, tokenY, userLpBalances, tokenIdsToCheck, addressToCheck, isLoadingActiveId, isLoadingBatch]);

  // --- Handle Loading and Errors from initial fetches ---
  useEffect(() => {
      const initialLoading = isLoadingActiveId || (batchContracts.length > 0 && isLoadingBatch);
      if (initialLoading && usdcBalanceRaw === null && !error) {
          setIsLoading(true);
      }
  }, [isLoadingActiveId, isLoadingBatch, batchContracts.length, usdcBalanceRaw, error]);

  useEffect(() => {
      const fetchError = activeIdError || batchError;
      if (fetchError) {
          console.error("(useMMPoolBalance) Error fetching initial data:", fetchError);
          setError(fetchError instanceof Error ? fetchError : new Error('Failed to fetch initial pool data'));
          setUsdcBalanceRaw(null);
          setIsLoading(false);
      }
  }, [activeIdError, batchError]);

  // --- Refetch Logic ---
  const refetch = () => {
      // console.log("(useMMPoolBalance) Refetch triggered."); // Keep this one maybe?
      setError(null);
      setUsdcBalanceRaw(null);
      refetchActiveId();
      refetchBatchBalances();
  };

  return {
    usdcBalanceRaw,
    isLoading,
    error,
    refetch
  };
} 