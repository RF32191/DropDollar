#!/usr/bin/env python3
"""
Drop Coin Deployment Script
Deploys the Drop Coin smart contract to Ethereum blockchain for the DollarDrop website
"""

import json
import os
import sys
from web3 import Web3
from solcx import compile_source, install_solc
import time
from price_oracle import get_one_dollar_in_eth

class DropCoinDeployer:
    def __init__(self, network="mainnet"):
        """
        Initialize the deployer
        
        Args:
            network (str): Network to deploy to ("mainnet", "goerli", "sepolia", "polygon")
        """
        self.network = network
        self.w3 = None
        self.contract_source = None
        self.compiled_contract = None
        self.contract_interface = None
        
        # Network configurations
        self.networks = {
            "mainnet": {
                "rpc_url": "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
                "rpc_url_public": "https://eth.llamarpc.com",
                "chain_id": 1,
                "gas_price_gwei": 20
            },
            "goerli": {
                "rpc_url": "https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID",
                "rpc_url_public": "https://rpc.ankr.com/eth_goerli",
                "chain_id": 5,
                "gas_price_gwei": 10
            },
            "sepolia": {
                "rpc_url": "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID",
                "rpc_url_public": "https://1rpc.io/sepolia",
                "chain_id": 11155111,
                "gas_price_gwei": 10
            },
            "polygon": {
                "rpc_url": "https://polygon-rpc.com/",
                "rpc_url_public": "https://polygon-rpc.com/",
                "chain_id": 137,
                "gas_price_gwei": 30
            },
            "mumbai": {
                "rpc_url": "https://rpc-mumbai.maticvigil.com/",
                "rpc_url_public": "https://rpc-mumbai.maticvigil.com/",
                "chain_id": 80001,
                "gas_price_gwei": 1
            }
        }
    
    def setup_connection(self, private_key, infura_project_id=None):
        """
        Setup Web3 connection
        
        Args:
            private_key (str): Private key of the deployer account
            infura_project_id (str): Infura project ID (optional for some networks)
        """
        network_config = self.networks[self.network]
        
        # Replace placeholder with actual Infura project ID or use public RPC
        rpc_url = network_config["rpc_url"]
        if infura_project_id and "YOUR_INFURA_PROJECT_ID" in rpc_url:
            rpc_url = rpc_url.replace("YOUR_INFURA_PROJECT_ID", infura_project_id)
        elif "YOUR_INFURA_PROJECT_ID" in rpc_url:
            # Use public RPC if no Infura project ID
            rpc_url = network_config["rpc_url_public"]
            print(f"🌐 Using public RPC: {rpc_url}")
        
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not self.w3.is_connected():
            raise Exception(f"Failed to connect to {self.network} network")
        
        # Setup account
        self.account = self.w3.eth.account.from_key(private_key)
        self.w3.eth.default_account = self.account.address
        
        print(f"✅ Connected to {self.network}")
        print(f"📍 Deployer address: {self.account.address}")
        
        # Check balance
        balance = self.w3.eth.get_balance(self.account.address)
        balance_eth = self.w3.from_wei(balance, 'ether')
        print(f"💰 Balance: {balance_eth:.4f} ETH")
        
        if balance_eth < 0.01:
            print("⚠️  Warning: Low balance. Make sure you have enough ETH for deployment.")
    
    def compile_contract(self):
        """
        Compile the Drop Coin smart contract
        """
        print("🔨 Compiling Drop Coin contract...")
        
        # Install Solidity compiler if needed
        try:
            from solcx import set_solc_version
            install_solc('0.8.20')
            set_solc_version('0.8.20')
        except Exception as e:
            print(f"Solc installation error: {e}")
            try:
                # Try installing latest version
                install_solc('0.8.30')
                set_solc_version('0.8.30')
            except Exception as e2:
                print(f"Failed to install Solc: {e2}")
                raise
        
        # Read the contract source
        with open('DropCoin.sol', 'r') as file:
            self.contract_source = file.read()
        
        # Compile the contract
        self.compiled_contract = compile_source(
            self.contract_source,
            output_values=['abi', 'bin']
        )
        
        # Get contract interface
        contract_id, self.contract_interface = self.compiled_contract.popitem()
        print("✅ Contract compiled successfully")
    
    def estimate_gas_and_cost(self, base_price_wei):
        """
        Estimate deployment gas and cost
        
        Args:
            base_price_wei (int): Base price for Drop Coin in wei
        """
        print("⛽ Estimating gas costs...")
        
        # Create contract instance for gas estimation
        contract = self.w3.eth.contract(
            abi=self.contract_interface['abi'],
            bytecode=self.contract_interface['bin']
        )
        
        # Estimate gas
        gas_estimate = contract.constructor(base_price_wei).estimate_gas()
        
        # Get current gas price
        gas_price = self.w3.eth.gas_price
        network_config = self.networks[self.network]
        
        # Use network-specific gas price if higher
        min_gas_price = self.w3.to_wei(network_config["gas_price_gwei"], 'gwei')
        gas_price = max(gas_price, min_gas_price)
        
        # Calculate cost
        deployment_cost = gas_estimate * gas_price
        deployment_cost_eth = self.w3.from_wei(deployment_cost, 'ether')
        
        print(f"📊 Gas estimate: {gas_estimate:,}")
        print(f"💸 Gas price: {self.w3.from_wei(gas_price, 'gwei'):.2f} Gwei")
        print(f"💰 Estimated cost: {deployment_cost_eth:.6f} ETH")
        
        return gas_estimate, gas_price, deployment_cost_eth
    
    def deploy_contract(self, base_price_wei, gas_limit=None, gas_price=None):
        """
        Deploy the Drop Coin contract
        
        Args:
            base_price_wei (int): Base price for Drop Coin in wei (e.g., 1000000000000000 for 0.001 ETH)
            gas_limit (int): Gas limit for deployment (optional)
            gas_price (int): Gas price in wei (optional)
        """
        print("🚀 Deploying Drop Coin contract...")
        
        # Create contract instance
        contract = self.w3.eth.contract(
            abi=self.contract_interface['abi'],
            bytecode=self.contract_interface['bin']
        )
        
        # Get gas parameters
        if not gas_limit or not gas_price:
            estimated_gas, estimated_price, _ = self.estimate_gas_and_cost(base_price_wei)
            gas_limit = gas_limit or int(estimated_gas * 1.2)  # Add 20% buffer
            gas_price = gas_price or estimated_price
        
        # Build transaction
        transaction = contract.constructor(base_price_wei).build_transaction({
            'chainId': self.networks[self.network]["chain_id"],
            'gas': gas_limit,
            'gasPrice': gas_price,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
        })
        
        # Sign and send transaction
        signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        print(f"📝 Transaction hash: {tx_hash.hex()}")
        print("⏳ Waiting for confirmation...")
        
        # Wait for transaction receipt
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        if tx_receipt.status == 1:
            print("✅ Contract deployed successfully!")
            print(f"📍 Contract address: {tx_receipt.contractAddress}")
            
            # Save deployment info
            self.save_deployment_info(tx_receipt, base_price_wei)
            
            return tx_receipt.contractAddress
        else:
            raise Exception("❌ Contract deployment failed!")
    
    def save_deployment_info(self, tx_receipt, base_price_wei):
        """
        Save deployment information to a JSON file
        """
        deployment_info = {
            "network": self.network,
            "contract_address": tx_receipt.contractAddress,
            "transaction_hash": tx_receipt.transactionHash.hex(),
            "block_number": tx_receipt.blockNumber,
            "deployer_address": self.account.address,
            "base_price_wei": str(base_price_wei),
            "base_price_eth": str(self.w3.from_wei(base_price_wei, 'ether')),
            "gas_used": tx_receipt.gasUsed,
            "deployment_timestamp": int(time.time()),
            "abi": self.contract_interface['abi']
        }
        
        filename = f"dropcoin_deployment_{self.network}.json"
        with open(filename, 'w') as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"💾 Deployment info saved to {filename}")
        
        # Also save to website src folder for frontend integration
        website_config_path = "../../src/data/dropcoin_config.json"
        try:
            with open(website_config_path, 'w') as f:
                json.dump({
                    "contractAddress": tx_receipt.contractAddress,
                    "network": self.network,
                    "abi": self.contract_interface['abi']
                }, f, indent=2)
            print(f"💾 Website config saved to {website_config_path}")
        except Exception as e:
            print(f"⚠️  Could not save website config: {e}")
    
    def verify_deployment(self, contract_address):
        """
        Verify the deployed contract
        """
        print("🔍 Verifying deployment...")
        
        # Create contract instance
        contract = self.w3.eth.contract(
            address=contract_address,
            abi=self.contract_interface['abi']
        )
        
        # Check basic contract functions
        try:
            name = contract.functions.name().call()
            symbol = contract.functions.symbol().call()
            total_supply = contract.functions.totalSupply().call()
            owner = contract.functions.owner().call()
            
            print(f"✅ Contract verified:")
            print(f"   Name: {name}")
            print(f"   Symbol: {symbol}")
            print(f"   Total Supply: {total_supply / 10**18:,.0f} {symbol}")
            print(f"   Owner: {owner}")
            
            return True
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            return False

