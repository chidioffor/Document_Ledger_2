// src/utils/constants.ts
// rpc: 'https://mainnet.infura.io/v3/b664e89be59243f387fa848c6473cfb6',
// rpc: 'https://ethereum-rpc.publicnode.com',

export const CONTRACT_ADDRESS = '0x16AA9B509D1568BE832af8424b026B4B94183DeA';
export const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // correct USDT contract for Etherium Mainnet
export const USDT_DECIMALS = 6;

export const MASTER_WALLET = '0x75A10bd22634Ab072b609578Bfa0C9554D18E361';

export const FEE_USDT = 5; // $5 per certification

export const NETWORKS: Record<string, { name: string; chainId: number; rpc: string; explorer: string; color: string }> = {
  '1': {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpc: 'https://mainnet.infura.io/v3/b664e89be59243f387fa848c6473cfb6',
    explorer: 'https://etherscan.io',
    color: '#627EEA',
  },
  '11155111': {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpc: 'https://sepolia.infura.io/v3/b664e89be59243f387fa848c6473cfb6',
    explorer: 'https://sepolia.etherscan.io',
    color: '#5F7ADB',
  },
  '137': {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.infura.io/v3/b664e89be59243f387fa848c6473cfb6',
    explorer: 'https://polygonscan.com',
    color: '#8247E5',
  },
};

export const DEFAULT_NETWORK = '1';

export const CONTRACT_ABI = [
  'function certify(bytes32 docHash, string calldata title, string calldata ipfsCID, string calldata version, uint256 expiry) external',
  'function verify(bytes32 docHash) external view returns (tuple(bytes32 docHash, address certifier, uint256 timestamp, string title, string ipfsCID, string version, uint256 expiry, bool revoked))',
  'function exists(bytes32 docHash) external view returns (bool)',
  'function totalDocuments() external view returns (uint256)',
  'function listDocuments(uint256 offset, uint256 limit) external view returns (tuple(bytes32 docHash, address certifier, uint256 timestamp, string title, string ipfsCID, string version, uint256 expiry, bool revoked)[])',
  'function listByCertifier(address certifier, uint256 offset, uint256 limit) external view returns (tuple(bytes32 docHash, address certifier, uint256 timestamp, string title, string ipfsCID, string version, uint256 expiry, bool revoked)[])',
  'function revoke(bytes32 docHash) external',
];

export const WALLETCONNECT_PROJECT_ID = '22cc994d5c62cb2737db414dbeb06292'; // get free at cloud.walletconnect.com
