// DROP Coin Wallet Integration
// Connects existing wallet system with real DROP coin contract

import { dropCoinContract } from './dropCoinContract';
import { blockchainManager } from './blockchain';
import Web3 from 'web3';

export interface WalletTransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface WalletBalance {
  websiteBalance: number;  // Tokens held in website wallet
  blockchainBalance: number; // Tokens held on actual blockchain
  totalBalance: number;
}

export class DropCoinWalletIntegration {
  private web3: Web3;

  constructor() {
    this.web3 = new Web3('https://1rpc.io/sepolia');
  }

  // Get comprehensive balance for a user
  async getUserDropBalance(userId: string, walletAddress: string): Promise<WalletBalance> {
    try {
      // Get website wallet balance (from your existing system)
      const websiteBalance = await this.getWebsiteWalletBalance(userId);
      
      // Get real blockchain balance
      const blockchainBalance = await dropCoinContract.getUserBalance(walletAddress);
      
      return {
        websiteBalance,
        blockchainBalance,
        totalBalance: websiteBalance + blockchainBalance
      };
    } catch (error) {
      console.error('Error getting DROP balance:', error);
      return {
        websiteBalance: 0,
        blockchainBalance: 0,
        totalBalance: 0
      };
    }
  }

  // Transfer tokens from website wallet to user's MetaMask
  async transferToMetaMask(
    userId: string, 
    userWalletAddress: string, 
    amount: number,
    userPassword: string
  ): Promise<WalletTransferResult> {
    try {
      // Validate amount
      const websiteBalance = await this.getWebsiteWalletBalance(userId);
      if (amount > websiteBalance) {
        return {
          success: false,
          error: 'Insufficient balance in website wallet'
        };
      }

      // Get user's website wallet private key (securely)
      const websiteWallet = await this.getUserWebsiteWallet(userId, userPassword);
      if (!websiteWallet) {
        return {
          success: false,
          error: 'Could not access website wallet'
        };
      }

      // Transfer tokens on blockchain from website wallet to user's MetaMask
      const transferResult = await this.executeBlockchainTransfer(
        websiteWallet.address,
        userWalletAddress,
        amount,
        websiteWallet.privateKey
      );

      if (transferResult.success) {
        // Update website wallet balance
        await this.updateWebsiteWalletBalance(userId, -amount);
        
        return {
          success: true,
          transactionHash: transferResult.transactionHash
        };
      } else {
        return transferResult;
      }
    } catch (error) {
      console.error('Transfer to MetaMask failed:', error);
      return {
        success: false,
        error: 'Transfer failed. Please try again.'
      };
    }
  }

  // Transfer tokens from MetaMask to website wallet
  async transferFromMetaMask(
    userWalletAddress: string,
    websiteWalletAddress: string,
    amount: number
  ): Promise<WalletTransferResult> {
    try {
      // This requires user to approve transaction in MetaMask
      // The frontend will handle the MetaMask interaction
      
      // Check if user has enough balance
      const balance = await dropCoinContract.getUserBalance(userWalletAddress);
      if (amount > balance) {
        return {
          success: false,
          error: 'Insufficient balance in MetaMask wallet'
        };
      }

      // Return instructions for frontend to handle MetaMask transfer
      return {
        success: true,
        error: 'Please approve the transaction in MetaMask'
      };
    } catch (error) {
      console.error('Transfer from MetaMask preparation failed:', error);
      return {
        success: false,
        error: 'Transfer preparation failed'
      };
    }
  }

  // Execute actual blockchain transfer
  private async executeBlockchainTransfer(
    fromAddress: string,
    toAddress: string,
    amount: number,
    privateKey: string
  ): Promise<WalletTransferResult> {
    try {
      // Create account from private key
      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      
      // Get contract instance
      const contractABI = [
        {
          "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_amount", "type": "uint256"}
          ],
          "name": "transfer",
          "outputs": [{"name": "", "type": "bool"}],
          "type": "function"
        }
      ];
      
      const contract = new this.web3.eth.Contract(
        contractABI as any,
        '0xCF84a5f1c9E40f5FdF21DC42127A09A71cD3E56c'
      );

      // Prepare transfer transaction
      const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');
      const transferData = contract.methods.transfer(toAddress, amountWei).encodeABI();

      // Get gas estimate
      const gasEstimate = await this.web3.eth.estimateGas({
        from: fromAddress,
        to: '0xCF84a5f1c9E40f5FdF21DC42127A09A71cD3E56c',
        data: transferData
      });

      // Build transaction
      const transaction = {
        from: fromAddress,
        to: '0xCF84a5f1c9E40f5FdF21DC42127A09A71cD3E56c',
        data: transferData,
        gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
        gasPrice: await this.web3.eth.getGasPrice(),
        nonce: await this.web3.eth.getTransactionCount(fromAddress)
      };

      // Sign and send transaction
      const signedTx = await account.signTransaction(transaction);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Blockchain transfer failed:', error);
      return {
        success: false,
        error: 'Blockchain transaction failed'
      };
    }
  }

  // Get website wallet balance (integrate with your existing system)
  private async getWebsiteWalletBalance(userId: string): Promise<number> {
    try {
      // TODO: Integrate with your existing wallet service
      // This should query your database for the user's website wallet balance
      console.log('Getting website wallet balance for user:', userId);
      
      // For now, return mock data - replace with actual database query
      return 0;
    } catch (error) {
      console.error('Error getting website wallet balance:', error);
      return 0;
    }
  }

  // Get user's website wallet info
  private async getUserWebsiteWallet(userId: string, password: string): Promise<{address: string, privateKey: string} | null> {
    try {
      // TODO: Integrate with your existing wallet service
      // This should decrypt and return the user's website wallet
      console.log('Getting website wallet for user:', userId);
      
      // For now, return null - replace with actual wallet retrieval
      return null;
    } catch (error) {
      console.error('Error getting website wallet:', error);
      return null;
    }
  }

  // Update website wallet balance
  private async updateWebsiteWalletBalance(userId: string, balanceChange: number): Promise<void> {
    try {
      // TODO: Integrate with your existing wallet service
      // This should update the user's website wallet balance in your database
      console.log('Updating website wallet balance:', userId, balanceChange);
    } catch (error) {
      console.error('Error updating website wallet balance:', error);
    }
  }

  // Credit tokens to website wallet (after successful payment)
  async creditWebsiteWallet(userId: string, amount: number, paymentReference: string): Promise<boolean> {
    try {
      // TODO: Integrate with your existing wallet service
      // This should add tokens to the user's website wallet balance
      console.log('Crediting website wallet:', userId, amount, paymentReference);
      
      // Update balance in database
      await this.updateWebsiteWalletBalance(userId, amount);
      
      // Log transaction
      await this.logWalletTransaction(userId, 'credit', amount, paymentReference);
      
      return true;
    } catch (error) {
      console.error('Error crediting website wallet:', error);
      return false;
    }
  }

  // Log wallet transaction
  private async logWalletTransaction(
    userId: string, 
    type: 'credit' | 'debit' | 'transfer', 
    amount: number, 
    reference: string
  ): Promise<void> {
    try {
      // TODO: Integrate with your existing transaction logging system
      console.log('Logging wallet transaction:', {
        userId,
        type,
        amount,
        reference,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging wallet transaction:', error);
    }
  }
}

export const dropCoinWalletIntegration = new DropCoinWalletIntegration();
