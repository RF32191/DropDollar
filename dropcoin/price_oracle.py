#!/usr/bin/env python3
"""
Price Oracle for Drop Coin
Fetches current ETH/USD price to calculate accurate token pricing
"""

import requests
import time
from web3 import Web3

class PriceOracle:
    def __init__(self):
        self.eth_price_usd = None
        self.last_update = 0
        self.cache_duration = 300  # 5 minutes
    
    def get_eth_price_usd(self):
        """
        Get current ETH price in USD from multiple sources
        """
        current_time = time.time()
        
        # Use cached price if recent
        if self.eth_price_usd and (current_time - self.last_update) < self.cache_duration:
            return self.eth_price_usd
        
        # Try multiple price sources
        sources = [
            self._get_price_coingecko,
            self._get_price_coinbase,
            self._get_price_binance
        ]
        
        for source in sources:
            try:
                price = source()
                if price and price > 0:
                    self.eth_price_usd = price
                    self.last_update = current_time
                    print(f"💰 Current ETH price: ${price:,.2f} USD")
                    return price
            except Exception as e:
                print(f"⚠️  Price source failed: {e}")
                continue
        
        # Fallback to estimated price
        fallback_price = 3300.0
        print(f"⚠️  Using fallback ETH price: ${fallback_price:,.2f} USD")
        self.eth_price_usd = fallback_price
        self.last_update = current_time
        return fallback_price
    
    def _get_price_coingecko(self):
        """Get price from CoinGecko API"""
        url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return float(data['ethereum']['usd'])
    
    def _get_price_coinbase(self):
        """Get price from Coinbase API"""
        url = "https://api.coinbase.com/v2/exchange-rates?currency=ETH"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return float(data['data']['rates']['USD'])
    
    def _get_price_binance(self):
        """Get price from Binance API"""
        url = "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return float(data['price'])
    
    def calculate_eth_for_usd(self, usd_amount):
        """
        Calculate how much ETH is needed for a given USD amount
        
        Args:
            usd_amount (float): Amount in USD
            
        Returns:
            float: Amount in ETH
        """
        eth_price = self.get_eth_price_usd()
        eth_amount = usd_amount / eth_price
        return eth_amount
    
    def calculate_usd_for_eth(self, eth_amount):
        """
        Calculate USD value of a given ETH amount
        
        Args:
            eth_amount (float): Amount in ETH
            
        Returns:
            float: Amount in USD
        """
        eth_price = self.get_eth_price_usd()
        usd_amount = eth_amount * eth_price
        return usd_amount

def get_one_dollar_in_eth():
    """
    Get the current ETH amount equivalent to $1 USD
    
    Returns:
        float: ETH amount for $1 USD
    """
    oracle = PriceOracle()
    eth_for_one_dollar = oracle.calculate_eth_for_usd(1.0)
    
    print(f"💵 $1 USD = {eth_for_one_dollar:.6f} ETH")
    print(f"💵 $1 USD = {Web3.to_wei(eth_for_one_dollar, 'ether')} wei")
    
    return eth_for_one_dollar

if __name__ == "__main__":
    print("🔮 Drop Coin Price Oracle")
    print("=" * 30)
    
    oracle = PriceOracle()
    
    # Get current ETH price
    eth_price = oracle.get_eth_price_usd()
    
    # Calculate $1 in ETH
    one_dollar_eth = oracle.calculate_eth_for_usd(1.0)
    
    print()
    print("📊 Price Information:")
    print(f"   ETH Price: ${eth_price:,.2f} USD")
    print(f"   $1 USD = {one_dollar_eth:.6f} ETH")
    print(f"   $1 USD = {Web3.to_wei(one_dollar_eth, 'ether'):,} wei")
    
    # Show some example calculations
    print()
    print("💡 Example Token Prices:")
    for usd_price in [1, 5, 10, 50, 100]:
        eth_price = oracle.calculate_eth_for_usd(usd_price)
        print(f"   ${usd_price} USD = {eth_price:.6f} ETH")