def main():
    """
    Main deployment function
    """
    print("🪙 Drop Coin Deployment Script for DollarDrop Website")
    print("=" * 50)
    
    # Configuration
    NETWORK = "sepolia"  # Change to "mainnet" for production
    TARGET_PRICE_USD = 1.0  # $1 USD per DROP token initially
    
    # Get current ETH price and calculate exact amount for $1 USD
    print("🔮 Fetching current ETH price...")
    BASE_PRICE_ETH = get_one_dollar_in_eth()
    
    # Convert base price to wei
    base_price_wei = Web3.to_wei(BASE_PRICE_ETH, 'ether')
    
    print(f"🌐 Network: {NETWORK}")
    print(f"💰 Base price: {BASE_PRICE_ETH:.6f} ETH per DROP (~$1 USD)")
    print()
    
    # Get credentials from environment or user input
    private_key = os.getenv('PRIVATE_KEY')
    infura_project_id = os.getenv('INFURA_PROJECT_ID')
    
    if not private_key:
        print("⚠️  Please set your PRIVATE_KEY environment variable")
        print("   export PRIVATE_KEY='your_private_key_here'")
        return
    
    if not infura_project_id and NETWORK in ['mainnet', 'goerli', 'sepolia']:
        print("ℹ️  No Infura project ID found - using public RPC endpoints")
        print("   (This is fine for deployment, but may be slower)")
        print("   To use Infura: export INFURA_PROJECT_ID='your_infura_project_id_here'")
    
    try:
        # Initialize deployer
        deployer = DropCoinDeployer(NETWORK)
        
        # Setup connection
        deployer.setup_connection(private_key, infura_project_id)
        
        # Compile contract
        deployer.compile_contract()
        
        # Estimate costs
        gas_estimate, gas_price, cost_eth = deployer.estimate_gas_and_cost(base_price_wei)
        
        # Confirm deployment
        print()
        response = input(f"Deploy Drop Coin for ~{cost_eth:.6f} ETH? (y/N): ")
        if response.lower() != 'y':
            print("❌ Deployment cancelled")
            return
        
        # Deploy contract
        contract_address = deployer.deploy_contract(base_price_wei)
        
        # Verify deployment
        deployer.verify_deployment(contract_address)
        
        print()
        print("🎉 Drop Coin deployment completed!")
        print(f"📍 Contract Address: {contract_address}")
        print(f"🌐 Network: {NETWORK}")
        print(f"🌐 Website integration files created!")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")

if __name__ == "__main__":
    main()
