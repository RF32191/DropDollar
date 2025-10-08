#!/usr/bin/env python3
"""
Simple Drop Coin Deployment Script
"""

import json
import os
from web3 import Web3
from solcx import compile_source, install_solc, set_solc_version
from price_oracle import get_one_dollar_in_eth

def main():
    print("🪙 Simple Drop Coin Deployment")
    print("=" * 40)
    
    # Install and set Solidity version
    print("🔧 Setting up Solidity compiler...")
    install_solc('0.8.20')
    set_solc_version('0.8.20')
    
    # Connect to Sepolia
    print("🌐 Connecting to Sepolia...")
    w3 = Web3(Web3.HTTPProvider('https://1rpc.io/sepolia'))
    
    if not w3.is_connected():
        print("❌ Failed to connect to Sepolia")
        return
    
    print("✅ Connected to Sepolia")
    
    # Get private key
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ Please set PRIVATE_KEY environment variable")
        return
    
    # Setup account
    account = w3.eth.account.from_key(private_key)
    print(f"📍 Deployer: {account.address}")
    
    # Check balance
    balance = w3.eth.get_balance(account.address)
    balance_eth = w3.from_wei(balance, 'ether')
    print(f"💰 Balance: {balance_eth:.4f} ETH")
    
    if balance_eth < 0.01:
        print("⚠️ Low balance - need more test ETH")
        return
    
    # Get ETH price for $1 USD
    print("🔮 Getting ETH price...")
    base_price_eth = get_one_dollar_in_eth()
    if not base_price_eth:
        print("❌ Failed to get ETH price")
        return
    
    base_price_wei = w3.to_wei(base_price_eth, 'ether')
    print(f"💵 $1 USD = {base_price_eth:.6f} ETH")
    
    # Read and compile contract
    print("🔨 Compiling contract...")
    
    # Simple ERC-20 contract source
    contract_source = '''
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DropCoin {
    string public name = "Drop Coin";
    string public symbol = "DROP";
    uint8 public decimals = 18;
    uint256 public totalSupply = 110000000 * 10**18; // 110 million tokens
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    uint256 public basePrice;
    uint256 public holderCount;
    uint256 public totalTransactions;
    
    mapping(address => bool) public isHolder;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 ethPaid, uint256 currentPrice);
    
    constructor(uint256 _basePrice) {
        owner = msg.sender;
        basePrice = _basePrice;
        
        // Mint 10M to owner, 100M to contract for sale
        balanceOf[owner] = 10000000 * 10**18;
        balanceOf[address(this)] = 100000000 * 10**18;
        
        isHolder[owner] = true;
        holderCount = 1;
        
        emit Transfer(address(0), owner, 10000000 * 10**18);
        emit Transfer(address(0), address(this), 100000000 * 10**18);
    }
    
    function getCurrentPrice() public view returns (uint256) {
        // Price increases by 0.1% per holder and 0.01% per transaction
        uint256 multiplier = 1000000 + (holderCount * 1000) + (totalTransactions * 100);
        return (basePrice * multiplier) / 1000000;
    }
    
    function calculatePurchaseCost(uint256 _tokenAmount) public view returns (uint256) {
        return (_tokenAmount * getCurrentPrice()) / 10**18;
    }
    
    function purchaseTokens(uint256 _tokenAmount) public payable {
        require(_tokenAmount > 0, "Amount must be greater than zero");
        require(balanceOf[address(this)] >= _tokenAmount, "Not enough tokens available");
        
        uint256 cost = calculatePurchaseCost(_tokenAmount);
        require(msg.value >= cost, "Insufficient ETH sent");
        
        // Transfer tokens
        balanceOf[address(this)] -= _tokenAmount;
        balanceOf[msg.sender] += _tokenAmount;
        
        // Refund excess ETH
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
        
        // Update holder status
        if (!isHolder[msg.sender]) {
            isHolder[msg.sender] = true;
            holderCount++;
        }
        totalTransactions++;
        
        emit Transfer(address(this), msg.sender, _tokenAmount);
        emit TokensPurchased(msg.sender, _tokenAmount, cost, getCurrentPrice());
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        if (!isHolder[to] && amount > 0) {
            isHolder[to] = true;
            holderCount++;
        }
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        if (!isHolder[to] && amount > 0) {
            isHolder[to] = true;
            holderCount++;
        }
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function getContractStats() public view returns (uint256, uint256, uint256, uint256, uint256) {
        return (
            holderCount,
            totalTransactions,
            getCurrentPrice(),
            balanceOf[address(this)], // Tokens available for sale
            address(this).balance // ETH balance
        );
    }
    
    // Owner can withdraw ETH from sales
    function withdrawETH() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
'''
    
    try:
        compiled_sol = compile_source(contract_source)
        contract_interface = compiled_sol['<stdin>:DropCoin']
        print("✅ Contract compiled successfully")
    except Exception as e:
        print(f"❌ Compilation failed: {e}")
        return
    
    # Deploy contract
    print("🚀 Deploying contract...")
    
    contract = w3.eth.contract(
        abi=contract_interface['abi'],
        bytecode=contract_interface['bin']
    )
    
    # Estimate gas
    gas_estimate = contract.constructor(base_price_wei).estimate_gas()
    gas_price = w3.eth.gas_price
    
    print(f"⛽ Gas estimate: {gas_estimate:,}")
    print(f"💸 Gas price: {w3.from_wei(gas_price, 'gwei'):.2f} Gwei")
    
    cost_eth = w3.from_wei(gas_estimate * gas_price, 'ether')
    print(f"💰 Estimated cost: {cost_eth:.6f} ETH")
    
    # Confirm deployment
    response = input(f"Deploy Drop Coin for ~{cost_eth:.6f} ETH? (y/N): ")
    if response.lower() != 'y':
        print("❌ Deployment cancelled")
        return
    
    # Build transaction
    transaction = contract.constructor(base_price_wei).build_transaction({
        'chainId': 11155111,  # Sepolia
        'gas': int(gas_estimate * 1.2),  # Add 20% buffer
        'gasPrice': gas_price,
        'nonce': w3.eth.get_transaction_count(account.address),
    })
    
    # Sign and send
    signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    
    print(f"📝 Transaction hash: {tx_hash.hex()}")
    print("⏳ Waiting for confirmation...")
    
    # Wait for receipt
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
    
    if tx_receipt.status == 1:
        print("✅ Contract deployed successfully!")
        print(f"📍 Contract address: {tx_receipt.contractAddress}")
        
        # Verify contract has code
        code = w3.eth.get_code(tx_receipt.contractAddress)
        print(f"🔍 Contract code length: {len(code)} bytes")
        
        if len(code) > 0:
            print("✅ Contract verification successful!")
            
            # Test contract functions
            deployed_contract = w3.eth.contract(
                address=tx_receipt.contractAddress,
                abi=contract_interface['abi']
            )
            
            try:
                name = deployed_contract.functions.name().call()
                symbol = deployed_contract.functions.symbol().call()
                total_supply = deployed_contract.functions.totalSupply().call()
                owner_balance = deployed_contract.functions.balanceOf(account.address).call()
                
                print(f"📊 Contract Info:")
                print(f"   Name: {name}")
                print(f"   Symbol: {symbol}")
                print(f"   Total Supply: {total_supply / 10**18:,.0f} {symbol}")
                print(f"   Your Balance: {owner_balance / 10**18:,.0f} {symbol}")
                
                # Save deployment info
                deployment_info = {
                    "network": "sepolia",
                    "contract_address": tx_receipt.contractAddress,
                    "transaction_hash": tx_hash.hex(),
                    "deployer_address": account.address,
                    "base_price_wei": str(base_price_wei),
                    "base_price_eth": str(base_price_eth),
                    "abi": contract_interface['abi']
                }
                
                with open('dropcoin_deployment_sepolia.json', 'w') as f:
                    json.dump(deployment_info, f, indent=2)
                
                print("💾 Deployment info saved")
                print()
                print("🎉 DROP COIN SUCCESSFULLY DEPLOYED!")
                print(f"📍 Contract: {tx_receipt.contractAddress}")
                print(f"🌐 View on Etherscan: https://sepolia.etherscan.io/address/{tx_receipt.contractAddress}")
                
            except Exception as e:
                print(f"⚠️ Contract deployed but verification failed: {e}")
        else:
            print("❌ Contract deployed but has no code!")
    else:
        print("❌ Contract deployment failed!")

if __name__ == "__main__":
    main()


