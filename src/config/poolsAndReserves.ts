import { Pool, Reserve } from './apiConfig';

export const SAMPLE_POOLS: Pool[] = [
  {
    name: "USDC/USDT_MM",
    daily_fee: 41.64,
    pool_distribution: 473625,
    protocol_fee: 0,
    reward_per_day: 5127,
    reward_token_price: 0.02535
  }
];

export const SAMPLE_RESERVES: Reserve[] = [
  {
    name: "USDC Reserve Lendle",
    total_borrowed: 171898,
    total_supplied: 548269,
    optimal_usage_ratio: 0.85,
    variable_rate_slope1: 0.08,
    variable_rate_slope2: 0.8,
    token_price: 1,
    fee_percentage: 0.08,
    base_variable_borrow_rate: 0
  },
  {
    name: "USDT Reserve Lendle",
    total_borrowed: 303980,
    total_supplied: 1145332,
    optimal_usage_ratio: 0.85,
    variable_rate_slope1: 0.08,
    variable_rate_slope2: 0.8,
    token_price: 1,
    fee_percentage: 0.08,
    base_variable_borrow_rate: 0
  }
]; 