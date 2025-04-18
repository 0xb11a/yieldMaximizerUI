/**
 * Represents a lending reserve with its key parameters
 * Used for calculating interest rates and managing liquidity
 */
export interface Reserve {
  name: string;                    // Identifier for the reserve
  total_borrowed: number;          // Total amount borrowed from the reserve
  total_supplied: number;          // Total liquidity supplied to the reserve
  optimal_usage_ratio: number;     // Target utilization rate (0-1)
  variable_rate_slope1: number;    // Interest rate parameter for utilization below optimal
  variable_rate_slope2: number;    // Interest rate parameter for utilization above optimal
  token_price: number;             // Current price of the reserve's token
  fee_percentage: number;          // Fee charged on borrowing (0-1)
  base_variable_borrow_rate: number; // Minimum borrowing rate
}

/**
 * Represents a liquidity pool on a specific blockchain
 */
export interface Pool {
  name: string;     // Name of the pool
  daily_fee?: number; // Optional: Daily fee generated by the pool
  pool_distribution?: number; // Optional: Pool's distribution amount
  protocol_fee?: number; // Optional: Protocol fee percentage
  reward_per_day?: number; // Optional: Daily rewards distributed
  reward_token_price?: number; // Optional: Price of the reward token
}

/**
 * Structure for API request payload
 * Contains all necessary data for distribution calculation
 */
export interface ApiRequestBody {
  total_funds: number;  // Total amount to be distributed
  pools: Pool[];       // Available liquidity pools
  reserves: Reserve[]; // Available lending reserves
}

/**
 * API response detail item structure
 */
interface ApiResponseDetail {
  allocated_amount: number;
  expected_apy: number; // This seems to be the total APY
  expected_fee_apr?: number; // Keeping this as it might still be used elsewhere or returned sometimes
  expected_profit: number;
  expected_total_apr?: number; // Keeping this as it might still be used elsewhere or returned sometimes
  expected_reserve_apy?: number; // Added field
  expected_rewards_apy?: number; // Added field
  index: number;
  percentage: number;
  type: 'pool' | 'reserve';
}

/**
 * Raw API response structure
 */
interface RawApiResponse {
  details: ApiResponseDetail[];
  total_profit: number;
  // Removed specific pool/reserve supply fields (pool1_supply, etc.)
  // Remove index signature
  // [key: string]: any; 
}

/**
 * Processed API response for frontend use
 */
export interface ApiResponse {
  investments: Investment[];      // Individual allocations
  total_profit: number;          // Expected total profit
  total_expected_return: number; // Overall expected APY
  total_funds: number;           // Total amount distributed
}

/**
 * Represents a single investment allocation
 */
export interface Investment {
  name: string;           // Identifier of the pool or reserve
  allocation: number;     // Amount allocated
  expected_return: number; // Predicted TOTAL APY (from expected_apy)
  expectedProfit: number;  // Profit specific to this investment
  reserve_apy?: number;   // Optional: APY from reserve interest/fees
  rewards_apy?: number;   // Optional: APY from rewards
  type: 'pool' | 'reserve'; // Investment type
}

/**
 * Mock data for development and testing
 * Follows the same structure as actual API response
 */
export const DEMO_DATA: ApiResponse = {
  investments: [
    {
      name: "Pool-7ccd8a76",
      allocation: 35000,
      expected_return: 0.0546,
      expectedProfit: 35000 * 0.0546,
      type: "pool"
    },
    {
      name: "Pool-9876abcd",
      allocation: 25000,
      expected_return: 0.0482,
      expectedProfit: 25000 * 0.0482,
      type: "pool"
    },
    {
      name: "USDC Reserve",
      allocation: 28000,
      expected_return: 0.0418,
      expectedProfit: 28000 * 0.0418,
      type: "reserve"
    },
    {
      name: "ETH Reserve",
      allocation: 12000,
      expected_return: 0.0362,
      expectedProfit: 12000 * 0.0362,
      type: "reserve"
    }
  ],
  total_profit: 5423.4,
  total_expected_return: 0.05423,
  total_funds: 800000
};

/**
 * Generates the request body for the distribution API
 * @param reserves - Array of available lending reserves
 * @param totalFunds - Total amount to be distributed
 * @param pools - Array of available liquidity pools
 * @returns Formatted request body for API
 */
export function generateApiRequestBody(reserves: Reserve[], totalFunds: number, pools: Pool[]): ApiRequestBody {
  return {
    total_funds: totalFunds,
    pools: pools,
    reserves: reserves
  };
}

/**
 * Fetches optimal distribution from the API
 * @param requestBody - Formatted request data
 * @returns Promise resolving to distribution results
 * @throws Error if API request fails
 */
export async function fetchDistribution(requestBody: ApiRequestBody): Promise<ApiResponse> {
  try {
    console.log('Request body:', requestBody);

    // Ensure URL exists
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error('API URL is not configured');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/optimize-investments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error('API Response Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: RawApiResponse = await response.json();
    console.log('Server response:', data);

    // Transform API response to match our interface
    const transformedData: ApiResponse = {
      investments: data.details.map(item => {
        let name = `Unknown-${item.index}`; // Default name
        const poolCount = requestBody.pools.length;
        if (item.type === 'pool') {
          // API index is 1-based, array index is 0-based
          const poolIndex = item.index - 1;
          if (poolIndex >= 0 && poolIndex < poolCount && requestBody.pools[poolIndex]) {
            name = requestBody.pools[poolIndex].name;
          } else {
            name = `Pool-${item.index}`; // Fallback if index is invalid
          }
        } else {
          // API index is 1-based and continues after pools. Array index is 0-based.
          const reserveIndex = item.index - poolCount - 1; 
          if (reserveIndex >= 0 && reserveIndex < requestBody.reserves.length && requestBody.reserves[reserveIndex]) {
            name = requestBody.reserves[reserveIndex].name; 
          } else {
            name = `Reserve-${item.index}`; // Fallback if index is invalid
          }
        }

        return {
          name: name,
          allocation: item.allocated_amount,
          expected_return: item.expected_apy, // Total APY
          expectedProfit: item.expected_profit, // Map the profit
          reserve_apy: item.expected_reserve_apy, // APY from reserve
          rewards_apy: item.expected_rewards_apy, // APY from rewards
          type: item.type
        };
      }),
      total_profit: data.total_profit,
      total_expected_return: data.total_profit / requestBody.total_funds,
      total_funds: requestBody.total_funds
    };

    return transformedData;
  } catch (error) {
    console.error('Fetch error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch distribution: ${error.message}`);
    }
    throw new Error('Failed to fetch distribution');
  }
} 