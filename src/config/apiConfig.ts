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
  address: string;  // Contract address of the pool
  chain: string;    // Blockchain network identifier
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
 * Represents a single investment allocation
 */
export interface Investment {
  name: string;           // Identifier of the pool or reserve
  allocation: number;     // Amount allocated
  expected_return: number; // Predicted APY
  type: 'pool' | 'reserve'; // Investment type
}

/**
 * Structure for API response
 * Contains calculated distribution and expected returns
 */
export interface ApiResponse {
  investments: Investment[];      // Individual allocations
  total_profit: number;          // Expected total profit
  total_expected_return: number; // Overall expected APY
  total_funds: number;           // Total amount distributed
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
      type: "pool"
    },
    {
      name: "Pool-9876abcd",
      allocation: 25000,
      expected_return: 0.0482,
      type: "pool"
    },
    {
      name: "USDC Reserve",
      allocation: 28000,
      expected_return: 0.0418,
      type: "reserve"
    },
    {
      name: "ETH Reserve",
      allocation: 12000,
      expected_return: 0.0362,
      type: "reserve"
    }
  ],
  total_profit: 5423.4,
  total_expected_return: 0.05423,
  total_funds: 100000
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
  console.log('Request body:', requestBody);

  const response = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    console.error('Response error:', response.status, response.statusText);
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Server response:', data);
  return data;
} 