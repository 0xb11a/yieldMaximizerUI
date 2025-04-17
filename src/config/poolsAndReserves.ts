import { Pool, Reserve } from './apiConfig';

export const TOTAL_FUNDS = 1000000;

export const SAMPLE_POOLS: Pool[] = [
  {
    name: "USDC/USDT pool",
    address: "0x48c1a89af1102cad358549e9bb16ae5f96cddfec",
    chain: "mantle"
  },
  {
    name: "USDe/USDT pool",
    address: "0x7ccd8a769d466340fff36c6e10ffa8cf9077d988",
    chain: "mantle"
  }
];

export const SAMPLE_RESERVES: Reserve[] = [
  {
    name: "USDC Reserve",
    total_borrowed: 168180,
    total_supplied: 598650,
    optimal_usage_ratio: 0.85,
    variable_rate_slope1: 0.08,
    variable_rate_slope2: 0.8,
    token_price: 1,
    fee_percentage: 0.08,
    base_variable_borrow_rate: 0.03
  },
  {
    name: "USDT Reserve",
    total_borrowed: 245690,
    total_supplied: 664390,
    optimal_usage_ratio: 0.85,
    variable_rate_slope1: 0.08,
    variable_rate_slope2: 0.8,
    token_price: 1,
    fee_percentage: 0.08,
    base_variable_borrow_rate: 0.02
  }
]; 