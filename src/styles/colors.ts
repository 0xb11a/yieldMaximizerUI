// Pool colors (green shades)
export const POOL_COLORS = [
  '#059669', // darkest
  '#10B981',
  '#34D399',
  '#6EE7B7',
  '#A7F3D0',
  '#D1FAE5',
  '#ECFDF5',
  '#00C853',
  '#69F0AE',
  '#B9F6CA', // lightest
];

// Reserve colors (blue shades)
export const RESERVE_COLORS = [
  '#1E40AF', // darkest
  '#3B82F6',
  '#60A5FA',
  '#93C5FD',
  '#BFDBFE',
  '#2196F3',
  '#42A5F5',
  '#64B5F6',
  '#90CAF9',
  '#BBDEFB', // lightest
];

// Get color based on index and type
export function getInvestmentColor(type: 'pool' | 'reserve', index: number): string {
  const colors = type === 'pool' ? POOL_COLORS : RESERVE_COLORS;
  return colors[index % colors.length];
} 