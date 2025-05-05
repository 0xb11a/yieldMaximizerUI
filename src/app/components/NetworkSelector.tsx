import React from 'react';
import { NetworkFilter } from '@/config/assets';

interface NetworkSelectorProps {
  selectedNetwork: NetworkFilter;
  onNetworkChange: (network: NetworkFilter) => void;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({ selectedNetwork, onNetworkChange }) => {
  const networks: NetworkFilter[] = ['all', 'mantle', 'sonic'];

  const getButtonClass = (network: NetworkFilter) => {
    const baseClass = 'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none';
    const activeClass = 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-md';
    const inactiveClass = 'bg-[#1F2937] text-[#9CA3AF] hover:bg-[#374151] hover:text-white';
    return `${baseClass} ${selectedNetwork === network ? activeClass : inactiveClass}`;
  };

  return (
    <div className="flex space-x-2 p-1 bg-[#0d1117] rounded-lg shadow-sm">
      {networks.map((network) => (
        <button
          key={network}
          onClick={() => onNetworkChange(network)}
          className={getButtonClass(network)}
        >
          {network.charAt(0).toUpperCase() + network.slice(1)} {/* Capitalize */} 
        </button>
      ))}
    </div>
  );
};

export default NetworkSelector; 