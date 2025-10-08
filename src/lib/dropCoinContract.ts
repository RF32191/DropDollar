// Drop Coin Smart Contract Integration
// Connects your website to the real deployed Drop Coin contract

import Web3 from 'web3';

// Your deployed Drop Coin contract details
export const DROP_COIN_CONFIG = {
  contractAddress: '0xCF84a5f1c9E40f5FdF21DC42127A09A71cD3E56c',
  network: 'sepolia',
  rpcUrl: 'https://1rpc.io/sepolia',
  explorerUrl: 'https://sepolia.etherscan.io',
  abi: [
    {
      "inputs": [{"internalType": "uint256", "name": "_tokenAmount", "type": "uint256"}],
      "name": "calculatePurchaseCost",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCurrentPrice",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractStats",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "_tokenAmount", "type": "uint256"}],
      "name": "purchaseTokens",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

export interface DropCoinStats {
  holderCount: number;
  totalTransactions: number;
  currentPriceETH: number;
  currentPriceUSD: number;
  tokensAvailableForSale: number;
  contractETHBalance: number;
  marketCap: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  tokensReceived?: number;
  ethSpent?: number;
}

export class DropCoinContract {
  private web3: Web3;
  private contract: any;
  private ethPriceUSD: number = 4500; // Default ETH price, should be fetched from API

  constructor() {
    // Initialize Web3 with fallback for server-side rendering
    if (typeof window !== 'undefined' && window.ethereum) {
      this.web3 = new Web3(window.ethereum);
    } else {
      this.web3 = new Web3(DROP_COIN_CONFIG.rpcUrl);
    }
    
    this.contract = new this.web3.eth.Contract(DROP_COIN_CONFIG.abi as any, DROP_COIN_CONFIG.contractAddress);
    this.updateETHPrice();
  }

  // Get current ETH price in USD
  private async updateETHPrice(): Promise<void> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      this.ethPriceUSD = data.ethereum.usd;
    } catch (error) {
      console.warn('Failed to fetch ETH price, using default:', error);
      this.ethPriceUSD = 4500; // Fallback price
    }
  }

  // Get real-time contract statistics
  async getContractStats(): Promise<DropCoinStats> {
    try {
      const stats = await this.contract.methods.getContractStats().call();
      const [holderCount, totalTransactions, currentPriceWei, tokensForSale, ethBalance] = stats;

      const currentPriceETH = parseFloat(this.web3.utils.fromWei(currentPriceWei, 'ether'));
      const currentPriceUSD = currentPriceETH * this.ethPriceUSD;
      const tokensAvailable = parseFloat(this.web3.utils.fromWei(tokensForSale, 'ether'));
      const contractBalance = parseFloat(this.web3.utils.fromWei(ethBalance, 'ether'));

      return {
        holderCount: parseInt(holderCount),
        totalTransactions: parseInt(totalTransactions),
        currentPriceETH,
        currentPriceUSD,
        tokensAvailableForSale: tokensAvailable,
        contractETHBalance: contractBalance,
        marketCap: 110000000 * currentPriceUSD // 110M total supply
      };
    } catch (error) {
      console.error('Error fetching contract stats:', error);
      throw new Error('Failed to fetch contract statistics');
    }
  }

  // Calculate cost for purchasing tokens
  async calculatePurchaseCost(tokenAmount: number): Promise<{ ethCost: number; usdCost: number }> {
    try {
      const tokenAmountWei = this.web3.utils.toWei(tokenAmount.toString(), 'ether');
      const costWei = await this.contract.methods.calculatePurchaseCost(tokenAmountWei).call();
      
      const ethCost = parseFloat(this.web3.utils.fromWei(costWei, 'ether'));
      const usdCost = ethCost * this.ethPriceUSD;

      return { ethCost, usdCost };
    } catch (error) {
      console.error('Error calculating purchase cost:', error);
      throw new Error('Failed to calculate purchase cost');
    }
  }

  // Purchase tokens directly with ETH (requires MetaMask)
  async purchaseTokensWithETH(tokenAmount: number, userAddress: string): Promise<PurchaseResult> {
    try {
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: 'MetaMask is required for ETH payments. Please install MetaMask.'
        };
      }

      // Calculate cost
      const { ethCost } = await this.calculatePurchaseCost(tokenAmount);
      const tokenAmountWei = this.web3.utils.toWei(tokenAmount.toString(), 'ether');
      const ethCostWei = this.web3.utils.toWei(ethCost.toString(), 'ether');

      // Create transaction
      const transaction = {
        from: userAddress,
        to: DROP_COIN_CONFIG.contractAddress,
        value: ethCostWei,
        data: this.contract.methods.purchaseTokens(tokenAmountWei).encodeABI()
      };

      // Send transaction via MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction]
      });

      return {
        success: true,
        transactionHash: txHash,
        tokensReceived: tokenAmount,
        ethSpent: ethCost
      };
    } catch (error: any) {
      console.error('Error purchasing tokens:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  // Get user's DROP token balance
  async getUserBalance(userAddress: string): Promise<number> {
    try {
      const balanceWei = await this.contract.methods.balanceOf(userAddress).call();
      return parseFloat(this.web3.utils.fromWei(balanceWei, 'ether'));
    } catch (error) {
      console.error('Error fetching user balance:', error);
      return 0;
    }
  }

  // Check if user has MetaMask and is connected
  async checkMetaMaskConnection(): Promise<{ connected: boolean; address?: string; network?: string }> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return { connected: false };
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        return { connected: false };
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networkName = chainId === '0xaa36a7' ? 'sepolia' : 'unknown';

      return {
        connected: true,
        address: accounts[0],
        network: networkName
      };
    } catch (error) {
      console.error('Error checking MetaMask connection:', error);
      return { connected: false };
    }
  }

  // Connect to MetaMask
  async connectMetaMask(): Promise<{ success: boolean; address?: string; error?: string }> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: 'MetaMask is not installed. Please install MetaMask to use ETH payments.'
        };
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Switch to Sepolia network if needed
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }] // Sepolia testnet
        });
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://1rpc.io/sepolia'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        }
      }

      return {
        success: true,
        address: accounts[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to MetaMask'
      };
    }
  }

  // Add DROP token to MetaMask
  async addTokenToMetaMask(): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: 'MetaMask is not available'
        };
      }

      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: DROP_COIN_CONFIG.contractAddress,
            symbol: 'DROP',
            decimals: 18,
            image: 'https://your-website.com/DropCoin.png' // Update with your logo URL
          }
        }
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add token to MetaMask'
      };
    }
  }

  // Get contract explorer URL
  getExplorerUrl(): string {
    return `${DROP_COIN_CONFIG.explorerUrl}/address/${DROP_COIN_CONFIG.contractAddress}`;
  }

  // Get transaction explorer URL
  getTransactionUrl(txHash: string): string {
    return `${DROP_COIN_CONFIG.explorerUrl}/tx/${txHash}`;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Export singleton instance with lazy initialization
let _dropCoinContract: DropCoinContract | null = null;

export const getDropCoinContract = (): DropCoinContract => {
  if (!_dropCoinContract) {
    _dropCoinContract = new DropCoinContract();
  }
  return _dropCoinContract;
};

// For backward compatibility
export const dropCoinContract = {
  getContractStats: () => getDropCoinContract().getContractStats(),
  calculatePurchaseCost: (amount: number) => getDropCoinContract().calculatePurchaseCost(amount),
  purchaseTokensWithETH: (amount: number, address: string) => getDropCoinContract().purchaseTokensWithETH(amount, address),
  getUserBalance: (address: string) => getDropCoinContract().getUserBalance(address),
  checkMetaMaskConnection: () => getDropCoinContract().checkMetaMaskConnection(),
  connectMetaMask: () => getDropCoinContract().connectMetaMask(),
  addTokenToMetaMask: () => getDropCoinContract().addTokenToMetaMask(),
  getExplorerUrl: () => getDropCoinContract().getExplorerUrl(),
  getTransactionUrl: (txHash: string) => getDropCoinContract().getTransactionUrl(txHash)
};
