import { Pool, Reserve } from './apiConfig';

export const SAMPLE_POOLS: Pool[] = [
  {
    address: "0x7ccd8a769d466340fff36c6e10ffa8cf9077d988",
    chain: "mantle"
  },
  {
    address: "0xe50019c79cbd7c49cffa7c3f8080ea238de75962",
    chain: "mantle"
  }
];

export const SAMPLE_RESERVES: Reserve[] = [
  {
    name: "USDC Reserve",
    total_borrowed: 179954,
    total_supplied: 370406,
    optimal_usage_ratio: 0.85,
    variable_rate_slope1: 0.08,
    variable_rate_slope2: 0.8,
    token_price: 1,
    fee_percentage: 0.08,
    base_variable_borrow_rate: 0.03
  },
  {
    name: "ETH Reserve",
    total_borrowed: 522821,
    total_supplied: 1792518,
    optimal_usage_ratio: 0.75,
    variable_rate_slope1: 0.11,
    variable_rate_slope2: 0.7,
    token_price: 1,
    fee_percentage: 0.05,
    base_variable_borrow_rate: 0.02
  }
]; 