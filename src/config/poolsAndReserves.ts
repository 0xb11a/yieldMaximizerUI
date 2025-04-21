export interface PoolAddress {
  type: 'pool';
  address: string;
}

export interface ReserveAddress {
  type: 'reserve';
  address: string;
  source: string;
}

export const RESERVE_ADDRESSES: ReserveAddress[] = [
    {
    type: "reserve",
    address: "0x00000000efe302beaa2b3e6e1b18d08d69a9012a",
    source: "lendle"
  },
  {
    type: "reserve",
    address: "0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9",
    source: "lendle"
  }
];

export const POOL_ADDRESSES: PoolAddress[] = [
    {
        type: "pool",
        address: "0x48c1a89af1102cad358549e9bb16ae5f96cddfec"
    }
];
